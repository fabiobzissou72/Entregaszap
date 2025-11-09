# Configuração do Storage para Fotos de Entregas

## Passo a Passo para Configurar o Supabase Storage

### 1. Acessar o Dashboard do Supabase

Acesse: https://ofaifvyowixzktwvxrps.supabase.co

### 2. Ir para Storage

- No menu lateral, clique em **Storage**
- Você verá a tela de gerenciamento de buckets

### 3. Criar o Bucket para Fotos

1. Clique no botão **"New Bucket"** ou **"Criar Bucket"**
2. Preencha os dados:
   - **Nome:** `entregas-fotos`
   - **Public bucket:** ✅ Marque como **Público** (para que as URLs sejam acessíveis)
   - **Allowed MIME types:** Deixe vazio ou adicione: `image/jpeg, image/png, image/jpg, image/webp`
   - **Maximum file size:** 5 MB (ou o tamanho que preferir)

3. Clique em **"Create Bucket"**

### 4. Configurar Políticas de Acesso (RLS)

Após criar o bucket, você precisa configurar as políticas de acesso. Vá em:
- **Storage** → **Policies** → **New Policy**

#### Política 1: Permitir Upload (INSERT)

```sql
-- Permitir qualquer um fazer upload de fotos
CREATE POLICY "Permitir upload de fotos"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'entregas-fotos');
```

#### Política 2: Permitir Leitura Pública (SELECT)

```sql
-- Permitir leitura pública das fotos
CREATE POLICY "Permitir leitura pública das fotos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'entregas-fotos');
```

#### Política 3: Permitir Deletar (DELETE)

```sql
-- Permitir deletar fotos
CREATE POLICY "Permitir deletar fotos"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'entregas-fotos');
```

### 5. Verificar Configuração

Para verificar se está tudo OK:

1. Vá em **Storage** → **entregas-fotos**
2. Tente fazer upload manual de uma imagem
3. Se conseguir, está funcionando!

### 6. Alternativa: Criar via SQL

Se preferir, você pode criar o bucket via SQL Editor:

```sql
-- Inserir bucket na tabela storage.buckets
INSERT INTO storage.buckets (id, name, public)
VALUES ('entregas-fotos', 'entregas-fotos', true)
ON CONFLICT (id) DO NOTHING;

-- Criar políticas
CREATE POLICY "Permitir upload de fotos"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'entregas-fotos');

CREATE POLICY "Permitir leitura pública das fotos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'entregas-fotos');

CREATE POLICY "Permitir deletar fotos"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'entregas-fotos');
```

## Como Funciona Agora

### Fluxo de Upload de Fotos:

1. **Usuário tira/seleciona uma foto** na página "Nova Entrega"
2. **Preview é mostrado** localmente
3. **Ao clicar em "Enviar Mensagem":**
   - Sistema faz **upload da foto para o Supabase Storage**
   - Obtém a **URL pública** da foto
   - Inclui a **URL no payload do webhook**
   - Salva a **URL no banco de dados** (campo `foto_url`)

### Estrutura de Armazenamento:

```
entregas-fotos/
  └── entregas/
      ├── entrega-1730812345678.jpg
      ├── entrega-1730812456789.jpg
      └── entrega-1730812567890.jpg
```

### URL Gerada:

```
https://ofaifvyowixzktwvxrps.supabase.co/storage/v1/object/public/entregas-fotos/entregas/entrega-1730812345678.jpg
```

## Payload do Webhook com Foto

Exemplo de payload enviado ao webhook quando há foto:

```json
{
  "condominio": "Condomínio ABC",
  "morador": "João da Silva",
  "mensagem": "Olá João, você tem uma nova encomenda!...",
  "telefone": "5511999999999",
  "codigo_retirada": "12345",
  "foto_url": "https://ofaifvyowixzktwvxrps.supabase.co/storage/v1/object/public/entregas-fotos/entregas/entrega-1730812345678.jpg"
}
```

## Banco de Dados

A URL da foto é salva automaticamente no campo `foto_url` da tabela `entregas`:

```sql
SELECT id, codigo_retirada, foto_url
FROM entregas
WHERE foto_url IS NOT NULL;
```

## Segurança

### Bucket Público vs Privado:

- **Público:** Qualquer pessoa com a URL pode ver a foto
- **Recomendado para este caso:** Público (para facilitar visualização no webhook)
- Se precisar de mais segurança, pode usar bucket privado e gerar URLs assinadas

### Tamanho de Arquivos:

- Configure limite de 5MB por arquivo
- Sistema aceita: JPG, PNG, JPEG, WEBP

### Proteção contra Abuso:

```sql
-- Adicionar limite de taxa (rate limiting) - exemplo
CREATE POLICY "Limitar uploads por IP"
ON storage.objects FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'entregas-fotos' AND
  (SELECT COUNT(*) FROM storage.objects
   WHERE bucket_id = 'entregas-fotos'
   AND created_at > NOW() - INTERVAL '1 hour') < 100
);
```

## Troubleshooting

### Erro: "Bucket not found"
- Certifique-se de que criou o bucket com nome exato: `entregas-fotos`

### Erro: "Permission denied"
- Verifique se criou as políticas de acesso (RLS)
- Certifique-se que o bucket está marcado como público

### Fotos não aparecem
- Verifique se as políticas de SELECT estão ativas
- Teste a URL manualmente no navegador

### Upload falha
- Verifique o tamanho do arquivo (máx 5MB)
- Verifique o tipo MIME (deve ser imagem)
- Veja os logs no console do navegador

## Testando

1. Acesse a aplicação: http://localhost:3001
2. Vá em "Nova Entrega"
3. Selecione um morador
4. Tire/envie uma foto
5. Envie a mensagem
6. Verifique:
   - URL da foto no console
   - Foto no bucket do Supabase
   - foto_url no banco de dados
   - foto_url no payload do webhook

## Links Úteis

- Dashboard Supabase: https://ofaifvyowixzktwvxrps.supabase.co
- Documentação Storage: https://supabase.com/docs/guides/storage
- Storage Policies: https://supabase.com/docs/guides/storage/security/access-control
