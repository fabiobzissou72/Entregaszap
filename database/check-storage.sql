-- ============================================
-- Verificação do Storage - Entregas ZAP
-- ============================================

-- 1. Verificar se o bucket 'entregas-fotos' existe
SELECT
    id,
    name,
    public,
    created_at
FROM storage.buckets
WHERE id = 'entregas-fotos';

-- Resultado esperado: 1 linha com public = true
-- Se retornar 0 linhas: O bucket NÃO existe, execute setup-storage.sql

-- ============================================

-- 2. Verificar políticas de acesso do bucket
SELECT
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND policyname LIKE '%foto%';

-- Resultado esperado: 4 políticas
-- - Permitir upload de fotos (INSERT)
-- - Permitir leitura pública das fotos (SELECT)
-- - Permitir deletar fotos (DELETE)
-- - Permitir atualizar fotos (UPDATE)

-- ============================================

-- 3. Verificar arquivos já enviados (se houver)
SELECT
    name,
    bucket_id,
    owner,
    created_at,
    updated_at,
    last_accessed_at,
    metadata->>'size' as size_bytes,
    metadata->>'mimetype' as mime_type
FROM storage.objects
WHERE bucket_id = 'entregas-fotos'
ORDER BY created_at DESC
LIMIT 10;

-- Mostra os últimos 10 arquivos enviados

-- ============================================

-- 4. Contar total de fotos no bucket
SELECT
    bucket_id,
    COUNT(*) as total_fotos,
    SUM((metadata->>'size')::bigint) as tamanho_total_bytes,
    ROUND(SUM((metadata->>'size')::bigint) / 1024.0 / 1024.0, 2) as tamanho_total_mb
FROM storage.objects
WHERE bucket_id = 'entregas-fotos'
GROUP BY bucket_id;

-- Mostra estatísticas do bucket

-- ============================================

-- 5. Verificar entregas com fotos salvas
SELECT
    e.id,
    e.codigo_retirada,
    e.foto_url,
    e.observacoes,
    e.data_entrega,
    m.nome as morador_nome,
    e.status
FROM entregas e
LEFT JOIN moradores m ON e.morador_id = m.id
WHERE e.foto_url IS NOT NULL
ORDER BY e.data_entrega DESC
LIMIT 10;

-- Mostra entregas que têm foto_url salva no banco

-- ============================================
-- DIAGNÓSTICO COMPLETO
-- ============================================

-- Se o bucket NÃO existir, execute:
-- \i database/setup-storage.sql

-- Se o bucket existir mas upload falhar, verifique:
-- 1. As políticas (query #2 acima)
-- 2. Se public = true (query #1 acima)
-- 3. As credenciais do Supabase em .env

-- Para testar manualmente o upload:
-- 1. Vá em Storage no dashboard do Supabase
-- 2. Clique em 'entregas-fotos'
-- 3. Tente fazer upload de uma imagem
-- 4. Se funcionar, o problema está no código da aplicação
-- 5. Se não funcionar, o problema está nas permissões

-- ============================================
