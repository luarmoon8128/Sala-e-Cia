// Testes da API de autenticação, com banco PostgreSQL de verdade.
// Rodar:  TEST_DATABASE_URL=postgres://usuario:senha@localhost:5432/patio_teste npm test
// ATENÇÃO: o banco de teste tem as tabelas de login APAGADAS a cada execução. Nunca aponte para o banco real.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const URL_TESTE = process.env.TEST_DATABASE_URL;
if (!URL_TESTE) {
  test('API de autenticação (pulado: defina TEST_DATABASE_URL)', { skip: true }, () => {});
  return;
}

process.env.DATABASE_URL = URL_TESTE;
process.env.JWT_SECRET = crypto.randomBytes(32).toString('hex');
process.env.BCRYPT_COST = '4';
process.env.NODE_ENV = 'test';
process.env.LOGIN_MAX_TENTATIVAS = '5';
process.env.AUTH_MAX_REQ = '1000';
process.env.APP_URL = 'http://localhost:3000';

const db = require('../src/config/db');
const { config } = require('../src/config/env');
const emailService = require('../src/services/email.service');
const adminService = require('../src/services/admin.service');
const { criarApp } = require('../src/app');

let server, base;
const emails = [];
const SENHA = 'senha-forte-123';
let seq = 0;
const novoEmail = () => `teste${Date.now()}${++seq}@escola.test`;

async function api(metodo, rota, corpo, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const r = await fetch(base + rota, { method: metodo, headers, body: corpo === undefined ? undefined : JSON.stringify(corpo) });
  const texto = await r.text();
  let json = null;
  try { json = texto ? JSON.parse(texto) : null; } catch (_) { /* não era JSON */ }
  return { status: r.status, json, headers: r.headers, texto };
}

const cadastro = (extra = {}) => ({
  nome: 'Maria Souza', email: novoEmail(), senha: SENHA, confirmarSenha: SENHA, aceitoPolitica: true, ...extra,
});

async function criarEEntrar(extra = {}) {
  const d = cadastro(extra);
  const c = await api('POST', '/api/auth/register', d);
  assert.equal(c.status, 201, c.texto);
  const l = await api('POST', '/api/auth/login', { email: d.email, senha: d.senha });
  assert.equal(l.status, 200, l.texto);
  return { dados: d, token: l.json.token, usuario: l.json.usuario };
}

async function criarComPerfil(perfil) {
  const email = novoEmail();
  const u = await adminService.criar({ nome: 'Pessoa Teste', email, senha: SENHA, perfil, papel: 'gestao' });
  const l = await api('POST', '/api/auth/login', { email, senha: SENHA });
  assert.equal(l.status, 200, l.texto);
  return { id: u.id, email, token: l.json.token };
}

