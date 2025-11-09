-- ============================================
-- Script para configurar o webhook do condomínio
-- Execute este script no SQL Editor do Supabase
-- ============================================

-- Atualizar o webhook_url de todos os condomínios para o novo webhook
UPDATE public.condominios
SET webhook_url = 'https://webhook.fbzia.com.br/webhook/entregaszapnovo'
WHERE ativo = true;

-- OU atualizar apenas um condomínio específico (substitua 'NOME_DO_CONDOMINIO')
-- UPDATE public.condominios
-- SET webhook_url = 'https://webhook.fbzia.com.br/webhook/entregaszapnovo'
-- WHERE nome = 'NOME_DO_CONDOMINIO' AND ativo = true;

-- Verificar se foi atualizado corretamente
SELECT
    id,
    nome,
    webhook_url,
    ativo
FROM public.condominios
ORDER BY nome;

-- ============================================
-- OBSERVAÇÕES IMPORTANTES:
-- ============================================
-- 1. Cada condomínio pode ter seu próprio webhook
-- 2. Se o webhook_url estiver NULL ou vazio, o sistema usará
--    o webhook padrão: https://webhook.fbzia.com.br/webhook/entregaszapnovo
-- 3. Para adicionar webhooks diferentes por condomínio:
--    UPDATE public.condominios
--    SET webhook_url = 'https://seu-webhook-personalizado.com/webhook'
--    WHERE nome = 'Condomínio Específico';
