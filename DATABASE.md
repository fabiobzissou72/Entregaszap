# Configuração do Banco de Dados Supabase

## Informações de Conexão

O projeto está configurado para usar o Supabase como banco de dados.

**URL do Projeto:** https://ofaifvyowixzktwvxrps.supabase.co

## Configuração Local

### 1. Variáveis de Ambiente

As credenciais do Supabase já foram configuradas no arquivo `.env`:

```env
VITE_SUPABASE_URL=https://ofaifvyowixzktwvxrps.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
```

### 2. Cliente Supabase

O cliente Supabase está configurado em `lib/supabase.ts` e pode ser importado em qualquer componente:

```typescript
import { supabase } from './lib/supabase';

// Exemplo de uso
const { data, error } = await supabase
  .from('entregas')
  .select('*')
  .eq('status', 'pendente');
```

## Estrutura do Banco de Dados

### Tabelas

#### 1. condominios
Armazena informações dos condomínios cadastrados.

**Campos principais:**
- `id` (UUID) - Identificador único
- `nome` (TEXT) - Nome do condomínio
- `endereco`, `cidade`, `cep`, `estado` - Informações de localização
- `telefone`, `email` - Contato
- `cnpj` - CNPJ do condomínio
- `sindico_id` - Referência ao funcionário síndico
- `webhook_url` - URL para webhooks
- `ativo` (BOOLEAN) - Status ativo/inativo

#### 2. funcionarios
Armazena os funcionários (porteiros, síndicos, etc).

**Campos principais:**
- `id` (UUID) - Identificador único
- `cpf` (TEXT UNIQUE) - CPF do funcionário
- `nome` (TEXT) - Nome completo
- `senha` (TEXT) - Senha (deve ser hash)
- `cargo` (TEXT) - Cargo (padrão: 'porteiro')
- `condominio_id` (UUID) - Referência ao condomínio
- `ativo` (BOOLEAN) - Status ativo/inativo

#### 3. moradores
Armazena os moradores dos condomínios.

**Campos principais:**
- `id` (UUID) - Identificador único
- `nome` (TEXT) - Nome do morador
- `apartamento` (TEXT) - Número do apartamento
- `bloco` (TEXT) - Bloco (opcional)
- `telefone` (TEXT) - Telefone para contato
- `condominio_id` (UUID) - Referência ao condomínio
- `ativo` (BOOLEAN) - Status ativo/inativo

#### 4. entregas
Armazena as entregas registradas.

**Campos principais:**
- `id` (UUID) - Identificador único
- `funcionario_id` (UUID) - Quem registrou a entrega
- `morador_id` (UUID) - Destinatário da entrega
- `condominio_id` (UUID) - Condomínio da entrega
- `codigo_retirada` (TEXT) - Código para retirada
- `foto_url` (TEXT) - URL da foto da entrega
- `status` (TEXT) - Status: 'pendente', 'retirada', 'cancelada'
- `mensagem_enviada` (BOOLEAN) - Se mensagem foi enviada
- `data_entrega` (TIMESTAMP) - Data/hora da entrega
- `data_retirada` (TIMESTAMP) - Data/hora da retirada
- `observacoes` (TEXT) - Observações adicionais
- `descricao_retirada` (TEXT) - Descrição da retirada
- `ultimo_lembrete_enviado` (TIMESTAMP) - Último lembrete

#### 5. super_administradores
Armazena os super administradores do sistema.

**Campos principais:**
- `id` (UUID) - Identificador único
- `nome` (TEXT) - Nome completo
- `cpf` (TEXT UNIQUE) - CPF
- `senha` (TEXT) - Senha (deve ser hash)
- `ativo` (BOOLEAN) - Status ativo/inativo

## Aplicar o Schema

### Método 1: Via Dashboard do Supabase
1. Acesse https://ofaifvyowixzktwvxrps.supabase.co
2. Vá para SQL Editor
3. Execute o conteúdo do arquivo `database/schema.sql`

### Método 2: Via CLI do Supabase
```bash
# Instalar CLI do Supabase (se necessário)
npm install -g supabase

# Aplicar migrations
supabase db push
```

## Exemplos de Uso

### Buscar Entregas Pendentes
```typescript
import { supabase } from './lib/supabase';

const fetchPendingDeliveries = async () => {
  const { data, error } = await supabase
    .from('entregas')
    .select(`
      *,
      morador:moradores(*),
      funcionario:funcionarios(*),
      condominio:condominios(*)
    `)
    .eq('status', 'pendente')
    .order('data_entrega', { ascending: false });

  if (error) {
    console.error('Erro ao buscar entregas:', error);
    return [];
  }

  return data;
};
```

### Registrar Nova Entrega
```typescript
const createDelivery = async (delivery: {
  funcionario_id: string;
  morador_id: string;
  condominio_id: string;
  codigo_retirada: string;
  foto_url?: string;
  observacoes?: string;
}) => {
  const { data, error } = await supabase
    .from('entregas')
    .insert([delivery])
    .select()
    .single();

  if (error) {
    console.error('Erro ao criar entrega:', error);
    throw error;
  }

  return data;
};
```

### Marcar Entrega como Retirada
```typescript
const markAsPickedUp = async (entregaId: string, descricao?: string) => {
  const { data, error } = await supabase
    .from('entregas')
    .update({
      status: 'retirada',
      data_retirada: new Date().toISOString(),
      descricao_retirada: descricao
    })
    .eq('id', entregaId)
    .select()
    .single();

  if (error) {
    console.error('Erro ao marcar entrega como retirada:', error);
    throw error;
  }

  return data;
};
```

### Buscar Moradores de um Condomínio
```typescript
const fetchResidents = async (condominioId: string) => {
  const { data, error } = await supabase
    .from('moradores')
    .select('*')
    .eq('condominio_id', condominioId)
    .eq('ativo', true)
    .order('nome');

  if (error) {
    console.error('Erro ao buscar moradores:', error);
    return [];
  }

  return data;
};
```

## Tipos TypeScript

Os tipos para todas as tabelas estão definidos em `lib/database.types.ts`. Você pode usá-los assim:

```typescript
import type { Database } from './lib/database.types';

type Entrega = Database['public']['Tables']['entregas']['Row'];
type NovaEntrega = Database['public']['Tables']['entregas']['Insert'];
type AtualizarEntrega = Database['public']['Tables']['entregas']['Update'];
```

## Segurança

- A chave `ANON_KEY` é segura para uso no frontend
- NUNCA exponha a `SERVICE_ROLE_KEY` no código do cliente
- Configure Row Level Security (RLS) no Supabase para proteger os dados
- Sempre valide dados no backend antes de salvar

## RLS (Row Level Security) - Recomendado

Para maior segurança, configure políticas RLS no Supabase:

```sql
-- Exemplo: Funcionários só podem ver entregas do seu condomínio
ALTER TABLE entregas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Funcionários veem entregas do próprio condomínio"
ON entregas FOR SELECT
USING (
  condominio_id IN (
    SELECT condominio_id FROM funcionarios
    WHERE id = auth.uid()
  )
);
```

## Observações Importantes

1. As tabelas já devem existir no seu Supabase, mas caso não existam, execute o arquivo `database/schema.sql`
2. Certifique-se de que as functions `update_updated_at_column()` e `handle_updated_at()` estejam criadas
3. Todos os campos de senha devem ser armazenados com hash (bcrypt, argon2, etc)
4. Configure backup automático no Supabase
5. Monitore os logs de erro no dashboard do Supabase
