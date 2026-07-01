import React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Search, Moon, Sun, RotateCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface HeaderProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  onRescan: () => void
  isScanning: boolean
}

export function Header({ searchQuery, onSearchChange, onRescan, isScanning }: HeaderProps) {
  const [dark, setDark] = React.useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  const pageTitles: Record<string, string> = {
    '/': 'Dashboard',
    '/skills': 'Skills',
    '/sources': 'Sources',
    '/import': 'Import',
    '/create': 'Create',
    '/settings': 'Settings',
  }

  const title = pageTitles[location.pathname] || 'SkillCenter'

  const toggleTheme = () => {
    setDark(!dark)
    document.documentElement.classList.toggle('dark')
  }

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6">
      <h1 className="text-lg font-semibold">{title}</h1>

      <div className="flex-1" />

      <div className="relative w-72">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search skills..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 h-9"
        />
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={onRescan}
        disabled={isScanning}
        className="gap-2"
      >
        <RotateCw className={cn('h-4 w-4', isScanning && 'animate-spin')} />
        Rescan
      </Button>

      <Button variant="ghost" size="icon" onClick={toggleTheme}>
        {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </Button>
    </header>
  )
}
