# Sala & Cia

Rede social escolar com grupos, mensagens, tags e quadro de avisos
para alunos, professores e gestão.

## Requisitos
- Node.js 18 ou superior
- PostgreSQL 14 ou superior
- Git

## Como instalar e rodar
1. Clone o repositório:
   git clone https://github.com/luarmoon8128/sala-e-cia.git
   cd sala-e-cia
2. Instale as dependências:
   npm install
3. Copie o arquivo de variáveis e preencha com seus dados:
   cp .env.example .env
4. Crie o banco e rode o script:
   createdb patio_escolar
   psql -d sala-ecia -f database/fase2.sql
5. Inicie o servidor:
   npm run dev
6. Abra http://localhost:3000

## Fluxo de trabalho (Git Flow)
- `main`: versão estável, só recebe Pull Request revisado.
- `develop`: integração do time.
- `feature/nome`: uma branch por tarefa, criada a partir de `develop`.

## Equipe
- Nome 1 – função
- Nome 2 – função
