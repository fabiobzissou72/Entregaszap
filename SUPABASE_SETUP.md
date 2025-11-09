# Integração Supabase - Resumo Rápido

## Status da Integração

✅ Banco de dados Supabase conectado ao projeto
✅ Cliente Supabase configurado
✅ Tipos TypeScript criados
✅ Funções auxiliares implementadas
✅ Variáveis de ambiente configuradas

## Arquivos Criados

### 1. Configuração
- `.env` - Credenciais do Supabase (NÃO COMMITAR)
- `.env.example` - Template de variáveis de ambiente
- `lib/supabase.ts` - Cliente Supabase inicializado
- `lib/database.types.ts` - Tipos TypeScript das tabelas

### 2. Helpers e Utilitários
- `lib/database-helpers.ts` - Funções prontas para operações no banco
- `examples/EntregasExample.tsx` - Exemplos de uso

### 3. Documentação e Schema
- `DATABASE.md` - Documentação completa do banco
- `database/schema.sql` - Schema SQL das tabelas
- `SUPABASE_SETUP.md` - Este arquivo

## Como Usar

### 1. Iniciar o Projeto

```bash
npm install
npm run dev
```

### 2. Importar o Cliente Supabase

```typescript
import { supabase } from './lib/supabase';

// Fazer uma consulta
const { data, error } = await supabase
  .from('entregas')
  .select('*')
  .eq('status', 'pendente');
```

### 3. Usar Funções Auxiliares (Recomendado)

```typescript
import { fetchPendingDeliveries, createDelivery } from './lib/database-helpers';

// Buscar entregas pendentes
const entregas = await fetchPendingDeliveries();

// Criar nova entrega
const novaEntrega = await createDelivery({
  funcionario_id: 'uuid-funcionario',
  morador_id: 'uuid-morador',
  condominio_id: 'uuid-condominio',
  codigo_retirada: 'ABC123'
});
```

## Próximos Passos

### 1. Aplicar Schema no Supabase (IMPORTANTE!)

As tabelas precisam existir no seu banco de dados Supabase. Execute:

#### Opção A: Via Dashboard
1. Acesse https://ofaifvyowixzktwvxrps.supabase.co
2. Vá em **SQL Editor**
3. Copie e execute o conteúdo de `database/schema.sql`

#### Opção B: Via Supabase CLI
```bash
# Instalar CLI (se necessário)
npm install -g supabase

# Login
supabase login

# Aplicar schema
supabase db push
```

### 2. Configurar Row Level Security (RLS) - RECOMENDADO

Para segurança, habilite RLS nas tabelas:

```sql
-- Exemplo: apenas funcionários veem entregas do próprio condomínio
ALTER TABLE entregas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ver entregas do próprio condomínio"
ON entregas FOR SELECT
USING (
  condominio_id IN (
    SELECT condominio_id FROM funcionarios
    WHERE id = auth.uid()
  )
);
```

### 3. Configurar Storage (Opcional)

Se precisar armazenar fotos de entregas:

1. No Supabase Dashboard, vá em **Storage**
2. Crie um bucket chamado `entregas-fotos`
3. Configure políticas de acesso
4. Use o código:

```typescript
import { supabase } from './lib/supabase';

// Upload de foto
const uploadFoto = async (file: File, entregaId: string) => {
  const fileName = `${entregaId}-${Date.now()}.jpg`;

  const { data, error } = await supabase.storage
    .from('entregas-fotos')
    .upload(fileName, file);

  if (error) throw error;

  // Obter URL pública
  const { data: { publicUrl } } = supabase.storage
    .from('entregas-fotos')
    .getPublicUrl(fileName);

  return publicUrl;
};
```

### 4. Implementar Autenticação (Opcional)

Se precisar de login com email/senha:

```typescript
import { supabase } from './lib/supabase';

// Criar usuário
const { data, error } = await supabase.auth.signUp({
  email: 'usuario@exemplo.com',
  password: 'senha-segura'
});

// Login
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'usuario@exemplo.com',
  password: 'senha-segura'
});

// Logout
await supabase.auth.signOut();

// Verificar usuário logado
const { data: { user } } = await supabase.auth.getUser();
```

