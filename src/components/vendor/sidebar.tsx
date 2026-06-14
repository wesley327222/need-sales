'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { V } from './colors'

const NAV = [
  { href: '/vendor/dashboard', label: 'Dashboard',        icon: dashboardIcon },
  { href: '/vendor/clients',   label: 'Meus Clientes',    icon: clientsIcon },
  { href: '/vendor/meetings',  label: 'Minhas Reuniões',  icon: meetingsIcon },
  { href: '/vendor/calls',     label: 'Minhas Ligações',  icon: callsIcon },
  { href: '/vendor/insights',  label: 'Meus Insights',    icon: insightsIcon },
  { href: '/vendor/profile',   label: 'Meu Perfil',       icon: profileIcon },
]

function dashboardIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
}
function clientsIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
}
function meetingsIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
}
function callsIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6z"/></svg>
}
function insightsIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
}
function profileIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
}

interface VendorSidebarProps {
  userName: string
  userInitials: string
  userRole: string
}

export function VendorSidebar({ userName, userInitials, userRole }: VendorSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const isActive = (href: string) =>
    pathname === href || (pathname.startsWith(href + '/') && href !== '/vendor/dashboard')

  return (
    <aside style={{
      width: 210, background: V.surface, borderRight: `1px solid ${V.border}`,
      display: 'flex', flexDirection: 'column', flexShrink: 0, overflowY: 'auto',
      fontFamily: V.ui,
    }}>
      {/* Logo */}
      <Link href="/vendor/dashboard" style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '18px 16px 16px', borderBottom: `1px solid ${V.border}`,
        textDecoration: 'none',
      }}>
        <div style={{
          width: 26, height: 26, borderRadius: 5, background: V.accent,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
            <path d="M4 6h16M4 11h10M4 16h7" stroke="#000" strokeWidth="2.5" strokeLinecap="round"/>
          </svg>
        </div>
        <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: '-0.03em', color: V.text1 }}>
          Need<span style={{ color: V.accent }}>Sales</span>
        </span>
      </Link>

      {/* Nav */}
      <div style={{ padding: '16px 10px 6px' }}>
        <div style={{
          fontFamily: V.mono, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.12em',
          color: V.text3, padding: '0 6px', marginBottom: 4,
        }}>
          Navegação Principal
        </div>
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = isActive(href)
          return (
            <Link key={href} href={href} style={{
              display: 'flex', alignItems: 'center', gap: 9, padding: '7px 8px',
              borderRadius: 4, color: active ? V.accent : V.text2,
              background: active ? 'rgba(0,229,160,0.08)' : 'none',
              border: active ? '1px solid rgba(0,229,160,0.12)' : '1px solid transparent',
              fontSize: 12.5, fontWeight: 500, textDecoration: 'none',
              letterSpacing: '-0.01em', marginBottom: 1,
              transition: 'background 0.12s, color 0.12s',
            }}>
              <span style={{ width: 15, height: 15, flexShrink: 0 }}><Icon /></span>
              {label}
            </Link>
          )
        })}
      </div>

      {/* Conta */}
      <div style={{ padding: '0 10px' }}>
        <div style={{
          fontFamily: V.mono, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.12em',
          color: V.text3, padding: '0 6px', marginBottom: 4,
        }}>
          Conta
        </div>
        <button onClick={handleLogout} style={{
          display: 'flex', alignItems: 'center', gap: 9, padding: '7px 8px',
          borderRadius: 4, color: V.text2, background: 'none',
          border: '1px solid transparent', fontSize: 12.5, fontWeight: 500,
          letterSpacing: '-0.01em', marginBottom: 1, cursor: 'pointer',
          fontFamily: V.ui, width: '100%', textAlign: 'left',
        }}>
          <span style={{ width: 15, height: 15, flexShrink: 0 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </span>
          Sair
        </button>
      </div>

      {/* User */}
      <div style={{ marginTop: 'auto', borderTop: `1px solid ${V.border}`, padding: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%', background: V.surface2,
            border: `1px solid ${V.border2}`, display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: 10, fontWeight: 700, color: V.accent, flexShrink: 0,
          }}>
            {userInitials}
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: V.text1 }}>{userName}</div>
            <div style={{ fontSize: 10, color: V.text3 }}>{userRole}</div>
          </div>
        </div>
      </div>
    </aside>
  )
}
