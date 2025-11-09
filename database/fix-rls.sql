-- ============================================
-- Script para corrigir problemas de RLS (Row Level Security)
-- Execute este script no SQL Editor do Supabase
-- ============================================

-- OPÇÃO 1: Desabilitar RLS (apenas para desenvolvimento/teste)
-- Descomente as linhas abaixo se quiser desabilitar completamente o RLS

-- ALTER TABLE public.condominios DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.funcionarios DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.moradores DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.entregas DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.super_administradores DISABLE ROW LEVEL SECURITY;

-- ============================================
-- OPÇÃO 2: Criar políticas permissivas (RECOMENDADO)
-- Permite acesso total para desenvolvimento
-- ============================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.condominios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funcionarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moradores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entregas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.super_administradores ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "Permitir tudo em condominios" ON public.condominios;
DROP POLICY IF EXISTS "Permitir tudo em funcionarios" ON public.funcionarios;
DROP POLICY IF EXISTS "Permitir tudo em moradores" ON public.moradores;
DROP POLICY IF EXISTS "Permitir tudo em entregas" ON public.entregas;
DROP POLICY IF EXISTS "Permitir tudo em super_administradores" ON public.super_administradores;

-- Criar políticas permissivas para todas as operações
-- CONDOMINIOS
CREATE POLICY "Permitir tudo em condominios"
ON public.condominios
FOR ALL
USING (true)
WITH CHECK (true);

-- FUNCIONARIOS
CREATE POLICY "Permitir tudo em funcionarios"
ON public.funcionarios
FOR ALL
USING (true)
WITH CHECK (true);

-- MORADORES
CREATE POLICY "Permitir tudo em moradores"
ON public.moradores
FOR ALL
USING (true)
WITH CHECK (true);

-- ENTREGAS
CREATE POLICY "Permitir tudo em entregas"
ON public.entregas
FOR ALL
USING (true)
WITH CHECK (true);

-- SUPER_ADMINISTRADORES
CREATE POLICY "Permitir tudo em super_administradores"
ON public.super_administradores
FOR ALL
USING (true)
WITH CHECK (true);

-- ============================================
-- Verificar se as políticas foram criadas
-- ============================================
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
