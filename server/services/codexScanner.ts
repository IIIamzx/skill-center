import fs from 'fs'
import path from 'path'
import os from 'os'
import matter from 'gray-matter'
import { v4 as uuidv4 } from 'uuid'
import type { Skill, SourceType, ItemType, SourceProduct } from '../types'
import { logger } from './logger'

const log = logger.scope('CodexScanner')

// ─── Skill scanning ───────────────────────────────────────────────

/** Scan ~/.codex/skills for user skills */
export function scanCodexUserSkills(homeDir: string): Skill[] {
  const dir = path.join(homeDir, '.codex', 'skills')
  return scanCodexSkillDir(dir, 'codex-user-skill', 'skill', true)
}

/** Scan ~/.codex/skills/.system for system skills */
export function scanCodexSystemSkills(homeDir: string): Skill[] {
  const dir = path.join(homeDir, '.codex', 'skills', '.system')
  return scanCodexSkillDir(dir, 'codex-system-skill', 'skill', false)
}

/** Scan ~/.agents/skills for cross-agent skills */
export function scanCodexAgentsSkills(homeDir: string): Skill[] {
  const dir = path.join(homeDir, '.agents', 'skills')
  return scanCodexSkillDir(dir, 'codex-agents-skill', 'skill', true)
}

/** Scan <workspace>/.codex/skills */
export function scanCodexProjectSkills(workspaceDir: string): Skill[] {
  const dir = path.join(workspaceDir, '.codex', 'skills')
  return scanCodexSkillDir(dir, 'codex-user-skill', 'skill', true)
}

/** Scan <workspace>/.agents/skills */
export function scanCodexProjectAgentsSkills(workspaceDir: string): Skill[] {
  const dir = path.join(workspaceDir, '.agents', 'skills')
  return scanCodexSkillDir(dir, 'codex-agents-skill', 'skill', true)
}

function scanCodexSkillDir(dirPath: string, sourceType: SourceType, itemType: ItemType, isEditable: boolean): Skill[] {
  const skills: Skill[] = []
  if (!fs.existsSync(dirPath)) {
    log.debug(`Directory not found: ${dirPath}`)
    return skills
  }

  log.info(`Scanning Codex skills: ${dirPath}`)
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true })
    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      if (entry.name.startsWith('.') && entry.name !== '.system') continue
      const skillPath = path.join(dirPath, entry.name)
      const skill = parseCodexSkillDir(skillPath, sourceType, itemType, isEditable)
      if (skill) skills.push(skill)
    }
  } catch (err: any) {
    log.error(`Failed to scan ${dirPath}`, err.message)
  }
  return skills
}

function parseCodexSkillDir(dirPath: string, sourceType: SourceType, itemType: ItemType, isEditable: boolean): Skill | null {
  // Look for SKILL.md or README.md
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

    const skill: Skill = {
      id: (frontmatter.id as string) || uuidv4(),
      name: (frontmatter.name as string) || dirName,
      title: (frontmatter.title as string) || (frontmatter.name as string) || dirName,
      description: (frontmatter.description as string) || bodyContent.slice(0, 200).trim() || '',
      sourceType,
      sourceProduct: 'codex',
      itemType,
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
      isEditable,
      marketplace: '',
      parentPlugin: '',
      rawContent: content,
      fileTree: buildFileTree(dirPath),
      lastScannedAt: new Date().toISOString(),
    }
    log.debug(`Found Codex skill: ${skill.name} at ${dirPath}`)
    return skill
  } catch (err: any) {
    log.warn(`Failed to parse ${dirPath}`, err.message)
    return null
  }
}

// ─── Config.toml parsing ──────────────────────────────────────────

interface CodexConfig {
  marketplaces: Record<string, { source_type: string; source: string; last_updated?: string }>
  plugins: Record<string, { enabled: boolean }>
}

/** Read ~/.codex/config.toml (simple TOML parser for our needs) */
export function readCodexConfig(homeDir: string, workspaceDir: string): { config: CodexConfig; sources: string[] } {
  const configPaths = [
    path.join(homeDir, '.codex', 'config.toml'),
    path.join(workspaceDir, '.codex', 'config.toml'),
  ]

  const merged: CodexConfig = { marketplaces: {}, plugins: {} }
  const sources: string[] = []

  for (const cp of configPaths) {
    if (!fs.existsSync(cp)) {
      log.debug(`Config not found: ${cp}`)
      continue
    }
    try {
      const content = fs.readFileSync(cp, 'utf-8')
      const parsed = parseSimpleToml(content)
      if (parsed.marketplaces) Object.assign(merged.marketplaces, parsed.marketplaces)
      if (parsed.plugins) Object.assign(merged.plugins, parsed.plugins)
      sources.push(cp)
      log.info(`Read Codex config: ${cp}`)
    } catch (err: any) {
      log.warn(`Failed to read ${cp}`, err.message)
    }
  }

  return { config: merged, sources }
}

