# Banco de dados

Coloque aqui o script da Fase 2 (por exemplo `fase2.sql`).

Tabelas que o site já usa e que o script deve cobrir:
`usuarios` (papel: aluno, professor ou gestão), `grupos` (código de 6 caracteres),
`membros_grupo`, `tags`, `membros_tags`, `mensagens` e `avisos`.

Para rodar (PostgreSQL):

    createdb patio_escolar
    psql -d patio_escolar -f database/fase2.sql
