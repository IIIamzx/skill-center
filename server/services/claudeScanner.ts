import fs from 'fs'
import path from 'path'
import os from 'os'
import matter from 'gray-matter'
import { v4 as uuidv4 } from 'uuid'
import type { Skill, SourceType, ItemType, SourceProduct } from '../types'
import { logger } from './logger'

const log = logger.scope('ClaudeScanner')

// ─── Skill scanning ───────────────────────────────────────────────

/** Scan ~/.claude/skills for personal skills */
export function scanClaudePersonalSkills(homeDir: string): Skill[] {
  const skillsDir = path.join(homeDir, '.claude', 'skills')
  return scanClaudeSkillDir(skillsDir, 'claude-personal-skill', 'skill', false)
}

/** Scan <workspace>/.claude/skills for project skills */
export function scanClaudeProjectSkills(workspaceDir: string): Skill[] {
  const skillsDir = path.join(workspaceDir, '.claude', 'skills')
  return scanClaudeSkillDir(skillsDir, 'claude-project-skill', 'skill', true)
}

// Recursively scan <workspace>/**/.claude/skills
export function scanClaudeNestedProjectSkills(workspaceDir: string): Skill[] {
  const skills: Skill[] = []
  try {
    walkDir(workspaceDir, (dirPath) => {
      if (dirPath.endsWith('.claude/skills') || dirPath.endsWith('.claude\\skills')) {
        const found = scanClaudeSkillDir(dirPath, 'claude-project-skill', 'skill', true)
        skills.push(...found)
      }
    }, 5) // max depth 5
  } catch (err: any) {
    log.warn('Nested scan failed', err.message)
  }
  return skills
}

function scanClaudeSkillDir(dirPath: string, sourceType: SourceType, itemType: ItemType, isEditable: boolean): Skill[] {
  const skills: Skill[] = []
  if (!fs.existsSync(dirPath)) {
    log.debug(`Directory not found: ${dirPath}`)
    return skills
  }

  log.info(`Scanning Claude skills: ${dirPath}`)
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true })
    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      if (entry.name.startsWith('.') && entry.name !== '.system') continue
      const skillPath = path.join(dirPath, entry.name)
      const skill = parseClaudeSkillDir(skillPath, sourceType, itemType, isEditable)
      if (skill) skills.push(skill)
    }
  } catch (err: any) {
    log.error(`Failed to scan ${dirPath}`, err.message)
  }
  return skills
}

function parseClaudeSkillDir(dirPath: string, sourceType: SourceType, itemType: ItemType, isEditable: boolean): Skill | null {
  const skillMdPath = path.join(dirPath, 'SKILL.md')
  if (!fs.existsSync(skillMdPath)) return null

  try {
    const content = fs.readFileSync(skillMdPath, 'utf-8')
    const parsed = matter(content)
    const data = parsed.data || {}
    const dirName = path.basename(dirPath)
    const stat = fs.statSync(skillMdPath)

    const skill: Skill = {
      id: (data.id as string) || uuidv4(),
      name: (data.name as string) || dirName,
      title: (data.title as string) || (data.name as string) || dirName,
      description: (data.description as string) || parsed.content?.slice(0, 200).trim() || '',
      sourceType,
      sourceProduct: 'claude',
      itemType,
      sourcePath: dirPath,
      entryFile: 'SKILL.md',
      tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
      tools: Array.isArray(data.tools) ? data.tools.map(String) : [],
      dependencies: Array.isArray(data.dependencies) ? data.dependencies.map(String) : [],
      version: (data.version as string) || '1.0.0',
      author: (data.author as string) || '',
      createdAt: (data.createdAt as string) || stat.birthtime?.toISOString() || new Date().toISOString(),
      updatedAt: (data.updatedAt as string) || stat.mtime?.toISOString() || new Date().toISOString(),
      enabled: true,
      isFromCache: false,
      isEditable,
      marketplace: '',
      parentPlugin: '',
      rawContent: content,
      fileTree: buildFileTree(dirPath),
      lastScannedAt: new Date().toISOString(),
    }
    log.debug(`Found Claude skill: ${skill.name} at ${dirPath}`)
    return skill
  } catch (err: any) {
    log.warn(`Failed to parse ${skillMdPath}`, err.message)
    return null
  }
}

