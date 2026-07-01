import fs from 'fs'
import path from 'path'
import os from 'os'

const LOG_DIR = path.resolve(process.cwd(), 'log')

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

let currentLevel: LogLevel = 'info'

function ensureLogDir(): void {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true })
  }
}

function getLogFilePath(): string {
  const date = new Date().toISOString().slice(0, 10)
  return path.join(LOG_DIR, `skillcenter-${date}.log`)
}

function formatTimestamp(): string {
  return new Date().toISOString()
}

function writeToFile(message: string): void {
  try {
    ensureLogDir()
    fs.appendFileSync(getLogFilePath(), message + '\n', 'utf-8')
  } catch {
    // silently fail if log dir is not writable
  }
}

function log(level: LogLevel, module: string, message: string, meta?: unknown): void {
  if (LEVEL_PRIORITY[level] < LEVEL_PRIORITY[currentLevel]) return

  const timestamp = formatTimestamp()
  const prefix = `[${timestamp}] [${level.toUpperCase()}] [${module}]`
  const metaStr = meta !== undefined ? ' ' + (typeof meta === 'string' ? meta : JSON.stringify(meta)) : ''
  const line = `${prefix} ${message}${metaStr}`

  // Always write to file
  writeToFile(line)

  // Also console output
  if (level === 'error') {
    console.error(line)
  } else if (level === 'warn') {
    console.warn(line)
  } else {
    console.log(line)
  }
}

export const logger = {
  setLevel: (level: LogLevel) => { currentLevel = level },

  debug: (module: string, message: string, meta?: unknown) => log('debug', module, message, meta),
  info: (module: string, message: string, meta?: unknown) => log('info', module, message, meta),
  warn: (module: string, message: string, meta?: unknown) => log('warn', module, message, meta),
  error: (module: string, message: string, meta?: unknown) => log('error', module, message, meta),

  /** Return a scoped logger bound to a module name */
  scope: (module: string) => ({
    debug: (message: string, meta?: unknown) => log('debug', module, message, meta),
    info: (message: string, meta?: unknown) => log('info', module, message, meta),
    warn: (message: string, meta?: unknown) => log('warn', module, message, meta),
    error: (message: string, meta?: unknown) => log('error', module, message, meta),
  }),

  getLogDir: () => LOG_DIR,
  getLogFilePath,
}

export type { LogLevel }