## Estrutura do Banco de Dados

### Tabelas Principais

1. **condominios** - Condomínios cadastrados
2. **funcionarios** - Porteiros, síndicos, etc
3. **moradores** - Moradores dos condomínios
4. **entregas** - Entregas registradas
5. **super_administradores** - Administradores do sistema

### Relacionamentos

```
condominios
    ├── funcionarios (1:N)
    ├── moradores (1:N)
    └── entregas (1:N)

funcionarios
    └── entregas (1:N)

moradores
    └── entregas (1:N)
```

## Funções Disponíveis em `database-helpers.ts`

### Entregas
- `fetchPendingDeliveries(condominioId?)` - Buscar entregas pendentes
- `fetchDeliveriesByStatus(status, condominioId?)` - Buscar por status
- `createDelivery(delivery)` - Criar nova entrega
- `markAsPickedUp(entregaId, descricao?)` - Marcar como retirada
- `cancelDelivery(entregaId, motivo?)` - Cancelar entrega
- `updateMessageSent(entregaId, enviada)` - Atualizar status de mensagem
- `updateLastReminder(entregaId)` - Atualizar último lembrete

### Moradores
- `fetchResidents(condominioId)` - Buscar moradores ativos
- `fetchResidentById(moradorId)` - Buscar por ID
- `createResident(morador)` - Criar novo morador
- `updateResident(moradorId, updates)` - Atualizar morador
- `deactivateResident(moradorId)` - Desativar morador

### Funcionários
- `fetchEmployees(condominioId)` - Buscar funcionários ativos
- `fetchEmployeeByCPF(cpf)` - Buscar por CPF
- `createEmployee(funcionario)` - Criar funcionário

### Condomínios
- `fetchCondominiums()` - Buscar todos ativos
- `fetchCondominiumById(condominioId)` - Buscar por ID
- `createCondominium(condominio)` - Criar condomínio

### Relatórios
- `fetchDeliveryStats(condominioId, startDate?, endDate?)` - Estatísticas
- `fetchDeliveriesNeedingReminder(horasAtraso)` - Entregas que precisam lembrete

## Variáveis de Ambiente

```env
VITE_SUPABASE_URL=https://ofaifvyowixzktwvxrps.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
```

## Troubleshooting

### Erro: "Supabase URL e Anon Key devem estar definidas"
- Certifique-se que o arquivo `.env` existe na raiz do projeto
- Verifique se as variáveis começam com `VITE_`
- Reinicie o servidor de desenvolvimento (`npm run dev`)

### Erro: "relation does not exist"
- As tabelas não foram criadas no Supabase
- Execute o arquivo `database/schema.sql` no SQL Editor do Supabase

### Erro 401 Unauthorized
- Verifique se a chave ANON_KEY está correta
- Configure políticas RLS adequadas

### Dados não aparecem
- Verifique se há dados nas tabelas (via Dashboard do Supabase)
- Verifique políticas RLS
- Verifique console do navegador para erros

## Links Úteis

- Dashboard do Supabase: https://ofaifvyowixzktwvxrps.supabase.co
- Documentação Supabase: https://supabase.com/docs
- Documentação do Cliente JS: https://supabase.com/docs/reference/javascript/introduction

## Segurança

⚠️ **IMPORTANTE:**
- NUNCA commite o arquivo `.env`
- Use apenas `ANON_KEY` no frontend
- `SERVICE_ROLE_KEY` deve ser usada APENAS no backend
- Configure RLS para proteger dados sensíveis
- Sempre hash senhas antes de salvar (bcrypt, argon2)
- Valide dados no backend antes de salvar

## Suporte

Se precisar de ajuda:
1. Verifique os arquivos de exemplo em `examples/`
2. Consulte `DATABASE.md` para documentação completa
3. Verifique logs no Dashboard do Supabase
4. Consulte a documentação oficial do Supabase
