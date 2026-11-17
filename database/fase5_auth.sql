-- Fase 5b: tabelas do sistema de login.
-- Pode ser rodado mais de uma vez (idempotente). Se o script da Fase 2 já criou
-- a tabela "usuarios", as colunas novas são acrescentadas com ALTER TABLE.

CREATE TABLE IF NOT EXISTS usuarios (
  id                 BIGSERIAL PRIMARY KEY,
  nome               VARCHAR(80)  NOT NULL,
  email              VARCHAR(254) UNIQUE,
  telefone           VARCHAR(15)  UNIQUE,          -- só dígitos, com DDD
  senha_hash         VARCHAR(100) NOT NULL,        -- bcrypt, nunca a senha em texto
  perfil             VARCHAR(12)  NOT NULL DEFAULT 'cliente'
                     CHECK (perfil IN ('cliente', 'profissional', 'admin')),  -- nível de acesso no sistema
  papel_escolar      VARCHAR(10)  NOT NULL DEFAULT 'aluno'
                     CHECK (papel_escolar IN ('aluno', 'professor', 'gestao')), -- quem a pessoa é na escola
  ativo              BOOLEAN      NOT NULL DEFAULT TRUE,
  token_version      INTEGER      NOT NULL DEFAULT 0, -- aumenta para invalidar todos os tokens do usuário
  aceite_politica_em TIMESTAMPTZ,
  politica_versao    VARCHAR(20),
  criado_em          TIMESTAMPTZ  NOT NULL DEFAULT now(),
  atualizado_em      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  CONSTRAINT usuarios_contato_ck CHECK (email IS NOT NULL OR telefone IS NOT NULL)
);

-- Caso "usuarios" já exista (Fase 2), garante as colunas usadas pela API.
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS telefone           VARCHAR(15);
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS senha_hash         VARCHAR(100);
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS perfil             VARCHAR(12) NOT NULL DEFAULT 'cliente';
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS papel_escolar      VARCHAR(10) NOT NULL DEFAULT 'aluno';
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS ativo              BOOLEAN     NOT NULL DEFAULT TRUE;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS token_version      INTEGER     NOT NULL DEFAULT 0;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS aceite_politica_em TIMESTAMPTZ;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS politica_versao    VARCHAR(20);
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS atualizado_em      TIMESTAMPTZ NOT NULL DEFAULT now();

-- Garante a restrição do papel escolar também quando a tabela veio da Fase 2.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'usuarios_papel_escolar_ck') THEN
    BEGIN
      ALTER TABLE usuarios ADD CONSTRAINT usuarios_papel_escolar_ck
        CHECK (papel_escolar IN ('aluno', 'professor', 'gestao'));
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

-- E-mail e telefone únicos mesmo se a tabela veio da Fase 2 sem a restrição.
CREATE UNIQUE INDEX IF NOT EXISTS usuarios_email_uq    ON usuarios (email)    WHERE email    IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS usuarios_telefone_uq ON usuarios (telefone) WHERE telefone IS NOT NULL;

-- Códigos de recuperação de senha: guardamos só o hash do código (SHA-256).
CREATE TABLE IF NOT EXISTS recuperacoes_senha (
  id          BIGSERIAL PRIMARY KEY,
  usuario_id  BIGINT      NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  codigo_hash CHAR(64)    NOT NULL UNIQUE,
  expira_em   TIMESTAMPTZ NOT NULL,             -- validade curta (30 min)
  usado_em    TIMESTAMPTZ,                      -- uso único
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS recuperacoes_usuario_idx ON recuperacoes_senha (usuario_id);

-- Tokens encerrados no logout (lista de revogação, pelo "jti" do JWT).
CREATE TABLE IF NOT EXISTS tokens_revogados (
  jti       CHAR(32)    PRIMARY KEY,
  expira_em TIMESTAMPTZ NOT NULL                -- depois disso o token já seria recusado de qualquer forma
);
CREATE INDEX IF NOT EXISTS tokens_revogados_expira_idx ON tokens_revogados (expira_em);
