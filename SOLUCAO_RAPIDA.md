# 🔧 Solução Rápida - Problemas Resolvidos

## ✅ PROBLEMA IDENTIFICADO E CORRIGIDO!

O código estava tentando fazer upload para um bucket chamado **"entregas-fotos"**, mas o bucket no Supabase se chama **"Imagem Encomenda"**.

## 📝 O que foi corrigido automaticamente:

1. ✅ **storage-helpers.ts** - Atualizado para usar "Imagem Encomenda"
2. ✅ Upload de fotos
3. ✅ Obtenção de URL pública
4. ✅ Função de deletar fotos

## 🚀 PRÓXIMO PASSO (OBRIGATÓRIO):

Execute este script SQL no Supabase para configurar as permissões:

### Passo a Passo:

1. **Acesse o Supabase:**
   - URL: https://ofaifvyowixzktwvxrps.supabase.co

2. **Vá em SQL Editor**
   - Menu lateral → SQL Editor

3. **Execute este script:**

```sql
-- Remover políticas antigas
DROP POLICY IF EXISTS "Permitir upload de imagens encomenda" ON storage.objects;
DROP POLICY IF EXISTS "Permitir leitura pública das imagens encomenda" ON storage.objects;
DROP POLICY IF EXISTS "Permitir deletar imagens encomenda" ON storage.objects;
DROP POLICY IF EXISTS "Permitir atualizar imagens encomenda" ON storage.objects;

-- Criar política para UPLOAD
CREATE POLICY "Permitir upload de imagens encomenda"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'Imagem Encomenda');

-- Criar política para LEITURA pública
CREATE POLICY "Permitir leitura pública das imagens encomenda"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'Imagem Encomenda');

-- Criar política para DELETAR
CREATE POLICY "Permitir deletar imagens encomenda"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'Imagem Encomenda');

-- Criar política para ATUALIZAR
CREATE POLICY "Permitir atualizar imagens encomenda"
ON storage.objects FOR UPDATE
TO public
USING (bucket_id = 'Imagem Encomenda')
WITH CHECK (bucket_id = 'Imagem Encomenda');

-- Garantir que o bucket está público
UPDATE storage.buckets
SET public = true
WHERE name = 'Imagem Encomenda';
```

4. **Clique em RUN**

## 🧪 TESTAR AGORA:

1. **Acesse a aplicação:**
   - http://localhost:3000

2. **Vá em "Nova Entrega"**

3. **Preencha o formulário:**
   - Selecione condomínio, bloco, apartamento
   - Escolha o serviço
   - **Tire ou selecione uma foto**
   - (Opcional) Adicione observação

4. **Abra o Console do Navegador (F12)**
   - Veja a aba "Console"

5. **Clique em "Enviar Mensagem"**

## ✅ LOGS ESPERADOS (Console do Navegador):

```
📸 Iniciando upload da foto... foto.jpg
📁 Caminho do arquivo: entregas/entrega-1234567890.jpg
✅ Upload bem-sucedido!
🔗 URL pública gerada: https://ofaifvyowixzktwvxrps.supabase.co/storage/v1/object/public/Imagem%20Encomenda/entregas/entrega-1234567890.jpg
📸 foto_url adicionada ao payload: https://...
📤 Payload do webhook: {...}
💾 Salvando entrega no banco com dados: {...}
```

## ❌ SE DER ERRO:

### Erro: "new row violates row-level security policy"
**Solução:** Você esqueceu de executar o script SQL acima!

### Erro: "Bucket not found"
**Solução:** Verifique se o bucket "Imagem Encomenda" existe no Storage

### Erro de CORS no webhook
**Solução:** O webhook precisa permitir requisições de localhost:3000

## 🎯 CHECKLIST COMPLETO:

- [x] Código atualizado para usar bucket correto
- [ ] Script SQL executado no Supabase
- [ ] Teste de upload realizado
- [ ] Foto apareceu no bucket
- [ ] Webhook recebeu foto_url
- [ ] Entrega salva no banco com foto_url

## 📂 ARQUIVOS CRIADOS/MODIFICADOS:

1. **lib/storage-helpers.ts** ← MODIFICADO (bucket corrigido)
2. **database/fix-imagem-encomenda-policies.sql** ← CRIADO (configurar permissões)
3. **SOLUCAO_RAPIDA.md** ← Este arquivo

## 🆘 SUPORTE:

Se após executar o script SQL o problema persistir:

1. Abra o Console (F12)
2. Vá na aba "Network"
3. Tente enviar uma entrega
4. Copie os logs da aba "Console"
5. Envie para análise

## 🔗 WEBHOOK CONFIGURADO:

```
URL: https://webhook.fbzia.com.br/webhook/entregaszap
```

O webhook receberá:
- `condominio`
- `morador`
- `mensagem`
- `telefone`
- `codigo_retirada` (se for encomenda)
- `foto_url` (se houver foto) ← AGORA VAI FUNCIONAR!
- `observacao` (se houver) ← NOVO CAMPO IMPLEMENTADO!

## ✨ NOVO RECURSO IMPLEMENTADO:

**Campo de Observação** agora disponível em "Nova Entrega"!
- Use para registrar estado da encomenda (rasgada, amassada, etc.)
- Vai junto no webhook se preenchido
- Salvo no banco de dados

---

**Status:** ✅ Código corrigido, aguardando configuração SQL
**Servidor:** 🟢 Rodando em http://localhost:3000
