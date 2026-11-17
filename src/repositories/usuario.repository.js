// Consultas da tabela "usuarios". Só SQL aqui; regras ficam no service.
const db = require('../config/db');

const COLS = 'id, nome, email, telefone, senha_hash, perfil, papel_escolar, ativo, token_version, aceite_politica_em, criado_em';

async function criar(d, q = db.query) {
  const r = await q(
    `INSERT INTO usuarios (nome, email, telefone, senha_hash, perfil, papel_escolar, aceite_politica_em, politica_versao)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING ${COLS}`,
    [d.nome, d.email || null, d.telefone || null, d.senhaHash, d.perfil, d.papel || 'aluno', d.aceiteEm || null, d.politicaVersao || null]
  );
  return r.rows[0];
}

const buscarPorId = async (id) =>
  (await db.query(`SELECT ${COLS} FROM usuarios WHERE id = $1`, [id])).rows[0] || null;

const buscarPorEmail = async (email) =>
  (await db.query(`SELECT ${COLS} FROM usuarios WHERE email = $1`, [email])).rows[0] || null;

const buscarPorTelefone = async (tel) =>
  (await db.query(`SELECT ${COLS} FROM usuarios WHERE telefone = $1`, [tel])).rows[0] || null;

// Troca a senha e aumenta token_version: todos os tokens antigos deixam de valer.
async function atualizarSenha(id, senhaHash, q = db.query) {
  await q(
    `UPDATE usuarios SET senha_hash = $2, token_version = token_version + 1, atualizado_em = now() WHERE id = $1`,
    [id, senhaHash]
  );
}

const escaparLike = (s) => s.replace(/[\\%_]/g, '\\$&');

async function listar({ busca, limite, deslocamento }) {
  const params = [];
  let where = '';
  if (busca) {
    params.push(`%${escaparLike(busca)}%`);
    where = `WHERE nome ILIKE $1 OR email ILIKE $1 OR telefone ILIKE $1`;
  }
  const total = (await db.query(`SELECT count(*)::int AS n FROM usuarios ${where}`, params)).rows[0].n;
  params.push(limite, deslocamento);
  const itens = (
    await db.query(
      `SELECT ${COLS} FROM usuarios ${where} ORDER BY nome ASC, id ASC LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    )
  ).rows;
  return { itens, total };
}

// Só colunas da lista branca podem ser alteradas (os nomes nunca vêm do usuário).
const EDITAVEIS = { nome: 'nome', perfil: 'perfil', papel: 'papel_escolar', ativo: 'ativo' };

async function atualizar(id, campos) {
  const sets = [];
  const params = [id];
  Object.keys(EDITAVEIS).forEach((k) => {
    if (campos[k] !== undefined) { params.push(campos[k]); sets.push(`${EDITAVEIS[k]} = $${params.length}`); }
  });
  if (campos.invalidarTokens) sets.push('token_version = token_version + 1');
  if (!sets.length) return buscarPorId(id);
  const r = await db.query(
    `UPDATE usuarios SET ${sets.join(', ')}, atualizado_em = now() WHERE id = $1 RETURNING ${COLS}`,
    params
  );
  return r.rows[0] || null;
}

module.exports = { criar, buscarPorId, buscarPorEmail, buscarPorTelefone, atualizarSenha, listar, atualizar };
