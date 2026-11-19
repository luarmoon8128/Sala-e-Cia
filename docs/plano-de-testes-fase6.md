# Fase 6 — Roteiro de testes e qualidade

**Data da execução:** 18/11/2026 · **Versão:** 0.2.0 · **Ambiente:** Node 22, PostgreSQL real, Chromium (Playwright).

## Resumo

| Resultado | Quantidade |
|---|:-:|
| OK | 60 |
| Falhou | 1 |
| Não implementado | 1 |
| Parcial / não testável aqui | 1 |

**Correções feitas durante a fase 6** (testes que falharam ou requisitos não atendidos):
- **RNF01:** as senhas usavam bcrypt; passaram a usar **Argon2id** (19 MiB, 2 passes).
- **RN02:** não havia limite de eventos; agora cada usuário mantém no máximo **5 eventos ativos**.
- **RNF02:** no celular (360 px) os botões de tema e sair tinham 34 px, pequenos para o toque; agora têm 40 px.
- **RNF05:** criado o módulo de criptografia **AES-256-GCM** (`src/utils/cripto.js`) para as mensagens, com testes. Falta usá-lo quando as mensagens forem para o banco (fase 5c).

**Pendências que dependem de decisão ou de outra fase:** RN01 (regra ambígua), RNF05 (mensagens ainda no navegador) e o certificado HTTPS (só existe na hospedagem). Detalhes nas notas ao final.

## Como repetir os testes

```
# 1) API e regras de segurança (46 testes, banco só de teste!)
TEST_DATABASE_URL=postgres://usuario:senha@localhost:5432/patio_teste npm test

# 2) Telas no navegador (40 testes) e desempenho: com o servidor rodando em outra janela
pip install playwright && playwright install chromium
python3 tests/e2e/fase6_e2e.py http://localhost:3000
python3 tests/e2e/desempenho_4g.py http://localhost:3000
```

O resultado do roteiro de telas fica em `tests/e2e/resultado.jsonl`; as capturas de tela, em `tests/e2e/tela-*.png`.

## Tabela de testes

Status: **OK** = passou · **Falhou** = não atende ao requisito · **Parcial** = atende só em parte ou não dá para testar neste ambiente · **Não implementado**.

### RF06 — Cadastro e login por e-mail e/ou telefone

| ID | Requisito | Passos | Resultado esperado | Status |
|:-|:-|:-|:-|:-:|
| CT-RF06-01 | RF06 | Abrir o cadastro, preencher nome, e-mail, senha, confirmação, escolher "Professor", aceitar a política e enviar. | Conta criada, usuário já entra logado e o nome aparece no topo. | OK |
| CT-RF06-02 | RF06 | Cadastrar um aluno informando **só o telefone** (sem e-mail). | Conta criada e logada. | OK |
| CT-RF06-03 | RF06 | Sair, entrar com e-mail e senha e recarregar a página. | Entra e continua logado após o recarregamento. | OK |
| CT-RF06-04 | RF06 | Sair e entrar usando o telefone e a senha. | Entra normalmente. | OK |
| CT-RF06-05 | RF06 | Cadastrar sem e-mail e sem telefone. | Erro na tela e nenhuma conta criada. | OK |
| CT-RF06-06 | RF06 | API: validar campos do cadastro (nome com número, e-mail inválido, senha com 7 caracteres, confirmação diferente, sem aceite da política). | 400 com a mensagem do campo; nada é salvo. | OK |
| CT-RF06-07 | RF06 | API: login com senha errada e com e-mail inexistente. | 401 com a mesma mensagem "E-mail ou senha inválidos". | OK |
| CT-RF06-08 | RF06 | API: errar a senha 5 vezes e tentar a 6ª (mesmo com a senha certa). | 429 (limite de tentativas); outra conta não é afetada. | OK |
| CT-RF06-09 | RF06 | API: "esqueci a senha" com e-mail existente, inexistente e inválido. | Sempre 200 com o mesmo texto; só a conta existente recebe o e-mail. | OK |
| CT-RF06-10 | RF06 | API: redefinir senha com o código do e-mail; repetir o mesmo código; usar código expirado ou inventado. | 1ª vez 200 (sessões antigas caem); repetido, expirado e inventado dão 400. | OK |
| CT-RF06-11 | RF06 | API: acessar `/me` sem token, com token adulterado, com algoritmo `none`, expirado e depois do logout. | 401 em todos; com token válido 200. | OK |
| CT-RF06-12 | RF06 | API: usuário "cliente" chama as rotas do painel; "profissional" lista e tenta criar; admin cria, edita e desativa. | cliente 403; profissional lista (200) e não altera (403); admin faz tudo; conta desativada perde a sessão. | OK |
| CT-RF06-13 | RF06 | API: tentar SQL Injection no login. | 400 ou 401, nunca erro de servidor; a tabela continua existindo. | OK |

