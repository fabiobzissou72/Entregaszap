-- ============================================
-- Schema do Banco de Dados - Sistema de Entregas
-- ============================================

-- Function para atualizar o campo updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function alternativa para updated_at
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Tabela: condominios
-- ============================================
CREATE TABLE IF NOT EXISTS public.condominios (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    endereco TEXT NOT NULL,
    cidade TEXT NOT NULL,
    cep TEXT NOT NULL,
    telefone TEXT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    sindico_id UUID NULL,
    sindico_nome TEXT NULL,
    sindico_senha TEXT NULL,
    sindico_cpf TEXT NULL,
    sindico_telefone TEXT NULL,
    estado CHARACTER VARYING(2) NULL,
    ativo BOOLEAN NULL DEFAULT TRUE,
    email CHARACTER VARYING(255) NULL,
    cnpj CHARACTER VARYING(18) NULL,
    webhook_url TEXT NULL,
    CONSTRAINT condominios_pkey PRIMARY KEY (id)
) TABLESPACE pg_default;

-- ============================================
-- Tabela: funcionarios
-- ============================================
CREATE TABLE IF NOT EXISTS public.funcionarios (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    cpf TEXT NOT NULL,
    nome TEXT NOT NULL,
    senha TEXT NOT NULL,
    cargo TEXT NOT NULL DEFAULT 'porteiro',
    condominio_id UUID NOT NULL,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT funcionarios_pkey PRIMARY KEY (id),
    CONSTRAINT funcionarios_cpf_key UNIQUE (cpf),
    CONSTRAINT funcionarios_condominio_id_fkey FOREIGN KEY (condominio_id)
        REFERENCES condominios (id) ON DELETE CASCADE
) TABLESPACE pg_default;

-- Adicionar foreign key do sindico após criar funcionarios
ALTER TABLE public.condominios
    DROP CONSTRAINT IF EXISTS condominios_sindico_id_fkey,
    ADD CONSTRAINT condominios_sindico_id_fkey FOREIGN KEY (sindico_id)
        REFERENCES funcionarios (id) ON DELETE SET NULL;

-- ============================================
-- Tabela: moradores
-- ============================================
CREATE TABLE IF NOT EXISTS public.moradores (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    apartamento TEXT NOT NULL,
    bloco TEXT NULL,
    telefone TEXT NOT NULL,
    condominio_id UUID NOT NULL,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT moradores_pkey PRIMARY KEY (id),
    CONSTRAINT moradores_condominio_id_fkey FOREIGN KEY (condominio_id)
        REFERENCES condominios (id) ON DELETE CASCADE
) TABLESPACE pg_default;

-- ============================================
-- Tabela: entregas
-- ============================================
CREATE TABLE IF NOT EXISTS public.entregas (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    funcionario_id UUID NOT NULL,
    morador_id UUID NOT NULL,
    codigo_retirada TEXT NOT NULL,
    foto_url TEXT NULL,
    mensagem_enviada BOOLEAN NOT NULL DEFAULT FALSE,
    status TEXT NOT NULL DEFAULT 'pendente',
    data_entrega TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    data_retirada TIMESTAMP WITH TIME ZONE NULL,
    observacoes TEXT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    descricao_retirada TEXT NULL,
    condominio_id UUID NULL,
    ultimo_lembrete_enviado TIMESTAMP WITH TIME ZONE NULL,
    CONSTRAINT entregas_pkey PRIMARY KEY (id),
    CONSTRAINT entregas_condominio_id_fkey FOREIGN KEY (condominio_id)
        REFERENCES condominios (id) ON DELETE SET NULL,
    CONSTRAINT entregas_funcionario_id_fkey FOREIGN KEY (funcionario_id)
        REFERENCES funcionarios (id) ON DELETE CASCADE,
    CONSTRAINT entregas_morador_id_fkey FOREIGN KEY (morador_id)
        REFERENCES moradores (id) ON DELETE CASCADE,
    CONSTRAINT entregas_status_check CHECK (
        status IN ('pendente', 'retirada', 'cancelada')
    )
) TABLESPACE pg_default;

-- ============================================
-- Tabela: super_administradores
-- ============================================
CREATE TABLE IF NOT EXISTS public.super_administradores (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    cpf TEXT NOT NULL,
    senha TEXT NOT NULL,
    ativo BOOLEAN NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT TIMEZONE('utc', NOW()),
    CONSTRAINT super_administradores_pkey PRIMARY KEY (id),
    CONSTRAINT super_administradores_cpf_key UNIQUE (cpf)
) TABLESPACE pg_default;

-- ============================================
-- Índices
-- ============================================

-- Índices para funcionarios
CREATE INDEX IF NOT EXISTS idx_funcionarios_cpf
    ON public.funcionarios USING btree (cpf) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_funcionarios_condominio
    ON public.funcionarios USING btree (condominio_id) TABLESPACE pg_default;

-- Índices para moradores
CREATE INDEX IF NOT EXISTS idx_moradores_apartamento
    ON public.moradores USING btree (apartamento, bloco, condominio_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_moradores_condominio
    ON public.moradores USING btree (condominio_id) TABLESPACE pg_default;

-- Índices para entregas
CREATE INDEX IF NOT EXISTS idx_entregas_funcionario
    ON public.entregas USING btree (funcionario_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_entregas_morador
    ON public.entregas USING btree (morador_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_entregas_status
    ON public.entregas USING btree (status) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_entregas_condominio_id
    ON public.entregas USING btree (condominio_id) TABLESPACE pg_default;

-- ============================================
-- Triggers
-- ============================================

-- Triggers para condominios
DROP TRIGGER IF EXISTS update_condominios_updated_at ON condominios;
CREATE TRIGGER update_condominios_updated_at
    BEFORE UPDATE ON condominios
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Triggers para funcionarios
DROP TRIGGER IF EXISTS update_funcionarios_updated_at ON funcionarios;
CREATE TRIGGER update_funcionarios_updated_at
    BEFORE UPDATE ON funcionarios
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Triggers para moradores
DROP TRIGGER IF EXISTS update_moradores_updated_at ON moradores;
CREATE TRIGGER update_moradores_updated_at
    BEFORE UPDATE ON moradores
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Triggers para entregas
DROP TRIGGER IF EXISTS update_entregas_updated_at ON entregas;
CREATE TRIGGER update_entregas_updated_at
    BEFORE UPDATE ON entregas
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Triggers para super_administradores
DROP TRIGGER IF EXISTS handle_super_administradores_updated_at ON super_administradores;
CREATE TRIGGER handle_super_administradores_updated_at
    BEFORE UPDATE ON super_administradores
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();
