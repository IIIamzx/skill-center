import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Boxes,
  CheckCircle2,
  XCircle,
  FolderOpen,
  Clock,
  ArrowRight,
  Activity,
  Package,
  Layers,
} from 'lucide-react'
import { cn, timeAgo } from '@/lib/utils'
import { api } from '@/services/api'
import {
  SOURCE_TYPE_LABELS,
  SOURCE_PRODUCT_LABELS,
  ITEM_TYPE_LABELS,
  SOURCE_PRODUCT_COLORS,
  type DashboardStats,
  type Skill,
  type SourceProduct,
} from '@/types'

interface DashboardPageProps {
  onNavigate: (path: string) => void
  onViewSkill: (skill: Skill) => void
}

export function DashboardPage({ onNavigate, onViewSkill }: DashboardPageProps) {
  const [stats, setStats] = React.useState<DashboardStats | null>(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      setLoading(true)
      const data = await api.getDashboard()
      setStats(data)
    } catch (err) {
      console.error('Failed to load dashboard:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">加载中...</div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <p>加载失败</p>
        <Button variant="outline" className="mt-4" onClick={loadStats}>重试</Button>
      </div>
    )
  }

  const statCards = [
    { label: '总 Skill 数', value: stats.totalSkills, icon: Boxes, color: 'text-primary' },
    { label: '已启用', value: stats.enabledSkills, icon: CheckCircle2, color: 'text-emerald-500' },
    { label: '已禁用', value: stats.disabledSkills, icon: XCircle, color: 'text-orange-500' },
    { label: '活跃目录', value: `${stats.activeDirectories}/${stats.totalDirectories}`, icon: FolderOpen, color: 'text-blue-500' },
  ]

  return (
    <div className="space-y-6 fade-in">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <Card key={card.label}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{card.label}</p>
                  <p className="text-3xl font-bold mt-1">{card.value}</p>
                </div>
                <card.icon className={cn('h-8 w-8', card.color, 'opacity-80')} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Product Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4" />
              产品分布
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.productDistribution && Object.keys(stats.productDistribution).length > 0 ? (
              <div className="space-y-3">
                {Object.entries(stats.productDistribution).map(([product, count]) => {
                  const pct = stats.totalSkills > 0 ? (count / stats.totalSkills) * 100 : 0
                  const colorClass = SOURCE_PRODUCT_COLORS[product as SourceProduct] || SOURCE_PRODUCT_COLORS.unknown
                  return (
                    <div key={product} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <Badge className={cn('text-xs', colorClass)}>
                          {SOURCE_PRODUCT_LABELS[product as SourceProduct] || product}
                        </Badge>
                        <span className="font-medium">{count}</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className={cn('h-full rounded-full transition-all', colorClass.split(' ')[0])}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                暂无数据，点击 "重新扫描" 扫描本地目录。
              </p>
            )}
          </CardContent>
        </Card>

        {/* Type Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Layers className="h-4 w-4" />
              类型分布
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.typeDistribution && Object.keys(stats.typeDistribution).length > 0 ? (
              <div className="space-y-3">
                {Object.entries(stats.typeDistribution).map(([type, count]) => {
                  const pct = stats.totalSkills > 0 ? (count / stats.totalSkills) * 100 : 0
                  return (
                    <div key={type} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <Badge variant="secondary" className="text-xs">
                          {ITEM_TYPE_LABELS[type as keyof typeof ITEM_TYPE_LABELS] || type}
                        </Badge>
                        <span className="font-medium">{count}</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary/60 transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                暂无数据
              </p>
            )}
          </CardContent>
        </Card>

        {/* Recent Skills */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" />
              最近更新
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.recentSkills.length > 0 ? (
              <div className="space-y-3">
                {stats.recentSkills.map((skill) => (
                  <div
                    key={skill.id}
                    className="flex items-center gap-3 p-2 rounded-md hover:bg-accent cursor-pointer transition-colors"
                    onClick={() => onViewSkill(skill)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{skill.title || skill.name}</p>
                      <p className="text-xs text-muted-foreground">{timeAgo(skill.updatedAt)}</p>
                    </div>
                    <Badge className={cn('text-xs', SOURCE_PRODUCT_COLORS[skill.sourceProduct] || SOURCE_PRODUCT_COLORS.unknown)}>
                      {SOURCE_PRODUCT_LABELS[skill.sourceProduct] || skill.sourceProduct}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                暂无最近更新
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Last scan info */}
      {stats.lastScanTime && (
        <div className="text-center text-xs text-muted-foreground">
          上次扫描: {timeAgo(stats.lastScanTime)}
        </div>
      )}
    </div>
  )
}