/** Minimal TOML parser for the sections we need */
function parseSimpleToml(content: string): Partial<CodexConfig> {
  const result: Partial<CodexConfig> = { marketplaces: {}, plugins: {} }
  let currentSection = ''
  let currentKey = ''

  for (const line of content.split('\n')) {
    const trimmed = line.trim()

    // Section header [marketplaces.name] or [plugins."name@marketplace"]
    const sectionMatch = trimmed.match(/^\[(\w+)\.(.+)\]$/)
    if (sectionMatch) {
      currentSection = sectionMatch[1]
      currentKey = sectionMatch[2].replace(/^"|"$/g, '') // strip quotes
      if (currentSection === 'marketplaces' && !result.marketplaces) result.marketplaces = {}
      if (currentSection === 'plugins' && !result.plugins) result.plugins = {}
      continue
    }

    // Key = value
    const kvMatch = trimmed.match(/^(\w+)\s*=\s*(.+)$/)
    if (kvMatch && currentSection) {
      const [, key, rawVal] = kvMatch
      let value: any = rawVal.trim().replace(/^"|"$/g, '')
      if (value === 'true') value = true
      else if (value === 'false') value = false

      if (currentSection === 'marketplaces' && result.marketplaces) {
        if (!result.marketplaces[currentKey]) (result.marketplaces as any)[currentKey] = {}
        ;(result.marketplaces as any)[currentKey][key] = value
      } else if (currentSection === 'plugins' && result.plugins) {
        if (!result.plugins[currentKey]) (result.plugins as any)[currentKey] = {}
        ;(result.plugins as any)[currentKey][key] = value
      }
    }
  }

  return result
}

/** Check if a Codex plugin is enabled based on config */
function isCodexPluginEnabled(config: CodexConfig, pluginKey: string): boolean | null {
  if (config.plugins && pluginKey in config.plugins) {
    return config.plugins[pluginKey].enabled ?? null
  }
  return null
}

// ─── Plugin scanning ──────────────────────────────────────────────

/** Scan ~/.codex/plugins/cache for cached plugins */
export function scanCodexCachePlugins(homeDir: string, config: CodexConfig): Skill[] {
  const plugins: Skill[] = []
  const cacheDir = path.join(homeDir, '.codex', 'plugins', 'cache')

  if (!fs.existsSync(cacheDir)) {
    log.debug(`Cache dir not found: ${cacheDir}`)
    return plugins
  }

  log.info(`Scanning Codex cache plugins: ${cacheDir}`)

  try {
    walkDir(cacheDir, (dirPath) => {
      const pluginJsonPath = path.join(dirPath, '.codex-plugin', 'plugin.json')
      if (fs.existsSync(pluginJsonPath)) {
        // Extract marketplace and plugin name from path
        const relativePath = path.relative(cacheDir, dirPath)
        const parts = relativePath.split(path.sep)
        const mktName = parts[0] || 'unknown'
        const pluginName = parts[1] || path.basename(dirPath)
        const pluginKey = `${pluginName}@${mktName}`

        const plugin = parseCodexPlugin(pluginJsonPath, mktName, config, pluginKey, true)
        if (plugin) plugins.push(plugin)

        // Scan plugin-internal skills
        const pluginSkills = scanCodexPluginSkills(dirPath, mktName, pluginName)
        plugins.push(...pluginSkills)
      }
    }, 6)
  } catch (err: any) {
    log.error(`Failed to scan cache plugins`, err.message)
  }

  return plugins
}

function parseCodexPlugin(pluginJsonPath: string, marketplace: string, config: CodexConfig, pluginKey: string, isFromCache: boolean): Skill | null {
  try {
    const content = fs.readFileSync(pluginJsonPath, 'utf-8')
    const data = JSON.parse(content)
    const pluginDir = path.dirname(path.dirname(pluginJsonPath))
    const pluginName = data.name || path.basename(pluginDir)
    const enabled = isCodexPluginEnabled(config, pluginKey)

    const skill: Skill = {
      id: data.id || uuidv4(),
      name: pluginName,
      title: data.title || data.displayName || data.name || pluginName,
      description: data.description || '',
      sourceType: isFromCache ? 'codex-plugin' : 'marketplace-plugin',
      sourceProduct: 'codex',
      itemType: 'plugin',
      sourcePath: pluginDir,
      entryFile: '.codex-plugin/plugin.json',
      tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
      tools: Array.isArray(data.tools) ? data.tools.map(String) : [],
      dependencies: [],
      version: data.version || '1.0.0',
      author: data.author || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      enabled: enabled !== null ? enabled : true,
      isFromCache,
      isEditable: false,
      marketplace,
      parentPlugin: '',
      rawContent: content,
      fileTree: buildFileTree(pluginDir),
      lastScannedAt: new Date().toISOString(),
    }
    log.debug(`Found Codex plugin: ${pluginName}@${marketplace} (cache=${isFromCache})`)
    return skill
  } catch (err: any) {
    log.warn(`Failed to parse ${pluginJsonPath}`, err.message)
    return null
  }
}

