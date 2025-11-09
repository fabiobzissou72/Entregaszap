export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      condominios: {
        Row: {
          id: string
          nome: string
          endereco: string
          cidade: string
          cep: string
          telefone: string | null
          created_at: string
          updated_at: string
          sindico_id: string | null
          sindico_nome: string | null
          sindico_senha: string | null
          sindico_cpf: string | null
          sindico_telefone: string | null
          estado: string | null
          ativo: boolean | null
          email: string | null
          cnpj: string | null
          webhook_url: string | null
        }
        Insert: {
          id?: string
          nome: string
          endereco: string
          cidade: string
          cep: string
          telefone?: string | null
          created_at?: string
          updated_at?: string
          sindico_id?: string | null
          sindico_nome?: string | null
          sindico_senha?: string | null
          sindico_cpf?: string | null
          sindico_telefone?: string | null
          estado?: string | null
          ativo?: boolean | null
          email?: string | null
          cnpj?: string | null
          webhook_url?: string | null
        }
        Update: {
          id?: string
          nome?: string
          endereco?: string
          cidade?: string
          cep?: string
          telefone?: string | null
          created_at?: string
          updated_at?: string
          sindico_id?: string | null
          sindico_nome?: string | null
          sindico_senha?: string | null
          sindico_cpf?: string | null
          sindico_telefone?: string | null
          estado?: string | null
          ativo?: boolean | null
          email?: string | null
          cnpj?: string | null
          webhook_url?: string | null
        }
      }
      entregas: {
        Row: {
          id: string
          funcionario_id: string
          morador_id: string
          codigo_retirada: string
          foto_url: string | null
          mensagem_enviada: boolean
          status: 'pendente' | 'retirada' | 'cancelada'
          data_entrega: string
          data_retirada: string | null
          observacoes: string | null
          created_at: string
          updated_at: string
          descricao_retirada: string | null
          condominio_id: string | null
          ultimo_lembrete_enviado: string | null
        }
        Insert: {
          id?: string
          funcionario_id: string
          morador_id: string
          codigo_retirada: string
          foto_url?: string | null
          mensagem_enviada?: boolean
          status?: 'pendente' | 'retirada' | 'cancelada'
          data_entrega?: string
          data_retirada?: string | null
          observacoes?: string | null
          created_at?: string
          updated_at?: string
          descricao_retirada?: string | null
          condominio_id?: string | null
          ultimo_lembrete_enviado?: string | null
        }
        Update: {
          id?: string
          funcionario_id?: string
          morador_id?: string
          codigo_retirada?: string
          foto_url?: string | null
          mensagem_enviada?: boolean
          status?: 'pendente' | 'retirada' | 'cancelada'
          data_entrega?: string
          data_retirada?: string | null
          observacoes?: string | null
          created_at?: string
          updated_at?: string
          descricao_retirada?: string | null
          condominio_id?: string | null
          ultimo_lembrete_enviado?: string | null
        }
      }
      funcionarios: {
        Row: {
          id: string
          cpf: string
          nome: string
          senha: string
          cargo: string
          condominio_id: string
          ativo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          cpf: string
          nome: string
          senha: string
          cargo?: string
          condominio_id: string
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          cpf?: string
          nome?: string
          senha?: string
          cargo?: string
          condominio_id?: string
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      moradores: {
        Row: {
          id: string
          nome: string
          apartamento: string
          bloco: string | null
          telefone: string
          condominio_id: string
          ativo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          nome: string
          apartamento: string
          bloco?: string | null
          telefone: string
          condominio_id: string
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          nome?: string
          apartamento?: string
          bloco?: string | null
          telefone?: string
          condominio_id?: string
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      super_administradores: {
        Row: {
          id: string
          nome: string
          cpf: string
          senha: string
          ativo: boolean | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          nome: string
          cpf: string
          senha: string
          ativo?: boolean | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          nome?: string
          cpf?: string
          senha?: string
          ativo?: boolean | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
