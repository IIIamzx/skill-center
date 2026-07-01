import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Settings as SettingsIcon,
  FolderOpen,
  Plus,
  Trash2,
  Download,
  Upload,
  RefreshCw,
  FileText,
  Search,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { api } from '@/services/api'
import { useToast } from '@/components/ui/toast'
import { SOURCE_PRODUCT_LABELS, type SkillCenterConfig, type ScanDirectory, type SourceType } from '@/types'

export function SettingsPage() {
  const { addToast } = useToast()
  const [config, setConfig] = React.useState<SkillCenterConfig | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [newDirPath, setNewDirPath] = React.useState('')
  const [newDirLabel, setNewDirLabel] = React.useState('')
  const [newDirType, setNewDirType] = React.useState<SourceType>('unknown')
  const [importData, setImportData] = React.useState('')
  const [logs, setLogs] = React.useState('')
  const [logDir, setLogDir] = React.useState('')

  React.useEffect(() => {
    loadConfig()
    loadLogs()
  }, [])

  const loadConfig = async () => {
    try {
      setLoading(true)
      const data = await api.getConfig()
      setConfig(data)
    } catch (err: any) {
      addToast({ title: '加载配置失败', description: err.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const loadLogs = async () => {
    try {
      const data = await api.getLogs()
      setLogs(data.logs || '')
      setLogDir(data.logDir || '')
    } catch {
      // ignore
    }
  }

  const updateConfigField = async (field: string, value: any) => {
    try {
      const updated = await api.updateConfig({ [field]: value })
      setConfig(updated)
    } catch (err: any) {
      addToast({ title: '更新失败', description: err.message, variant: 'destructive' })
    }
  }

  const addDirectory = async () => {
    if (!newDirPath.trim()) return
    try {
      await api.addDirectory(newDirPath.trim(), newDirLabel.trim(), newDirType)
      await loadConfig()
      setNewDirPath('')
      setNewDirLabel('')
      addToast({ title: '已添加目录', variant: 'success' })
    } catch (err: any) {
      addToast({ title: '添加失败', description: err.message, variant: 'destructive' })
    }
  }

  const removeDirectory = async (dirPath: string) => {
    try {
      await api.removeDirectory(dirPath)
      await loadConfig()
      addToast({ title: '已移除目录', variant: 'success' })
    } catch (err: any) {
      addToast({ title: '移除失败', description: err.message, variant: 'destructive' })
    }
  }

  const handleExport = async () => {
    try {
      const data = await api.exportConfig()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `skillcenter-backup-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      addToast({ title: '配置已导出', variant: 'success' })
    } catch (err: any) {
      addToast({ title: '导出失败', description: err.message, variant: 'destructive' })
    }
  }

  const handleImport = async () => {
    if (!importData.trim()) return
    try {
      const data = JSON.parse(importData)
      await api.importConfig(data)
      await loadConfig()
      setImportData('')
      addToast({ title: '配置已导入', variant: 'success' })
    } catch (err: any) {
      addToast({ title: '导入失败', description: err.message, variant: 'destructive' })
    }
  }

  if (loading || !config) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">加载中...</div>
      </div>
    )
  }

  const customDirs = config.scanDirectories.filter(d => !d.isDefault)
  const defaultDirs = config.scanDirectories.filter(d => d.isDefault)

  return (
    <div className="max-w-3xl mx-auto space-y-6 fade-in">
      {/* Scan Directories */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FolderOpen className="h-4 w-4" />
            扫描目录
          </CardTitle>
          <CardDescription>
            SkillCenter 扫描这些目录以发现 Skill 和插件
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Default directories */}
          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">默认目录</Label>
            <div className="space-y-2">
              {defaultDirs.map((dir) => (
                <div key={dir.path} className="flex items-center gap-3 p-2 rounded-md bg-muted/30">
                  <FolderOpen className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">{dir.label}</p>
                    <p className="text-xs text-muted-foreground font-mono truncate">{dir.path}</p>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {SOURCE_PRODUCT_LABELS[dir.sourceProduct as keyof typeof SOURCE_PRODUCT_LABELS] || dir.sourceProduct}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {dir.scanCategory}
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Custom directories */}
          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">自定义目录</Label>
            {customDirs.length > 0 ? (
              <div className="space-y-2 mb-3">
                {customDirs.map((dir) => (
                  <div key={dir.path} className="flex items-center gap-3 p-2 rounded-md border">
                    <FolderOpen className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">{dir.label}</p>
                      <p className="text-xs text-muted-foreground font-mono truncate">{dir.path}</p>
                    </div>
                    <Badge variant="outline" className="text-xs">{dir.sourceType}</Badge>
                    <Button variant="ghost" size="icon" onClick={() => removeDirectory(dir.path)} className="h-8 w-8">
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground mb-3">暂无自定义目录</p>
            )}

            {/* Add new directory */}
            <div className="flex gap-2 items-end">
              <div className="flex-1 space-y-1">
                <Label className="text-xs">路径</Label>
                <Input
                  value={newDirPath}
                  onChange={(e) => setNewDirPath(e.target.value)}
                  placeholder="/path/to/skills"
                />
              </div>
              <div className="w-36 space-y-1">
                <Label className="text-xs">标签</Label>
                <Input
                  value={newDirLabel}
                  onChange={(e) => setNewDirLabel(e.target.value)}
                  placeholder="My Skills"
                />
              </div>
              <div className="w-28 space-y-1">
                <Label className="text-xs">类型</Label>
                <select
                  value={newDirType}
                  onChange={(e) => setNewDirType(e.target.value as SourceType)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="unknown">未知</option>
                  <option value="claude-personal-skill">Claude</option>
                  <option value="codex-user-skill">Codex</option>
                  <option value="codex-agents-skill">Agents</option>
                </select>
              </div>
              <Button onClick={addDirectory} size="icon" className="shrink-0">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* General Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <SettingsIcon className="h-4 w-4" />
            通用设置
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>默认导入保存目录</Label>
            <Input
              value={config.defaultImportDir}
              onChange={(e) => updateConfigField('defaultImportDir', e.target.value)}
              placeholder="~/.skillcenter/skills"
            />
            <p className="text-xs text-muted-foreground">
              导入和创建的 Skill 默认保存到此目录
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>扫描隐藏目录</Label>
              <p className="text-xs text-muted-foreground">包含以 . 开头的目录</p>
            </div>
            <Switch
              checked={config.scanHiddenDirs}
              onCheckedChange={(v) => updateConfigField('scanHiddenDirs', v)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>读取插件目录</Label>
              <p className="text-xs text-muted-foreground">扫描插件目录获取 Skill 元数据</p>
            </div>
            <Switch
              checked={config.readPluginDirs}
              onCheckedChange={(v) => updateConfigField('readPluginDirs', v)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>递归扫描工作区嵌套 Skill</Label>
              <p className="text-xs text-muted-foreground">扫描 &lt;workspace&gt;/**/.claude/skills（可能较慢）</p>
            </div>
            <Switch
              checked={config.scanNestedWorkspaceSkills}
              onCheckedChange={(v) => updateConfigField('scanNestedWorkspaceSkills', v)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>GitHub 导入</Label>
              <p className="text-xs text-muted-foreground">启用从 GitHub 仓库导入 Skill</p>
            </div>
            <Switch
              checked={config.githubImportEnabled}
              onCheckedChange={(v) => updateConfigField('githubImportEnabled', v)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Logs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            运行日志
          </CardTitle>
          <CardDescription>
            最近的服务器日志输出（最近 200 行）
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              日志目录: <code className="font-mono bg-muted px-1.5 py-0.5 rounded">{logDir}</code>
            </p>
            <Button variant="outline" size="sm" onClick={loadLogs} className="gap-1.5">
              <RefreshCw className="h-3 w-3" /> 刷新
            </Button>
          </div>
          <div className="max-h-64 overflow-y-auto rounded-md border bg-muted/30 p-3">
            {logs ? (
              <pre className="text-xs font-mono whitespace-pre-wrap leading-relaxed text-muted-foreground">
                {logs}
              </pre>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-4">暂无日志</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Data Management */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">数据管理</CardTitle>
          <CardDescription>备份和恢复 SkillCenter 配置</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleExport} className="gap-2">
              <Download className="h-4 w-4" /> 导出配置
            </Button>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>导入配置</Label>
            <Textarea
              value={importData}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setImportData(e.target.value)}
              placeholder="粘贴导出的 JSON 配置..."
              rows={4}
              className="font-mono text-xs"
            />
            <Button variant="outline" onClick={handleImport} disabled={!importData.trim()} className="gap-2">
              <Upload className="h-4 w-4" /> 导入配置
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Config file location */}
      <div className="text-center text-xs text-muted-foreground pb-8">
        配置文件: <code className="font-mono bg-muted px-1.5 py-0.5 rounded">~/.skillcenter/config.json</code>
      </div>
    </div>
  )
}
