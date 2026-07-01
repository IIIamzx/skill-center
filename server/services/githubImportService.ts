import { execSync } from 'child_process'
import path from 'path'
import fs from 'fs'
import os from 'os'
import { v4 as uuidv4 } from 'uuid'
import matter from 'gray-matter'
import type { Skill, ImportPreview } from '../types'
import { loadConfig, saveConfig } from './configService'
import { logger } from './logger'

const log = logger.scope('GitHubImport')

interface GitHubUrlInfo {
  owner: string
  repo: string
  branch: string
  subPath: string
  isRaw: boolean
}

export function parseGitHubUrl(url: string): GitHubUrlInfo | null {
  try {
    // Raw file URL: https://raw.githubusercontent.com/owner/repo/branch/path
    const rawMatch = url.match(/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/([^/]+)\/(.+)/)
    if (rawMatch) {
      return {
        owner: rawMatch[1],
        repo: rawMatch[2],
        branch: rawMatch[3],
        subPath: rawMatch[4],
        isRaw: true,
      }
    }

    // Regular URL: https://github.com/owner/repo/tree/branch/path
    const treeMatch = url.match(/github\.com\/([^/]+)\/([^/]+)(?:\/tree\/([^/]+)(?:\/(.+))?)?/)
    if (treeMatch) {
      return {
        owner: treeMatch[1],
        repo: treeMatch[2],
        branch: treeMatch[3] || 'main',
        subPath: treeMatch[4] || '',
        isRaw: false,
      }
    }

    // Simple repo URL: https://github.com/owner/repo
    const simpleMatch = url.match(/github\.com\/([^/]+)\/([^/]+)/)
    if (simpleMatch) {
      return {
        owner: simpleMatch[1],
        repo: simpleMatch[2],
        branch: 'main',
        subPath: '',
        isRaw: false,
      }
    }

    return null
  } catch {
    return null
  }
}

