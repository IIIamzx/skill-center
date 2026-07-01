import express from 'express'
import cors from 'cors'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import apiRouter from './routes/api'
import { logger } from './services/logger'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const log = logger.scope('Server')

const app = express()
const PORT = process.env.PORT || 3001

// ─── Middleware ────────────────────────────────────────────────────

app.use(cors())
app.use(express.json({ limit: '50mb' }))

// HTTP request logging middleware
app.use((req, _res, next) => {
  const start = Date.now()
  const { method, originalUrl } = req

  _res.on('finish', () => {
    const duration = Date.now() - start
    const status = _res.statusCode
    const level = status >= 400 ? 'warn' : 'info'
    log[level](`${method} ${originalUrl} → ${status} (${duration}ms)`)
  })

  next()
})

// ─── Routes ────────────────────────────────────────────────────────

app.use('/api', apiRouter)

// Serve static files in production
const distPath = path.join(__dirname, '../../dist')
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath))
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'))
  })
}

// ─── Start ─────────────────────────────────────────────────────────

app.listen(PORT, () => {
  log.info(`SkillCenter API Server started at http://localhost:${PORT}`)
  log.info(`API endpoint: http://localhost:${PORT}/api`)
  log.info(`Config directory: ~/.skillcenter/`)
  log.info(`Log directory: ${logger.getLogDir()}`)
  console.log(`\n  🔧 SkillCenter API Server running at http://localhost:${PORT}`)
  console.log(`  📡 API endpoint: http://localhost:${PORT}/api`)
  console.log(`  📂 Config directory: ~/.skillcenter/`)
  console.log(`  📝 Log directory: ${logger.getLogDir()}\n`)
})

export default app
