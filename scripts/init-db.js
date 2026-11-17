// Cria/atualiza as tabelas: node scripts/init-db.js [arquivo.sql ...]
// Sem argumentos, roda database/fase2.sql (se existir) e depois database/fase5_auth.sql.
const fs = require('fs');
const path = require('path');
require('../src/config/env');
const db = require('../src/config/db');

(async () => {
  const dir = path.join(__dirname, '..', 'database');
  const arquivos = process.argv.slice(2).length ? process.argv.slice(2) : ['fase2.sql', 'fase5_auth.sql'];
  try {
    for (const nome of arquivos) {
      const f = path.join(dir, nome);
      if (!fs.existsSync(f)) { console.log(`- ${nome}: não encontrado, pulando`); continue; }
      await db.query(fs.readFileSync(f, 'utf8'));
      console.log(`- ${nome}: ok`);
    }
  } catch (err) {
    console.error('Falha ao preparar o banco:', err.message);
    process.exitCode = 1;
  } finally {
    await db.end();
  }
})();
