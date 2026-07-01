import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  X,
  Copy,
  FolderOpen,
  FileText,
  Clock,
  Tag,
  Wrench,
  GitBranch,
  User,
  Pencil,
  ExternalLink,
  FolderTree,
  Lock,
  Package,
  Database,
  Shield,
} from 'lucide-react'
import { cn, formatDate, truncate } from '@/lib/utils'
import {
  SOURCE_TYPE_LABELS,
  SOURCE_PRODUCT_LABELS,
  ITEM_TYPE_LABELS,
  SOURCE_PRODUCT_COLORS,
  type Skill,
} from '@/types'

interface SkillDetailProps {
  skill: Skill
  onClose: () => void
  onEdit: (skill: Skill) => void
  onToggle: (id: string) => void
}

export function SkillDetail({ skill, onClose, onEdit, onToggle }: SkillDetailProps) {
  const [copied, setCopied] = React.useState(false)

  const copyContent = () => {
    navigator.clipboard.writeText(skill.rawContent)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="slide-in fixed inset-y-0 right-0 z-50 w-full max-w-2xl border-l bg-background shadow-xl overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b px-6 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h2 className="text-xl font-bold truncate">{skill.title || skill.name}</h2>
              <Badge className={cn('text-xs', SOURCE_PRODUCT_COLORS[skill.sourceProduct] || SOURCE_PRODUCT_COLORS.unknown)}>
                {SOURCE_PRODUCT_LABELS[skill.sourceProduct] || skill.sourceProduct}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {ITEM_TYPE_LABELS[skill.itemType] || skill.itemType}
              </Badge>
              {skill.isFromCache && (
                <Badge variant="outline" className="text-xs gap-1">
                  <Database className="h-3 w-3" /> Cache
                </Badge>
              )}
              {!skill.isEditable && (
                <Badge variant="outline" className="text-xs gap-1 text-muted-foreground">
                  <Lock className="h-3 w-3" /> 只读
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{truncate(skill.description, 200)}</p>
          </div>
          <div className="flex items-center gap-2">
            {skill.isEditable && (
              <Button variant="outline" size="sm" onClick={() => onEdit(skill)} className="gap-1.5">
                <Pencil className="h-3.5 w-3.5" /> 编辑
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="px-6 py-4">
        {/* Status & Editability */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              {skill.enabled ? '✅ 已启用' : '⬜ 已禁用'}
            </span>
            {!skill.isEditable && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Shield className="h-3 w-3" />
                {skill.sourceType.includes('system') ? '系统 Skill' :
                 skill.isFromCache ? '缓存目录' :
                 skill.sourceType.includes('marketplace') ? 'Marketplace' : '只读'}
              </span>
            )}
          </div>
          <Switch checked={skill.enabled} onCheckedChange={() => onToggle(skill.id)} />
        </div>

        <Tabs defaultValue="content">
          <TabsList className="w-full">
            <TabsTrigger value="content" className="flex-1">内容</TabsTrigger>
            <TabsTrigger value="metadata" className="flex-1">元数据</TabsTrigger>
            <TabsTrigger value="files" className="flex-1">文件</TabsTrigger>
          </TabsList>

          <TabsContent value="content">
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={copyContent}
                className="absolute right-2 top-2 z-10 gap-1.5 text-xs"
              >
                <Copy className="h-3 w-3" />
                {copied ? '已复制!' : '复制'}
              </Button>
              <div className="markdown-content rounded-lg border bg-muted/30 p-4 max-h-[60vh] overflow-y-auto text-sm">
                <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed">
                  {skill.rawContent || 'No content available'}
                </pre>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="metadata">
            <div className="space-y-4">
              <MetaRow icon={Tag} label="来源类型" value={SOURCE_TYPE_LABELS[skill.sourceType] || skill.sourceType} />
              <MetaRow icon={Package} label="来源产品" value={SOURCE_PRODUCT_LABELS[skill.sourceProduct] || skill.sourceProduct} />
              <MetaRow icon={Tag} label="类型" value={ITEM_TYPE_LABELS[skill.itemType] || skill.itemType} />
              {skill.marketplace && <MetaRow icon={Package} label="Marketplace" value={skill.marketplace} />}
              {skill.parentPlugin && <MetaRow icon={Package} label="所属插件" value={skill.parentPlugin} />}
              <Separator />
              <MetaRow icon={Tag} label="Tags" value={skill.tags.length > 0 ? skill.tags.join(', ') : '-'} />
              <MetaRow icon={Wrench} label="Tools" value={skill.tools.length > 0 ? skill.tools.join(', ') : '-'} />
              <MetaRow icon={GitBranch} label="Dependencies" value={skill.dependencies.length > 0 ? skill.dependencies.join(', ') : '-'} />
              <MetaRow icon={User} label="Author" value={skill.author || '-'} />
              <MetaRow icon={FileText} label="Version" value={skill.version || '-'} />
              <Separator />
              <MetaRow icon={FolderOpen} label="Source Path" value={skill.sourcePath || '-'} />
              <MetaRow icon={FileText} label="Entry File" value={skill.entryFile || '-'} />
              <MetaRow icon={Database} label="来自缓存" value={skill.isFromCache ? '是' : '否'} />
              <MetaRow icon={Shield} label="可编辑" value={skill.isEditable ? '是' : '否'} />
              <MetaRow icon={Clock} label="Created" value={formatDate(skill.createdAt)} />
              <MetaRow icon={Clock} label="Updated" value={formatDate(skill.updatedAt)} />
              <MetaRow icon={Clock} label="Last Scanned" value={formatDate(skill.lastScannedAt)} />
            </div>
          </TabsContent>

          <TabsContent value="files">
            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="flex items-center gap-2 mb-3 text-sm font-medium">
                <FolderTree className="h-4 w-4" />
                File Structure
              </div>
              {skill.fileTree.length > 0 ? (
                <div className="space-y-1">
                  {skill.fileTree.map((file, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground py-0.5">
                      <FileText className="h-3.5 w-3.5 shrink-0" />
                      <span className="font-mono text-xs">{file}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No file structure available</p>
              )}
            </div>

            <div className="mt-4 p-3 rounded-lg border bg-muted/30">
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <ExternalLink className="h-3 w-3" />
                Open in terminal: <code className="font-mono bg-muted px-1.5 py-0.5 rounded">{skill.sourcePath}</code>
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

function MetaRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium break-all">{value}</p>
      </div>
    </div>
  )
}