async function esperarEmail(para, ms = 3000) {
  const fim = Date.now() + ms;
  while (Date.now() < fim) {
    const m = emails.find((e) => e.to === para);
    if (m) return m;
    await new Promise((r) => setTimeout(r, 25));
  }
  return null;
}
const codigoDoEmail = (m) => decodeURIComponent(/#redefinir=([^\s"<]+)/.exec(m.text)[1]);

test.before(async () => {
  await db.query('DROP TABLE IF EXISTS tokens_revogados, recuperacoes_senha, usuarios CASCADE');
  await db.query(fs.readFileSync(path.join(__dirname, '..', 'database', 'fase5_auth.sql'), 'utf8'));
  await db.query(fs.readFileSync(path.join(__dirname, '..', 'database', 'fase5_auth.sql'), 'utf8')); // idempotente
  emailService.definirEnvio(async (m) => { emails.push(m); });
  server = criarApp().listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
  emailService.definirEnvio(null);
  await new Promise((r) => server.close(r));
  await db.end();
});

// ---------------------------------------------------------------- cadastro
test.describe('POST /api/auth/register', () => {
  test('cria a conta (201), guarda só o hash bcrypt e registra o aceite da política', async () => {
    const d = cadastro();
    const r = await api('POST', '/api/auth/register', d);
    assert.equal(r.status, 201);
    assert.equal(r.json.usuario.email, d.email);
    assert.equal(r.json.usuario.perfil, 'cliente');
    assert.ok(!('senha' in r.json.usuario) && !('senha_hash' in r.json.usuario), 'não pode devolver senha nem hash');
    const { rows } = await db.query('SELECT senha_hash, aceite_politica_em, politica_versao FROM usuarios WHERE email = $1', [d.email]);
    assert.match(rows[0].senha_hash, /^\$2[aby]\$/);
    assert.ok(!rows[0].senha_hash.includes(d.senha));
    assert.ok(rows[0].aceite_politica_em);
    assert.equal(rows[0].politica_versao, config.politicaVersao);
  });

  test('aceita telefone no lugar do e-mail e guarda só os dígitos', async () => {
    const tel = '(11) 91234-' + String(1000 + (++seq % 9000));
    const r = await api('POST', '/api/auth/register', cadastro({ email: undefined, telefone: tel }));
    assert.equal(r.status, 201, r.texto);
    assert.match(r.json.usuario.telefone, /^\d{11}$/);
  });

  test('ignora tentativa de escolher o perfil: conta pública é sempre "cliente"', async () => {
    const r = await api('POST', '/api/auth/register', cadastro({ perfil: 'admin' }));
    assert.equal(r.status, 201);
    assert.equal(r.json.usuario.perfil, 'cliente');
  });

  test('papel escolar: padrão aluno, aceita professor, recusa inválido', async () => {
    assert.equal((await api('POST', '/api/auth/register', cadastro())).json.usuario.papel, 'aluno');
    assert.equal((await api('POST', '/api/auth/register', cadastro({ papel: 'professor' }))).json.usuario.papel, 'professor');
    const r = await api('POST', '/api/auth/register', cadastro({ papel: 'dono' }));
    assert.equal(r.status, 400);
    assert.ok(r.json.campos.papel);
  });

  const invalidos = [
    ['sem nome', { nome: '' }, 'nome'],
    ['nome com números', { nome: 'M4ria 123' }, 'nome'],
    ['e-mail inválido', { email: 'nao-e-email' }, 'email'],
    ['sem e-mail e sem telefone', { email: undefined }, 'email'],
    ['telefone inválido', { email: undefined, telefone: '123' }, 'telefone'],
    ['senha curta (7)', { senha: '1234567', confirmarSenha: '1234567' }, 'senha'],
    ['senha acima de 72 bytes', { senha: 'a'.repeat(73), confirmarSenha: 'a'.repeat(73) }, 'senha'],
    ['confirmação diferente', { confirmarSenha: 'outra-senha-123' }, 'confirmarSenha'],
    ['sem aceite da política', { aceitoPolitica: false }, 'aceitoPolitica'],
    ['aceite como texto "true"', { aceitoPolitica: 'true' }, 'aceitoPolitica'],
  ];
  for (const [nome, extra, campo] of invalidos) {
    test(`recusa (400): ${nome}`, async () => {
      const r = await api('POST', '/api/auth/register', cadastro(extra));
      assert.equal(r.status, 400, r.texto);
      assert.ok(r.json.campos[campo], `esperava erro em "${campo}": ${r.texto}`);
    });
  }

  test('e-mail repetido (409), mesmo com letras maiúsculas', async () => {
    const d = cadastro();
    assert.equal((await api('POST', '/api/auth/register', d)).status, 201);
    assert.equal((await api('POST', '/api/auth/register', { ...d, email: d.email.toUpperCase() })).status, 409);
  });

  test('corpo que não é objeto ou JSON quebrado → 400, nunca 500', async () => {
    assert.equal((await api('POST', '/api/auth/register', 'texto')).status, 400);
    const r = await fetch(base + '/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{quebrado' });
    assert.equal(r.status, 400);
  });
});

