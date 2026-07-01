import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  FolderOpen,
  FolderX,
  CheckCircle2,
  XCircle,
  Boxes,
  RefreshCw,
  Settings,
  Package,
  Database,
  FileText,
  AlertTriangle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { api } from '@/services/api'
import { useToast } from '@/components/ui/toast'
import {
  SOURCE_PRODUCT_LABELS,
  SOURCE_PRODUCT_COLORS,
  type ScanDirectory,
  type ScanResult,
  type SourceProduct,
} from '@/types'

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  skill: FileText,
  plugin: Package,
  config: Settings,
  marketplace: Package,
  cache: Database,
}

const CATEGORY_LABELS: Record<string, string> = {
  skill: 'Skill 目录',
  plugin: '插件目录',
  config: '配置文件',
  marketplace: 'Marketplace',
  cache: '缓存目录',
}

export function SourcesPage() {
  const { addToast } = useToast()
  const [directories, setDirectories] = React.useState<ScanDirectory[]>([])
  const [lastScan, setLastScan] = React.useState<ScanResult | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [scanning, setScanning] = React.useState(false)

  React.useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const dirs = await api.getDirectories()
      setDirectories(dirs)
      const scan = await api.getScanResult()
      setLastScan(scan)
    } catch (err: any) {
      addToast({ title: '加载失败', description: err.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const handleRescan = async () => {
    try {
      setScanning(true)
      const result = await api.triggerScan()
      setLastScan(result)
      setDirectories(result.directories)
      addToast({
        title: '扫描完成',
        description: `发现 ${result.totalSkillsFound} 项，耗时 ${result.duration}ms`,
        variant: 'success',
      })
    } catch (err: any) {
      addToast({ title: '扫描失败', description: err.message, variant: 'destructive' })
    } finally {
      setScanning(false)
    }
  }

  // Group by sourceProduct
  const grouped = React.useMemo(() => {
    const groups: Record<string, ScanDirectory[]> = {}
    for (const dir of directories) {
      const key = dir.sourceProduct || 'unknown'
      if (!groups[key]) groups[key] = []
      groups[key].push(dir)
    }
    return groups
  }, [directories])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">加载中...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">扫描目录</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {directories.length} 个目录 · {directories.filter(d => d.exists).length} 个活跃
          </p>
        </div>
        <Button onClick={handleRescan} disabled={scanning} className="gap-2">
          <RefreshCw className={cn('h-4 w-4', scanning && 'animate-spin')} />
          {scanning ? '扫描中...' : '重新扫描'}
        </Button>
      </div>

      {/* Scan Summary */}
      {lastScan && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-6 text-sm flex-wrap">
              <span className="flex items-center gap-2">
                <Boxes className="h-4 w-4 text-primary" />
                <strong>{lastScan.totalSkillsFound}</strong> 项
              </span>
              <span className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                {lastScan.directories.filter(d => d.exists).length} 目录活跃
              </span>
              <span className="flex items-center gap-2">
                <FolderX className="h-4 w-4 text-orange-500" />
                {lastScan.directories.filter(d => !d.exists).length} 目录不存在
              </span>
              {lastScan.errors && lastScan.errors.length > 0 && (
                <span className="text-destructive">{lastScan.errors.length} 错误</span>
              )}
              {lastScan.warnings && lastScan.warnings.length > 0 && (
                <span className="text-yellow-600">{lastScan.warnings.length} 警告</span>
              )}
            </div>
            {lastScan.scanLog && lastScan.scanLog.length > 0 && (
              <div className="mt-3 pt-3 border-t">
                <p className="text-xs text-muted-foreground mb-1">扫描日志:</p>
                <div className="text-xs text-muted-foreground space-y-0.5">
                  {lastScan.scanLog.map((line, i) => (
                    <div key={i} className="font-mono">{line}</div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Grouped by product */}
      {Object.entries(grouped).map(([product, dirs]) => {
        const colorClass = SOURCE_PRODUCT_COLORS[product as SourceProduct] || SOURCE_PRODUCT_COLORS.unknown
        return (
          <Card key={product}>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Badge className={cn('text-xs', colorClass)}>
                  {SOURCE_PRODUCT_LABELS[product as SourceProduct] || product}
                </Badge>
                <span className="text-muted-foreground font-normal">
                  {dirs.length} 目录 · {dirs.reduce((sum, d) => sum + d.skillCount, 0)} skills
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {dirs.map((dir) => {
                  const CategoryIcon = CATEGORY_ICONS[dir.scanCategory] || FileText
                  return (
                    <div
                      key={dir.path}
                      className={cn(
                        'flex items-center gap-3 p-3 rounded-md border',
                        dir.exists ? 'bg-background' : 'bg-muted/30 opacity-60',
                      )}
                    >
                      {dir.exists ? (
                        <CategoryIcon className="h-5 w-5 text-emerald-500 shrink-0" />
                      ) : (
                        <FolderX className="h-5 w-5 text-orange-500 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{dir.label}</p>
                          <Badge variant="outline" className="text-xs">
                            {CATEGORY_LABELS[dir.scanCategory] || dir.scanCategory}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground font-mono truncate">{dir.path}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {dir.exists ? (
                          <>
                            {dir.scanCategory === 'skill' && (
                              <Badge variant="secondary" className="text-xs">
                                {dir.skillCount} skill{dir.skillCount !== 1 ? 's' : ''}
                              </Badge>
                            )}
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          </>
                        ) : (
                          <>
                            <Badge variant="outline" className="text-xs">未找到</Badge>
                            <XCircle className="h-4 w-4 text-orange-500" />
                          </>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )
      })}

      {/* Scan errors */}
      {lastScan?.errors && lastScan.errors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-destructive flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              扫描错误
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1">
              {lastScan.errors.map((err, i) => (
                <li key={i} className="text-sm text-destructive">{err}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Scan warnings */}
      {lastScan?.warnings && lastScan.warnings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-yellow-600 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              扫描警告
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1">
              {lastScan.warnings.map((w, i) => (
                <li key={i} className="text-sm text-yellow-600">{w}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
