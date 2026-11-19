# Pátio Escolar

Rede social escolar com grupos, mensagens, tags e quadro de avisos
para alunos, professores e gestão.

## Requisitos
- Node.js 18 ou superior
- Git
- PostgreSQL 14 ou superior (só quando a API for ligada ao banco)

## Como instalar e rodar
1. Clone o repositório:

       git clone https://github.com/SEU-USUARIO/patio-escolar.git
       cd patio-escolar

2. Instale as dependências:

       npm install

3. Copie o arquivo de variáveis e preencha com seus dados:

       cp .env.example .env

   Preencha `JWT_SECRET` (gere com `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`) e os dados do banco.

4. Crie o banco e as tabelas, e o primeiro administrador:

       createdb patio_escolar
       npm run db:init
       ADMIN_SENHA='uma-senha-forte' npm run admin:criar -- "Seu Nome" voce@escola.com

5. Inicie o servidor:

       npm run dev

6. Abra http://localhost:3000

> O login, o cadastro, a recuperação de senha e o painel administrativo usam a API (`/api/auth`, `/api/admin`) e o PostgreSQL.
> Grupos, mensagens, tags e avisos ainda são um protótipo que guarda os dados no navegador (localStorage); cada um vira API na Fase 5c.
> Veja `docs/guia-fase5.md`.

Testes: `TEST_DATABASE_URL=postgres://... npm test` (use um banco só de teste). O roteiro completo da Fase 6, com a tabela de resultados, está em `docs/plano-de-testes-fase6.md`.

## Dados de exemplo
Crie sua conta e entre na sala de exemplo com o código `8B2026`.

## Estrutura de pastas

    src/
      routes/         rotas da API
      controllers/    recebem a requisição e devolvem a resposta
      services/       regras de negócio
      repositories/   consultas ao banco
      middlewares/    login, permissão por papel, erros
      config/         conexão com o banco e variáveis
      app.js          servidor
    database/         script do banco
    public/           o site: index.html (landing), app.html (aplicativo), privacidade.html
    scripts/          preparar o banco e criar o administrador
    tests/            testes automatizados da API
    docs/             documentação e histórias de usuário

## Fluxo de trabalho (Git Flow)
- `main`: versão estável, só recebe Pull Request revisado.
- `develop`: integração do time.
- `feature/nome`: uma branch por tarefa, criada a partir de `develop`.

## Equipe
- Nome 1 – função
- Nome 2 – função
