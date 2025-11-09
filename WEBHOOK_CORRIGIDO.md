# Correção do Webhook - Concluída ✅

## O que foi corrigido

O webhook estava **hardcoded** (fixo) no código e não utilizava o `webhook_url` configurado no banco de dados para cada condomínio.

### Alterações realizadas:

1. **lib/adapters.ts**
   - Adicionado campo `webhookUrl` na interface `Condo`
   - Modificado `condominioToApp()` para incluir o `webhook_url` do banco

2. **App.tsx**
   - Adicionado campo `webhookUrl` na interface `Condo`
   - Passado `condos` como prop para o componente `Reminder`

3. **components/NewDelivery.tsx**
   - Modificado para buscar o webhook do condomínio selecionado
   - Se não houver webhook configurado, usa o padrão como fallback

4. **components/Reminder.tsx**
   - Adicionado `condos` nas props do componente
   - Modificado para usar o webhook específico de cada condomínio
   - Fallback para webhook padrão se não configurado

## Como funciona agora

O sistema agora funciona da seguinte forma:

1. Quando um usuário envia uma mensagem ou lembrete, o sistema:
   - Identifica o condomínio do morador
   - Busca o `webhook_url` configurado para aquele condomínio no banco
   - Usa esse webhook para enviar a mensagem
   - Se não houver webhook configurado, usa o padrão: `https://webhook.fbzia.com.br/webhook/entregaszap`

## Como configurar o webhook no banco de dados

### Opção 1: Configurar via SQL Editor do Supabase

1. Acesse: https://ofaifvyowixzktwvxrps.supabase.co
2. Vá em **SQL Editor**
3. Execute o script `database/update-webhook.sql`

### Opção 2: Atualizar manualmente

Execute este SQL no Supabase:

```sql
-- Atualizar todos os condomínios
UPDATE public.condominios
SET webhook_url = 'https://webhook.fbzia.com.br/webhook/entregaszap'
WHERE ativo = true;
```

Ou para um condomínio específico:

```sql
-- Atualizar apenas um condomínio
UPDATE public.condominios
SET webhook_url = 'https://webhook.fbzia.com.br/webhook/entregaszap'
WHERE nome = 'Nome do Condomínio';
```

### Verificar se foi configurado corretamente

```sql
SELECT nome, webhook_url, ativo
FROM public.condominios
ORDER BY nome;
```

## Configurações múltiplas

Você pode configurar webhooks diferentes para cada condomínio:

```sql
-- Condomínio A com webhook específico
UPDATE public.condominios
SET webhook_url = 'https://webhook-condominio-a.com/webhook'
WHERE nome = 'Condomínio A';

-- Condomínio B com outro webhook
UPDATE public.condominios
SET webhook_url = 'https://webhook-condominio-b.com/webhook'
WHERE nome = 'Condomínio B';
```

## Testar o webhook

1. Configure o webhook no banco de dados (veja acima)
2. Acesse a aplicação: http://localhost:3001
3. Vá em "Nova Entrega" ou "Lembretes"
4. Selecione um morador
5. Envie a mensagem
6. O sistema agora usará o webhook configurado no banco!

## Fallback (Segurança)

Se por algum motivo o `webhook_url` não estiver configurado no banco, o sistema automaticamente usará:
```
https://webhook.fbzia.com.br/webhook/entregaszap
```

Isso garante que o sistema sempre funcionará, mesmo sem configuração.

## Problemas de comunicação com o banco?

Se você ainda estiver tendo problemas de comunicação com o banco de dados, execute também o script:
```
database/fix-rls.sql
```

Este script corrige problemas de Row Level Security (RLS) que podem estar bloqueando o acesso às tabelas.

## Resumo

✅ Webhook agora é dinâmico e vem do banco de dados
✅ Cada condomínio pode ter seu próprio webhook
✅ Sistema tem fallback para webhook padrão
✅ Sem erros de compilação
✅ Servidor rodando em http://localhost:3001

## Seu webhook configurado

```
https://webhook.fbzia.com.br/webhook/entregaszap
```

Basta executar o script `database/update-webhook.sql` no Supabase para configurar!
