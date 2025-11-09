import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export type UserType = 'superadmin' | 'sindico' | 'funcionario' | null;

export interface AuthUser {
  id: string;
  cpf: string;
  nome: string;
  tipo: UserType;
  condominioId?: string;
  condominioNome?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (cpf: string, senha: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Carregar usuário do localStorage ao iniciar
  useEffect(() => {
    const savedUser = localStorage.getItem('entregas_zap_user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem('entregas_zap_user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (cpf: string, senha: string): Promise<{ success: boolean; error?: string }> => {
    try {
      console.log('🔐 Tentando login com CPF:', cpf);

      // 1. Tentar como Super Admin
      const { data: superAdmin, error: saError } = await supabase
        .from('super_administradores')
        .select('*')
        .eq('cpf', cpf)
        .eq('ativo', true)
        .single();

      if (superAdmin && !saError) {
        console.log('👨‍💼 Super Admin encontrado:', superAdmin.nome);

        // Verificar senha (em produção, use hash!)
        if (superAdmin.senha === senha) {
          const authUser: AuthUser = {
            id: superAdmin.id,
            cpf: superAdmin.cpf,
            nome: superAdmin.nome,
            tipo: 'superadmin'
          };

          setUser(authUser);
          localStorage.setItem('entregas_zap_user', JSON.stringify(authUser));
          console.log('✅ Login como Super Admin bem-sucedido');
          return { success: true };
        } else {
          return { success: false, error: 'Senha incorreta' };
        }
      }

      // 2. Tentar como Funcionário
      const { data: funcionario, error: funcError } = await supabase
        .from('funcionarios')
        .select(`
          *,
          condominio:condominios!funcionarios_condominio_id_fkey(id, nome)
        `)
        .eq('cpf', cpf)
        .eq('ativo', true)
        .single();

      if (funcionario && !funcError) {
        console.log('👷 Funcionário encontrado:', funcionario.nome);

        if (funcionario.senha === senha) {
          const authUser: AuthUser = {
            id: funcionario.id,
            cpf: funcionario.cpf,
            nome: funcionario.nome,
            tipo: 'funcionario',
            condominioId: funcionario.condominio_id,
            condominioNome: funcionario.condominio?.nome
          };

          setUser(authUser);
          localStorage.setItem('entregas_zap_user', JSON.stringify(authUser));
          console.log('✅ Login como Funcionário bem-sucedido');
          return { success: true };
        } else {
          return { success: false, error: 'Senha incorreta' };
        }
      }

      // 3. Tentar como Síndico
      const { data: condominio, error: condError } = await supabase
        .from('condominios')
        .select('*')
        .eq('sindico_cpf', cpf)
        .eq('ativo', true)
        .single();

      if (condominio && !condError) {
        console.log('🏢 Síndico encontrado do condomínio:', condominio.nome);

        if (condominio.sindico_senha === senha) {
          const authUser: AuthUser = {
            id: condominio.sindico_id || condominio.id,
            cpf: condominio.sindico_cpf,
            nome: condominio.sindico_nome || 'Síndico',
            tipo: 'sindico',
            condominioId: condominio.id,
            condominioNome: condominio.nome
          };

          setUser(authUser);
          localStorage.setItem('entregas_zap_user', JSON.stringify(authUser));
          console.log('✅ Login como Síndico bem-sucedido');
          return { success: true };
        } else {
          return { success: false, error: 'Senha incorreta' };
        }
      }

      // Nenhum usuário encontrado
      console.log('❌ Nenhum usuário encontrado com este CPF');
      return { success: false, error: 'CPF não encontrado ou inativo' };

    } catch (error) {
      console.error('❌ Erro ao fazer login:', error);
      return { success: false, error: 'Erro ao tentar fazer login' };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('entregas_zap_user');
    console.log('🚪 Logout realizado');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }
  return context;
}
