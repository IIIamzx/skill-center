import React from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import {
  Eye,
  Pencil,
  Trash2,
  FolderOpen,
  FileText,
  Clock,
  Lock,
  Package,
  Database,
} from 'lucide-react'
import { cn, timeAgo, truncate } from '@/lib/utils'
import {
  SOURCE_TYPE_LABELS,
  SOURCE_PRODUCT_LABELS,
  ITEM_TYPE_LABELS,
  SOURCE_PRODUCT_COLORS,
  type Skill,
} from '@/types'

interface SkillCardProps {
  skill: Skill
  onView: (skill: Skill) => void
  onEdit: (skill: Skill) => void
  onToggle: (id: string) => void
  onDelete: (skill: Skill) => void
}

export function SkillCard({ skill, onView, onEdit, onToggle, onDelete }: SkillCardProps) {
  return (
    <Card className={cn(
      'group transition-all hover:shadow-md hover:border-primary/20',
      !skill.enabled && 'opacity-60',
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base truncate">{skill.title || skill.name}</h3>
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {truncate(skill.description, 120)}
            </p>
          </div>
          <Switch
            checked={skill.enabled}
            onCheckedChange={() => onToggle(skill.id)}
          />
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex flex-wrap gap-1.5 mb-3">
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
          {skill.tags.slice(0, 2).map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
          {skill.tags.length > 2 && (
            <Badge variant="outline" className="text-xs">+{skill.tags.length - 2}</Badge>
          )}
        </div>

        <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3 flex-wrap">
          <span className="flex items-center gap-1" title={skill.sourcePath}>
            <FolderOpen className="h-3 w-3" />
            {truncate(skill.sourcePath, 35)}
          </span>
          <span className="flex items-center gap-1">
            <FileText className="h-3 w-3" />
            {skill.entryFile}
          </span>
          {skill.marketplace && (
            <span className="flex items-center gap-1">
              <Package className="h-3 w-3" />
              {skill.marketplace}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {timeAgo(skill.updatedAt)}
          </span>
        </div>

        <div className="flex items-center gap-2 pt-2 border-t">
          <Button variant="ghost" size="sm" onClick={() => onView(skill)} className="gap-1.5 text-xs">
            <Eye className="h-3.5 w-3.5" /> 查看
          </Button>
          {skill.isEditable && (
            <Button variant="ghost" size="sm" onClick={() => onEdit(skill)} className="gap-1.5 text-xs">
              <Pencil className="h-3.5 w-3.5" /> 编辑
            </Button>
          )}
          <div className="flex-1" />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(skill)}
            className="gap-1.5 text-xs text-destructive hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
