import * as React from 'react'
import { cn } from '@/lib/utils'

interface SelectProps {
  value: string
  onValueChange: (value: string) => void
  children: React.ReactNode
  className?: string
}

interface SelectOptionProps {
  value: string
  children: React.ReactNode
}

function Select({ value, onValueChange, children, className }: SelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
      className={cn(
        'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
    >
      {children}
    </select>
  )
}

function SelectOption({ value, children }: SelectOptionProps) {
  return <option value={value}>{children}</option>
}

function SelectGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return <optgroup label={label}>{children}</optgroup>
}

export { Select, SelectOption, SelectGroup }