### RN03 — E-mail ou telefone ligado a uma única conta

| ID | Requisito | Passos | Resultado esperado | Status |
|:-|:-|:-|:-|:-:|
| CT-RN03-01 | RN03 | Cadastrar nova conta com o e-mail de uma conta existente, escrito em MAIÚSCULAS. | Mensagem "Já existe uma conta com este e-mail ou telefone." e nenhuma conta criada. | OK |
| CT-RN03-02 | RN03 | Cadastrar nova conta com o telefone de uma conta existente, digitado com máscara `(11) 97777-1234`. | Cadastro recusado. | OK |
| CT-RN03-03 | RN03 | API: repetir telefone com máscaras diferentes (`(11) 95555-1234`, `11955551234`). | 201 na primeira, 409 nas seguintes. Há também índice único no banco. | OK |

### RNF01 — Senha com Argon2

| ID | Requisito | Passos | Resultado esperado | Status |
|:-|:-|:-|:-|:-:|
| CT-RNF01-01 | RNF01 | Criar conta e consultar a coluna `senha_hash` no PostgreSQL. | Valor começa com `$argon2id$v=19$m=19456,t=2,p=1$` e não contém a senha. | OK |
| CT-RNF01-02 | RNF01 | Criar usuário pelo painel e trocar senha pela recuperação; depois entrar com a senha nova. | Os dois caminhos gravam Argon2id e o login confere. | OK |

### RF02 — Professores criam e organizam canais e cargos

| ID | Requisito | Passos | Resultado esperado | Status |
|:-|:-|:-|:-|:-:|
| CT-RF02-01 | RF02 | Logado como professor, em Grupos clicar em novo grupo e criar "Turma 9A". | Grupo criado com código de entrada de 6 caracteres. | OK |
| CT-RF02-02 | RF02 | Na aba Membros, criar o cargo (tag) "Monitor". | Tag aparece na lista. | OK |
| CT-RF02-03 | RF02 | Criar outra tag chamada "monitor" (minúsculas). | Erro "Já existe uma tag com esse nome neste grupo." | OK |
| CT-RF02-04 | RF02 | Entrar como aluno e abrir Membros do grupo. | Sem botões de criar tag, aplicar tag ou lançar nota. | OK |
| CT-RF02-05 | RF02 | Professor aplica a tag "Monitor" ao aluno. | Tag aparece ao lado do aluno. | OK |

### RF01 — Alunos enviam mensagens nos canais

| ID | Requisito | Passos | Resultado esperado | Status |
|:-|:-|:-|:-|:-:|
| CT-RF01-00 | RF01 | Aluno entra no grupo "Turma 9A" digitando o código em minúsculas. | Entra e abre o chat do grupo. | OK |
| CT-RF01-01 | RF01 | Aluno digita uma mensagem e pressiona Enter. | Mensagem aparece no chat. | OK |
| CT-RF01-02 | RF01 | Enviar uma segunda mensagem. | As mensagens ficam em ordem cronológica. | OK |
| CT-RF01-03 | RF01 | Anexar uma imagem e enviar. | A imagem aparece no chat. | OK |
| CT-RF01-04 | RF01 | Pressionar Enter com o campo vazio. | Nada é enviado. | OK |
| CT-RF01-05 | RF01 | Entrar como professor no mesmo grupo. | Vê a mensagem enviada pelo aluno, com o nome dele. | OK |

### RF03 — Eventos e avisos