// ------------------------------------------------------------------- login
test.describe('POST /api/auth/login', () => {
  test('senha certa → 200 + token JWT com expiração', async () => {
    const { dados } = await criarEEntrar();
    const r = await api('POST', '/api/auth/login', { email: dados.email, senha: dados.senha });
    assert.equal(r.status, 200);
    assert.equal(r.json.tipo, 'Bearer');
    const p = jwt.decode(r.json.token);
    assert.ok(p.exp > p.iat, 'token precisa ter expiração');
    assert.ok(p.jti);
    assert.ok(!('senha_hash' in r.json.usuario));
  });

  test('entra também pelo telefone e é insensível a maiúsculas no e-mail', async () => {
    const tel = '1198877' + String(1000 + (++seq % 9000));
    const d = cadastro({ email: undefined, telefone: tel });
    assert.equal((await api('POST', '/api/auth/register', d)).status, 201);
    assert.equal((await api('POST', '/api/auth/login', { telefone: tel, senha: SENHA })).status, 200);
    const e = await criarEEntrar();
    assert.equal((await api('POST', '/api/auth/login', { email: e.dados.email.toUpperCase(), senha: SENHA })).status, 200);
  });

  test('erro genérico: senha errada e e-mail inexistente dão a MESMA resposta', async () => {
    const { dados } = await criarEEntrar();
    const errada = await api('POST', '/api/auth/login', { email: dados.email, senha: 'senha-errada-999' });
    const inexistente = await api('POST', '/api/auth/login', { email: novoEmail(), senha: 'senha-errada-999' });
    assert.equal(errada.status, 401);
    assert.equal(inexistente.status, 401);
    assert.equal(errada.json.erro, 'E-mail ou senha inválidos');
    assert.deepEqual(errada.json, inexistente.json);
  });

  test('campos vazios → 400; tipos estranhos não derrubam o servidor', async () => {
    assert.equal((await api('POST', '/api/auth/login', {})).status, 400);
    assert.equal((await api('POST', '/api/auth/login', { email: { $ne: 1 }, senha: ['x'] })).status, 400);
  });

  test('tentativa de SQL Injection não passa (consultas parametrizadas)', async () => {
    const { dados } = await criarEEntrar();
    for (const email of ["' OR 1=1 --", `${dados.email}' OR '1'='1`, "x@y.com'; DROP TABLE usuarios; --"]) {
      const r = await api('POST', '/api/auth/login', { email, senha: "' OR '1'='1" });
      assert.ok([400, 401].includes(r.status), `status ${r.status} para ${email}`);
    }
    const { rows } = await db.query('SELECT count(*)::int AS n FROM usuarios');
    assert.ok(rows[0].n > 0, 'a tabela continua existindo');
  });

  test('conta desativada não entra (mesma mensagem genérica)', async () => {
    const { dados, usuario } = await criarEEntrar();
    await db.query('UPDATE usuarios SET ativo = false WHERE id = $1', [usuario.id]);
    const r = await api('POST', '/api/auth/login', { email: dados.email, senha: dados.senha });
    assert.equal(r.status, 401);
    assert.equal(r.json.erro, 'E-mail ou senha inválidos');
  });

  test('limite de tentativas: 5 erros por conta → 429 na 6ª, mesmo com a senha certa', async () => {
    const { dados } = await criarEEntrar();
    for (let i = 0; i < 5; i++) {
      assert.equal((await api('POST', '/api/auth/login', { email: dados.email, senha: 'errada-errada' })).status, 401);
    }
    const bloqueado = await api('POST', '/api/auth/login', { email: dados.email, senha: dados.senha });
    assert.equal(bloqueado.status, 429);
    assert.ok(bloqueado.json.erro);
    assert.ok(bloqueado.headers.get('retry-after') || bloqueado.headers.get('ratelimit-reset'));
    // outra conta, mesmo IP, não é afetada
    const outra = await criarEEntrar();
    assert.ok(outra.token);
  });
});

// --------------------------------------------------------- rotas protegidas
test.describe('GET /api/auth/me e proteção de rotas', () => {
  test('com token válido → 200 e dados do usuário', async () => {
    const { token, dados } = await criarEEntrar();
    const r = await api('GET', '/api/auth/me', undefined, token);
    assert.equal(r.status, 200);
    assert.equal(r.json.usuario.email, dados.email);
    assert.ok(!('senha_hash' in r.json.usuario));
  });

  test('sem token, token lixo, esquema errado → 401', async () => {
    assert.equal((await api('GET', '/api/auth/me')).status, 401);
    assert.equal((await api('GET', '/api/auth/me', undefined, 'lixo.lixo.lixo')).status, 401);
    const r = await fetch(base + '/api/auth/me', { headers: { Authorization: 'Basic abc' } });
    assert.equal(r.status, 401);
  });

  test('token adulterado, assinado com outra chave ou com alg "none" → 401', async () => {
    const { token, usuario } = await criarEEntrar();
    const [h, p, s] = token.split('.');
    const pAdmin = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(p, 'base64url')), perfil: 'admin' })).toString('base64url');
    assert.equal((await api('GET', '/api/auth/me', undefined, `${h}.${pAdmin}.${s}`)).status, 401);
    const falso = jwt.sign({ perfil: 'admin', tv: 0 }, 'outra-chave-qualquer-com-mais-de-32-caracteres', { subject: String(usuario.id), issuer: config.jwt.issuer, jwtid: 'a'.repeat(32) });
    assert.equal((await api('GET', '/api/auth/me', undefined, falso)).status, 401);
    const none = `${Buffer.from('{"alg":"none","typ":"JWT"}').toString('base64url')}.${p}.`;
    assert.equal((await api('GET', '/api/auth/me', undefined, none)).status, 401);
  });

  test('token expirado → 401', async () => {
    const { usuario } = await criarEEntrar();
    const velho = jwt.sign({ perfil: 'cliente', tv: 0 }, config.jwt.secret, {
      subject: String(usuario.id), issuer: config.jwt.issuer, jwtid: 'b'.repeat(32), expiresIn: -10,
    });
    assert.equal((await api('GET', '/api/auth/me', undefined, velho)).status, 401);
  });
});

