import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Upload,
  Github,
  FileText,
  FileArchive,
  FileJson,
  Download,
  Eye,
  Check,
  AlertCircle,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { api } from '@/services/api'
import { useToast } from '@/components/ui/toast'
import type { ImportPreview } from '@/types'

export function ImportPage() {
  const { addToast } = useToast()
  const [activeTab, setActiveTab] = React.useState('file')
  const [preview, setPreview] = React.useState<ImportPreview | null>(null)
  const [githubUrl, setGithubUrl] = React.useState('')
  const [savePath, setSavePath] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [confirming, setConfirming] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  // Load default save path
  React.useEffect(() => {
    api.getConfig().then(config => {
      setSavePath(config.defaultImportDir || '')
    }).catch(() => {})
  }, [])

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const ext = file.name.split('.').pop()?.toLowerCase()
    if (!['md', 'json', 'zip'].includes(ext || '')) {
      addToast({ title: 'Unsupported file type', description: 'Please upload .md, .json, or .zip files', variant: 'destructive' })
      return
    }

    try {
      setLoading(true)
      setPreview(null)
      const result = await api.uploadFile(file)
      setPreview(result)
      addToast({ title: 'File parsed successfully', variant: 'success' })
    } catch (err: any) {
      addToast({ title: 'Failed to parse file', description: err.message, variant: 'destructive' })
    } finally {
      setLoading(false)
      // Reset file input
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleGitHubImport = async () => {
    if (!githubUrl.trim()) {
      addToast({ title: 'Please enter a GitHub URL', variant: 'destructive' })
      return
    }

    try {
      setLoading(true)
      setPreview(null)
      const result = await api.importFromGitHub(githubUrl.trim())
      setPreview(result)
      addToast({ title: 'GitHub content fetched', variant: 'success' })
    } catch (err: any) {
      addToast({ title: 'GitHub import failed', description: err.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmImport = async () => {
    if (!preview) return

    try {
      setConfirming(true)
      const skill = await api.confirmImport(preview, savePath || undefined)
      addToast({ title: 'Skill imported successfully', description: skill.name, variant: 'success' })
      setPreview(null)
      setGithubUrl('')
    } catch (err: any) {
      addToast({ title: 'Import failed', description: err.message, variant: 'destructive' })
    } finally {
      setConfirming(false)
    }
  }

  const handleConfirmGitHubImport = async () => {
    if (!preview) return

    try {
      setConfirming(true)
      const skill = await api.confirmGitHubImport(preview, savePath || undefined)
      addToast({ title: 'Skill imported from GitHub', description: skill.name, variant: 'success' })
      setPreview(null)
      setGithubUrl('')
    } catch (err: any) {
      addToast({ title: 'Import failed', description: err.message, variant: 'destructive' })
    } finally {
      setConfirming(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 fade-in">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full">
          <TabsTrigger value="file" className="flex-1 gap-2">
            <Upload className="h-4 w-4" /> File Upload
          </TabsTrigger>
          <TabsTrigger value="github" className="flex-1 gap-2">
            <Github className="h-4 w-4" /> GitHub
          </TabsTrigger>
        </TabsList>

        <TabsContent value="file">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Upload Skill File</CardTitle>
              <CardDescription>
                Upload a .md, .json, or .zip file to import as a skill
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Upload zone */}
              <div
                className={cn(
                  'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
                  'hover:border-primary/50 hover:bg-accent/30',
                  loading && 'opacity-50 pointer-events-none',
                )}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".md,.json,.zip"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                {loading ? (
                  <Loader2 className="h-8 w-8 mx-auto animate-spin text-muted-foreground" />
                ) : (
                  <>
                    <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
                    <p className="text-sm font-medium">Click to upload or drag & drop</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Supports .md, .json, .zip files
                    </p>
                  </>
                )}
              </div>

              <div className="flex gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><FileText className="h-3 w-3" /> Markdown</span>
                <span className="flex items-center gap-1"><FileJson className="h-3 w-3" /> JSON</span>
                <span className="flex items-center gap-1"><FileArchive className="h-3 w-3" /> ZIP Archive</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="github">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Import from GitHub</CardTitle>
              <CardDescription>
                Enter a GitHub repository URL, subdirectory, or raw file link
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>GitHub URL</Label>
                <div className="flex gap-2">
                  <Input
                    value={githubUrl}
                    onChange={(e) => setGithubUrl(e.target.value)}
                    placeholder="https://github.com/owner/repo"
                    onKeyDown={(e) => e.key === 'Enter' && handleGitHubImport()}
                  />
                  <Button onClick={handleGitHubImport} disabled={loading} className="gap-2 shrink-0">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                    Fetch
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Supports: repo URL, repo/tree/branch/path, raw.githubusercontent.com links
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Preview */}
      {preview && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Import Preview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Name</p>
                <p className="text-sm font-medium">{preview.name}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Source</p>
                <Badge className={cn('text-xs', preview.sourceType === 'github' ? 'bg-gray-500/15 text-gray-600 dark:text-gray-400' : 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400')}>
                  {preview.sourceType}
                </Badge>
              </div>
            </div>

            <div>
              <p className="text-xs text-muted-foreground">Description</p>
              <p className="text-sm">{preview.description || '-'}</p>
            </div>

            <div>
              <p className="text-xs text-muted-foreground mb-1">Files ({preview.files.length})</p>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {preview.files.map((file, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <FileText className="h-3 w-3" />
                    <span className="font-mono">{file.name}</span>
                    <span className="ml-auto">{(file.content.length / 1024).toFixed(1)}KB</span>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>Save Path</Label>
              <Input
                value={savePath}
                onChange={(e) => setSavePath(e.target.value)}
                placeholder="Default save directory"
              />
              <p className="text-xs text-muted-foreground">
                Skill will be saved to: {savePath}/{preview.name}/SKILL.md
              </p>
            </div>

            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setPreview(null)}>Cancel</Button>
              <Button
                onClick={activeTab === 'github' ? handleConfirmGitHubImport : handleConfirmImport}
                disabled={confirming}
                className="gap-2"
              >
                {confirming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Confirm Import
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