// ─── Plugin scanning ──────────────────────────────────────────────

interface ClaudeSettings {
  enabledPlugins?: Record<string, boolean>
  extraKnownMarketplaces?: Record<string, any>
  strictKnownMarketplaces?: Record<string, any>
}

/** Read Claude settings.json files */
export function readClaudeSettings(homeDir: string, workspaceDir: string): { settings: ClaudeSettings; sources: string[] } {
  const settingsPaths = [
    path.join(homeDir, '.claude', 'settings.json'),
    path.join(workspaceDir, '.claude', 'settings.json'),
    path.join(workspaceDir, '.claude', 'settings.local.json'),
  ]

  const merged: ClaudeSettings = {}
  const sources: string[] = []

  for (const sp of settingsPaths) {
    if (!fs.existsSync(sp)) {
      log.debug(`Settings not found: ${sp}`)
      continue
    }
    try {
      const content = fs.readFileSync(sp, 'utf-8')
      const parsed = JSON.parse(content)
      if (parsed.enabledPlugins) {
        merged.enabledPlugins = { ...merged.enabledPlugins, ...parsed.enabledPlugins }
      }
      if (parsed.extraKnownMarketplaces) {
        merged.extraKnownMarketplaces = { ...merged.extraKnownMarketplaces, ...parsed.extraKnownMarketplaces }
      }
      if (parsed.strictKnownMarketplaces) {
        merged.strictKnownMarketplaces = { ...merged.strictKnownMarketplaces, ...parsed.strictKnownMarketplaces }
      }
      sources.push(sp)
      log.info(`Read Claude settings: ${sp}`)
    } catch (err: any) {
      log.warn(`Failed to read ${sp}`, err.message)
    }
  }

  return { settings: merged, sources }
}

/** Check if a plugin is enabled based on settings */
function isPluginEnabled(settings: ClaudeSettings, pluginName: string, marketplace: string): boolean | null {
  const key = `${pluginName}@${marketplace}`
  if (settings.enabledPlugins && key in settings.enabledPlugins) {
    return settings.enabledPlugins[key]
  }
  // If no settings found, return null (unknown)
  return null
}

/** Scan ~/.claude/plugins/marketplaces for plugins */
export function scanClaudeMarketplacePlugins(homeDir: string, settings: ClaudeSettings): Skill[] {
  const plugins: Skill[] = []
  const marketplacesDir = path.join(homeDir, '.claude', 'plugins', 'marketplaces')

  if (!fs.existsSync(marketplacesDir)) {
    log.debug(`Marketplaces dir not found: ${marketplacesDir}`)
    return plugins
  }

  log.info(`Scanning Claude marketplace plugins: ${marketplacesDir}`)

  try {
    const marketplaces = fs.readdirSync(marketplacesDir, { withFileTypes: true })
    for (const mkt of marketplaces) {
      if (!mkt.isDirectory()) continue
      const mktName = mkt.name
      const mktPath = path.join(marketplacesDir, mkt.name)

      // Find all plugin.json files under .claude-plugin directories
      walkDir(mktPath, (dirPath) => {
        const pluginJsonPath = path.join(dirPath, '.claude-plugin', 'plugin.json')
        if (fs.existsSync(pluginJsonPath)) {
          const plugin = parseClaudePlugin(pluginJsonPath, mktName, settings, false)
          if (plugin) plugins.push(plugin)

          // Also scan for skills inside the plugin
          const pluginSkills = scanPluginSkills(dirPath, mktName, 'claude-plugin-skill', 'claude', settings)
          plugins.push(...pluginSkills)
        }
      }, 4)
    }
  } catch (err: any) {
    log.error(`Failed to scan marketplaces`, err.message)
  }

  return plugins
}

