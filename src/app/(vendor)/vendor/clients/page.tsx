import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { VendorSidebar } from '@/components/vendor/sidebar'
import { V, scoreColor, fmtScore } from '@/components/vendor/colors'

export default async function VendorClients() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const service = createServiceClient()

  const { data: profile } = await service
    .from('profiles')
    .select('nome, role, empresa_id')
    .eq('id', user.id)
    .single()

  const initials = (profile?.nome ?? 'V').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)

  // Fetch only reunioes and ligacoes belonging to this vendor
  const [{ data: reunioes }, { data: ligacoes }] = await Promise.all([
    service
      .from('reunioes')
      .select('cliente_id, nota_geral, data_hora')
      .eq('vendedor_id', user.id),
    service
      .from('ligacoes')
      .select('cliente_id, nota_geral, data_hora')
      .eq('vendedor_id', user.id),
  ])

  // Build stats per client using only this vendor's records
  type ClientStat = { reunioes: number; ligacoes: number; scores: number[]; lastDate: string }
  const statsMap: Record<string, ClientStat> = {}

  for (const r of reunioes ?? []) {
    if (!r.cliente_id) continue
    if (!statsMap[r.cliente_id]) statsMap[r.cliente_id] = { reunioes: 0, ligacoes: 0, scores: [], lastDate: '' }
    statsMap[r.cliente_id].reunioes++
    if (r.nota_geral != null) statsMap[r.cliente_id].scores.push(r.nota_geral)
    if ((r.data_hora ?? '') > statsMap[r.cliente_id].lastDate) statsMap[r.cliente_id].lastDate = r.data_hora ?? ''
  }

  for (const l of ligacoes ?? []) {
    if (!l.cliente_id) continue
    if (!statsMap[l.cliente_id]) statsMap[l.cliente_id] = { reunioes: 0, ligacoes: 0, scores: [], lastDate: '' }
    statsMap[l.cliente_id].ligacoes++
    if (l.nota_geral != null) statsMap[l.cliente_id].scores.push(l.nota_geral)
    if ((l.data_hora ?? '') > statsMap[l.cliente_id].lastDate) statsMap[l.cliente_id].lastDate = l.data_hora ?? ''
  }

  // Fetch only the clients that have at least one record associated with this vendor
  const myClientIds = Object.keys(statsMap)
  const { data: clientes } = myClientIds.length
    ? await service
        .from('clientes')
        .select('id, nome, email, telefone')
        .in('id', myClientIds)
        .order('nome')
    : { data: [] }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <VendorSidebar userName={profile?.nome ?? ''} userInitials={initials} userRole={profile?.role ?? 'seller'} />

      <main style={{ flex: 1, overflowY: 'auto', background: V.bg }}>
        <div style={{ padding: '28px 32px 0', marginBottom: 20 }}>
          <div style={{ fontFamily: V.mono, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.12em', color: V.accent, marginBottom: 4 }}>Portal do Vendedor</div>
          <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.04em', marginBottom: 3 }}>Meus Clientes</h1>
          <div style={{ fontSize: 12, color: V.text2 }}>Clientes com os quais você possui reuniões ou ligações</div>
        </div>

        <div style={{ padding: '0 32px 40px' }}>
          {clientes && clientes.length > 0 ? (
            <div style={{ background: V.surface, border: `1px solid ${V.border}`, borderRadius: 5, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Cliente', 'Reuniões', 'Ligações', 'Último Contato', 'Nota Média'].map(h => (
                      <th key={h} style={{ fontFamily: V.mono, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: V.text3, fontWeight: 500, textAlign: 'left', padding: '9px 16px', borderBottom: `1px solid ${V.border}` }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {clientes.map(c => {
                    const stats = statsMap[c.id]
                    const avg = stats?.scores.length
                      ? stats.scores.reduce((a, b) => a + b, 0) / stats.scores.length
                      : null
                    return (
                      <tr key={c.id}
                        onMouseEnter={e => (e.currentTarget.style.background = V.surface2)}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <td style={{ padding: '12px 16px', borderBottom: `1px solid ${V.border}` }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: V.text1 }}>{c.nome}</div>
                          {c.email && <div style={{ fontSize: 11, color: V.text3, marginTop: 2 }}>{c.email}</div>}
                        </td>
                        <td style={{ padding: '12px 16px', borderBottom: `1px solid ${V.border}`, fontFamily: V.mono, fontSize: 12, color: V.text2 }}>{stats?.reunioes ?? 0}</td>
                        <td style={{ padding: '12px 16px', borderBottom: `1px solid ${V.border}`, fontFamily: V.mono, fontSize: 12, color: V.text2 }}>{stats?.ligacoes ?? 0}</td>
                        <td style={{ padding: '12px 16px', borderBottom: `1px solid ${V.border}`, fontFamily: V.mono, fontSize: 12, color: V.text2 }}>
                          {stats?.lastDate ? new Date(stats.lastDate).toLocaleDateString('pt-BR') : '—'}
                        </td>
                        <td style={{ padding: '12px 16px', borderBottom: `1px solid ${V.border}` }}>
                          <span style={{ fontFamily: V.mono, fontSize: 16, fontWeight: 700, letterSpacing: '-0.03em', color: scoreColor(avg) }}>
                            {fmtScore(avg)}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ padding: 80, textAlign: 'center', fontFamily: V.mono, fontSize: 10, color: V.text3, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Nenhum cliente associado ainda
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
