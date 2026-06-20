'use client'

import { useState } from 'react'
import { VendorsTable, type SellerRow } from '@/components/dashboard/vendors-table'
import { VendorFormModal, type VendorFormData } from '@/components/dashboard/vendor-form-modal'

const D = {
  accent: '#00E5A0',
  border2: '#2A2A30',
  text1: '#F0F0F4',
  text2: '#8A8A96',
  mono: "'JetBrains Mono', monospace",
  ui: "'Space Grotesk', system-ui, sans-serif",
}

interface Props {
  sellers: SellerRow[]
  cards: { label: string; val: string; color: string }[]
  criteriaLabels?: string[]
}

export function VendorsClient({ sellers: initialSellers, cards, criteriaLabels }: Props) {
  const [sellers, setSellers] = useState(initialSellers)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingVendor, setEditingVendor] = useState<VendorFormData | null>(null)

  function handleNew() {
    setEditingVendor(null)
    setModalOpen(true)
  }

  function handleEdit(seller: SellerRow) {
    setEditingVendor({ id: seller.id, nome: seller.nome, email: seller.email, avatarUrl: seller.avatarUrl })
    setModalOpen(true)
  }

  function handleSuccess(updated: VendorFormData) {
    setSellers(prev => {
      const existing = prev.findIndex(s => s.id === updated.id)
      if (existing >= 0) {
        const next = [...prev]
        next[existing] = {
          ...next[existing],
          nome: updated.nome,
          email: updated.email,
          initials: updated.nome.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2),
          avatarUrl: updated.avatarUrl ?? next[existing].avatarUrl,
        }
        return next
      }
      return [...prev, {
        id: updated.id!,
        nome: updated.nome,
        email: updated.email,
        initials: updated.nome.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2),
        avatarUrl: updated.avatarUrl ?? null,
        totalMeetings: 0,
        totalCalls: 0,
        avgScore: null,
        avgEscuta: null,
        avgObjecoes: null,
        avgApresentacao: null,
        avgNota1: null,
        avgNota2: null,
        avgNota3: null,
        avgNota4: null,
      }]
    })
  }

  return (
    <>
      <div style={{ fontFamily: D.ui, color: D.text1 }}>
        <div style={{ padding: '28px 32px 0', marginBottom: 20 }}>
          <div style={{ fontFamily: D.mono, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.12em', color: D.accent, marginBottom: 4 }}>Need Sales</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.04em', color: D.text1, margin: '0 0 3px' }}>Vendedores</h1>
              <div style={{ fontSize: 12, color: D.text2 }}>Performance individual da equipe comercial</div>
            </div>
            <button
              onClick={handleNew}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 4, background: D.accent, color: '#000', fontSize: 13, fontWeight: 700, fontFamily: D.ui, border: 'none', cursor: 'pointer' }}
            >
              + Novo Vendedor
            </button>
          </div>
        </div>

        <div style={{ padding: '0 32px 40px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 20 }}>
            {cards.map(card => (
              <div key={card.label} style={{ background: '#111113', border: '1px solid #1E1E22', borderRadius: 6, padding: '18px 20px' }}>
                <div style={{ fontFamily: D.mono, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#4A4A56', marginBottom: 8 }}>{card.label}</div>
                <div style={{ fontFamily: D.mono, fontSize: 30, fontWeight: 700, letterSpacing: '-0.04em', color: card.color }}>{card.val}</div>
              </div>
            ))}
          </div>
          <VendorsTable sellers={sellers} onEdit={handleEdit} criteriaLabels={criteriaLabels} />
        </div>
      </div>

      <VendorFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        vendor={editingVendor}
        onSuccess={handleSuccess}
      />
    </>
  )
}
