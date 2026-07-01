import fs from 'fs'
import path from 'path'
import os from 'os'
import matter from 'gray-matter'
import { v4 as uuidv4 } from 'uuid'
import type { Skill, SourceType, ScanDirectory, ScanResult, SkillCenterConfig } from '../types'
import { loadConfig, saveConfig } from './configService'
import { logger } from './logger'
import {
  scanClaudePersonalSkills,
  scanClaudeProjectSkills,
  scanClaudeNestedProjectSkills,
  readClaudeSettings,
  scanClaudeMarketplacePlugins,
  scanClaudeCachePlugins,
} from './claudeScanner'
import {
  scanCodexUserSkills,
  scanCodexSystemSkills,
  scanCodexAgentsSkills,
  scanCodexProjectSkills,
  scanCodexProjectAgentsSkills,
  readCodexConfig,
  scanCodexCachePlugins,
  scanMarketplaces,
} from './codexScanner'

const log = logger.scope('SkillService')

// ─── Full scan ────────────────────────────────────────────────────

export function scanAllDirectories(): { skills: Skill[]; errors: string[]; warnings: string[]; directories: ScanDirectory[]; scanLog: string[] } {
  const startTime = Date.now()
  const allSkills: Skill[] = []
  const errors: string[] = []
  const warnings: string[] = []
  const scanLog: string[] = []
  const config = loadConfig()

  const homeDir = os.homedir()
  const workspaceDir = process.cwd()

  log.info('=== Starting full scan ===')
  log.info(`Home dir: ${homeDir}`)
  log.info(`Workspace dir: ${workspaceDir}`)

  // ── 1. Claude Code Skills ──
  log.info('--- Scanning Claude Code Skills ---')
  const claudePersonal = scanClaudePersonalSkills(homeDir)
  allSkills.push(...claudePersonal)
  scanLog.push(`Claude personal skills: ${claudePersonal.length}`)

  const claudeProject = scanClaudeProjectSkills(workspaceDir)
  allSkills.push(...claudeProject)
  scanLog.push(`Claude project skills: ${claudeProject.length}`)

  if (config.scanNestedWorkspaceSkills) {
    const claudeNested = scanClaudeNestedProjectSkills(workspaceDir)
    allSkills.push(...claudeNested)
    scanLog.push(`Claude nested project skills: ${claudeNested.length}`)
  }

  // ── 2. Claude Code Plugins ──
  log.info('--- Scanning Claude Code Plugins ---')
  const { settings: claudeSettings, sources: claudeSettingSources } = readClaudeSettings(homeDir, workspaceDir)
  scanLog.push(`Claude settings sources: ${claudeSettingSources.length}`)

  const claudeMktPlugins = scanClaudeMarketplacePlugins(homeDir, claudeSettings)
  allSkills.push(...claudeMktPlugins)
  scanLog.push(`Claude marketplace plugins: ${claudeMktPlugins.length}`)

  const claudeCachePlugins = scanClaudeCachePlugins(homeDir, claudeSettings)
  allSkills.push(...claudeCachePlugins)
  scanLog.push(`Claude cache plugins: ${claudeCachePlugins.length}`)

  // ── 3. Codex Skills ──
  log.info('--- Scanning Codex Skills ---')
  const codexUser = scanCodexUserSkills(homeDir)
  allSkills.push(...codexUser)
  scanLog.push(`Codex user skills: ${codexUser.length}`)

  const codexSystem = scanCodexSystemSkills(homeDir)
  allSkills.push(...codexSystem)
  scanLog.push(`Codex system skills: ${codexSystem.length}`)

  const codexAgents = scanCodexAgentsSkills(homeDir)
  allSkills.push(...codexAgents)
  scanLog.push(`Codex agents skills: ${codexAgents.length}`)

  const codexProject = scanCodexProjectSkills(workspaceDir)
  allSkills.push(...codexProject)
  scanLog.push(`Codex project skills: ${codexProject.length}`)

  const codexProjectAgents = scanCodexProjectAgentsSkills(workspaceDir)
  allSkills.push(...codexProjectAgents)
  scanLog.push(`Codex project agents skills: ${codexProjectAgents.length}`)

  // ── 4. Codex Plugins ──
  log.info('--- Scanning Codex Plugins ---')
  const { config: codexConfig, sources: codexConfigSources } = readCodexConfig(homeDir, workspaceDir)
  scanLog.push(`Codex config sources: ${codexConfigSources.length}`)

  const codexCachePlugins = scanCodexCachePlugins(homeDir, codexConfig)
  allSkills.push(...codexCachePlugins)
  scanLog.push(`Codex cache plugins: ${codexCachePlugins.length}`)

  // ── 5. Marketplaces ──
  log.info('--- Scanning Marketplaces ---')
  const marketplacePlugins = scanMarketplaces(homeDir, workspaceDir)
  allSkills.push(...marketplacePlugins)
  scanLog.push(`Marketplace plugins: ${marketplacePlugins.length}`)

  // ── 6. Custom directories (generic scan) ──
  log.info('--- Scanning Custom Directories ---')
  for (const customDir of config.customScanDirectories || []) {
    if (!fs.existsSync(customDir)) {
      warnings.push(`Custom directory not found: ${customDir}`)
      continue
    }
    const customSkills = scanGenericDirectory(customDir)
    allSkills.push(...customSkills)
    scanLog.push(`Custom dir ${customDir}: ${customSkills.length} skills`)
  }

  // ── De-duplicate by sourcePath ──
  const seen = new Set<string>()
  const uniqueSkills = allSkills.filter(s => {
    if (seen.has(s.sourcePath)) return false
    seen.add(s.sourcePath)
    return true
  })

  // ── Build directory status ──
  const directories = buildDirectoryStatuses(homeDir, workspaceDir, config)

  const duration = Date.now() - startTime
  log.info(`=== Scan complete: ${uniqueSkills.length} unique skills found in ${duration}ms ===`)

  // ── Update config ──
  config.scanDirectories = directories
  config.lastScanTime = new Date().toISOString()
  config.skillIndexCache = {}
  for (const skill of uniqueSkills) {
    config.skillIndexCache[skill.id] = skill
  }
  saveConfig(config)

  return { skills: uniqueSkills, errors, warnings, directories, scanLog }
}

