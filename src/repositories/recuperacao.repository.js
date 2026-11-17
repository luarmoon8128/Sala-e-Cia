// Códigos de recuperação de senha (guardamos só o hash SHA-256 do código).
const db = require('../config/db');

async function criar(usuarioId, codigoHash, expiraEm) {
  // Um novo pedido cancela os anteriores que ainda não foram usados.
  await db.query(`UPDATE recuperacoes_senha SET usado_em = now() WHERE usuario_id = $1 AND usado_em IS NULL`, [usuarioId]);
  await db.query(
    `INSERT INTO recuperacoes_senha (usuario_id, codigo_hash, expira_em) VALUES ($1, $2, $3)`,
    [usuarioId, codigoHash, expiraEm]
  );
}

// Consome o código de forma atômica: só um pedido consegue usar (uso único)
// e só se ainda estiver dentro da validade.
async function consumir(codigoHash, q = db.query) {
  const r = await q(
    `UPDATE recuperacoes_senha SET usado_em = now()
      WHERE codigo_hash = $1 AND usado_em IS NULL AND expira_em > now()
      RETURNING usuario_id`,
    [codigoHash]
  );
  return r.rows[0] ? r.rows[0].usuario_id : null;
}

async function limparAntigos() {
  await db.query(`DELETE FROM recuperacoes_senha WHERE expira_em < now() - interval '1 day'`);
}

module.exports = { criar, consumir, limparAntigos };
