export type SourceType =
  | 'claude-personal-skill'
  | 'claude-project-skill'
  | 'claude-plugin'
  | 'claude-plugin-skill'
  | 'codex-user-skill'
  | 'codex-system-skill'
  | 'codex-agents-skill'
  | 'codex-plugin'
  | 'codex-plugin-skill'
  | 'marketplace-plugin'
  | 'uploaded'
  | 'github'
  | 'unknown'

export type ItemType = 'skill' | 'plugin' | 'plugin-skill' | 'marketplace'

export type SourceProduct = 'claude' | 'codex' | 'agents' | 'uploaded' | 'github' | 'unknown'

export interface Skill {
  id: string
  name: string
  title: string
  description: string
  sourceType: SourceType
  sourceProduct: SourceProduct
  itemType: ItemType
  sourcePath: string
  entryFile: string
  tags: string[]
  tools: string[]
  dependencies: string[]
  version: string
  author: string
  createdAt: string
  updatedAt: string
  enabled: boolean
  isFromCache: boolean
  isEditable: boolean
  marketplace: string
  parentPlugin: string
  rawContent: string
  fileTree: string[]
  lastScannedAt: string
}

export interface ScanDirectory {
  path: string
  label: string
  sourceType: SourceType
  sourceProduct: SourceProduct
  scanCategory: 'skill' | 'plugin' | 'config' | 'marketplace' | 'cache'
  exists: boolean
  skillCount: number
  isDefault: boolean
}

export interface ScanResult {
  timestamp: string
  directories: ScanDirectory[]
  totalSkillsFound: number
  errors: string[]
  warnings: string[]
  duration: number
  scanLog: string[]
}

export interface SkillCenterConfig {
  scanDirectories: ScanDirectory[]
  customScanDirectories: string[]
  defaultImportDir: string
  scanHiddenDirs: boolean
  readPluginDirs: boolean
  githubImportEnabled: boolean
  scanNestedWorkspaceSkills: boolean
  customTags: string[]
  skillIndexCache: Record<string, Skill>
  lastScanTime: string
  theme: 'light' | 'dark' | 'system'
}

export interface SkillFormData {
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
}

export interface GitHubImportRequest {
  url: string
  savePath?: string
}

export interface ImportPreview {
  name: string
  description: string
  sourceType: SourceType
  content: string
  files: { name: string; content: string }[]
}

export interface DashboardStats {
  totalSkills: number
  enabledSkills: number
  disabledSkills: number
  sourceDistribution: Record<string, number>
  productDistribution: Record<string, number>
  typeDistribution: Record<string, number>
  recentSkills: Skill[]
  lastScanTime: string
  totalDirectories: number
  activeDirectories: number
}

export type ViewMode = 'card' | 'list'
export type SortField = 'updatedAt' | 'name' | 'sourceType' | 'createdAt' | 'sourceProduct'
export type SortOrder = 'asc' | 'desc'

export interface SkillFilter {
  search: string
  sourceType: SourceType | 'all'
  sourceProduct: SourceProduct | 'all'
  itemType: ItemType | 'all'
  enabled: 'all' | 'enabled' | 'disabled'
  tags: string[]
  sortField: SortField
  sortOrder: SortOrder
}

// ─── Label helpers ─────────────────────────────────────────────────

export const SOURCE_TYPE_LABELS: Record<SourceType, string> = {
  'claude-personal-skill': 'Claude 个人 Skill',
  'claude-project-skill': 'Claude 项目 Skill',
  'claude-plugin': 'Claude 插件',
  'claude-plugin-skill': 'Claude 插件 Skill',
  'codex-user-skill': 'Codex 用户 Skill',
  'codex-system-skill': 'Codex 系统 Skill',
  'codex-agents-skill': 'Agents Skill',
  'codex-plugin': 'Codex 插件',
  'codex-plugin-skill': 'Codex 插件 Skill',
  'marketplace-plugin': 'Marketplace 插件',
  'uploaded': '本地上传',
  'github': 'GitHub 导入',
  'unknown': '未知',
}

export const SOURCE_PRODUCT_LABELS: Record<SourceProduct, string> = {
  'claude': 'Claude',
  'codex': 'Codex',
  'agents': 'Agents',
  'uploaded': '本地上传',
  'github': 'GitHub',
  'unknown': '未知',
}

export const ITEM_TYPE_LABELS: Record<ItemType, string> = {
  'skill': 'Skill',
  'plugin': '插件',
  'plugin-skill': '插件 Skill',
  'marketplace': 'Marketplace',
}

export const SOURCE_PRODUCT_COLORS: Record<SourceProduct, string> = {
  'claude': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  'codex': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  'agents': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  'uploaded': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  'github': 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
  'unknown': 'bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-300',
}
