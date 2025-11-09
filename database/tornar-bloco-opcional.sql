-- ============================================
-- Tornar Campo 'Bloco' Opcional
-- ============================================

-- 1. Adicionar campo para indicar se condomínio usa blocos
ALTER TABLE condominios
ADD COLUMN IF NOT EXISTS usa_blocos BOOLEAN DEFAULT true;

-- 2. Atualizar condomínios específicos que NÃO usam blocos
-- (Substitua 'Nome do Condomínio' pelos seus condomínios sem bloco)
UPDATE condominios
SET usa_blocos = false
WHERE nome IN (
  'Condomínio Exemplo Sem Blocos',
  'Outro Condomínio Sem Blocos'
);

-- OU atualizar todos para false e depois ativar os que têm:
-- UPDATE condominios SET usa_blocos = false;
-- UPDATE condominios SET usa_blocos = true WHERE nome IN ('Com Blocos 1', 'Com Blocos 2');

-- 3. Verificar quais condomínios usam blocos
SELECT
  id,
  nome,
  usa_blocos,
  CASE
    WHEN usa_blocos THEN '✅ Usa blocos'
    ELSE '❌ Não usa blocos'
  END as status
FROM condominios
ORDER BY nome;

-- ============================================
-- IMPORTANTE: Depois de executar, atualize o código da aplicação
-- para respeitar este campo usa_blocos
-- ============================================
