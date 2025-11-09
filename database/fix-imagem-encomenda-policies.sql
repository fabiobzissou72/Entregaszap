-- ============================================
-- Configurar Políticas para o Bucket "Imagem Encomenda"
-- ============================================

-- Este script configura as políticas de acesso para o bucket existente

-- 1. Verificar se o bucket existe
SELECT id, name, public FROM storage.buckets WHERE name = 'Imagem Encomenda';
-- Deve retornar 1 linha com public = true

-- ============================================

-- 2. Remover políticas antigas se existirem (evitar conflitos)
DROP POLICY IF EXISTS "Permitir upload de imagens encomenda" ON storage.objects;
DROP POLICY IF EXISTS "Permitir leitura pública das imagens encomenda" ON storage.objects;
DROP POLICY IF EXISTS "Permitir deletar imagens encomenda" ON storage.objects;
DROP POLICY IF EXISTS "Permitir atualizar imagens encomenda" ON storage.objects;

DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Public Upload" ON storage.objects;
DROP POLICY IF EXISTS "Public Delete" ON storage.objects;
DROP POLICY IF EXISTS "Public Update" ON storage.objects;

-- ============================================

-- 3. Criar política para UPLOAD (INSERT)
CREATE POLICY "Permitir upload de imagens encomenda"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'Imagem Encomenda');

-- ============================================

-- 4. Criar política para LEITURA pública (SELECT)
CREATE POLICY "Permitir leitura pública das imagens encomenda"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'Imagem Encomenda');

-- ============================================

-- 5. Criar política para DELETAR (DELETE)
CREATE POLICY "Permitir deletar imagens encomenda"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'Imagem Encomenda');

-- ============================================

-- 6. Criar política para ATUALIZAR (UPDATE)
CREATE POLICY "Permitir atualizar imagens encomenda"
ON storage.objects FOR UPDATE
TO public
USING (bucket_id = 'Imagem Encomenda')
WITH CHECK (bucket_id = 'Imagem Encomenda');

-- ============================================

-- 7. Verificar políticas criadas
SELECT
    policyname,
    cmd,
    qual
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND policyname LIKE '%imagens encomenda%';

-- Deve retornar 4 políticas:
-- - INSERT (upload)
-- - SELECT (leitura)
-- - DELETE (deletar)
-- - UPDATE (atualizar)

-- ============================================

-- 8. Garantir que o bucket está público
UPDATE storage.buckets
SET public = true
WHERE name = 'Imagem Encomenda';

-- ============================================

-- PRONTO! Agora você pode testar o upload na aplicação
-- 1. Acesse http://localhost:3000
-- 2. Vá em "Nova Entrega"
-- 3. Selecione/tire uma foto
-- 4. Envie a mensagem
-- 5. Verifique no console se o upload foi bem-sucedido

-- ============================================
