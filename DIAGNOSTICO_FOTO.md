# Diagnóstico de Foto não Salvando no Banco 🔍

## Problema Atual

✅ Entregas estão sendo salvas no banco
❌ Mas o campo `foto_url` está NULL/vazio

## Passo a Passo para Diagnosticar

### 1. Verificar se o Bucket Existe ⚠️ IMPORTANTE!

Execute no SQL Editor do Supabase: `database/verificar-storage.sql`

```sql
SELECT id, name, public, created_at
FROM storage.buckets
WHERE name = 'entregas-fotos';
```

**Se retornar VAZIO:** O bucket NÃO existe! Você precisa criar.

#### Como Criar o Bucket:

**Opção A: Via Dashboard**
1. Acesse: https://ofaifvyowixzktwvxrps.supabase.co
2. Vá em **Storage** (menu lateral)
3. Clique em **"New Bucket"**
4. Nome: `entregas-fotos`
5. Marque: ✅ **Public bucket**
6. Clique em **"Create Bucket"**

**Opção B: Via SQL**
```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('entregas-fotos', 'entregas-fotos', true)
ON CONFLICT (id) DO NOTHING;
```

### 2. Verificar Políticas de Acesso

Execute no SQL Editor:

```sql
SELECT policyname, cmd
FROM pg_policies
WHERE schemaname = 'storage'
AND tablename = 'objects'
AND policyname LIKE '%entregas%';
```

**Se retornar VAZIO:** As políticas NÃO existem!

#### Criar Políticas:

```sql
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
```

### 3. Testar com Logs de Debug

Agora o código tem logs completos! Faça o seguinte:

1. **Abra o Console do Navegador** (F12)
2. **Vá em "Console"**
3. **Acesse a aplicação:** http://localhost:3001
4. **Vá em "Nova Entrega"**
5. **Tire ou selecione uma foto**
6. **Envie a mensagem**
7. **Observe os logs:**

#### Logs Esperados (Sucesso):

```
📸 Iniciando upload da foto... capture-1730812345678.jpg
📤 uploadPhoto: Iniciando upload...
📁 Caminho do arquivo: entregas/entrega-1730812345678.jpg
✅ Upload bem-sucedido! Data: {...}
🔗 URL pública gerada: https://...
✅ Upload da foto bem-sucedido!
🔗 URL da foto: https://ofaifvyowixzktwvxrps.supabase.co/storage/v1/object/public/entregas-fotos/entregas/entrega-1730812345678.jpg
📸 foto_url adicionada ao payload: https://...
📤 Payload do webhook: {...}
💾 Salvando entrega no banco com dados: {...}
📸 photoUrl sendo salvo: https://...
🔵 addDelivery chamada com: {...}
📸 photoUrl recebida: https://...
📦 Dados da entrega a serem salvos no banco: {...}
📸 foto_url que será salva: https://...
✅ Entrega salva no banco com sucesso!
📸 foto_url salva no banco: https://...
```

#### Possíveis Erros:

**❌ Erro: "Bucket not found"**
```
❌ Erro ao fazer upload da foto: Bucket not found
```
**Solução:** Crie o bucket (veja passo 1)

**❌ Erro: "Permission denied"**
```
❌ Erro ao fazer upload da foto: Permission denied
```
**Solução:** Configure as políticas (veja passo 2)

**❌ Erro: "photoUrl sendo salvo: NENHUMA"**
```
📸 photoUrl sendo salvo: NENHUMA
```
**Solução:** O upload falhou. Veja o erro anterior no console.

**❌ Erro: "Nenhuma foto selecionada"**
```
ℹ️ Nenhuma foto selecionada
```
**Solução:** Você não selecionou nenhuma foto!

### 4. Verificar no Banco de Dados

Execute no SQL Editor:

```sql
-- Ver última entrega
SELECT
    id,
    codigo_retirada,
    foto_url,
    created_at
FROM entregas
ORDER BY created_at DESC
LIMIT 1;
```

**Se foto_url está NULL:** O problema ainda está ocorrendo.

**Se foto_url tem valor:** Funcionou! ✅

### 5. Verificar Arquivos no Storage

Execute no SQL Editor:

```sql
SELECT name, created_at
FROM storage.objects
WHERE bucket_id = 'entregas-fotos'
ORDER BY created_at DESC
LIMIT 10;
```

**Se retornar VAZIO:** Nenhum arquivo foi enviado para o Storage.

**Se retornar arquivos:** Os uploads estão funcionando!

## Checklist Completo

Use este checklist para verificar tudo:

- [ ] Bucket `entregas-fotos` existe?
- [ ] Bucket está marcado como **público**?
- [ ] 3 políticas de acesso existem? (INSERT, SELECT, DELETE)
- [ ] Console mostra "✅ Upload bem-sucedido!"?
- [ ] Console mostra URL da foto?
- [ ] Console mostra "foto_url salva no banco"?
- [ ] SQL mostra foto_url na tabela entregas?
- [ ] SQL mostra arquivos na tabela storage.objects?

## Soluções Rápidas

### Problema: Bucket não existe
```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('entregas-fotos', 'entregas-fotos', true);
```

### Problema: Políticas não existem
Execute o script completo em `database/setup-storage.md` ou:
```sql
CREATE POLICY "Permitir upload de fotos"
ON storage.objects FOR INSERT TO public
WITH CHECK (bucket_id = 'entregas-fotos');

CREATE POLICY "Permitir leitura pública das fotos"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'entregas-fotos');

CREATE POLICY "Permitir deletar fotos"
ON storage.objects FOR DELETE TO public
USING (bucket_id = 'entregas-fotos');
```

### Problema: Foto não está sendo selecionada
- Verifique se o botão de câmera está funcionando
- Tente usar "Selecionar arquivo" em vez de tirar foto
- Veja se o preview da foto aparece

## Como Testar Depois de Corrigir

1. **Configure bucket e políticas** (se ainda não fez)
2. **Recarregue a aplicação** (F5)
3. **Abra Console** (F12)
4. **Vá em "Nova Entrega"**
5. **Selecione uma foto**
6. **Envie**
7. **Veja os logs no console**
8. **Verifique no SQL:**

```sql
SELECT foto_url FROM entregas ORDER BY created_at DESC LIMIT 1;
```

9. **Se foto_url tem valor:** ✅ FUNCIONOU!

## Arquivos Modificados (com Debug)

- ✅ `components/NewDelivery.tsx` - Logs de upload
- ✅ `lib/storage-helpers.ts` - Logs detalhados de upload
- ✅ `App.tsx` - Logs de salvamento no banco
- ✅ `database/verificar-storage.sql` (NOVO) - Script de verificação

## Próximos Passos

Após seguir este guia:

1. **Execute `database/verificar-storage.sql`**
2. **Crie o bucket se não existir**
3. **Crie as políticas se não existirem**
4. **Teste novamente com uma foto**
5. **Veja os logs no console**
6. **Me mostre o que apareceu no console!**

## Suporte

Se depois de tudo isso ainda não funcionar, me envie:

1. **Resultado do script** `verificar-storage.sql`
2. **Logs completos do console** (F12 → Console)
3. **Screenshot do erro** (se houver)

Vou ajudar a identificar o problema específico!

---

**Próximo passo:** Execute o script `database/verificar-storage.sql` e me diga o resultado! 🔍