| ID | Requisito | Passos | Resultado esperado | Status |
|:-|:-|:-|:-|:-:|
| CT-RF03-01 | RF03 | Professor publica o aviso "Prova de Ciências" (categoria Prova, com data). | Aviso publicado e visível no grupo. | OK |
| CT-RF03-02 | RF03 | Professor publica o evento "Feira de Ciências". | Evento publicado. | OK |
| CT-RF03-03 | RF03 | Aluno abre o Mural. | Vê a prova e o evento; não há botão de publicar. | OK |
| CT-RF03-04 | RF03 | Aluno abre a aba Avisos do grupo. | Sem botão de publicar nem de apagar. | OK |
| CT-RF03-05 | RF03 | Usuário de Gestão entra no grupo e publica "Reunião de pais". | Aviso publicado. | OK |

### RN02 — No máximo 5 eventos ativos por usuário

| ID | Requisito | Passos | Resultado esperado | Status |
|:-|:-|:-|:-|:-:|
| CT-RN02-01 | RN02 | Professor cria 5 eventos com data futura. | Os 5 são publicados. | OK |
| CT-RN02-02 | RN02 | Tentar criar o 6º evento. | Bloqueado com "Você já tem 5 eventos ativos…"; o evento não é criado. | OK |
| CT-RN02-03 | RN02 | Com 5 eventos, publicar um aviso de categoria "Aviso geral". | Permitido (o limite vale só para eventos). | OK |
| CT-RN02-04 | RN02 | Apagar um evento e criar outro. | Permitido, porque abriu uma vaga. | OK |

### RF04 e RF05 — Notas e mascote

| ID | Requisito | Passos | Resultado esperado | Status |
|:-|:-|:-|:-|:-:|
| CT-RF05-01 | RF05 | Professor, em Membros, lança nota 9,5 de Matemática (1º tri) para o aluno. | "Nota lançada" e a nota é registrada. | OK |
| CT-RF05-02 | RF05 | Lançar nota 11. | Erro "A nota precisa estar entre 0 e 10." | OK |
| CT-RF05-03 | RF05 | Aluno abre a tela do Mascote. | Não há opção de lançar nota. | OK |
| CT-RF05-04 | RF05 | Professor lança nota 2 de História no 2º trimestre. | Nota registrada. | OK |
| CT-RF05-05 | RF05 | Aluno abre o Mascote, 1º trimestre. | Vê Matemática, a nota 9,5 e o nome de quem lançou. | OK |
| CT-RF04-01 | RF04 | Aluno sem nenhuma nota abre o Mascote. | Aparece o ovo (aguardando a primeira nota). | OK |
| CT-RF04-02 | RF04 | Com a nota 9,5, escolher o 1º trimestre. | Mascote evolui e mostra o estado "Radiante". | OK |
| CT-RF04-03 | RF04 | Escolher o 2º trimestre (nota 2). | Mascote mostra o estado "Abatido". | OK |
| CT-RF04-04 | RF04 | Personalizar o mascote (nome "Pipoca"). | Novo nome aparece. | OK |
| CT-RF04-05 | RF04 | Recarregar a página e abrir o Mascote. | O nome "Pipoca" continua. | OK |

### RNF02 — Interface responsiva

| ID | Requisito | Passos | Resultado esperado | Status |
|:-|:-|:-|:-|:-:|
| CT-RNF02-01 | RNF02 | Celular (360 px): abrir landing, privacidade, login, cadastro, Mural, Grupos e Mascote. | Nenhuma tela com rolagem horizontal; botões do topo com pelo menos 36 px. (1ª execução falhou: botões de 34 px; corrigido para 40 px.) | OK |
| CT-RNF02-02 | RNF02 | Tablet (768 px): as mesmas telas. | Sem rolagem horizontal. | OK |
| CT-RNF02-03 | RNF02 | Computador (1280 px): as mesmas telas. | Sem rolagem horizontal. | OK |

### RNF03 — Desempenho em 4G

Rede emulada: latência 170 ms, 9 Mbps de descida e 1,5 Mbps de subida. Meta: até 1 s.

| ID | Requisito | Passos | Resultado esperado | Status |
|:-|:-|:-|:-|:-:|
| CT-RNF03-01 | RNF03 | Chamar 20 vezes `POST /api/auth/login` (inclui o Argon2). | Cada resposta em até 1 s. Medido: média 183 ms, máximo 186 ms. | OK |
| CT-RNF03-02 | RNF03 | Chamar 20 vezes `GET /api/auth/me`. | Até 1 s. Medido: média 177 ms, máximo 179 ms. | OK |
| CT-RNF03-03 | RNF03 | Chamar `forgot-password` (5×) e login com senha errada (4×). | Até 1 s. Medido: 183 ms e 182 ms de média. | OK |
| CT-RNF03-04 | RNF03 | Carregar a landing page e a tela de login sem cache (HTML, CSS, JS e imagens). | Até 1 s. Medido: landing 460 ms, login 102 ms de média. | OK |

