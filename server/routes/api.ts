import { Router, Request, Response } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import AdmZip from 'adm-zip'
import { scanAllDirectories, getAllSkills, getSkillById, updateSkill, toggleSkillEnabled, deleteSkillFromIndex, createSkill, saveSkillFile } from '../services/skillService'
import { loadConfig, updateConfig, addCustomDirectory, removeCustomDirectory } from '../services/configService'
import { parseUploadedFile, confirmImport } from '../services/fileImportService'
import { fetchFromGitHub, confirmGitHubImport } from '../services/githubImportService'
import { logger } from '../services/logger'

const log = logger.scope('API')
const router = Router()
const upload = multer({ dest: '/tmp/skillcenter-uploads/', limits: { fileSize: 50 * 1024 * 1024 } })

// Skills
router.get('/skills', (_req: Request, res: Response) => {
  try {
    let skills = getAllSkills()
    const { search, sourceType, sourceProduct, itemType, enabled, sortField, sortOrder } = _req.query as any

    if (search) {
      const q = search.toLowerCase()
      skills = skills.filter(s =>
        s.name.toLowerCase().includes(q) ||
        s.title.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.tags.some(t => t.toLowerCase().includes(q)) ||
        s.rawContent.toLowerCase().includes(q)
      )
    }
    if (sourceType && sourceType !== 'all') {
      skills = skills.filter(s => s.sourceType === sourceType)
    }
    if (sourceProduct && sourceProduct !== 'all') {
      skills = skills.filter(s => s.sourceProduct === sourceProduct)
    }
    if (itemType && itemType !== 'all') {
      skills = skills.filter(s => s.itemType === itemType)
    }
    if (enabled && enabled !== 'all') {
      skills = skills.filter(s => enabled === 'enabled' ? s.enabled : !s.enabled)
    }
    if (sortField) {
      skills.sort((a: any, b: any) => {
        const aVal = a[sortField] || ''
        const bVal = b[sortField] || ''
        const cmp = typeof aVal === 'string' ? aVal.localeCompare(bVal) : (aVal - bVal)
        return sortOrder === 'desc' ? -cmp : cmp
      })
    }

    res.json(skills)
  } catch (err: any) {
    log.error('GET /skills failed', err.message)
    res.status(500).json({ message: err.message })
  }
})

router.get('/skills/:id', (req: Request, res: Response) => {
  const skill = getSkillById(req.params.id)
  if (!skill) return res.status(404).json({ message: 'Skill not found' })
  res.json(skill)
})

router.post('/skills', (req: Request, res: Response) => {
  try {
    const skill = createSkill(req.body)
    log.info(`Created skill: ${skill.name}`)
    res.json(skill)
  } catch (err: any) {
    log.error('POST /skills failed', err.message)
    res.status(500).json({ message: err.message })
  }
})

router.put('/skills/:id', (req: Request, res: Response) => {
  try {
    const skill = updateSkill(req.params.id, req.body)
    if (!skill) return res.status(404).json({ message: 'Skill not found' })
    res.json(skill)
  } catch (err: any) {
    log.error(`PUT /skills/${req.params.id} failed`, err.message)
    res.status(500).json({ message: err.message })
  }
})

router.delete('/skills/:id', (req: Request, res: Response) => {
  try {
    const { deleteFiles } = req.body || {}
    const ok = deleteSkillFromIndex(req.params.id, deleteFiles)
    if (!ok) return res.status(404).json({ message: 'Skill not found' })
    res.json({ success: true })
  } catch (err: any) {
    log.error(`DELETE /skills/${req.params.id} failed`, err.message)
    res.status(500).json({ message: err.message })
  }
})

router.post('/skills/:id/toggle', (req: Request, res: Response) => {
  try {
    const skill = toggleSkillEnabled(req.params.id)
    if (!skill) return res.status(404).json({ message: 'Skill not found' })
    res.json(skill)
  } catch (err: any) {
    res.status(500).json({ message: err.message })
  }
})