function buildDirectoryStatuses(homeDir: string, workspaceDir: string, config: SkillCenterConfig): ScanDirectory[] {
  const dirs: ScanDirectory[] = [
    // Claude
    { path: path.join(homeDir, '.claude', 'skills'), label: 'Claude Personal Skills', sourceType: 'claude-personal-skill', sourceProduct: 'claude', scanCategory: 'skill', exists: false, skillCount: 0, isDefault: true },
    { path: path.join(workspaceDir, '.claude', 'skills'), label: 'Claude Project Skills', sourceType: 'claude-project-skill', sourceProduct: 'claude', scanCategory: 'skill', exists: false, skillCount: 0, isDefault: true },
    { path: path.join(homeDir, '.claude', 'settings.json'), label: 'Claude Settings', sourceType: 'claude-plugin', sourceProduct: 'claude', scanCategory: 'config', exists: false, skillCount: 0, isDefault: true },
    { path: path.join(homeDir, '.claude', 'plugins', 'marketplaces'), label: 'Claude Marketplace Plugins', sourceType: 'claude-plugin', sourceProduct: 'claude', scanCategory: 'marketplace', exists: false, skillCount: 0, isDefault: true },
    { path: path.join(homeDir, '.claude', 'plugins', 'cache'), label: 'Claude Cache Plugins', sourceType: 'claude-plugin', sourceProduct: 'claude', scanCategory: 'cache', exists: false, skillCount: 0, isDefault: true },
    // Codex
    { path: path.join(homeDir, '.codex', 'skills'), label: 'Codex User Skills', sourceType: 'codex-user-skill', sourceProduct: 'codex', scanCategory: 'skill', exists: false, skillCount: 0, isDefault: true },
    { path: path.join(homeDir, '.codex', 'skills', '.system'), label: 'Codex System Skills', sourceType: 'codex-system-skill', sourceProduct: 'codex', scanCategory: 'skill', exists: false, skillCount: 0, isDefault: true },
    { path: path.join(homeDir, '.agents', 'skills'), label: 'Agents Skills', sourceType: 'codex-agents-skill', sourceProduct: 'codex', scanCategory: 'skill', exists: false, skillCount: 0, isDefault: true },
    { path: path.join(workspaceDir, '.codex', 'skills'), label: 'Project Codex Skills', sourceType: 'codex-user-skill', sourceProduct: 'codex', scanCategory: 'skill', exists: false, skillCount: 0, isDefault: true },
    { path: path.join(workspaceDir, '.agents', 'skills'), label: 'Project Agents Skills', sourceType: 'codex-agents-skill', sourceProduct: 'codex', scanCategory: 'skill', exists: false, skillCount: 0, isDefault: true },
    { path: path.join(homeDir, '.codex', 'config.toml'), label: 'Codex Config', sourceType: 'codex-plugin', sourceProduct: 'codex', scanCategory: 'config', exists: false, skillCount: 0, isDefault: true },
    { path: path.join(homeDir, '.codex', 'plugins', 'cache'), label: 'Codex Cache Plugins', sourceType: 'codex-plugin', sourceProduct: 'codex', scanCategory: 'cache', exists: false, skillCount: 0, isDefault: true },
    { path: path.join(homeDir, '.agents', 'plugins', 'marketplace.json'), label: 'Agents Marketplace', sourceType: 'marketplace-plugin', sourceProduct: 'codex', scanCategory: 'marketplace', exists: false, skillCount: 0, isDefault: true },
  ]

  // Check exists and count
  for (const dir of dirs) {
    dir.exists = fs.existsSync(dir.path)
    if (dir.exists && dir.scanCategory === 'skill') {
      try {
        const entries = fs.readdirSync(dir.path, { withFileTypes: true })
        dir.skillCount = entries.filter(e => e.isDirectory() && !e.name.startsWith('.')).length
      } catch {
        dir.skillCount = 0
      }
    }
  }

  return dirs
}

