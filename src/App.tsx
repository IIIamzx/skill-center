import React from 'react'
import { Routes, Route, useNavigate } from 'react-router-dom'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { ToastProvider } from '@/components/ui/toast'
import { DashboardPage } from '@/pages/Dashboard'
import { SkillsPage } from '@/pages/Skills'
import { SourcesPage } from '@/pages/Sources'
import { ImportPage } from '@/pages/Import'
import { CreatePage } from '@/pages/Create'
import { SettingsPage } from '@/pages/Settings'
import { api } from '@/services/api'
import { useToast } from '@/components/ui/toast'
import type { Skill } from '@/types'
import { cn } from '@/lib/utils'

function AppContent() {
  const { addToast } = useToast()
  const navigate = useNavigate()
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState('')
  const [isScanning, setIsScanning] = React.useState(false)
  const [viewSkill, setViewSkill] = React.useState<Skill | null>(null)

  const handleRescan = async () => {
    try {
      setIsScanning(true)
      const result = await api.triggerScan()
      addToast({
        title: 'Scan complete',
        description: `Found ${result.totalSkillsFound} skills in ${result.duration}ms`,
        variant: 'success',
      })
    } catch (err: any) {
      addToast({ title: 'Scan failed', description: err.message, variant: 'destructive' })
    } finally {
      setIsScanning(false)
    }
  }

  const handleViewSkill = (skill: Skill) => {
    setViewSkill(skill)
    navigate('/skills')
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />

      <div className={cn('transition-all duration-300', sidebarCollapsed ? 'ml-16' : 'ml-60')}>
        <Header
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onRescan={handleRescan}
          isScanning={isScanning}
        />

        <main className="p-6">
          <Routes>
            <Route path="/" element={<DashboardPage onNavigate={navigate} onViewSkill={handleViewSkill} />} />
            <Route path="/skills" element={<SkillsPage searchQuery={searchQuery} />} />
            <Route path="/sources" element={<SourcesPage />} />
            <Route path="/import" element={<ImportPage />} />
            <Route path="/create" element={<CreatePage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  )
}
