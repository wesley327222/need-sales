export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = 'admin' | 'manager' | 'seller'
export type RecordStatus = 'processando' | 'processado' | 'erro' | 'pending' | 'transcribing' | 'processing' | 'done' | 'partial' | 'error'
export type LoteStatus = 'pending' | 'processing' | 'done' | 'error'

export interface Database {
  public: {
    Tables: {
      ai_config: {
        Row: {
          id: string
          empresa_id: string
          tipo: 'reuniao' | 'ligacao'
          criterios: Json
          conhecimentos: string | null
          qualificacao_lead_prompt: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          empresa_id: string
          tipo: 'reuniao' | 'ligacao'
          criterios?: Json
          conhecimentos?: string | null
          qualificacao_lead_prompt?: string | null
          updated_at?: string
        }
        Update: {
          criterios?: Json
          conhecimentos?: string | null
          qualificacao_lead_prompt?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      companies: {
        Row: {
          id: string
          nome: string
          cnpj: string | null
          descricao: string | null
          Produtos: string | null
          Complemento: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          nome: string
          cnpj?: string | null
          descricao?: string | null
          Produtos?: string | null
          Complemento?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          nome?: string
          cnpj?: string | null
          descricao?: string | null
          Produtos?: string | null
          Complemento?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          empresa_id: string | null
          nome: string
          email: string
          role: UserRole
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          empresa_id?: string | null
          nome: string
          email: string
          role?: UserRole
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          empresa_id?: string | null
          nome?: string
          email?: string
          role?: UserRole
          avatar_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'profiles_empresa_id_fkey'
            columns: ['empresa_id']
            isOneToOne: false
            referencedRelation: 'companies'
            referencedColumns: ['id']
          }
        ]
      }
      clientes: {
        Row: {
          id: string
          empresa_id: string
          nome: string
          email: string | null
          telefone: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          empresa_id: string
          nome: string
          email?: string | null
          telefone?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          empresa_id?: string
          nome?: string
          email?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'clientes_empresa_id_fkey'
            columns: ['empresa_id']
            isOneToOne: false
            referencedRelation: 'companies'
            referencedColumns: ['id']
          }
        ]
      }
      reunioes: {
        Row: {
          id: string
          empresa_id: string
          vendedor_id: string | null
          cliente_id: string | null
          titulo: string
          status: RecordStatus
          audio_url: string | null
          audio_filename: string | null
          duracao: number | null
          transcricao: string | null
          data_hora: string | null
          nota_escuta: number | null
          nota_objecoes: number | null
          nota_apresentacao: number | null
          nota_geral: number | null
          nota_spin: number | null
          insights: Json | null
          objecoes: Json | null
          relatorio_nota_1: Json | null
          relatorio_nota_2: Json | null
          relatorio_nota_3: Json | null
          proposta: Json | null
          probabilidade_fechamento: number | null
          follow_whatsapp_d1: string | null
          follow_whatsapp_d3: string | null
          follow_email_5: string | null
          Spin: Json | null
          google_event_id: string | null
          nylas_notetaker_id: string | null
          meet_url: string | null
          origem: string | null
          nota_1: number | null
          nota_2: number | null
          nota_3: number | null
          nota_4: number | null
          criterios_resultado: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          empresa_id: string
          vendedor_id?: string | null
          cliente_id?: string | null
          titulo: string
          status?: RecordStatus
          audio_url?: string | null
          audio_filename?: string | null
          duracao?: number | null
          transcricao?: string | null
          data_hora?: string | null
          nota_escuta?: number | null
          nota_objecoes?: number | null
          nota_apresentacao?: number | null
          nota_geral?: number | null
          nota_spin?: number | null
          insights?: Json | null
          objecoes?: Json | null
          relatorio_nota_1?: Json | null
          relatorio_nota_2?: Json | null
          relatorio_nota_3?: Json | null
          proposta?: Json | null
          probabilidade_fechamento?: number | null
          follow_whatsapp_d1?: string | null
          follow_whatsapp_d3?: string | null
          follow_email_5?: string | null
          Spin?: Json | null
          google_event_id?: string | null
          nylas_notetaker_id?: string | null
          meet_url?: string | null
          origem?: string | null
          nota_1?: number | null
          nota_2?: number | null
          nota_3?: number | null
          nota_4?: number | null
          criterios_resultado?: Json | null
          created_at?: string
        }
        Update: {
          empresa_id?: string
          vendedor_id?: string | null
          cliente_id?: string | null
          titulo?: string
          status?: RecordStatus
          audio_url?: string | null
          audio_filename?: string | null
          duracao?: number | null
          transcricao?: string | null
          data_hora?: string | null
          nota_escuta?: number | null
          nota_objecoes?: number | null
          nota_apresentacao?: number | null
          nota_geral?: number | null
          nota_spin?: number | null
          insights?: Json | null
          objecoes?: Json | null
          relatorio_nota_1?: Json | null
          relatorio_nota_2?: Json | null
          relatorio_nota_3?: Json | null
          proposta?: Json | null
          probabilidade_fechamento?: number | null
          follow_whatsapp_d1?: string | null
          follow_whatsapp_d3?: string | null
          follow_email_5?: string | null
          Spin?: Json | null
          google_event_id?: string | null
          nylas_notetaker_id?: string | null
          meet_url?: string | null
          origem?: string | null
          nota_1?: number | null
          nota_2?: number | null
          nota_3?: number | null
          nota_4?: number | null
          criterios_resultado?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: 'reunioes_empresa_id_fkey'
            columns: ['empresa_id']
            isOneToOne: false
            referencedRelation: 'companies'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'reunioes_vendedor_id_fkey'
            columns: ['vendedor_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
      ligacoes: {
        Row: {
          id: string
          empresa_id: string
          vendedor_id: string | null
          cliente_id: string | null
          lote_id: string | null
          titulo: string
          status: RecordStatus
          audio_url: string | null
          audio_filename: string | null
          duracao: number | null
          transcricao: string | null
          transcricao_formatada: string | null
          gladia_request_id: string | null
          data_hora: string | null
          nota_acesso_decisor: number | null
          nota_qualificacao_lead: number | null
          nota_geracao_curiosidade: number | null
          nota_conducao_conversa: number | null
          nota_pedido_reuniao: number | null
          nota_geral: number | null
          analise: Json | null
          insights: Json | null
          objecoes: Json | null
          follow_whatsapp_d1: string | null
          follow_whatsapp_d3: string | null
          follow_email_5: string | null
          nota_1: number | null
          nota_2: number | null
          nota_3: number | null
          nota_4: number | null
          criterios_resultado: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          empresa_id: string
          vendedor_id?: string | null
          cliente_id?: string | null
          lote_id?: string | null
          titulo: string
          status?: RecordStatus
          audio_url?: string | null
          audio_filename?: string | null
          duracao?: number | null
          transcricao?: string | null
          transcricao_formatada?: string | null
          gladia_request_id?: string | null
          data_hora?: string | null
          nota_acesso_decisor?: number | null
          nota_qualificacao_lead?: number | null
          nota_geracao_curiosidade?: number | null
          nota_conducao_conversa?: number | null
          nota_pedido_reuniao?: number | null
          nota_geral?: number | null
          analise?: Json | null
          insights?: Json | null
          objecoes?: Json | null
          follow_whatsapp_d1?: string | null
          follow_whatsapp_d3?: string | null
          follow_email_5?: string | null
          nota_1?: number | null
          nota_2?: number | null
          nota_3?: number | null
          nota_4?: number | null
          criterios_resultado?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          empresa_id?: string
          vendedor_id?: string | null
          cliente_id?: string | null
          lote_id?: string | null
          titulo?: string
          status?: RecordStatus
          audio_url?: string | null
          audio_filename?: string | null
          duracao?: number | null
          transcricao?: string | null
          transcricao_formatada?: string | null
          gladia_request_id?: string | null
          data_hora?: string | null
          nota_acesso_decisor?: number | null
          nota_qualificacao_lead?: number | null
          nota_geracao_curiosidade?: number | null
          nota_conducao_conversa?: number | null
          nota_pedido_reuniao?: number | null
          nota_geral?: number | null
          analise?: Json | null
          insights?: Json | null
          objecoes?: Json | null
          follow_whatsapp_d1?: string | null
          follow_whatsapp_d3?: string | null
          follow_email_5?: string | null
          nota_1?: number | null
          nota_2?: number | null
          nota_3?: number | null
          nota_4?: number | null
          criterios_resultado?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'ligacoes_empresa_id_fkey'
            columns: ['empresa_id']
            isOneToOne: false
            referencedRelation: 'companies'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ligacoes_vendedor_id_fkey'
            columns: ['vendedor_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
      ligacoes_lotes: {
        Row: {
          id: string
          empresa_id: string
          vendedor_id: string | null
          nome: string
          arquivo_zip_url: string | null
          status: LoteStatus
          total_ligacoes: number
          ligacoes_processadas: number
          relatorio: Json | null
          periodo_inicio: string | null
          periodo_fim: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          empresa_id: string
          vendedor_id?: string | null
          nome: string
          arquivo_zip_url?: string | null
          status?: LoteStatus
          total_ligacoes?: number
          ligacoes_processadas?: number
          relatorio?: Json | null
          periodo_inicio?: string | null
          periodo_fim?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          nome?: string
          arquivo_zip_url?: string | null
          status?: LoteStatus
          total_ligacoes?: number
          ligacoes_processadas?: number
          relatorio?: Json | null
          periodo_inicio?: string | null
          periodo_fim?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      conversas_whatsapp: {
        Row: {
          id: string
          empresa_id: string
          vendedor_id: string | null
          cliente_id: string | null
          mensagens: Json
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          empresa_id: string
          vendedor_id?: string | null
          cliente_id?: string | null
          mensagens?: Json
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          mensagens?: Json
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      google_calendar_sync: {
        Row: {
          id: string
          sync_token: string | null
          channel_id: string | null
          resource_id: string | null
          channel_expiration: number | null
          updated_at: string
        }
        Insert: {
          id: string
          sync_token?: string | null
          channel_id?: string | null
          resource_id?: string | null
          channel_expiration?: number | null
          updated_at?: string
        }
        Update: {
          sync_token?: string | null
          channel_id?: string | null
          resource_id?: string | null
          channel_expiration?: number | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

export type Company = Database['public']['Tables']['companies']['Row']
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Cliente = Database['public']['Tables']['clientes']['Row']
export type Reuniao = Database['public']['Tables']['reunioes']['Row']
export type Ligacao = Database['public']['Tables']['ligacoes']['Row']
export type LigacaoLote = Database['public']['Tables']['ligacoes_lotes']['Row']

// Backward-compat aliases (dashboard components)
export type MeetingStatus = RecordStatus
export type MeetingType = 'meeting' | 'call'
export type User = Profile
export type Meeting = Reuniao

export interface Analysis {
  id: string
  status: RecordStatus
  meeting_id: string
  agent_type?: string
  result?: Json
  overall_score?: number | null
  error_message?: string | null
  retries?: number
  processed_at?: string | null
  created_at?: string
}