/** Generic directory scan for custom directories */
function scanGenericDirectory(dirPath: string): Skill[] {
  const skills: Skill[] = []
  if (!fs.existsSync(dirPath)) return skills

  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true })
    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      if (entry.name.startsWith('.') && entry.name !== '.system') continue
      const fullPath = path.join(dirPath, entry.name)
      const skill = parseGenericSkillDir(fullPath)
      if (skill) skills.push(skill)
    }
  } catch (err: any) {
    log.error(`Failed to scan custom dir ${dirPath}`, err.message)
  }

  return skills
}

function parseGenericSkillDir(dirPath: string): Skill | null {
  const entryCandidates = ['SKILL.md', 'skill.md', 'README.md', 'readme.md']
  let entryFile: string | null = null
  for (const name of entryCandidates) {
    if (fs.existsSync(path.join(dirPath, name))) {
      entryFile = name
      break
    }
  }
  if (!entryFile) return null

  try {
    const fullPath = path.join(dirPath, entryFile)
    const content = fs.readFileSync(fullPath, 'utf-8')
    let frontmatter: Record<string, unknown> = {}
    let bodyContent = content

    if (entryFile.toLowerCase().endsWith('.md')) {
      const parsed = matter(content)
      frontmatter = parsed.data || {}
      bodyContent = parsed.content || ''
    }

    const dirName = path.basename(dirPath)
    const stat = fs.statSync(fullPath)

    return {
      id: (frontmatter.id as string) || uuidv4(),
      name: (frontmatter.name as string) || dirName,
      title: (frontmatter.title as string) || dirName,
      description: (frontmatter.description as string) || bodyContent.slice(0, 200).trim() || '',
      sourceType: 'unknown',
      sourceProduct: 'unknown',
      itemType: 'skill',
      sourcePath: dirPath,
      entryFile,
      tags: Array.isArray(frontmatter.tags) ? frontmatter.tags.map(String) : [],
      tools: Array.isArray(frontmatter.tools) ? frontmatter.tools.map(String) : [],
      dependencies: Array.isArray(frontmatter.dependencies) ? frontmatter.dependencies.map(String) : [],
      version: (frontmatter.version as string) || '1.0.0',
      author: (frontmatter.author as string) || '',
      createdAt: (frontmatter.createdAt as string) || stat.birthtime?.toISOString() || new Date().toISOString(),
      updatedAt: (frontmatter.updatedAt as string) || stat.mtime?.toISOString() || new Date().toISOString(),
      enabled: true,
      isFromCache: false,
      isEditable: true,
      marketplace: '',
      parentPlugin: '',
      rawContent: content,
      fileTree: buildFileTree(dirPath),
      lastScannedAt: new Date().toISOString(),
    }
  } catch {
    return null
  }
}

// ─── CRUD operations ──────────────────────────────────────────────

export function getSkillById(id: string): Skill | null {
  const config = loadConfig()
  return config.skillIndexCache[id] || null
}

export function getAllSkills(): Skill[] {
  const config = loadConfig()
  return Object.values(config.skillIndexCache)
}

export function updateSkill(id: string, updates: Partial<Skill>): Skill | null {
  const config = loadConfig()
  const existing = config.skillIndexCache[id]
  if (!existing) return null

  const updated = { ...existing, ...updates, id }
  config.skillIndexCache[id] = updated
  saveConfig(config)
  log.info(`Updated skill: ${existing.name} (${id})`)
  return updated
}

export function toggleSkillEnabled(id: string): Skill | null {
  const config = loadConfig()
  const existing = config.skillIndexCache[id]
  if (!existing) return null

  existing.enabled = !existing.enabled
  config.skillIndexCache[id] = existing
  saveConfig(config)
  log.info(`Toggled skill: ${existing.name} → enabled=${existing.enabled}`)
  return existing
}

