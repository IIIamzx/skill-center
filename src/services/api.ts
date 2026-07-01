import type { Skill, SkillCenterConfig, DashboardStats, ScanResult, ImportPreview } from '../types'

const API_BASE = `${import.meta.env.BASE_URL.replace(/\/$/, '')}/api`

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }))
    throw new Error(err.message || `Request failed: ${res.status}`)
  }
  return res.json()
}

export const api = {
  // Skills
  getSkills: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : ''
    return request<Skill[]>(`/skills${qs}`)
  },
  getSkill: (id: string) => request<Skill>(`/skills/${id}`),
  createSkill: (data: any) => request<Skill>('/skills', { method: 'POST', body: JSON.stringify(data) }),
  updateSkill: (id: string, data: Partial<Skill>) => request<Skill>(`/skills/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSkill: (id: string, deleteFiles?: boolean) => request<{ success: boolean }>(`/skills/${id}`, { method: 'DELETE', body: JSON.stringify({ deleteFiles }) }),
  toggleSkill: (id: string) => request<Skill>(`/skills/${id}/toggle`, { method: 'POST' }),
  saveSkillContent: (id: string, content: string) => request<{ success: boolean }>(`/skills/${id}/content`, { method: 'PUT', body: JSON.stringify({ content }) }),

  // Scan
  triggerScan: () => request<ScanResult>('/scan', { method: 'POST' }),
  getScanResult: () => request<ScanResult>('/scan'),

  // Dashboard
  getDashboard: () => request<DashboardStats>('/dashboard'),

  // Directories
  getDirectories: () => request<any[]>('/directories'),
  addDirectory: (path: string, label: string, sourceType: string) => request<any[]>('/directories', { method: 'POST', body: JSON.stringify({ path, label, sourceType }) }),
  removeDirectory: (path: string) => request<any[]>(`/directories?path=${encodeURIComponent(path)}`, { method: 'DELETE' }),

  // Import
  uploadFile: async (file: File): Promise<ImportPreview> => {
    const formData = new FormData()
    formData.append('file', file)
    const res = await fetch(`${API_BASE}/import/upload`, { method: 'POST', body: formData })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }))
      throw new Error(err.message || 'Upload failed')
    }
    return res.json()
  },
  confirmImport: (preview: ImportPreview, savePath?: string) => request<Skill>('/import/confirm', { method: 'POST', body: JSON.stringify({ preview, savePath }) }),
  importFromGitHub: (url: string) => request<ImportPreview>('/import/github', { method: 'POST', body: JSON.stringify({ url }) }),
  confirmGitHubImport: (preview: ImportPreview, savePath?: string) => request<Skill>('/import/github/confirm', { method: 'POST', body: JSON.stringify({ preview, savePath }) }),

  // Config
  getConfig: () => request<SkillCenterConfig>('/config'),
  updateConfig: (data: Partial<SkillCenterConfig>) => request<SkillCenterConfig>('/config', { method: 'PUT', body: JSON.stringify(data) }),
  exportConfig: () => request<any>('/config/export'),
  importConfig: (data: any) => request<{ success: boolean }>('/config/import', { method: 'POST', body: JSON.stringify({ data }) }),

  // Logs
  getLogs: () => request<{ logs: string; logDir: string; logFiles: string[] }>('/logs'),
}