// ------------------------------------------------------------------ logout
test('POST /api/auth/logout → 204 e o token deixa de valer', async () => {
  const { token } = await criarEEntrar();
  assert.equal((await api('GET', '/api/auth/me', undefined, token)).status, 200);
  const out = await api('POST', '/api/auth/logout', undefined, token);
  assert.equal(out.status, 204);
  assert.equal(out.texto, '');
  assert.equal((await api('GET', '/api/auth/me', undefined, token)).status, 401);
  assert.equal((await api('POST', '/api/auth/logout', undefined, token)).status, 401);
  assert.equal((await api('POST', '/api/auth/logout')).status, 401);
});

// -------------------------------------------------------- recuperar senha
test.describe('recuperação de senha', () => {
  test('forgot-password responde 200 igual para e-mail existente, inexistente e inválido — e só envia para quem existe', async () => {
    const { dados } = await criarEEntrar();
    const desconhecido = novoEmail();
    const a = await api('POST', '/api/auth/forgot-password', { email: dados.email });
    const b = await api('POST', '/api/auth/forgot-password', { email: desconhecido });
    const c = await api('POST', '/api/auth/forgot-password', { email: 'lixo' });
    const d = await api('POST', '/api/auth/forgot-password', {});
    for (const r of [a, b, c, d]) assert.equal(r.status, 200);
    assert.deepEqual(a.json, b.json);
    assert.deepEqual(a.json, c.json);
    assert.ok(await esperarEmail(dados.email), 'conta existente recebe o e-mail');
    await new Promise((r) => setTimeout(r, 200));
    assert.equal(emails.filter((e) => e.to === desconhecido).length, 0, 'e-mail desconhecido não recebe nada');
  });

  test('fluxo completo: código no link, guardado como hash, uso único, derruba sessões antigas', async () => {
    const { dados, token } = await criarEEntrar();
    await api('POST', '/api/auth/forgot-password', { email: dados.email });
    const mail = await esperarEmail(dados.email);
    const codigo = codigoDoEmail(mail);
    assert.ok(codigo.length >= 40, 'código aleatório e longo');

    const { rows } = await db.query(
      'SELECT r.codigo_hash, r.expira_em, r.criado_em FROM recuperacoes_senha r JOIN usuarios u ON u.id = r.usuario_id WHERE u.email = $1', [dados.email]);
    assert.equal(rows.length, 1);
    assert.notEqual(rows[0].codigo_hash, codigo, 'o código não pode ficar em texto no banco');
    assert.equal(rows[0].codigo_hash, crypto.createHash('sha256').update(codigo).digest('hex'));
    const minutos = (new Date(rows[0].expira_em) - new Date(rows[0].criado_em)) / 60000;
    assert.ok(minutos > 29 && minutos < 31, `validade de ~30 min (deu ${minutos})`);

    const nova = 'nova-senha-456';
    const ok = await api('POST', '/api/auth/reset-password', { codigo, novaSenha: nova, confirmarSenha: nova });
    assert.equal(ok.status, 200);
    // sessão antiga cai, senha antiga não serve, nova serve
    assert.equal((await api('GET', '/api/auth/me', undefined, token)).status, 401);
    assert.equal((await api('POST', '/api/auth/login', { email: dados.email, senha: dados.senha })).status, 401);
    assert.equal((await api('POST', '/api/auth/login', { email: dados.email, senha: nova })).status, 200);
    // uso único
    const de_novo = await api('POST', '/api/auth/reset-password', { codigo, novaSenha: 'outra-senha-789', confirmarSenha: 'outra-senha-789' });
    assert.equal(de_novo.status, 400);
    assert.equal(de_novo.json.erro, 'Código inválido ou expirado.');
  });

  test('código expirado é recusado', async () => {
    const { dados } = await criarEEntrar();
    await api('POST', '/api/auth/forgot-password', { email: dados.email });
    const codigo = codigoDoEmail(await esperarEmail(dados.email));
    await db.query(`UPDATE recuperacoes_senha SET expira_em = now() - interval '1 minute' WHERE usuario_id = (SELECT id FROM usuarios WHERE email = $1)`, [dados.email]);
    const r = await api('POST', '/api/auth/reset-password', { codigo, novaSenha: 'nova-senha-456', confirmarSenha: 'nova-senha-456' });
    assert.equal(r.status, 400);
    assert.equal(r.json.erro, 'Código inválido ou expirado.');
  });

  test('código inventado, vazio ou de outro tipo → 400', async () => {
    for (const codigo of ['inventado', '', undefined, 123, ['a']]) {
      const r = await api('POST', '/api/auth/reset-password', { codigo, novaSenha: 'nova-senha-456', confirmarSenha: 'nova-senha-456' });
      assert.equal(r.status, 400);
    }
  });

  test('senha nova fraca ou divergente → 400 SEM gastar o código', async () => {
    const { dados } = await criarEEntrar();
    await api('POST', '/api/auth/forgot-password', { email: dados.email });
    const codigo = codigoDoEmail(await esperarEmail(dados.email));
    assert.equal((await api('POST', '/api/auth/reset-password', { codigo, novaSenha: '123', confirmarSenha: '123' })).status, 400);
    assert.equal((await api('POST', '/api/auth/reset-password', { codigo, novaSenha: 'nova-senha-456', confirmarSenha: 'diferente-789' })).status, 400);
    assert.equal((await api('POST', '/api/auth/reset-password', { codigo, novaSenha: 'nova-senha-456', confirmarSenha: 'nova-senha-456' })).status, 200);
  });

  test('um pedido novo invalida o link anterior', async () => {
    const { dados } = await criarEEntrar();
    await api('POST', '/api/auth/forgot-password', { email: dados.email });
    const primeiro = codigoDoEmail(await esperarEmail(dados.email));
    emails.length = 0;
    await api('POST', '/api/auth/forgot-password', { email: dados.email });
    const segundo = codigoDoEmail(await esperarEmail(dados.email));
    assert.notEqual(primeiro, segundo);
    assert.equal((await api('POST', '/api/auth/reset-password', { codigo: primeiro, novaSenha: 'nova-senha-456', confirmarSenha: 'nova-senha-456' })).status, 400);
    assert.equal((await api('POST', '/api/auth/reset-password', { codigo: segundo, novaSenha: 'nova-senha-456', confirmarSenha: 'nova-senha-456' })).status, 200);
  });
});