router.put('/skills/:id/content', (req: Request, res: Response) => {
  try {
    const { content } = req.body
    const ok = saveSkillFile(req.params.id, content)
    if (!ok) return res.status(404).json({ message: 'Skill not found or cannot save' })
    res.json({ success: true })
  } catch (err: any) {
    res.status(500).json({ message: err.message })
  }
})

// Scan
router.post('/scan', (_req: Request, res: Response) => {
  try {
    const start = Date.now()
    const result = scanAllDirectories()
    log.info(`Scan completed: ${result.skills.length} skills in ${Date.now() - start}ms`)
    res.json({
      timestamp: new Date().toISOString(),
      directories: result.directories,
      totalSkillsFound: result.skills.length,
      errors: result.errors,
      warnings: result.warnings,
      scanLog: result.scanLog,
      duration: Date.now() - start,
    })
  } catch (err: any) {
    log.error('POST /scan failed', err.message)
    res.status(500).json({ message: err.message })
  }
})

router.get('/scan', (_req: Request, res: Response) => {
  try {
    const config = loadConfig()
    res.json({
      timestamp: config.lastScanTime,
      directories: config.scanDirectories,
      totalSkillsFound: Object.keys(config.skillIndexCache).length,
      errors: [],
      warnings: [],
      scanLog: [],
      duration: 0,
    })
  } catch (err: any) {
    res.status(500).json({ message: err.message })
  }
})

// Dashboard
router.get('/dashboard', (_req: Request, res: Response) => {
  try {
    const skills = getAllSkills()
    const config = loadConfig()
    const enabled = skills.filter(s => s.enabled).length
    const sourceDistribution: Record<string, number> = {}
    const productDistribution: Record<string, number> = {}
    const typeDistribution: Record<string, number> = {}
    for (const s of skills) {
      sourceDistribution[s.sourceType] = (sourceDistribution[s.sourceType] || 0) + 1
      productDistribution[s.sourceProduct] = (productDistribution[s.sourceProduct] || 0) + 1
      typeDistribution[s.itemType] = (typeDistribution[s.itemType] || 0) + 1
    }
    const recent = [...skills].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 5)
    const activeDirs = config.scanDirectories.filter(d => d.exists).length

    res.json({
      totalSkills: skills.length,
      enabledSkills: enabled,
      disabledSkills: skills.length - enabled,
      sourceDistribution,
      productDistribution,
      typeDistribution,
      recentSkills: recent,
      lastScanTime: config.lastScanTime,
      totalDirectories: config.scanDirectories.length,
      activeDirectories: activeDirs,
    })
  } catch (err: any) {
    log.error('GET /dashboard failed', err.message)
    res.status(500).json({ message: err.message })
  }
})

// Directories
router.get('/directories', (_req: Request, res: Response) => {
  const config = loadConfig()
  res.json(config.scanDirectories)
})

router.post('/directories', (req: Request, res: Response) => {
  try {
    const { path: dirPath, label, sourceType } = req.body
    const config = addCustomDirectory(dirPath, label, sourceType)
    res.json(config.scanDirectories)
  } catch (err: any) {
    res.status(500).json({ message: err.message })
  }
})

router.delete('/directories', (req: Request, res: Response) => {
  try {
    const dirPath = req.query.path as string
    const config = removeCustomDirectory(dirPath)
    res.json(config.scanDirectories)
  } catch (err: any) {
    res.status(500).json({ message: err.message })
  }
})

