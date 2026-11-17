// Validação feita no back-end (o formulário do site é só conveniência).
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const NOME_RE = /^[\p{L}][\p{L}\p{M} .'’-]*$/u;

const texto = (v) => (typeof v === 'string' ? v : '');

function normalizarEmail(v) {
  const e = texto(v).trim().toLowerCase();
  return e && e.length <= 254 && EMAIL_RE.test(e) ? e : null;
}

// Aceita "(11) 91234-5678", "+55 11 91234-5678"... Guarda só dígitos com DDD (10 ou 11).
function normalizarTelefone(v) {
  let d = texto(v).replace(/\D/g, '');
  if ((d.length === 12 || d.length === 13) && d.startsWith('55')) d = d.slice(2);
  return d.length === 10 || d.length === 11 ? d : null;
}

function normalizarNome(v) {
  const n = texto(v).trim().replace(/\s+/g, ' ');
  return n.length >= 2 && n.length <= 80 && NOME_RE.test(n) ? n : null;
}

// Mínimo de 8 caracteres. O bcrypt só considera os primeiros 72 bytes, então
// recusamos acima disso em vez de truncar em silêncio.
function erroDeSenha(v) {
  if (typeof v !== 'string') return 'Informe a senha.';
  if (v.length < 8) return 'A senha precisa ter pelo menos 8 caracteres.';
  if (Buffer.byteLength(v, 'utf8') > 72) return 'A senha pode ter no máximo 72 caracteres.';
  return null;
}

// Perfil = nível de acesso no sistema. Papel escolar = quem a pessoa é na escola.
const PERFIS = ['cliente', 'profissional', 'admin'];
const PAPEIS = ['aluno', 'professor', 'gestao'];

module.exports = { normalizarEmail, normalizarTelefone, normalizarNome, erroDeSenha, PERFIS, PAPEIS };
