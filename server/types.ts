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