/** Scan <plugin-root>/skills/ for plugin-internal skills */
export function scanCodexPluginSkills(pluginRoot: string, marketplace: string, pluginName: string): Skill[] {
  const skills: Skill[] = []
  const skillsDir = path.join(pluginRoot, 'skills')
  if (!fs.existsSync(skillsDir)) return skills

  try {
    const entries = fs.readdirSync(skillsDir, { withFileTypes: true })
    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      const skillPath = path.join(skillsDir, entry.name)
      const skillMdPath = path.join(skillPath, 'SKILL.md')
      if (!fs.existsSync(skillMdPath)) continue

      try {
        const content = fs.readFileSync(skillMdPath, 'utf-8')
        const parsed = matter(content)
        const data = parsed.data || {}
        const dirName = path.basename(skillPath)

        skills.push({
          id: (data.id as string) || uuidv4(),
          name: (data.name as string) || dirName,
          title: (data.title as string) || dirName,
          description: (data.description as string) || '',
          sourceType: 'codex-plugin-skill',
          sourceProduct: 'codex',
          itemType: 'plugin-skill',
          sourcePath: skillPath,
          entryFile: 'SKILL.md',
          tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
          tools: Array.isArray(data.tools) ? data.tools.map(String) : [],
          dependencies: [],
          version: (data.version as string) || '1.0.0',
          author: (data.author as string) || '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          enabled: true,
          isFromCache: true,
          isEditable: false,
          marketplace,
          parentPlugin: pluginName,
          rawContent: content,
          fileTree: buildFileTree(skillPath),
          lastScannedAt: new Date().toISOString(),
        })
        log.debug(`Found Codex plugin skill: ${dirName} in ${pluginName}`)
      } catch (err: any) {
        log.warn(`Failed to parse plugin skill ${skillMdPath}`, err.message)
      }
    }
  } catch (err: any) {
    log.warn(`Failed to scan plugin skills in ${skillsDir}`, err.message)
  }

  return skills
}

// ─── Marketplace scanning ─────────────────────────────────────────

interface MarketplaceEntry {
  name: string
  source: { source: string; path?: string; repo?: string }
  category?: string
}

interface MarketplaceFile {
  name: string
  interface?: { displayName: string }
  plugins: MarketplaceEntry[]
}

