import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  PlusCircle,
  X,
  FileText,
  Loader2,
  Sparkles,
} from 'lucide-react'
import { api } from '@/services/api'
import { useToast } from '@/components/ui/toast'
import type { SkillFormData } from '@/types'

const SKILL_TEMPLATE = `# {{TITLE}}

{{DESCRIPTION}}

## 适用场景

Describe when this skill should be activated.

## 触发规则

Define the conditions that trigger this skill.

## 使用说明

Step-by-step instructions for using this skill.

## 输出格式

Describe the expected output format.
`

const defaultForm: SkillFormData = {
  name: '',
  title: '',
  description: '',
  tags: [],
  scenario: '',
  triggerRules: '',
  instructions: '',
  tools: [],
  dependencies: [],
  outputFormat: '',
  content: '',
  savePath: '',
  author: '',
  version: '1.0.0',
}

export function CreatePage() {
  const { addToast } = useToast()
  const [form, setForm] = React.useState<SkillFormData>({ ...defaultForm })
  const [tagInput, setTagInput] = React.useState('')
  const [toolInput, setToolInput] = React.useState('')
  const [depInput, setDepInput] = React.useState('')
  const [saving, setSaving] = React.useState(false)
  const [showPreview, setShowPreview] = React.useState(false)

  React.useEffect(() => {
    api.getConfig().then(config => {
      setForm(prev => ({ ...prev, savePath: config.defaultImportDir || '' }))
    }).catch(() => {})
  }, [])

  const addTag = () => {
    if (tagInput.trim() && !form.tags.includes(tagInput.trim())) {
      setForm({ ...form, tags: [...form.tags, tagInput.trim()] })
      setTagInput('')
    }
  }

  const addTool = () => {
    if (toolInput.trim() && !form.tools.includes(toolInput.trim())) {
      setForm({ ...form, tools: [...form.tools, toolInput.trim()] })
      setToolInput('')
    }
  }

  const addDep = () => {
    if (depInput.trim() && !form.dependencies.includes(depInput.trim())) {
      setForm({ ...form, dependencies: [...form.dependencies, depInput.trim()] })
      setDepInput('')
    }
  }

  const generateContent = () => {
    let content = SKILL_TEMPLATE
      .replace('{{TITLE}}', form.title || form.name || 'New Skill')
      .replace('{{DESCRIPTION}}', form.description || '')
    return content
  }

  const handleSave = async () => {
    if (!form.name.trim()) {
      addToast({ title: 'Skill name is required', variant: 'destructive' })
      return
    }

    try {
      setSaving(true)
      const data = {
        ...form,
        content: form.content || generateContent(),
      }
      const skill = await api.createSkill(data)
      addToast({ title: 'Skill created', description: skill.name, variant: 'success' })
      setForm({ ...defaultForm, savePath: form.savePath })
    } catch (err: any) {
      addToast({ title: 'Failed to create skill', description: err.message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const previewContent = () => {
    const content = form.content || generateContent()
    // Build frontmatter
    const fm = [
      '---',
      `name: ${form.name || 'untitled'}`,
      form.title ? `title: ${form.title}` : '',
      form.description ? `description: ${form.description}` : '',
      form.tags.length > 0 ? `tags: [${form.tags.map(t => `"${t}"`).join(', ')}]` : '',
      form.tools.length > 0 ? `tools: [${form.tools.map(t => `"${t}"`).join(', ')}]` : '',
      form.dependencies.length > 0 ? `dependencies: [${form.dependencies.map(d => `"${d}"`).join(', ')}]` : '',
      `version: "${form.version || '1.0.0'}"`,
      form.author ? `author: "${form.author}"` : '',
      `scenario: "${form.scenario || ''}"`,
      `triggerRules: "${form.triggerRules || ''}"`,
      `outputFormat: "${form.outputFormat || ''}"`,
      '---',
      '',
      content,
    ].filter(Boolean).join('\n')

    return fm
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 fade-in">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <PlusCircle className="h-5 w-5" />
            Create New Skill
          </CardTitle>
          <CardDescription>
            Fill in the form to create a new skill with a SKILL.md file
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Skill Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value, title: form.title || e.target.value })}
                placeholder="my-skill"
              />
            </div>
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="My Skill"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="What does this skill do?"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Author</Label>
              <Input
                value={form.author}
                onChange={(e) => setForm({ ...form, author: e.target.value })}
                placeholder="Author name"
              />
            </div>
            <div className="space-y-2">
              <Label>Version</Label>
              <Input
                value={form.version}
                onChange={(e) => setForm({ ...form, version: e.target.value })}
                placeholder="1.0.0"
              />
            </div>
          </div>

          <Separator />

          {/* Tags */}
          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                placeholder="Add tag..."
              />
              <Button variant="outline" size="icon" onClick={addTag}>
                <PlusCircle className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {form.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="gap-1">
                  {tag}
                  <button onClick={() => setForm({ ...form, tags: form.tags.filter(t => t !== tag) })}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          {/* Tools */}
          <div className="space-y-2">
            <Label>Tools</Label>
            <div className="flex gap-2">
              <Input
                value={toolInput}
                onChange={(e) => setToolInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTool())}
                placeholder="Add tool dependency..."
              />
              <Button variant="outline" size="icon" onClick={addTool}>
                <PlusCircle className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {form.tools.map((tool) => (
                <Badge key={tool} variant="outline" className="gap-1">
                  {tool}
                  <button onClick={() => setForm({ ...form, tools: form.tools.filter(t => t !== tool) })}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          <Separator />

          {/* Skill details */}
          <div className="space-y-2">
            <Label>适用场景 (Scenario)</Label>
            <Textarea
              value={form.scenario}
              onChange={(e) => setForm({ ...form, scenario: e.target.value })}
              placeholder="When should this skill be activated?"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>触发规则 (Trigger Rules)</Label>
            <Textarea
              value={form.triggerRules}
              onChange={(e) => setForm({ ...form, triggerRules: e.target.value })}
              placeholder="What conditions trigger this skill?"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>使用说明 (Instructions)</Label>
            <Textarea
              value={form.instructions}
              onChange={(e) => setForm({ ...form, instructions: e.target.value })}
              placeholder="How to use this skill?"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>输出格式 (Output Format)</Label>
            <Textarea
              value={form.outputFormat}
              onChange={(e) => setForm({ ...form, outputFormat: e.target.value })}
              placeholder="What format should the output follow?"
              rows={2}
            />
          </div>

          <Separator />

          {/* SKILL.md Content */}
          <div className="space-y-2">
            <Label>SKILL.md Content (Optional - auto-generated if empty)</Label>
            <Textarea
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              placeholder="Leave empty to auto-generate from the fields above, or write custom content..."
              rows={8}
              className="font-mono text-sm"
            />
          </div>

          {/* Save Path */}
          <div className="space-y-2">
            <Label>Save Path</Label>
            <Input
              value={form.savePath}
              onChange={(e) => setForm({ ...form, savePath: e.target.value })}
              placeholder="Directory to save the skill"
            />
            <p className="text-xs text-muted-foreground">
              Skill will be saved to: {form.savePath}/{form.name || 'untitled'}/SKILL.md
            </p>
          </div>

          <Separator />

          {/* Actions */}
          <div className="flex items-center gap-3 justify-end">
            <Button
              variant="outline"
              onClick={() => setShowPreview(!showPreview)}
              className="gap-2"
            >
              <FileText className="h-4 w-4" />
              {showPreview ? 'Hide Preview' : 'Preview SKILL.md'}
            </Button>
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Create Skill
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      {showPreview && (
        <Card className="fade-in">
          <CardHeader>
            <CardTitle className="text-base">SKILL.md Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap font-mono text-sm bg-muted/30 p-4 rounded-lg max-h-96 overflow-y-auto">
              {previewContent()}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
