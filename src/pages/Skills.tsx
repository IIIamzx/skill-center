import React from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectOption } from '@/components/ui/select'
import { SkillCard } from '@/components/skill/SkillCard'
import { SkillDetail } from '@/components/skill/SkillDetail'
import { SkillEditDialog } from '@/components/skill/SkillEditDialog'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Boxes, LayoutGrid, List, Search, SlidersHorizontal, Lock } from 'lucide-react'
import { api } from '@/services/api'
import { useToast } from '@/components/ui/toast'
import { cn, timeAgo, truncate } from '@/lib/utils'
import {
  SOURCE_TYPE_LABELS,
  SOURCE_PRODUCT_LABELS,
  ITEM_TYPE_LABELS,
  SOURCE_PRODUCT_COLORS,
  type Skill,
  type ViewMode,
  type SkillFilter,
  type SourceType,
  type SourceProduct,
  type ItemType,
} from '@/types'

interface SkillsPageProps {
  searchQuery: string
}

export function SkillsPage({ searchQuery }: SkillsPageProps) {
  const { addToast } = useToast()
  const [skills, setSkills] = React.useState<Skill[]>([])
  const [loading, setLoading] = React.useState(true)
  const [viewMode, setViewMode] = React.useState<ViewMode>('card')
  const [selectedSkill, setSelectedSkill] = React.useState<Skill | null>(null)
  const [editSkill, setEditSkill] = React.useState<Skill | null>(null)
  const [deleteSkill, setDeleteSkill] = React.useState<Skill | null>(null)
  const [deleteFiles, setDeleteFiles] = React.useState(false)
  const [filter, setFilter] = React.useState<Partial<SkillFilter>>({
    sourceProduct: 'all',
    itemType: 'all',
    enabled: 'all',
    sortField: 'updatedAt',
    sortOrder: 'desc',
  })

  React.useEffect(() => {
    loadSkills()
  }, [searchQuery, filter])

  const loadSkills = async () => {
    try {
      setLoading(true)
      const params: Record<string, string> = { search: searchQuery }
      if (filter.sourceProduct && filter.sourceProduct !== 'all') params.sourceProduct = filter.sourceProduct
      if (filter.itemType && filter.itemType !== 'all') params.itemType = filter.itemType
      if (filter.enabled && filter.enabled !== 'all') params.enabled = filter.enabled
      if (filter.sortField) params.sortField = filter.sortField
      if (filter.sortOrder) params.sortOrder = filter.sortOrder
      const data = await api.getSkills(params)
      setSkills(data)
    } catch (err: any) {
      addToast({ title: '加载失败', description: err.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const handleToggle = async (id: string) => {
    try {
      const updated = await api.toggleSkill(id)
      setSkills(prev => prev.map(s => s.id === id ? updated : s))
      if (selectedSkill?.id === id) setSelectedSkill(updated)
      addToast({ title: `${updated.enabled ? '已启用' : '已禁用'}: ${updated.name}`, variant: 'success' })
    } catch (err: any) {
      addToast({ title: '操作失败', description: err.message, variant: 'destructive' })
    }
  }

  const handleEditSave = async (id: string, data: Partial<Skill>) => {
    try {
      const updated = await api.updateSkill(id, data)
      if (data.rawContent) {
        await api.saveSkillContent(id, data.rawContent)
      }
      setSkills(prev => prev.map(s => s.id === id ? updated : s))
      if (selectedSkill?.id === id) setSelectedSkill(updated)
      addToast({ title: '已保存修改', variant: 'success' })
    } catch (err: any) {
      addToast({ title: '保存失败', description: err.message, variant: 'destructive' })
    }
  }

  const handleDelete = async () => {
    if (!deleteSkill) return
    try {
      await api.deleteSkill(deleteSkill.id, deleteFiles)
      setSkills(prev => prev.filter(s => s.id !== deleteSkill.id))
      if (selectedSkill?.id === deleteSkill.id) setSelectedSkill(null)
      addToast({ title: '已删除', variant: 'success' })
      setDeleteSkill(null)
      setDeleteFiles(false)
    } catch (err: any) {
      addToast({ title: '删除失败', description: err.message, variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-4 fade-in">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center border rounded-md">
          <Button
            variant={viewMode === 'card' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('card')}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>

        <Select
          value={filter.sourceProduct || 'all'}
          onValueChange={(v) => setFilter({ ...filter, sourceProduct: v as SourceProduct | 'all' })}
          className="w-36"
        >
          <SelectOption value="all">全部产品</SelectOption>
          <SelectOption value="claude">Claude</SelectOption>
          <SelectOption value="codex">Codex</SelectOption>
          <SelectOption value="agents">Agents</SelectOption>
          <SelectOption value="uploaded">本地上传</SelectOption>
          <SelectOption value="github">GitHub</SelectOption>
        </Select>

        <Select
          value={filter.itemType || 'all'}
          onValueChange={(v) => setFilter({ ...filter, itemType: v as ItemType | 'all' })}
          className="w-36"
        >
          <SelectOption value="all">全部类型</SelectOption>
          <SelectOption value="skill">Skill</SelectOption>
          <SelectOption value="plugin">插件</SelectOption>
          <SelectOption value="plugin-skill">插件 Skill</SelectOption>
          <SelectOption value="marketplace">Marketplace</SelectOption>
        </Select>

        <Select
          value={filter.enabled || 'all'}
          onValueChange={(v) => setFilter({ ...filter, enabled: v as any })}
          className="w-32"
        >
          <SelectOption value="all">全部状态</SelectOption>
          <SelectOption value="enabled">已启用</SelectOption>
          <SelectOption value="disabled">已禁用</SelectOption>
        </Select>

        <Select
          value={`${filter.sortField}-${filter.sortOrder}`}
          onValueChange={(v) => {
            const [field, order] = v.split('-')
            setFilter({ ...filter, sortField: field as any, sortOrder: order as any })
          }}
          className="w-40"
        >
          <SelectOption value="updatedAt-desc">最近更新</SelectOption>
          <SelectOption value="updatedAt-asc">最早更新</SelectOption>
          <SelectOption value="name-asc">名称 A-Z</SelectOption>
          <SelectOption value="name-desc">名称 Z-A</SelectOption>
          <SelectOption value="createdAt-desc">最新创建</SelectOption>
          <SelectOption value="createdAt-asc">最早创建</SelectOption>
        </Select>

        <div className="flex-1" />

        <span className="text-sm text-muted-foreground">{skills.length} 项</span>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse text-muted-foreground">加载中...</div>
        </div>
      ) : skills.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
          <Boxes className="h-12 w-12 mb-4 opacity-30" />
          <p className="text-lg font-medium">未找到 Skill</p>
          <p className="text-sm mt-1">
            {searchQuery ? '尝试不同的搜索关键词' : '点击 "重新扫描" 发现本地 Skill'}
          </p>
        </div>
      ) : viewMode === 'card' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {skills.map((skill) => (
            <SkillCard
              key={skill.id}
              skill={skill}
              onView={setSelectedSkill}
              onEdit={setEditSkill}
              onToggle={handleToggle}
              onDelete={setDeleteSkill}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {skills.map((skill) => (
            <div
              key={skill.id}
              className={cn(
                'flex items-center gap-4 p-3 rounded-lg border hover:bg-accent/50 cursor-pointer transition-colors',
                !skill.enabled && 'opacity-60',
              )}
              onClick={() => setSelectedSkill(skill)}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{skill.title || skill.name}</span>
                  <Badge className={cn('text-xs', SOURCE_PRODUCT_COLORS[skill.sourceProduct] || SOURCE_PRODUCT_COLORS.unknown)}>
                    {SOURCE_PRODUCT_LABELS[skill.sourceProduct] || skill.sourceProduct}
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    {ITEM_TYPE_LABELS[skill.itemType] || skill.itemType}
                  </Badge>
                  {!skill.isEditable && (
                    <Lock className="h-3 w-3 text-muted-foreground" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {truncate(skill.description, 100)}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {skill.tags.slice(0, 2).map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                ))}
                <span className="text-xs text-muted-foreground">{timeAgo(skill.updatedAt)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Panel */}
      {selectedSkill && (
        <SkillDetail
          skill={selectedSkill}
          onClose={() => setSelectedSkill(null)}
          onEdit={(s) => { setSelectedSkill(null); setEditSkill(s) }}
          onToggle={(id) => { handleToggle(id) }}
        />
      )}

      {/* Edit Dialog */}
      <SkillEditDialog
        skill={editSkill}
        open={!!editSkill}
        onOpenChange={(open) => !open && setEditSkill(null)}
        onSave={handleEditSave}
      />

      {/* Delete Confirmation */}
      <Dialog open={!!deleteSkill} onOpenChange={(open) => !open && setDeleteSkill(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>删除确认</DialogTitle>
            <DialogDescription>
              确定要从 SkillCenter 中移除 <strong>{deleteSkill?.name}</strong> 吗？
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            {deleteSkill?.isEditable ? (
              <label className="flex items-center gap-3 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={deleteFiles}
                  onChange={(e) => setDeleteFiles(e.target.checked)}
                  className="rounded border-input"
                />
                <span className="text-destructive font-medium">
                  同时删除本地文件: {deleteSkill?.sourcePath}
                </span>
              </label>
            ) : (
              <p className="text-sm text-muted-foreground">
                此 Skill 来自 {deleteSkill?.isFromCache ? '缓存目录' : deleteSkill?.sourceType.includes('system') ? '系统目录' : '只读目录'}，仅移除索引记录。
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              {deleteFiles
                ? '⚠️ 这将永久删除磁盘上的 Skill 文件。'
                : '仅移除 SkillCenter 索引记录，原始文件保持不变。'}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteSkill(null)}>取消</Button>
            <Button variant="destructive" onClick={handleDelete}>删除</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
