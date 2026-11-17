// Cria o primeiro administrador (o cadastro público nunca cria admin):
//   ADMIN_SENHA='uma-senha-forte' node scripts/criar-admin.js "Nome Completo" email@escola.com
require('../src/config/env');
const db = require('../src/config/db');
const admin = require('../src/services/admin.service');

(async () => {
  const [nome, email] = process.argv.slice(2);
  const senha = process.env.ADMIN_SENHA;
  if (!nome || !email || !senha) {
    console.error('Uso: ADMIN_SENHA=... node scripts/criar-admin.js "Nome Completo" email@escola.com');
    process.exit(1);
  }
  try {
    const u = await admin.criar({ nome, email, senha, perfil: 'admin', papel: 'gestao' });
    console.log(`Administrador criado: ${u.nome} <${u.email}> (id ${u.id})`);
  } catch (err) {
    console.error('Não foi possível criar:', err.message, err.campos ? JSON.stringify(err.campos) : '');
    process.exitCode = 1;
  } finally {
    await db.end();
  }
})();
