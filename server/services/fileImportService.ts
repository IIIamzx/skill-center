import fs from 'fs'
import path from 'path'
import os from 'os'
import { v4 as uuidv4 } from 'uuid'
import matter from 'gray-matter'
import type { Skill, ImportPreview } from '../types'
import { loadConfig, saveConfig } from './configService'
import { logger } from './logger'

const log = logger.scope('FileImport')

export function parseUploadedFile(filename: string, content: string): ImportPreview {
  const ext = path.extname(filename).toLowerCase()

  if (ext === '.json') {
    return parseJsonFile(filename, content)
  }

  if (ext === '.md') {
    return parseMarkdownFile(filename, content)
  }

  throw new Error(`Unsupported file type: ${ext}`)
}

function parseMarkdownFile(filename: string, content: string): ImportPreview {
  const parsed = matter(content)
  const data = parsed.data || {}
  const body = parsed.content || ''

  return {
    name: (data.name as string) || path.basename(filename, '.md'),
    description: (data.description as string) || body.slice(0, 200).trim(),
    sourceType: 'uploaded',
    content,
    files: [{ name: filename, content }],
  }
}

function parseJsonFile(filename: string, content: string): ImportPreview {
  const data = JSON.parse(content)

  const name = data.name || data.title || path.basename(filename, '.json')
  const description = data.description || ''

  const frontmatter = {
    name,
    title: data.title || name,
    description,
    tags: data.tags || [],
    tools: data.tools || [],
    version: data.version || '1.0.0',
    author: data.author || '',
  }

  const body = data.instructions || data.content || `# ${name}\n\n${description}\n`
  const skillMd = matter.stringify(body, frontmatter)

  return {
    name,
    description,
    sourceType: 'uploaded',
    content: skillMd,
    files: [
      { name: filename, content },
      { name: 'SKILL.md', content: skillMd },
    ],
  }
}

export function confirmImport(preview: ImportPreview, savePath: string): Skill {
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
  if (!fs.existsSync(skillMdPath)) {
    fs.writeFileSync(skillMdPath, preview.content, 'utf-8')
  }

  const skill: Skill = {
    id: uuidv4(),
    name: preview.name,
    title: preview.name,
    description: preview.description,
    sourceType: 'uploaded',
    sourceProduct: 'uploaded',
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
  log.info(`Imported skill: ${skill.name} at ${finalDir}`)
  return skill
}
