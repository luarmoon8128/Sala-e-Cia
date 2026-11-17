// Conexão com o PostgreSQL. Todas as consultas do projeto passam por aqui e
// usam parâmetros ($1, $2...), nunca texto concatenado (evita SQL Injection).
const { Pool } = require('pg');

let pool = null;

function getPool() {
  if (!pool) {
    const e = process.env;
    pool = new Pool(
      e.DATABASE_URL
        ? { connectionString: e.DATABASE_URL }
        : {
            host: e.DB_HOST || 'localhost',
            port: Number(e.DB_PORT) || 5432,
            database: e.DB_NAME || 'patio_escolar',
            user: e.DB_USER || undefined,
            password: e.DB_PASSWORD || undefined,
          }
    );
    pool.on('error', (err) => console.error('Erro no pool do banco:', err.message));
  }
  return pool;
}

const query = (text, params) => getPool().query(text, params);

async function transaction(fn) {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const out = await fn((text, params) => client.query(text, params));
    await client.query('COMMIT');
    return out;
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (_) { /* ignora */ }
    throw err;
  } finally {
    client.release();
  }
}

async function end() {
  if (pool) { await pool.end(); pool = null; }
}

module.exports = { query, transaction, end, getPool };