/** Scan marketplace.json files and resolve local plugin paths */
export function scanMarketplaces(homeDir: string, workspaceDir: string): Skill[] {
  const plugins: Skill[] = []
  const marketplacePaths = [
    path.join(homeDir, '.agents', 'plugins', 'marketplace.json'),
    path.join(workspaceDir, '.agents', 'plugins', 'marketplace.json'),
  ]

  for (const mktPath of marketplacePaths) {
    if (!fs.existsSync(mktPath)) {
      log.debug(`Marketplace file not found: ${mktPath}`)
      continue
    }

    log.info(`Scanning marketplace: ${mktPath}`)
    try {
      const content = fs.readFileSync(mktPath, 'utf-8')
      const mktData: MarketplaceFile = JSON.parse(content)
      const mktDir = path.dirname(mktPath)
      const mktName = mktData.name || path.basename(path.dirname(mktPath))

      for (const pluginEntry of mktData.plugins || []) {
        if (pluginEntry.source?.source === 'local' && pluginEntry.source.path) {
          // Resolve local path relative to marketplace directory
          const resolvedPath = resolveLocalPluginPath(mktDir, pluginEntry.source.path, homeDir)
          if (resolvedPath && fs.existsSync(resolvedPath)) {
            // Check for .codex-plugin/plugin.json
            const codexPluginJson = path.join(resolvedPath, '.codex-plugin', 'plugin.json')
            if (fs.existsSync(codexPluginJson)) {
              const plugin = parseMarketplacePlugin(codexPluginJson, mktName, resolvedPath)
              if (plugin) plugins.push(plugin)

              // Scan plugin skills
              const pluginSkills = scanCodexPluginSkills(resolvedPath, mktName, pluginEntry.name)
              plugins.push(...pluginSkills)
              continue
            }

            // Check for .claude-plugin/plugin.json
            const claudePluginJson = path.join(resolvedPath, '.claude-plugin', 'plugin.json')
            if (fs.existsSync(claudePluginJson)) {
              const plugin = parseMarketplacePlugin(claudePluginJson, mktName, resolvedPath, 'claude')
              if (plugin) plugins.push(plugin)
              continue
            }

            // Check if it's a skill directory
            const skillMd = path.join(resolvedPath, 'SKILL.md')
            if (fs.existsSync(skillMd)) {
              try {
                const skillContent = fs.readFileSync(skillMd, 'utf-8')
                const parsed = matter(skillContent)
                const data = parsed.data || {}
                plugins.push({
                  id: (data.id as string) || uuidv4(),
                  name: (data.name as string) || pluginEntry.name,
                  title: (data.title as string) || pluginEntry.name,
                  description: (data.description as string) || '',
                  sourceType: 'marketplace-plugin',
                  sourceProduct: 'codex',
                  itemType: 'skill',
                  sourcePath: resolvedPath,
                  entryFile: 'SKILL.md',
                  tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
                  tools: [],
                  dependencies: [],
                  version: (data.version as string) || '1.0.0',
                  author: (data.author as string) || '',
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                  enabled: true,
                  isFromCache: false,
                  isEditable: false,
                  marketplace: mktName,
                  parentPlugin: '',
                  rawContent: skillContent,
                  fileTree: buildFileTree(resolvedPath),
                  lastScannedAt: new Date().toISOString(),
                })
              } catch (err: any) {
                log.warn(`Failed to parse marketplace skill ${skillMd}`, err.message)
              }
            }
          } else {
            log.debug(`Marketplace plugin path not resolved: ${pluginEntry.source.path}`)
          }
        }
      }
    } catch (err: any) {
      log.error(`Failed to scan marketplace ${mktPath}`, err.message)
    }
  }

  return plugins
}

function resolveLocalPluginPath(marketplaceDir: string, relativePath: string, homeDir: string): string | null {
  // Try relative to marketplace directory first
  const resolved = path.resolve(marketplaceDir, relativePath)
  if (fs.existsSync(resolved)) return resolved

  // For home-level marketplace, try ~/.agents/plugins/<name>
  const homePluginsPath = path.join(homeDir, '.agents', 'plugins', relativePath.replace(/^\.\//, ''))
  if (fs.existsSync(homePluginsPath)) return homePluginsPath

  // Try ~/plugins/<name>
  const homePluginsAlt = path.join(homeDir, 'plugins', relativePath.replace(/^\.\//, ''))
  if (fs.existsSync(homePluginsAlt)) return homePluginsAlt

  return null
}

function parseMarketplacePlugin(
  pluginJsonPath: string,
  marketplace: string,
  pluginDir: string,
  sourceProduct: SourceProduct = 'codex'
): Skill | null {
  try {
    const content = fs.readFileSync(pluginJsonPath, 'utf-8')
    const data = JSON.parse(content)
    const pluginName = data.name || path.basename(pluginDir)

    return {
      id: data.id || uuidv4(),
      name: pluginName,
      title: data.title || data.displayName || pluginName,
      description: data.description || '',
      sourceType: 'marketplace-plugin',
      sourceProduct,
      itemType: 'plugin',
      sourcePath: pluginDir,
      entryFile: path.relative(pluginDir, pluginJsonPath),
      tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
      tools: Array.isArray(data.tools) ? data.tools.map(String) : [],
      dependencies: [],
      version: data.version || '1.0.0',
      author: data.author || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      enabled: true,
      isFromCache: false,
      isEditable: false,
      marketplace,
      parentPlugin: '',
      rawContent: content,
      fileTree: buildFileTree(pluginDir),
      lastScannedAt: new Date().toISOString(),
    }
  } catch (err: any) {
    log.warn(`Failed to parse marketplace plugin ${pluginJsonPath}`, err.message)
    return null
  }
}

// ─── Helpers ──────────────────────────────────────────────────────

function walkDir(dir: string, callback: (dirPath: string) => void, maxDepth: number = 4, currentDepth: number = 0): void {
  if (currentDepth > maxDepth) return
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.name.startsWith('.') && entry.name !== '.claude-plugin' && entry.name !== '.codex-plugin') continue
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        callback(fullPath)
        walkDir(fullPath, callback, maxDepth, currentDepth + 1)
      }
    }
  } catch {
    // ignore
  }
}

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
