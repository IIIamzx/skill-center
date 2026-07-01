import path from 'path'
import fs from 'fs'
import os from 'os'
import type { SkillCenterConfig, ScanDirectory, SourceType, SourceProduct } from '../types'
import { logger } from './logger'

const log = logger.scope('ConfigService')

// Re-export types for server usage
export type { Skill, ScanDirectory, ScanResult, SkillCenterConfig, SourceType, SourceProduct, SkillFormData, ImportPreview, GitHubImportRequest, DashboardStats, ItemType } from '../types'

const CONFIG_DIR = path.join(os.homedir(), '.skillcenter')
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json')

function getDefaultScanDirectories(): ScanDirectory[] {
  const home = os.homedir()
  const cwd = process.cwd()
  return [
    // Claude Code
    { path: path.join(home, '.claude', 'skills'), label: 'Claude Personal Skills', sourceType: 'claude-personal-skill', sourceProduct: 'claude', scanCategory: 'skill', exists: false, skillCount: 0, isDefault: true },
    { path: path.join(cwd, '.claude', 'skills'), label: 'Claude Project Skills', sourceType: 'claude-project-skill', sourceProduct: 'claude', scanCategory: 'skill', exists: false, skillCount: 0, isDefault: true },
    { path: path.join(home, '.claude', 'settings.json'), label: 'Claude Settings', sourceType: 'claude-plugin', sourceProduct: 'claude', scanCategory: 'config', exists: false, skillCount: 0, isDefault: true },
    { path: path.join(home, '.claude', 'plugins', 'marketplaces'), label: 'Claude Marketplace Plugins', sourceType: 'claude-plugin', sourceProduct: 'claude', scanCategory: 'marketplace', exists: false, skillCount: 0, isDefault: true },
    { path: path.join(home, '.claude', 'plugins', 'cache'), label: 'Claude Cache Plugins', sourceType: 'claude-plugin', sourceProduct: 'claude', scanCategory: 'cache', exists: false, skillCount: 0, isDefault: true },
    // Codex
    { path: path.join(home, '.codex', 'skills'), label: 'Codex User Skills', sourceType: 'codex-user-skill', sourceProduct: 'codex', scanCategory: 'skill', exists: false, skillCount: 0, isDefault: true },
    { path: path.join(home, '.codex', 'skills', '.system'), label: 'Codex System Skills', sourceType: 'codex-system-skill', sourceProduct: 'codex', scanCategory: 'skill', exists: false, skillCount: 0, isDefault: true },
    { path: path.join(home, '.agents', 'skills'), label: 'Agents Skills', sourceType: 'codex-agents-skill', sourceProduct: 'codex', scanCategory: 'skill', exists: false, skillCount: 0, isDefault: true },
    { path: path.join(cwd, '.codex', 'skills'), label: 'Project Codex Skills', sourceType: 'codex-user-skill', sourceProduct: 'codex', scanCategory: 'skill', exists: false, skillCount: 0, isDefault: true },
    { path: path.join(cwd, '.agents', 'skills'), label: 'Project Agents Skills', sourceType: 'codex-agents-skill', sourceProduct: 'codex', scanCategory: 'skill', exists: false, skillCount: 0, isDefault: true },
    { path: path.join(home, '.codex', 'config.toml'), label: 'Codex Config', sourceType: 'codex-plugin', sourceProduct: 'codex', scanCategory: 'config', exists: false, skillCount: 0, isDefault: true },
    { path: path.join(home, '.codex', 'plugins', 'cache'), label: 'Codex Cache Plugins', sourceType: 'codex-plugin', sourceProduct: 'codex', scanCategory: 'cache', exists: false, skillCount: 0, isDefault: true },
    { path: path.join(home, '.agents', 'plugins', 'marketplace.json'), label: 'Agents Marketplace', sourceType: 'marketplace-plugin', sourceProduct: 'codex', scanCategory: 'marketplace', exists: false, skillCount: 0, isDefault: true },
  ]
}

function getDefaultConfig(): SkillCenterConfig {
  return {
    scanDirectories: getDefaultScanDirectories(),
    customScanDirectories: [],
    defaultImportDir: path.join(os.homedir(), '.skillcenter', 'skills'),
    scanHiddenDirs: true,
    readPluginDirs: true,
    githubImportEnabled: true,
    scanNestedWorkspaceSkills: false,
    customTags: [],
    skillIndexCache: {},
    lastScanTime: '',
    theme: 'dark',
  }
}

export function loadConfig(): SkillCenterConfig {
  try {
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true })
    }
    if (fs.existsSync(CONFIG_FILE)) {
      const data = fs.readFileSync(CONFIG_FILE, 'utf-8')
      const config = JSON.parse(data)
      const defaults = getDefaultConfig()
      return { ...defaults, ...config, scanDirectories: config.scanDirectories || defaults.scanDirectories }
    }
  } catch (err) {
    log.error('Failed to load config', err)
  }
  return getDefaultConfig()
}

export function saveConfig(config: SkillCenterConfig): void {
  try {
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true })
    }
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8')
  } catch (err) {
    log.error('Failed to save config', err)
    throw err
  }
}

export function updateConfig(partial: Partial<SkillCenterConfig>): SkillCenterConfig {
  const config = loadConfig()
  const updated = { ...config, ...partial }
  saveConfig(updated)
  log.info('Config updated')
  return updated
}

export function addCustomDirectory(dirPath: string, label: string, sourceType: SourceType): SkillCenterConfig {
  const config = loadConfig()
  const exists = config.scanDirectories.some(d => d.path === dirPath) || config.customScanDirectories.includes(dirPath)
  if (exists) return config

  const newDir: ScanDirectory = {
    path: dirPath,
    label: label || path.basename(dirPath),
    sourceType: sourceType || 'unknown',
    sourceProduct: 'unknown',
    scanCategory: 'skill',
    exists: fs.existsSync(dirPath),
    skillCount: 0,
    isDefault: false,
  }
  config.scanDirectories.push(newDir)
  config.customScanDirectories.push(dirPath)
  saveConfig(config)
  log.info(`Added custom directory: ${dirPath}`)
  return config
}

export function removeCustomDirectory(dirPath: string): SkillCenterConfig {
  const config = loadConfig()
  config.scanDirectories = config.scanDirectories.filter(d => d.path !== dirPath || d.isDefault)
  config.customScanDirectories = config.customScanDirectories.filter(p => p !== dirPath)
  saveConfig(config)
  log.info(`Removed custom directory: ${dirPath}`)
  return config
}
