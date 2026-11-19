# Fase 5 — Desenvolvimento: guia e situação

## 1. Ordem da fase 5 (situação atual)

| Ordem | Módulo | Situação |
|:-:|---|---|
| 5a | Landing page | **Feita.** `public/index.html` + `landing.css`, com imagens WebP/JPG, favicon, SEO e política de privacidade. |
| 5b | Sistema de login | **Feito e testado.** API `/api/auth/*`, middlewares, perfis, telas em `public/app.html`. 42 testes automatizados com PostgreSQL. |
| 5c | Funcionalidades principais | **Ainda em protótipo.** Grupos, mensagens, tags e avisos funcionam no navegador (`localStorage`), sem API. Falta fazer uma por vez, na ordem da seção 3. |
| 5d | Painel administrativo | **Feito para usuários** (`/api/admin/usuarios` + tela "Painel"). "Serviços" não existe neste projeto; se surgir um cadastro de apoio (ex.: categorias de aviso), siga o mesmo molde. |

Na versão recebida o protótipo (5c) estava na frente da landing e do login, e o servidor só entregava arquivos. Agora o protótipo só abre depois do login real; o que ele guarda (grupos, mensagens) continua local até cada funcionalidade ganhar sua API.

## 2. Perfis

- **Perfil de acesso** (no sistema, vai no middleware): `cliente` (todo usuário da escola), `profissional` (equipe que trabalha no site, consulta o painel) e `admin`.
- **Papel escolar** (na escola): `aluno`, `professor`, `gestao`. É escolhido no cadastro e usado pelas telas (quem publica avisos, mascote).
- O cadastro público **sempre** cria `cliente`. `profissional` e `admin` só nascem pelo painel ou por `npm run admin:criar`.
- Decisão para você validar: hoje qualquer pessoa pode se declarar "professor" ou "gestão" no cadastro. Se isso for um problema, a 5c deve exigir aprovação (ex.: o admin confirma o papel).

## 3. Roteiro por funcionalidade (prioridades "Deve" do MoSCoW)

Faça **uma de cada vez**, nesta ordem (cada uma depende da anterior):

| # | História | Branch | Rotas sugeridas | Regras de negócio (service) | Casos de erro para testar |
|:-:|---|---|---|---|---|
| 1 | Criar grupo | `feature/criar-grupo` | `POST /api/grupos` | Nome 2–50, tipo válido; gera código único de 6 caracteres; criador vira membro e dono. | 401 sem login; 400 nome vazio/tipo inválido; 429 se limitar criação. |
| 2 | Entrar em grupo | `feature/entrar-em-grupo` | `POST /api/grupos/entrar` (corpo: `codigo`) | Código maiúsculo; não duplica membro; aplica tag automática do papel. | 401; 404 código inexistente; 200 se já é membro; 400 sem código. |
| 3 | Enviar mensagem | `feature/enviar-mensagem` | `POST /api/grupos/:id/mensagens` | Só membro envia; texto até N caracteres ou imagem (tipo e tamanho validados); pelo menos um dos dois. | 401; 403 não é membro; 404 grupo; 400 vazia/imagem inválida; 413 imagem grande. |
| 4 | Receber mensagem | `feature/receber-mensagem` | `GET /api/grupos/:id/mensagens?depois=<id>` | Só membro lê; ordem cronológica; paginação por cursor. | 401; 403; 404; 400 cursor inválido. |
| 5 | Criar tags | `feature/criar-tags` | `POST/PATCH/DELETE /api/grupos/:id/tags` | Só professor/dono do grupo; nome único no grupo; cor válida (hex). | 403 aluno; 409 nome repetido; 400 cor inválida. |
| 6 | Aplicar tags | `feature/aplicar-tags` | `PUT /api/grupos/:id/membros/:usuarioId/tags` | Só quem gerencia; tags precisam ser do mesmo grupo. | 403; 404 membro; 400 tag de outro grupo. |
| 7 | Quadro de avisos | `feature/quadro-de-avisos` | `POST /api/grupos/:id/avisos`, `PATCH`, `DELETE` | Só professor/gestão membro do grupo; título, categoria, data opcional, fixar. | 403 aluno; 400 título vazio/categoria inválida; 404. |
| 8 | Ler avisos | `feature/ler-avisos` | `GET /api/avisos` e `GET /api/grupos/:id/avisos` | Só avisos dos grupos do usuário; fixados no topo; próximos antes dos passados. | 401; 403/404 grupo alheio. |

Cada rota entra em `src/routes/<nome>.routes.js`, registrada em `src/routes/index.js`, usando `autenticar` (e `exigirPerfil` quando for restrita por perfil). Tabelas novas vão em um arquivo `database/fase5_<nome>.sql` idempotente.

### Lista de tarefas de cada funcionalidade

1. **Crie a branch** a partir da `develop`:
   ```
   git checkout develop && git pull
   git checkout -b feature/nome-da-funcionalidade
   ```
2. **Back-end**, nesta ordem de arquivos:
   - `repositories/x.repository.js`: só SQL, sempre com `$1, $2…` (nunca concatenar texto).
   - `services/x.service.js`: regras de negócio e validação (lance `AppError(status, mensagem, campos)`).
   - `controllers/x.controller.js`: lê `req`, chama o service, responde com o status certo.
   - `routes/x.routes.js` + registro em `routes/index.js`.