// ----------------------------------------------------------------- perfis
test.describe('perfis (cliente, profissional, admin) verificados no back-end', () => {
  test('cliente → 403 em toda rota administrativa', async () => {
    const { token } = await criarEEntrar();
    assert.equal((await api('GET', '/api/admin/usuarios', undefined, token)).status, 403);
    assert.equal((await api('POST', '/api/admin/usuarios', {}, token)).status, 403);
    assert.equal((await api('PATCH', '/api/admin/usuarios/1', { perfil: 'admin' }, token)).status, 403);
  });

  test('sem login → 401 nas rotas administrativas', async () => {
    assert.equal((await api('GET', '/api/admin/usuarios')).status, 401);
  });

  test('profissional consulta (200) mas não cria nem altera (403)', async () => {
    const pro = await criarComPerfil('profissional');
    assert.equal((await api('GET', '/api/admin/usuarios', undefined, pro.token)).status, 200);
    assert.equal((await api('POST', '/api/admin/usuarios', cadastro({ perfil: 'cliente' }), pro.token)).status, 403);
    assert.equal((await api('PATCH', `/api/admin/usuarios/${pro.id}`, { nome: 'X Y' }, pro.token)).status, 403);
  });

  test('admin lista (com busca e paginação), cria, edita e desativa', async () => {
    const adm = await criarComPerfil('admin');
    const lista = await api('GET', '/api/admin/usuarios?porPagina=2&pagina=1', undefined, adm.token);
    assert.equal(lista.status, 200);
    assert.ok(lista.json.itens.length <= 2 && lista.json.total >= 1);
    assert.ok(lista.json.itens.every((u) => !('senha_hash' in u)));

    const email = novoEmail();
    const c = await api('POST', '/api/admin/usuarios', { nome: 'Paulo Prof', email, senha: SENHA, perfil: 'profissional', papel: 'professor' }, adm.token);
    assert.equal(c.status, 201, c.texto);
    assert.equal(c.json.usuario.perfil, 'profissional');
    const id = c.json.usuario.id;

    const busca = await api('GET', `/api/admin/usuarios?busca=${encodeURIComponent('Paulo Prof')}`, undefined, adm.token);
    assert.ok(busca.json.itens.some((u) => u.id === id));
    const curinga = await api('GET', '/api/admin/usuarios?busca=%25', undefined, adm.token);
    assert.equal(curinga.status, 200); // "%" é tratado como texto, não como curinga

    const logado = (await api('POST', '/api/auth/login', { email, senha: SENHA })).json.token;
    const ed = await api('PATCH', `/api/admin/usuarios/${id}`, { ativo: false }, adm.token);
    assert.equal(ed.status, 200);
    assert.equal(ed.json.usuario.ativo, false);
    assert.equal((await api('GET', '/api/auth/me', undefined, logado)).status, 401, 'desativar derruba a sessão');
    assert.equal((await api('POST', '/api/auth/login', { email, senha: SENHA })).status, 401);
  });

  test('mudar o perfil vale na hora (token antigo é derrubado) e dados inválidos são recusados', async () => {
    const adm = await criarComPerfil('admin');
    const alvo = await criarComPerfil('profissional');
    assert.equal((await api('GET', '/api/admin/usuarios', undefined, alvo.token)).status, 200);
    assert.equal((await api('PATCH', `/api/admin/usuarios/${alvo.id}`, { perfil: 'cliente' }, adm.token)).status, 200);
    assert.equal((await api('GET', '/api/admin/usuarios', undefined, alvo.token)).status, 401);
    assert.equal((await api('PATCH', `/api/admin/usuarios/${alvo.id}`, { perfil: 'superuser' }, adm.token)).status, 400);
    assert.equal((await api('PATCH', `/api/admin/usuarios/abc`, { nome: 'Fulano Silva' }, adm.token)).status, 400);
    assert.equal((await api('PATCH', `/api/admin/usuarios/999999999`, { nome: 'Fulano Silva' }, adm.token)).status, 404);
    assert.equal((await api('POST', '/api/admin/usuarios', { nome: 'A', senha: '1' }, adm.token)).status, 400);
  });

  test('admin não rebaixa nem desativa a própria conta', async () => {
    const adm = await criarComPerfil('admin');
    assert.equal((await api('PATCH', `/api/admin/usuarios/${adm.id}`, { perfil: 'cliente' }, adm.token)).status, 400);
    assert.equal((await api('PATCH', `/api/admin/usuarios/${adm.id}`, { ativo: false }, adm.token)).status, 400);
  });
});

// ---------------------------------------------------------------- servidor
test.describe('servidor', () => {
  test('rota de API inexistente → 404 em JSON; cabeçalhos de segurança presentes', async () => {
    const r = await api('GET', '/api/nao-existe');
    assert.equal(r.status, 404);
    assert.ok(r.json.erro);
    assert.equal(r.headers.get('cache-control'), 'no-store');
    assert.equal(r.headers.get('x-powered-by'), null);
    assert.match(r.headers.get('content-security-policy'), /script-src 'self'/);
    assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
  });

  test('o site é entregue: landing em "/", app, privacidade e página 404', async () => {
    for (const [rota, trecho] of [['/', 'Pátio Escolar'], ['/app.html', 'Pátio'], ['/privacidade.html', 'Política de privacidade']]) {
      const r = await fetch(base + rota);
      assert.equal(r.status, 200, rota);
      assert.match(await r.text(), new RegExp(trecho));
    }
    assert.equal((await fetch(base + '/nao-existe')).status, 404);
    assert.equal((await fetch(base + '/../package.json')).status, 404);
    assert.equal((await fetch(base + '/%2e%2e/package.json')).status, 404);
    assert.equal((await fetch(base + '/.env')).status, 404);
  });
});
