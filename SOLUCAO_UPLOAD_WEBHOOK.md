# Solução: Erro no Upload de Foto e Webhook Não Enviando

## Problema Identificado

1. **Upload da foto falhando** → Bucket não configurado no Supabase
2. **Webhook não enviando** → Possível erro CORS ou falha na requisição

## Solução Passo a Passo

### 1. Configurar o Storage no Supabase (URGENTE)

Execute este script no **SQL Editor do Supabase**:

```sql
-- Criar o bucket 'entregas-fotos' (público)
INSERT INTO storage.buckets (id, name, public)
VALUES ('entregas-fotos', 'entregas-fotos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "Permitir upload de fotos" ON storage.objects;
DROP POLICY IF EXISTS "Permitir leitura pública das fotos" ON storage.objects;
DROP POLICY IF EXISTS "Permitir deletar fotos" ON storage.objects;
DROP POLICY IF EXISTS "Permitir atualizar fotos" ON storage.objects;

-- Criar política para UPLOAD (INSERT)
CREATE POLICY "Permitir upload de fotos"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'entregas-fotos');

-- Criar política para LEITURA pública (SELECT)
CREATE POLICY "Permitir leitura pública das fotos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'entregas-fotos');

-- Criar política para DELETAR (DELETE)
CREATE POLICY "Permitir deletar fotos"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'entregas-fotos');

-- Criar política para ATUALIZAR (UPDATE)
CREATE POLICY "Permitir atualizar fotos"
ON storage.objects FOR UPDATE
TO public
USING (bucket_id = 'entregas-fotos')
WITH CHECK (bucket_id = 'entregas-fotos');
```

**Como executar:**
1. Acesse: https://ofaifvyowixzktwvxrps.supabase.co
2. Vá em **SQL Editor**
3. Copie e cole o script acima
4. Clique em **Run** ou **Executar**

### 2. Verificar se o Bucket Foi Criado

No Supabase Dashboard:
1. Vá em **Storage** no menu lateral
2. Você deve ver o bucket **"entregas-fotos"**
3. Ele deve estar marcado como **Público**

### 3. Testar o Webhook Manualmente

Abra o **Console do Navegador (F12)** e execute:

```javascript
// Teste do webhook
fetch('https://webhook.fbzia.com.br/webhook/entregaszap', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    condominio: "Teste",
    morador: "João Teste",
    mensagem: "Teste de webhook",
    telefone: "5511999999999",
    codigo_retirada: "12345"
  })
})
.then(response => {
  console.log('✅ Webhook Status:', response.status);
  return response.text();
})
.then(data => {
  console.log('✅ Webhook Response:', data);
})
.catch(error => {
  console.error('❌ Erro no webhook:', error);
});
```

### 4. Verificar Logs no Console

Quando você tentar enviar uma entrega, verifique no **Console do Navegador (F12)** se aparecem:

#### Logs esperados para SUCESSO:
```
📸 Iniciando upload da foto...
✅ Upload da foto bem-sucedido!
🔗 URL da foto: https://...
📤 Payload do webhook: {...}
💾 Salvando entrega no banco com dados: {...}
```

#### Logs esperados se houver ERRO no upload (mas webhook deve funcionar):
```
📸 Iniciando upload da foto...
❌ Erro ao fazer upload da foto
⚠️ Nenhuma foto_url para adicionar ao payload
📤 Payload do webhook: {...}  <-- DEVE APARECER MESMO SEM FOTO!
```

### 5. Possíveis Erros do Webhook

#### Erro CORS:
```
Access to fetch at 'https://webhook.fbzia.com.br/webhook/entregaszap' from origin 'http://localhost:3000' has been blocked by CORS policy
```

**Solução:** O servidor webhook precisa permitir requisições de `http://localhost:3000`. Adicione estes headers no servidor webhook:
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: POST, OPTIONS
Access-Control-Allow-Headers: Content-Type
```

#### Erro de Rede:
```
Failed to fetch
```

**Causas possíveis:**
- Webhook offline
- URL incorreta
- Firewall bloqueando
- Internet caiu

### 6. Fluxo Correto do Sistema

```
1. Usuário preenche formulário
   ↓
2. Seleciona/tira foto (opcional)
   ↓
3. Clica em "Enviar Mensagem"
   ↓
4. [SE HOUVER FOTO]
   - Upload para Supabase Storage
   - Se SUCESSO → obtém URL
   - Se FALHA → mostra alert, continua sem foto
   ↓
5. Envia webhook (COM ou SEM foto)
   ↓
6. [SE for Encomenda/Produtos]
   - Salva no banco de dados
   ↓
7. Mostra mensagem de sucesso
```

## Checklist de Resolução

- [ ] Executei o script SQL no Supabase para criar o bucket
- [ ] Verifiquei que o bucket 'entregas-fotos' aparece no Storage
- [ ] Testei o webhook manualmente no console e funcionou
- [ ] Abri o Console do Navegador (F12) para ver os logs
- [ ] Tentei enviar uma entrega SEM foto primeiro
- [ ] Depois tentei enviar COM foto

## Debug Avançado

### Verificar URL do Webhook no Código

O webhook está configurado como fallback em:
```javascript
const webhookUrl = selectedCondo?.webhookUrl || 'https://webhook.fbzia.com.br/webhook/entregaszap';
```

Para forçar o uso desse webhook específico, você pode temporariamente modificar para:
```javascript
const webhookUrl = 'https://webhook.fbzia.com.br/webhook/entregaszap';
```

### Testar Sem Foto Primeiro

1. Vá em "Nova Entrega"
2. Selecione morador e serviço
3. **NÃO selecione/tire foto**
4. Envie a mensagem
5. Veja se o webhook funciona

Se funcionar sem foto mas não com foto, o problema é 100% no Storage.

## Arquivos Criados

- `database/setup-storage.sql` - Script SQL para configurar o Storage

## Suporte

Se após executar todos os passos o problema persistir:

1. Copie TODOS os logs do Console (F12)
2. Tire um print da aba Network (F12 → Network) mostrando a requisição do webhook
3. Verifique se o bucket foi criado no Supabase
4. Envie essas informações para análise

## Webhook Configurado

```
URL: https://webhook.fbzia.com.br/webhook/entregaszap
Método: POST
Content-Type: application/json
```

## Próximos Passos Após Correção

1. Testar upload de foto
2. Verificar se foto aparece no bucket
3. Verificar se webhook recebe foto_url
4. Verificar se banco salva foto_url
5. Testar campo de observação