3. **Teste a rota no Postman ou Insomnia**, incluindo erros: sem token (401), perfil errado (403), dado inválido (400), item inexistente (404), repetido (409). Importe `docs/postman/patio-auth.postman_collection.json` como modelo e duplique as pastas. Depois escreva o mesmo cenário em `tests/x.test.js` (copie o estilo de `tests/auth.test.js`).
4. **Front-end**: troque a lógica de `localStorage` dessa funcionalidade em `public/app/app.js` por chamadas via `PatioAPI` (`public/app/api.js`). A tela precisa de três estados: **carregando** (texto ou botão desabilitado), **sucesso** (`toast`) e **erro** (mensagem do servidor ao lado do campo ou `toast` em vermelho).
5. **Critérios de aceitação**: abra `docs/historias-de-usuario.md`, confira cada critério da história na tela real, rode `npm test` e abra o Pull Request para `develop` descrevendo o que mudou e como testar.
   ```
   git add . && git commit -m "feat: nome da funcionalidade"
   git push -u origin feature/nome-da-funcionalidade
   ```
6. **Revisão e merge**: depois da aprovação, faça o merge na `develop` (Pull Request) e mova o cartão para **Pronto**.

## 4. Checklist do site

| Item | Situação |
|---|---|
| Uso em 360, 768 e 1280 px | Conferido no navegador (landing, privacidade, login/cadastro, painel): sem rolagem horizontal. |
| Imagens otimizadas e com texto alternativo | `public/img/*.webp` (+ JPG de reserva), `srcset`, `width`/`height`, `loading="lazy"`, `alt` descritivo. |
| Link da política de privacidade no rodapé | Em todas as páginas públicas; também no cadastro. **Preencha o responsável e o contato** em `privacidade.html`. |
| Botão principal leva ao cadastro | "Criar minha conta" → `/app.html#cadastro`. |
| Favicon e nome do site | `favicon.svg`, `.ico`, ícones PNG, `site.webmanifest`; nome "Pátio Escolar". |
| `<title>` e meta description | Preenchidos em todas as páginas (a landing também tem Open Graph). |

## 5. API de autenticação

| Rota | O que faz | Sucesso |
|---|---|---|
| `POST /api/auth/register` | Cria a conta | 201 Created |
| `POST /api/auth/login` | Valida e-mail e senha, devolve token (JWT) | 200 OK + token |
| `POST /api/auth/logout` | Encerra a sessão (revoga o token) | 204 No Content |
| `POST /api/auth/forgot-password` | Envia o link de redefinição | 200 OK (sempre) |
| `POST /api/auth/reset-password` | Troca a senha com o código recebido | 200 OK |
| `GET /api/auth/me` | Dados do usuário logado | 200 OK ou 401 |

Painel: `GET /api/admin/usuarios` (admin e profissional), `POST /api/admin/usuarios` e `PATCH /api/admin/usuarios/:id` (só admin).

Ordem dos eventos: cadastro → valida campos → confere se o e-mail/telefone já existe → gera o hash → salva (com aceite da política) → login → compara com o hash → gera o token → rotas protegidas passam pelo middleware `autenticar` (token válido, não revogado, usuário ativo) e depois `exigirPerfil`.

> No cadastro, a checagem de duplicidade é por **e-mail/telefone**, não por nome: duas pessoas podem se chamar "Maria Souza".

## 6. Checklist de segurança do login

| Norma | Como está |
|---|---|
| Senha com hash | Argon2id (19 MiB, 2 passes), nunca em texto. Testado no banco. |
| Código de recuperação | Aleatório (256 bits), validade de 30 min, uso único, guardado só como SHA-256. Novo pedido cancela o anterior. |
| Mensagens genéricas | "E-mail ou senha inválidos" (inclusive com e-mail inexistente e com tempo de hash igualado); "esqueci a senha" responde sempre 200 e envia depois da resposta. |
| Validação no back-end | `utils/validacao.js` + services; o formulário é só conveniência. |
| Segredos no `.env` | `JWT_SECRET` (mín. 32 caracteres) e demais chaves só no `.env`, que está no `.gitignore`; o servidor se recusa a subir sem segredo forte. |
| Senha mínima de 8 | Validado no servidor (máx. 128 caracteres). |
| HTTPS em produção | Em `NODE_ENV=production` redireciona para HTTPS, exige `APP_URL` https e envia HSTS. |
| Limite de tentativas | 5 erros de login por IP+conta a cada 15 min (429); trava extra por IP no cadastro e na recuperação. |
| Consultas parametrizadas | Todo SQL usa `$1…`; testado com tentativas de SQL Injection. |
| Expiração | JWT com `exp` (padrão 1 dia); logout revoga o token; trocar a senha, mudar o perfil ou desativar derruba as sessões. |
| Perfil no back-end | O perfil vem do banco a cada requisição (não do token); `exigirPerfil` em toda rota restrita. |
| Extras | Helmet com CSP (`script-src 'self'`), `Cache-Control: no-store` na API, corpo JSON limitado a 20 KB. |

Pendências conhecidas (não dá para resolver só no código): configurar SMTP de verdade em produção, trocar o contador de tentativas em memória por um compartilhado (ex.: Redis) se houver mais de um servidor, e revisão jurídica da política de privacidade.

## 7. Como rodar

```
npm install
cp .env.example .env        # preencha JWT_SECRET e o banco
npm run db:init             # cria as tabelas
ADMIN_SENHA='uma-senha-forte' npm run admin:criar -- "Seu Nome" voce@escola.com
npm run dev                 # http://localhost:3000
```

Testes (use um banco **só de teste**; as tabelas de login são apagadas):

```
TEST_DATABASE_URL=postgres://usuario:senha@localhost:5432/patio_teste npm test
```
