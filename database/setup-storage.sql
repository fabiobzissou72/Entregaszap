-- ============================================
-- Configuração do Storage para Fotos de Entregas
-- ============================================

-- 1. Criar o bucket 'entregas-fotos' (público)
INSERT INTO storage.buckets (id, name, public)
VALUES ('entregas-fotos', 'entregas-fotos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Remover políticas antigas se existirem
DROP POLICY IF EXISTS "Permitir upload de fotos" ON storage.objects;
DROP POLICY IF EXISTS "Permitir leitura pública das fotos" ON storage.objects;
DROP POLICY IF EXISTS "Permitir deletar fotos" ON storage.objects;

-- 3. Criar política para UPLOAD (INSERT)
CREATE POLICY "Permitir upload de fotos"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'entregas-fotos');

-- 4. Criar política para LEITURA pública (SELECT)
CREATE POLICY "Permitir leitura pública das fotos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'entregas-fotos');

-- 5. Criar política para DELETAR (DELETE)
CREATE POLICY "Permitir deletar fotos"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'entregas-fotos');

-- 6. Criar política para ATUALIZAR (UPDATE)
CREATE POLICY "Permitir atualizar fotos"
ON storage.objects FOR UPDATE
TO public
USING (bucket_id = 'entregas-fotos')
WITH CHECK (bucket_id = 'entregas-fotos');

-- ============================================
-- Verificação
-- ============================================

-- Verificar se o bucket foi criado
SELECT * FROM storage.buckets WHERE id = 'entregas-fotos';

-- Verificar políticas criadas
SELECT * FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage';