export function deleteSkillFromIndex(id: string, deleteFiles: boolean = false): boolean {
  const config = loadConfig()
  const skill = config.skillIndexCache[id]
  if (!skill) return false

  if (deleteFiles && skill.sourcePath) {
    try {
      fs.rmSync(skill.sourcePath, { recursive: true, force: true })
      log.info(`Deleted files at ${skill.sourcePath}`)
    } catch (err: any) {
      log.error(`Failed to delete files at ${skill.sourcePath}`, err.message)
      throw new Error(`Failed to delete files: ${err.message}`)
    }
  }

  delete config.skillIndexCache[id]
  saveConfig(config)
  log.info(`Deleted skill from index: ${skill.name} (${id})`)
  return true
}

export function createSkill(data: {
  name: string
  title: string
  description: string
  tags: string[]
  scenario: string
  triggerRules: string
  instructions: string
  tools: string[]
  dependencies: string[]
  outputFormat: string
  content: string
  savePath: string
  author: string
  version: string
}): Skill {
  const config = loadConfig()
  const skillDir = path.join(data.savePath, data.name)

  if (!fs.existsSync(skillDir)) {
    fs.mkdirSync(skillDir, { recursive: true })
  }

  const frontmatter: Record<string, unknown> = {
    name: data.name,
    title: data.title,
    description: data.description,
    tags: data.tags,
    tools: data.tools,
    dependencies: data.dependencies,
    version: data.version || '1.0.0',
    author: data.author,
    scenario: data.scenario,
    triggerRules: data.triggerRules,
    outputFormat: data.outputFormat,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  let body = data.content || ''
  if (!body) {
    body = `# ${data.title || data.name}\n\n${data.description || ''}\n\n## 适用场景\n\n${data.scenario || '-'}\n\n## 触发规则\n\n${data.triggerRules || '-'}\n\n## 使用说明\n\n${data.instructions || '-'}\n\n## 输出格式\n\n${data.outputFormat || '-'}\n`
  }

  const skillMdContent = matter.stringify(body, frontmatter)
  const entryPath = path.join(skillDir, 'SKILL.md')
  fs.writeFileSync(entryPath, skillMdContent, 'utf-8')

  const skill: Skill = {
    id: uuidv4(),
    name: data.name,
    title: data.title || data.name,
    description: data.description,
    sourceType: 'uploaded',
    sourceProduct: 'uploaded',
    itemType: 'skill',
    sourcePath: skillDir,
    entryFile: 'SKILL.md',
    tags: data.tags,
    tools: data.tools || [],
    dependencies: data.dependencies || [],
    version: data.version || '1.0.0',
    author: data.author,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    enabled: true,
    isFromCache: false,
    isEditable: true,
    marketplace: '',
    parentPlugin: '',
    rawContent: skillMdContent,
    fileTree: ['SKILL.md'],
    lastScannedAt: new Date().toISOString(),
  }

  config.skillIndexCache[skill.id] = skill
  saveConfig(config)
  log.info(`Created skill: ${data.name} at ${skillDir}`)
  return skill
}

export function saveSkillFile(id: string, content: string): boolean {
  const config = loadConfig()
  const skill = config.skillIndexCache[id]
  if (!skill || !skill.sourcePath || !skill.entryFile) return false

  const fullPath = path.join(skill.sourcePath, skill.entryFile)
  try {
    fs.writeFileSync(fullPath, content, 'utf-8')
    skill.rawContent = content
    skill.updatedAt = new Date().toISOString()
    config.skillIndexCache[id] = skill
    saveConfig(config)
    log.info(`Saved skill file: ${skill.name}`)
    return true
  } catch (err: any) {
    log.error(`Failed to save skill file: ${skill.name}`, err.message)
    return false
  }
}

export function refreshSkillFromDisk(id: string): Skill | null {
  const config = loadConfig()
  const skill = config.skillIndexCache[id]
  if (!skill || !skill.sourcePath) return null

  const refreshed = parseGenericSkillDir(skill.sourcePath)
  if (!refreshed) return null

  refreshed.id = id
  refreshed.enabled = skill.enabled
  refreshed.sourceType = skill.sourceType
  refreshed.sourceProduct = skill.sourceProduct
  refreshed.itemType = skill.itemType
  config.skillIndexCache[id] = refreshed
  saveConfig(config)
  log.info(`Refreshed skill from disk: ${skill.name}`)
  return refreshed
}

// ─── Helpers ──────────────────────────────────────────────────────

function buildFileTree(dirPath: string, prefix: string = ''): string[] {
  const items: string[] = []
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.name.startsWith('.') && entry.name !== '.claude-plugin' && entry.name !== '.codex-plugin') continue
      const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name
      items.push(relativePath)
      if (entry.isDirectory()) {
        items.push(...buildFileTree(path.join(dirPath, entry.name), relativePath))
      }
    }
  } catch {
    // ignore
  }
  return items
}
