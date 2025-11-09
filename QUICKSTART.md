# Guia de Início Rápido - Supabase

## ✅ O que já está pronto

1. Cliente Supabase instalado e configurado
2. Variáveis de ambiente criadas (.env)
3. Tipos TypeScript gerados
4. Funções auxiliares para todas as operações
5. Exemplos de código prontos

## ⚡ Próximos Passos

### Passo 1: Criar Tabelas no Supabase (OBRIGATÓRIO)

As tabelas ainda não existem no seu banco de dados. Você precisa criá-las:

1. Acesse: https://ofaifvyowixzktwvxrps.supabase.co
2. Faça login
3. Vá em **SQL Editor** (menu lateral esquerdo)
4. Clique em **New Query**
5. Copie todo o conteúdo do arquivo `database/schema.sql`
6. Cole no editor
7. Clique em **RUN** (ou pressione Ctrl+Enter)

✅ Você verá mensagens de sucesso quando as tabelas forem criadas.

### Passo 2: Testar a Conexão

Execute o projeto:

```bash
npm run dev
```

Abra o console do navegador (F12) e teste:

```javascript
// Cole no console do navegador
import { supabase } from './lib/supabase';

const test = await supabase.from('condominios').select('*');
console.log(test);
```

Se retornar `{ data: [], error: null }` - Sucesso! ✅

### Passo 3: Inserir Dados de Teste

No SQL Editor do Supabase, execute:

```sql
-- Inserir um condomínio de teste
INSERT INTO condominios (nome, endereco, cidade, cep, estado)
VALUES ('Condomínio Teste', 'Rua Teste, 123', 'São Paulo', '01234-567', 'SP');

-- Buscar o ID do condomínio criado
SELECT id, nome FROM condominios;

-- Copie o ID e use no próximo INSERT (substitua 'SEU-UUID-AQUI')

-- Inserir um funcionário de teste
INSERT INTO funcionarios (cpf, nome, senha, condominio_id)
VALUES ('12345678900', 'João Porteiro', 'senha123', 'SEU-UUID-AQUI');

-- Inserir um morador de teste
INSERT INTO moradores (nome, apartamento, telefone, condominio_id)
VALUES ('Maria Silva', '101', '11999887766', 'SEU-UUID-AQUI');
```

### Passo 4: Testar com Dados Reais

Crie um componente de teste ou use o console:

```typescript
import {
  fetchCondominiums,
  fetchPendingDeliveries,
  createDelivery
} from './lib/database-helpers';

// Buscar condomínios
const condominios = await fetchCondominiums();
console.log('Condomínios:', condominios);

// Buscar entregas pendentes
const entregas = await fetchPendingDeliveries();
console.log('Entregas pendentes:', entregas);
```

## 🚀 Usar no Projeto

### Exemplo 1: Listar Entregas em um Componente

```typescript
import { useEffect, useState } from 'react';
import { fetchPendingDeliveries } from './lib/database-helpers';

export function ListaEntregas() {
  const [entregas, setEntregas] = useState([]);

  useEffect(() => {
    async function load() {
      const data = await fetchPendingDeliveries();
      setEntregas(data);
    }
    load();
  }, []);

  return (
    <div>
      <h2>Entregas Pendentes</h2>
      {entregas.map(entrega => (
        <div key={entrega.id}>
          <p>Código: {entrega.codigo_retirada}</p>
          <p>Morador: {entrega.morador?.nome}</p>
        </div>
      ))}
    </div>
  );
}
```

### Exemplo 2: Criar Nova Entrega

```typescript
import { createDelivery } from './lib/database-helpers';

async function registrarEntrega(
  funcionarioId: string,
  moradorId: string,
  condominioId: string
) {
  const codigo = Math.random().toString(36).substring(2, 8).toUpperCase();

  const entrega = await createDelivery({
    funcionario_id: funcionarioId,
    morador_id: moradorId,
    condominio_id: condominioId,
    codigo_retirada: codigo,
    observacoes: 'Entrega de encomenda'
  });

  console.log('Entrega criada:', entrega);
  return entrega;
}
```

### Exemplo 3: Marcar como Retirada

```typescript
import { markAsPickedUp } from './lib/database-helpers';

async function retirarEntrega(entregaId: string) {
  const entrega = await markAsPickedUp(
    entregaId,
    'Retirada pelo morador com documento'
  );

  console.log('Entrega retirada:', entrega);
}
```

## 📚 Documentação

- **SUPABASE_SETUP.md** - Guia completo de setup e configuração
- **DATABASE.md** - Documentação detalhada do banco de dados
- **lib/database-helpers.ts** - Todas as funções disponíveis
- **examples/EntregasExample.tsx** - Exemplos práticos de uso

## 🔒 Segurança (Importante!)

### Habilitar Row Level Security (RLS)

Por padrão, suas tabelas estão desprotegidas. Configure RLS:

1. No Supabase Dashboard, vá em **Authentication** > **Policies**
2. Para cada tabela, clique em **Enable RLS**
3. Crie políticas de acesso

Exemplo de política básica:

```sql
-- Permitir leitura pública (enquanto testa)
CREATE POLICY "Permitir leitura pública"
ON entregas FOR SELECT
USING (true);

-- Permitir inserção pública (enquanto testa)
CREATE POLICY "Permitir inserção pública"
ON entregas FOR INSERT
WITH CHECK (true);
```

⚠️ **ATENÇÃO:** Estas políticas são apenas para desenvolvimento. Em produção, crie políticas mais restritivas!

## 🐛 Resolução de Problemas

### "relation does not exist"
→ Você não executou o `schema.sql`. Vá para o Passo 1.

### "Invalid API key"
→ Verifique se o `.env` tem as chaves corretas.

### "null is not an object"
→ Certifique-se que o servidor está rodando (`npm run dev`).

### Dados não aparecem
→ Verifique se inseriu dados de teste (Passo 3).

## 🎯 Checklist

- [ ] Executei `database/schema.sql` no Supabase SQL Editor
- [ ] Inseri dados de teste
- [ ] Testei buscar dados com `fetchCondominiums()`
- [ ] O arquivo `.env` existe e está configurado
- [ ] O servidor está rodando (`npm run dev`)
- [ ] Li a documentação em `DATABASE.md`
- [ ] Configurei Row Level Security (RLS)

## 🆘 Precisa de Ajuda?

1. Verifique os logs no console do navegador (F12)
2. Verifique os logs no Supabase Dashboard > Logs
3. Consulte `DATABASE.md` para detalhes das tabelas
4. Veja exemplos em `examples/EntregasExample.tsx`

---

**Pronto para começar! 🚀**

Execute `npm run dev` e comece a usar o Supabase no seu projeto!