### RNF04 — Comunicação criptografada

| ID | Requisito | Passos | Resultado esperado | Status |
|:-|:-|:-|:-|:-:|
| CT-RNF04-01 | RNF04 | Subir em `NODE_ENV=production` e acessar por HTTP puro. | Redireciona (308) para `https://`. | OK |
| CT-RNF04-02 | RNF04 | Acessar como HTTPS atrás de proxy (`X-Forwarded-Proto: https`). | 200 com cabeçalho `Strict-Transport-Security`. | OK |
| CT-RNF04-03 | RNF04 | Subir em produção com `APP_URL` em `http://`, sem SMTP ou sem chave das mensagens. | O servidor se recusa a iniciar e diz o que falta. | OK |
| CT-RNF04-04 | RNF04 | Abrir o site publicado e conferir o certificado TLS. | Cadeado válido no navegador. | Parcial |

### RNF05 — Mensagens protegidas por criptografia

| ID | Requisito | Passos | Resultado esperado | Status |
|:-|:-|:-|:-|:-:|
| CT-RNF05-01 | RNF05 | Cifrar e decifrar textos com acento, emoji, vazio e 5.000 caracteres. | O texto volta idêntico; o texto cifrado não contém o original e muda a cada cifragem. | OK |
| CT-RNF05-02 | RNF05 | Alterar um byte do texto cifrado, trocar a versão ou passar lixo. | A leitura é recusada com erro (AES-GCM detecta adulteração). | OK |
| CT-RNF05-03 | RNF05 | Enviar uma mensagem no app e olhar onde ela fica guardada. | Guardada criptografada. Hoje fica em texto no `localStorage` do navegador. | Falhou |

### RN01 — No máximo 10 mensagens pendentes

| ID | Requisito | Passos | Resultado esperado | Status |
|:-|:-|:-|:-|:-:|
| CT-RN01-01 | RN01 | Acumular 10 mensagens pendentes e tentar enviar a 11ª. | A 11ª é bloqueada com aviso. | Não implementado |

## Notas sobre o que não ficou OK

1. **CT-RNF05-03 (Falhou):** as mensagens do protótipo moram no navegador, em texto simples. A solução é a fase 5c "Enviar mensagem": o service grava com `cripto.cifrar()` e lê com `cripto.decifrar()`, usando a chave `MENSAGENS_CHAVE` do `.env`. Quando isso existir, este teste passa a ser: enviar mensagem e conferir que a coluna no banco não mostra o texto.
2. **CT-RN01-01 (Não implementado):** "mensagem pendente" não está definida no projeto, e o app hoje grava na hora, sem fila. Preciso da sua definição. Duas leituras possíveis: (a) mensagem enviada e ainda não lida por ninguém; (b) mensagem na fila por falta de internet. Com a definição, a regra entra junto com a API de mensagens (5c).
3. **CT-RNF04-04 (Parcial):** o código já obriga HTTPS em produção, mas o certificado só existe depois do deploy (Render, Railway etc. emitem sozinhos). Teste de novo no endereço publicado.
4. **RNF03 foi medido com rede emulada**, em servidor local e sem TLS. Em produção some o tempo do banco remoto e entra o handshake HTTPS; confira de novo depois do deploy. Em rede real, as fontes do Google podem atrasar o desenho da página (não o da API).
5. **As regras de RF01 a RF05 e RN02 rodam no navegador.** Quem abrir as ferramentas do desenvolvedor consegue burlar, por exemplo o limite de 5 eventos. Para valer de verdade, cada uma precisa ser repetida no back-end na fase 5c.

## Observações de negócio (não são falhas, mas vale decidir)

- Qualquer usuário, inclusive aluno, consegue criar grupos. O RF01 fala em canais criados por professores e gestão, sem proibir alunos; o card "Criar grupo" fala em "usuário". Se só professores e gestão devem criar, a mudança é pequena.
- A **gestão** também lança notas (hoje "equipe" = professor ou gestão), enquanto o RF05 cita só professores.
- O papel (aluno, professor ou gestão) é escolhido por quem se cadastra, sem aprovação.
