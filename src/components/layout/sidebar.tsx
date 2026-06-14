'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'

const D = {
  surface:    '#111113',
  surface2:   '#18181B',
  border:     '#1E1E22',
  border2:    '#2A2A30',
  text1:      '#F0F0F4',
  text2:      '#8A8A96',
  text3:      '#4A4A56',
  accent:     '#00E5A0',
  accentDim:  'rgba(0,229,160,0.08)',
  ui:         "'Space Grotesk', system-ui, sans-serif",
  mono:       "'JetBrains Mono', monospace",
}

function IconDashboard() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>
}
function IconMeetings() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.889L15 14M3 8a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z"/></svg>
}
function IconCalls() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.8a19.79 19.79 0 01-3.07-8.64A2 2 0 012 .82h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 8.61a16 16 0 006.29 6.29l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
}
function IconClients() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
}
function IconVendors() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
}
function IconReports() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
}
function IconSettings() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
}
function IconLogout() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>
}

const NAV_MAIN = [
  { href: '/dashboard', label: 'Dashboard',    Icon: IconDashboard },
  { href: '/meetings',  label: 'Reuniões',     Icon: IconMeetings  },
  { href: '/calls',     label: 'Ligações',     Icon: IconCalls     },
  { href: '/clients',   label: 'Clientes',     Icon: IconClients   },
  { href: '/vendors',   label: 'Vendedores',   Icon: IconVendors   },
]

const NAV_TOOLS = [
  { href: '/reports',   label: 'Relatórios',  Icon: IconReports   },
  { href: '/settings',  label: 'Configurações', Icon: IconSettings },
]

interface SidebarProps {
  userName: string
  userInitials: string
  userRole: string
}

export function Sidebar({ userName, userInitials, userRole }: SidebarProps) {
  const pathname = usePathname()
  const router   = useRouter()

  const isActive = (href: string) =>
    pathname === href || (href !== '/dashboard' && pathname.startsWith(href + '/'))

  const navItemStyle = (active: boolean): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: 9,
    padding: '7px 8px', borderRadius: 4, cursor: 'pointer',
    color:      active ? D.accent  : D.text2,
    background: active ? D.accentDim : 'none',
    border:     active ? '1px solid rgba(0,229,160,0.12)' : '1px solid transparent',
    fontSize: 12.5, fontWeight: 500,
    width: '100%', textAlign: 'left',
    fontFamily: D.ui, letterSpacing: '-0.01em',
    marginBottom: 1, textDecoration: 'none',
    transition: 'background 0.12s, color 0.12s',
  })

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside style={{
      width: 220, background: D.surface,
      borderRight: `1px solid ${D.border}`,
      display: 'flex', flexDirection: 'column',
      flexShrink: 0, zIndex: 100, overflowY: 'auto',
    }}>
      {/* Logo */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '18px 16px 16px',
        borderBottom: `1px solid ${D.border}`,
        flexShrink: 0,
      }}>
        <div style={{
          width: 26, height: 26, borderRadius: 5,
          background: D.accent,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M4 6h16M4 11h10M4 16h7" stroke="#000" strokeWidth="2.5" strokeLinecap="round"/>
          </svg>
        </div>
        <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: '-0.03em', color: D.text1, fontFamily: D.ui }}>
          Need<span style={{ color: D.accent }}>Sales</span>
        </div>
      </div>

      {/* Nav principal */}
      <div style={{ padding: '20px 12px 8px' }}>
        <div style={{
          fontFamily: D.mono, fontSize: 9, textTransform: 'uppercase',
          letterSpacing: '0.12em', color: D.text3,
          padding: '0 6px', marginBottom: 4,
        }}>
          Navegação Principal
        </div>
        {NAV_MAIN.map(({ href, label, Icon }) => (
          <Link key={href} href={href} style={navItemStyle(isActive(href))}>
            <Icon />
            {label}
          </Link>
        ))}
      </div>

      {/* Ferramentas */}
      <div style={{ padding: '12px 12px 8px' }}>
        <div style={{
          fontFamily: D.mono, fontSize: 9, textTransform: 'uppercase',
          letterSpacing: '0.12em', color: D.text3,
          padding: '0 6px', marginBottom: 4,
        }}>
          Ferramentas
        </div>
        {NAV_TOOLS.map(({ href, label, Icon }) => (
          <Link key={href} href={href} style={navItemStyle(isActive(href))}>
            <Icon />
            {label}
          </Link>
        ))}
      </div>

      {/* Conta + Logout (push para baixo) */}
      <div style={{ padding: '12px 12px 8px', marginTop: 'auto' }}>
        <div style={{
          fontFamily: D.mono, fontSize: 9, textTransform: 'uppercase',
          letterSpacing: '0.12em', color: D.text3,
          padding: '0 6px', marginBottom: 4,
        }}>
          Conta
        </div>
        <button
          onClick={handleLogout}
          style={{
            ...navItemStyle(false),
            background: 'none', border: '1px solid transparent',
            cursor: 'pointer',
          }}
        >
          <IconLogout />
          Sair
        </button>
      </div>

      {/* User card */}
      <div style={{ borderTop: `1px solid ${D.border}`, padding: '12px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 8px' }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            background: D.surface2, border: `1px solid ${D.border2}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 10, fontWeight: 700, color: D.accent,
            letterSpacing: '0.02em', flexShrink: 0,
            fontFamily: D.mono,
          }}>
            {userInitials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: D.text1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: D.ui }}>
              {userName}
            </div>
            <div style={{ fontSize: 10, color: D.text3, fontFamily: D.mono }}>
              {userRole === 'admin' ? 'Administrador' : userRole === 'manager' ? 'Gestor' : 'Gestor'}
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}
