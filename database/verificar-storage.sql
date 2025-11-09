-- ============================================
-- Script de Verificação do Storage
-- Execute este script no SQL Editor do Supabase
-- ============================================

-- 1. VERIFICAR SE O BUCKET EXISTE
SELECT
    id,
    name,
    public,
    created_at
FROM storage.buckets
WHERE name = 'entregas-fotos';

-- Se retornar VAZIO, o bucket NÃO EXISTE!
-- Você precisa criar o bucket primeiro.

-- ============================================
-- 2. VERIFICAR POLÍTICAS DO BUCKET
-- ============================================

SELECT
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE schemaname = 'storage'
AND tablename = 'objects'
AND policyname LIKE '%entregas%';

-- Se retornar VAZIO, as políticas NÃO EXISTEM!
-- Você precisa criar as políticas de acesso.

-- ============================================
-- 3. VERIFICAR ARQUIVOS NO BUCKET
-- ============================================

SELECT
    name,
    bucket_id,
    created_at,
    metadata
FROM storage.objects
WHERE bucket_id = 'entregas-fotos'
ORDER BY created_at DESC
LIMIT 10;

-- Lista os últimos 10 arquivos enviados

-- ============================================
-- 4. VERIFICAR ENTREGAS COM FOTO_URL
-- ============================================

SELECT
    id,
    codigo_retirada,
    foto_url,
    created_at
FROM entregas
WHERE foto_url IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;

-- Lista entregas que TÊM foto

-- ============================================
-- 5. VERIFICAR ENTREGAS SEM FOTO_URL
-- ============================================

SELECT
    id,
    codigo_retirada,
    foto_url,
    created_at
FROM entregas
WHERE foto_url IS NULL
ORDER BY created_at DESC
LIMIT 10;

-- Lista entregas que NÃO TÊM foto

-- ============================================
-- 6. ESTATÍSTICAS
-- ============================================

SELECT
    COUNT(*) as total_entregas,
    COUNT(foto_url) as entregas_com_foto,
    COUNT(*) - COUNT(foto_url) as entregas_sem_foto
FROM entregas;

-- Mostra quantas entregas têm/não têm foto

-- ============================================
-- SE O BUCKET NÃO EXISTE, CRIE-O ASSIM:
-- ============================================

/*
INSERT INTO storage.buckets (id, name, public)
VALUES ('entregas-fotos', 'entregas-fotos', true)
ON CONFLICT (id) DO NOTHING;
*/

-- ============================================
-- SE AS POLÍTICAS NÃO EXISTEM, CRIE-AS ASSIM:
-- ============================================

/*
-- Política para upload (INSERT)
CREATE POLICY "Permitir upload de fotos"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'entregas-fotos');

-- Política para leitura (SELECT)
CREATE POLICY "Permitir leitura pública das fotos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'entregas-fotos');

-- Política para deletar (DELETE)
CREATE POLICY "Permitir deletar fotos"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'entregas-fotos');
*/
