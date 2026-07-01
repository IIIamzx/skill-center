import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { X, Plus, AlertTriangle } from 'lucide-react'
import { SOURCE_TYPE_LABELS, SOURCE_PRODUCT_LABELS, type Skill } from '@/types'

interface SkillEditDialogProps {
  skill: Skill | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (id: string, data: Partial<Skill>) => void
}

export function SkillEditDialog({ skill, open, onOpenChange, onSave }: SkillEditDialogProps) {
  const [form, setForm] = React.useState({
    title: '',
    description: '',
    tags: [] as string[],
    tools: [] as string[],
    version: '',
    author: '',
    rawContent: '',
  })
  const [tagInput, setTagInput] = React.useState('')
  const [toolInput, setToolInput] = React.useState('')

  React.useEffect(() => {
    if (skill) {
      setForm({
        title: skill.title || '',
        description: skill.description || '',
        tags: skill.tags || [],
        tools: skill.tools || [],
        version: skill.version || '',
        author: skill.author || '',
        rawContent: skill.rawContent || '',
      })
    }
  }, [skill])

  if (!skill) return null

  const handleSave = () => {
    onSave(skill!.id, form)
    onOpenChange(false)
  }

  const addTag = () => {
    if (tagInput.trim() && !form.tags.includes(tagInput.trim())) {
      setForm({ ...form, tags: [...form.tags, tagInput.trim()] })
      setTagInput('')
    }
  }

  const removeTag = (tag: string) => {
    setForm({ ...form, tags: form.tags.filter(t => t !== tag) })
  }

  const addTool = () => {
    if (toolInput.trim() && !form.tools.includes(toolInput.trim())) {
      setForm({ ...form, tools: [...form.tools, toolInput.trim()] })
      setToolInput('')
    }
  }

  const removeTool = (tool: string) => {
    setForm({ ...form, tools: form.tools.filter(t => t !== tool) })
  }

  const isProjectSkill = skill.sourceType === 'claude-project-skill'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>编辑 Skill: {skill.name}</DialogTitle>
        </DialogHeader>

        {isProjectSkill && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 text-sm">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>此 Skill 属于项目文件，修改将直接影响项目代码。</span>
          </div>
        )}

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>标题</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>版本</Label>
              <Input
                value={form.version}
                onChange={(e) => setForm({ ...form, version: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>描述</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>作者</Label>
            <Input
              value={form.author}
              onChange={(e) => setForm({ ...form, author: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                placeholder="添加 tag..."
              />
              <Button variant="outline" size="icon" onClick={addTag}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {form.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="gap-1">
                  {tag}
                  <button onClick={() => removeTag(tag)} className="hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Tools</Label>
            <div className="flex gap-2">
              <Input
                value={toolInput}
                onChange={(e) => setToolInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTool())}
                placeholder="添加 tool..."
              />
              <Button variant="outline" size="icon" onClick={addTool}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {form.tools.map((tool) => (
                <Badge key={tool} variant="outline" className="gap-1">
                  {tool}
                  <button onClick={() => removeTool(tool)} className="hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>SKILL.md 内容</Label>
            <Textarea
              value={form.rawContent}
              onChange={(e) => setForm({ ...form, rawContent: e.target.value })}
              rows={12}
              className="font-mono text-sm"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button onClick={handleSave}>保存修改</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
