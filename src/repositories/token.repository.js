// Lista de tokens encerrados no logout.
const db = require('../config/db');

async function revogar(jti, expiraEm) {
  await db.query(
    `INSERT INTO tokens_revogados (jti, expira_em) VALUES ($1, $2) ON CONFLICT (jti) DO NOTHING`,
    [jti, expiraEm]
  );
  // Limpeza oportunista: token vencido já seria recusado de qualquer jeito.
  await db.query(`DELETE FROM tokens_revogados WHERE expira_em < now()`);
}

async function estaRevogado(jti) {
  const r = await db.query(`SELECT 1 FROM tokens_revogados WHERE jti = $1`, [jti]);
  return r.rowCount > 0;
}

module.exports = { revogar, estaRevogado };
