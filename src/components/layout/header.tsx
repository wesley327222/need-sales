'use client'

import { Bell, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function Header() {
  return (
    <header className="h-14 border-b border-slate-200 bg-white flex items-center justify-end px-6 gap-2">
      <Button variant="ghost" size="icon">
        <Bell className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon">
        <LogOut className="h-4 w-4" />
      </Button>
    </header>
  )
}