/** Scan ~/.claude/plugins/cache for cached plugins */
export function scanClaudeCachePlugins(homeDir: string, settings: ClaudeSettings): Skill[] {
  const plugins: Skill[] = []
  const cacheDir = path.join(homeDir, '.claude', 'plugins', 'cache')

  if (!fs.existsSync(cacheDir)) {
    log.debug(`Cache dir not found: ${cacheDir}`)
    return plugins
  }

  log.info(`Scanning Claude cache plugins: ${cacheDir}`)

  try {
    walkDir(cacheDir, (dirPath) => {
      const pluginJsonPath = path.join(dirPath, '.claude-plugin', 'plugin.json')
      if (fs.existsSync(pluginJsonPath)) {
        // Extract marketplace and plugin name from path
        const relativePath = path.relative(cacheDir, dirPath)
        const parts = relativePath.split(path.sep)
        const mktName = parts[0] || 'unknown'
        const pluginName = parts[1] || path.basename(dirPath)

        const plugin = parseClaudePlugin(pluginJsonPath, mktName, settings, true)
        if (plugin) plugins.push(plugin)

        // Also scan for skills inside the plugin
        const pluginSkills = scanPluginSkills(dirPath, mktName, 'claude-plugin-skill', 'claude', settings)
        plugins.push(...pluginSkills)
      }
    }, 6)
  } catch (err: any) {
    log.error(`Failed to scan cache plugins`, err.message)
  }

  return plugins
}

function parseClaudePlugin(pluginJsonPath: string, marketplace: string, settings: ClaudeSettings, isFromCache: boolean): Skill | null {
  try {
    const content = fs.readFileSync(pluginJsonPath, 'utf-8')
    const data = JSON.parse(content)
    const pluginDir = path.dirname(path.dirname(pluginJsonPath)) // up from .claude-plugin
    const pluginName = data.name || path.basename(pluginDir)
    const enabled = isPluginEnabled(settings, pluginName, marketplace)

    const skill: Skill = {
      id: data.id || uuidv4(),
      name: pluginName,
      title: data.title || data.displayName || data.name || pluginName,
      description: data.description || '',
      sourceType: isFromCache ? 'claude-plugin' : 'marketplace-plugin',
      sourceProduct: 'claude',
      itemType: 'plugin',
      sourcePath: pluginDir,
      entryFile: '.claude-plugin/plugin.json',
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
    log.debug(`Found Claude plugin: ${pluginName}@${marketplace} (cache=${isFromCache})`)
    return skill
  } catch (err: any) {
    log.warn(`Failed to parse ${pluginJsonPath}`, err.message)
    return null
  }
}

// ─── Shared helpers ───────────────────────────────────────────────

/** Scan <plugin-root>/skills/ for plugin-internal skills */
export function scanPluginSkills(
  pluginRoot: string,
  marketplace: string,
  sourceType: SourceType,
  sourceProduct: SourceProduct,
  settings?: ClaudeSettings
): Skill[] {
  const skills: Skill[] = []
  const skillsDir = path.join(pluginRoot, 'skills')
  if (!fs.existsSync(skillsDir)) return skills

  const pluginName = path.basename(pluginRoot)

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

        // Check enabled status from plugin
        let enabled = true
        if (settings) {
          const pluginEnabled = isPluginEnabled(settings, pluginName, marketplace)
          if (pluginEnabled === false) enabled = false
        }

        skills.push({
          id: (data.id as string) || uuidv4(),
          name: (data.name as string) || dirName,
          title: (data.title as string) || dirName,
          description: (data.description as string) || '',
          sourceType,
          sourceProduct,
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
          enabled,
          isFromCache: sourceType.includes('plugin') || sourceProduct === 'claude',
          isEditable: false,
          marketplace,
          parentPlugin: pluginName,
          rawContent: content,
          fileTree: buildFileTree(skillPath),
          lastScannedAt: new Date().toISOString(),
        })
        log.debug(`Found plugin skill: ${dirName} in ${pluginName}`)
      } catch (err: any) {
        log.warn(`Failed to parse plugin skill ${skillMdPath}`, err.message)
      }
    }
  } catch (err: any) {
    log.warn(`Failed to scan plugin skills in ${skillsDir}`, err.message)
  }

  return skills
}

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