export async function fetchFromGitHub(url: string): Promise<ImportPreview> {
  const info = parseGitHubUrl(url)
  if (!info) {
    throw new Error('Invalid GitHub URL. Please provide a valid repository or file link.')
  }

  const { owner, repo, branch, subPath, isRaw } = info

  if (isRaw) {
    // Fetch single raw file
    const content = await fetchRawFile(url)
    const filename = path.basename(subPath)

    if (filename.toLowerCase() === 'skill.md' || filename.toLowerCase() === 'readme.md') {
      const parsed = matter(content)
      const data = parsed.data || {}
      return {
        name: (data.name as string) || path.basename(subPath, '.md'),
        description: (data.description as string) || (parsed.content || '').slice(0, 200).trim(),
        sourceType: 'github',
        content,
        files: [{ name: 'SKILL.md', content }],
      }
    }

    return {
      name: path.basename(subPath, path.extname(subPath)),
      description: `Imported from GitHub: ${url}`,
      sourceType: 'github',
      content,
      files: [{ name: filename, content }],
    }
  }

  // For directories/repos, use GitHub API to fetch tree
  try {
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`
    const response = await fetch(apiUrl, {
      headers: { 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'SkillCenter' },
    })

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`)
    }

    const tree: any = await response.json()
    const files: { name: string; content: string }[] = []
    let skillMdContent = ''
    let skillName = repo

    // Filter to relevant path
    const relevantFiles = (tree.tree || []).filter((item: any) => {
      if (item.type !== 'blob') return false
      if (subPath && !item.path.startsWith(subPath)) return false
      return true
    })

    // Look for SKILL.md or README.md first
    const skillFile = relevantFiles.find((item: any) => {
      const basename = path.basename(item.path).toLowerCase()
      return basename === 'skill.md' || basename === 'readme.md'
    })

    // Fetch up to 10 files
    const filesToFetch = skillFile
      ? [skillFile, ...relevantFiles.filter((f: any) => f.path !== skillFile.path)].slice(0, 10)
      : relevantFiles.slice(0, 10)

    for (const file of filesToFetch) {
      try {
        const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${file.path}`
        const content = await fetchRawFile(rawUrl)
        const relativePath = subPath ? file.path.replace(subPath + '/', '') : file.path
        files.push({ name: relativePath, content })

        if (file === skillFile) {
          skillMdContent = content
          const parsed = matter(content)
          const data = parsed.data || {}
          skillName = (data.name as string) || repo
        }
      } catch {
        // Skip files that fail to fetch
      }
    }

    if (files.length === 0) {
      throw new Error('No accessible files found in the repository. Make sure the repo is public.')
    }

    if (!skillMdContent) {
      skillMdContent = files[0].content
    }

    return {
      name: skillName,
      description: `Imported from GitHub: ${owner}/${repo}`,
      sourceType: 'github',
      content: skillMdContent,
      files,
    }
  } catch (err: any) {
    // Fallback: try using git clone
    if (err.message?.includes('API')) {
      return await fetchViaGitClone(url, owner, repo, subPath)
    }
    throw err
  }
}

async function fetchRawFile(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'SkillCenter' },
  })
  if (!response.ok) {
    throw new Error(`Failed to fetch file: ${response.status}`)
  }
  return response.text()
}

async function fetchViaGitClone(url: string, owner: string, repo: string, subPath: string): Promise<ImportPreview> {
  const tmpDir = path.join(os.tmpdir(), `skillcenter-${Date.now()}`)
  const repoUrl = `https://github.com/${owner}/${repo}.git`

  try {
    execSync(`git clone --depth 1 ${repoUrl} "${tmpDir}"`, {
      timeout: 60000,
      stdio: 'pipe',
    })
  } catch {
    throw new Error('Failed to clone repository. Make sure git is installed and the repo is accessible.')
  }

  const targetDir = subPath ? path.join(tmpDir, subPath) : tmpDir

  if (!fs.existsSync(targetDir)) {
    fs.rmSync(tmpDir, { recursive: true, force: true })
    throw new Error(`Sub-path "${subPath}" not found in repository.`)
  }

  const files: { name: string; content: string }[] = []
  let skillMdContent = ''
  let skillName = repo

  function walkDir(dir: string, prefix: string = '') {
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.name.startsWith('.git')) continue
      const fullPath = path.join(dir, entry.name)
      const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name

      if (entry.isDirectory()) {
        walkDir(fullPath, relativePath)
      } else if (entry.isFile()) {
        try {
          const content = fs.readFileSync(fullPath, 'utf-8')
          files.push({ name: relativePath, content })

          if (entry.name.toLowerCase() === 'skill.md' || entry.name.toLowerCase() === 'readme.md') {
            if (!skillMdContent) {
              skillMdContent = content
              const parsed = matter(content)
              const data = parsed.data || {}
              skillName = (data.name as string) || repo
            }
          }
        } catch {
          // skip binary files
        }
      }
    }
  }

  walkDir(targetDir)

  // Cleanup
  try {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  } catch {
    // ignore
  }

  if (files.length === 0) {
    throw new Error('No readable files found in the repository path.')
  }

  return {
    name: skillName,
    description: `Imported from GitHub: ${owner}/${repo}`,
    sourceType: 'github',
    content: skillMdContent || files[0].content,
    files,
  }
}

export function confirmGitHubImport(preview: ImportPreview, savePath: string): Skill {
  const config = loadConfig()
  const targetDir = savePath || config.defaultImportDir
  const skillDir = path.join(targetDir, preview.name)

  let finalDir = skillDir
  let counter = 1
  while (fs.existsSync(finalDir)) {
    finalDir = `${skillDir}-${counter}`
    counter++
  }

  fs.mkdirSync(finalDir, { recursive: true })

  for (const file of preview.files) {
    const filePath = path.join(finalDir, file.name)
    const fileDir = path.dirname(filePath)
    if (!fs.existsSync(fileDir)) {
      fs.mkdirSync(fileDir, { recursive: true })
    }
    fs.writeFileSync(filePath, file.content, 'utf-8')
  }

  const skillMdPath = path.join(finalDir, 'SKILL.md')
  if (!fs.existsSync(skillMdPath) && preview.content) {
    fs.writeFileSync(skillMdPath, preview.content, 'utf-8')
  }

  const skill: Skill = {
    id: uuidv4(),
    name: preview.name,
    title: preview.name,
    description: preview.description,
    sourceType: 'github',
    sourceProduct: 'github',
    itemType: 'skill',
    sourcePath: finalDir,
    entryFile: 'SKILL.md',
    tags: [],
    tools: [],
    dependencies: [],
    version: '1.0.0',
    author: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    enabled: true,
    isFromCache: false,
    isEditable: true,
    marketplace: '',
    parentPlugin: '',
    rawContent: preview.content,
    fileTree: preview.files.map(f => f.name),
    lastScannedAt: new Date().toISOString(),
  }

  config.skillIndexCache[skill.id] = skill
  saveConfig(config)
  log.info(`GitHub import confirmed: ${skill.name} at ${finalDir}`)
  return skill
}
