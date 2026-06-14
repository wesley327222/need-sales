import type { Metadata } from 'next'
import './vendor.css'

export const metadata: Metadata = {
  title: 'Need Sales — Portal do Vendedor',
}

export default function VendorLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link
        href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap"
        rel="stylesheet"
      />
      <div style={{
        minHeight: '100vh',
        background: '#0A0A0B',
        color: '#F0F0F4',
        fontFamily: "'Space Grotesk', system-ui, sans-serif",
        WebkitFontSmoothing: 'antialiased',
      }}>
        {children}
      </div>
    </>
  )
}
