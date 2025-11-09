# 🚀 Plano de Refatoração Completa - Sistema de Entregas ZAP

## 📋 Problemas Atuais a Resolver:

1. ✅ Upload de fotos funcionando
2. ❌ Webhook não está sendo ativado (mesmo com mensagem de sucesso)
3. ❌ Erro ao confirmar retirada: "entrega não encontrada"
4. ❌ Sistema sem autenticação adequada
5. ❌ Campo "bloco" obrigatório (mas nem todos têm)
6. ❌ Sem filtro automático por condomínio do usuário

## 🎯 Objetivos da Refatoração:

### 1. Sistema de Autenticação Completo

**Página de Login Universal:**
- CPF + Senha
- Identifica automaticamente tipo de usuário:
  - Funcionário → Dashboard Funcionário
  - Síndico → Dashboard Síndico
  - Super Admin → Dashboard Super Admin

**Fluxo de Login:**
```
1. Usuário digita CPF e senha
2. Sistema busca em:
   - super_administradores (super admin)
   - funcionarios (funcionário)
   - condominios.sindico_cpf (síndico)
3. Autentica e direciona para dashboard apropriado
4. Armazena sessão (localStorage/sessionStorage)
```

### 2. Dashboard do Funcionário

**Características:**
- Auto-carrega condomínio do funcionário
- Não precisa selecionar condomínio
- Pode registrar entregas apenas do seu condomínio
- Pode confirmar retiradas
- Vê apenas entregas do seu condomínio

**Páginas:**
- Nova Entrega (sem seletor de condomínio)
- Entregas Pendentes
- Histórico de Retiradas
- Lembretes

### 3. Dashboard do Síndico

**Características:**
- Auto-carrega condomínio do síndico
- Vê todos os funcionários do condomínio
- Pode adicionar/remover moradores
- Pode adicionar/remover funcionários
- Relatórios completos do condomínio
- Configurar webhook do condomínio

**Páginas:**
- Dashboard com estatísticas
- Gerenciar Moradores
- Gerenciar Funcionários
- Relatórios
- Configurações (webhook próprio)

### 4. Dashboard do Super Admin

**Características:**
- Controla TUDO
- Vê todos os condomínios
- Pode criar/editar/deletar tudo
- Configura webhook global
- Acesso a todos os relatórios

**Páginas:**
- Dashboard Global (todos os condomínios)
- Gerenciar Condomínios
- Gerenciar Síndicos
- Gerenciar Funcionários (todos)
- Gerenciar Moradores (todos)
- Configurações Globais
  - Webhook Global
  - Webhooks por Condomínio
- Relatórios Globais
- Logs do Sistema

### 5. Melhorias Técnicas

**Bloco Opcional:**
- Campo `bloco` passa a ser opcional
- Sistema detecta se condomínio usa blocos
- Interface se adapta

**Webhook Inteligente:**
- Webhook por condomínio tem prioridade
- Se não tiver, usa webhook global
- Fallback para webhook padrão

**Retiradas Corrigidas:**
- Buscar entrega por UUID correto
- Adapter correto entre IDs locais e UUIDs

## 🗂️ Estrutura de Arquivos Nova:

```
components/
  ├── auth/
  │   ├── Login.tsx          (Página de login universal)
  │   └── AuthContext.tsx    (Context para autenticação)
  │
  ├── funcionario/
  │   ├── FuncionarioDashboard.tsx
  │   ├── NovaEntregaFunc.tsx
  │   └── MinhasRetiradas.tsx
  │
  ├── sindico/
  │   ├── SindicoDashboard.tsx
  │   ├── GerenciarMoradores.tsx
  │   ├── GerenciarFuncionarios.tsx
  │   ├── RelatoriosSindico.tsx
  │   └── ConfiguracoesSindico.tsx
  │
  ├── superadmin/
  │   ├── SuperAdminDashboard.tsx
  │   ├── GerenciarCondominios.tsx
  │   ├── GerenciarSindicos.tsx
  │   ├── GerenciarFuncionariosSA.tsx
  │   ├── ConfiguracoesGlobais.tsx
  │   └── RelatoriosGlobais.tsx
  │
  └── shared/
      ├── Header.tsx
      ├── Sidebar.tsx
      └── Stats.tsx
```

## 📊 Fluxograma do Sistema:

```
┌─────────────┐
│ Login Page  │
└──────┬──────┘
       │
       ├── CPF em super_administradores?
       │   └── Sim → Super Admin Dashboard
       │
       ├── CPF em funcionarios?
       │   └── Sim → Funcionário Dashboard (condominio_id)
       │
       └── CPF em condominios (sindico)?
           └── Sim → Síndico Dashboard (condominio_id)
```

## 🔧 Correções Específicas:

### 1. Webhook Não Chamado

**Problema:** Mensagem de sucesso mas webhook não ativa

**Investigação:**
- Logs mostram payload sendo montado
- Mas requisição não é feita
- Possível problema de fluxo assíncrono

**Solução:**
- Remover early returns
- Garantir que loop completo execute
- Adicionar timeout de debug

### 2. Erro ao Confirmar Retirada

**Problema:** "Entrega não encontrada" mas está no banco

**Causa Provável:**
- Mismatch entre ID local (number) e UUID do banco
- Adapter não converte corretamente

**Solução:**
- Corrigir `numberToUuid` em adapters
- Garantir busca por UUID correto
- Melhorar error handling

### 3. Bloco Opcional

**Solução:**
- Adicionar campo `usa_blocos` em condominios
- Condicionar UI baseado nesse flag
- Permitir bloco NULL no banco

## ⏱️ Ordem de Implementação:

1. ✅ **Criar sistema de autenticação** (Login + AuthContext)
2. ✅ **Refatorar App.tsx** para usar autenticação
3. ✅ **Dashboard Funcionário** (mais simples)
4. ✅ **Dashboard Síndico**
5. ✅ **Dashboard Super Admin**
6. ✅ **Corrigir webhook**
7. ✅ **Corrigir retiradas**
8. ✅ **Bloco opcional**
9. ✅ **Testes finais**

## 🚀 Vamos Começar!

Implementando na ordem acima para economizar tempo e ter um sistema funcional incremental.