// File Upload Import
router.post('/import/upload', upload.single('file'), (req: Request, res: Response) => {
  try {
    const file = req.file
    if (!file) return res.status(400).json({ message: 'No file uploaded' })

    const ext = path.extname(file.originalname || '').toLowerCase()

    if (ext === '.zip') {
      const zip = new AdmZip(file.path)
      const entries = zip.getEntries()
      const files: { name: string; content: string }[] = []
      let skillMdContent = ''
      let skillName = path.basename(file.originalname!, '.zip')

      for (const entry of entries) {
        if (entry.isDirectory) continue
        if (entry.entryName.startsWith('__MACOSX')) continue
        try {
          const content = entry.getData().toString('utf-8')
          files.push({ name: entry.entryName, content })
          const basename = path.basename(entry.entryName).toLowerCase()
          if (basename === 'skill.md' || basename === 'readme.md') {
            if (!skillMdContent) {
              skillMdContent = content
            }
          }
        } catch {
          // skip binary files
        }
      }

      try { fs.unlinkSync(file.path) } catch {}

      if (files.length === 0) {
        return res.status(400).json({ message: 'No readable files found in the zip archive' })
      }

      const preview = {
        name: skillName,
        description: `Imported from zip: ${file.originalname}`,
        sourceType: 'uploaded' as const,
        content: skillMdContent || files[0].content,
        files,
      }
      return res.json(preview)
    }

    const content = fs.readFileSync(file.path, 'utf-8')
    try { fs.unlinkSync(file.path) } catch {}

    const preview = parseUploadedFile(file.originalname || 'unknown.md', content)
    res.json(preview)
  } catch (err: any) {
    log.error('File upload import failed', err.message)
    res.status(500).json({ message: err.message })
  }
})

router.post('/import/confirm', (req: Request, res: Response) => {
  try {
    const { preview, savePath } = req.body
    const skill = confirmImport(preview, savePath)
    log.info(`Confirmed file import: ${skill.name}`)
    res.json(skill)
  } catch (err: any) {
    res.status(500).json({ message: err.message })
  }
})

// GitHub Import
router.post('/import/github', async (req: Request, res: Response) => {
  try {
    const { url } = req.body
    if (!url) return res.status(400).json({ message: 'GitHub URL is required' })
    const preview = await fetchFromGitHub(url)
    log.info(`GitHub import preview: ${url}`)
    res.json(preview)
  } catch (err: any) {
    log.error('GitHub import failed', err.message)
    res.status(500).json({ message: err.message })
  }
})

router.post('/import/github/confirm', (req: Request, res: Response) => {
  try {
    const { preview, savePath } = req.body
    const skill = confirmGitHubImport(preview, savePath)
    log.info(`Confirmed GitHub import: ${skill.name}`)
    res.json(skill)
  } catch (err: any) {
    res.status(500).json({ message: err.message })
  }
})

// Config
router.get('/config', (_req: Request, res: Response) => {
  const config = loadConfig()
  res.json(config)
})

router.put('/config', (req: Request, res: Response) => {
  try {
    const config = updateConfig(req.body)
    res.json(config)
  } catch (err: any) {
    res.status(500).json({ message: err.message })
  }
})

router.get('/config/export', (_req: Request, res: Response) => {
  const config = loadConfig()
  res.json({ version: '1.0', exportedAt: new Date().toISOString(), data: config })
})

router.post('/config/import', (req: Request, res: Response) => {
  try {
    const { data } = req.body
    if (!data) return res.status(400).json({ message: 'No data provided' })
    const config = updateConfig(data)
    res.json({ success: true })
  } catch (err: any) {
    res.status(500).json({ message: err.message })
  }
})

// Logs
router.get('/logs', (_req: Request, res: Response) => {
  try {
    const logDir = logger.getLogDir()
    if (!fs.existsSync(logDir)) {
      return res.json({ logs: [], logDir })
    }
    const logFiles = fs.readdirSync(logDir).filter(f => f.endsWith('.log')).sort().reverse()
    const latestLog = logFiles[0]
    let content = ''
    if (latestLog) {
      const raw = fs.readFileSync(path.join(logDir, latestLog), 'utf-8')
      const lines = raw.split('\n').filter(Boolean)
      content = lines.slice(-200).join('\n') // last 200 lines
    }
    res.json({ logs: content, logDir, logFiles })
  } catch (err: any) {
    res.status(500).json({ message: err.message })
  }
})

export default router
