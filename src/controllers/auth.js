// Rotas protegidas: exige sessão/token válido e (opcionalmente) um dos perfis permitidos.
const auth = require('../services/auth.service');
const { AppError } = require('../utils/erros');

const BEARER = /^Bearer ([A-Za-z0-9._-]+)$/;

// 1) Quem é você? Lê "Authorization: Bearer <token>", valida e põe o usuário em req.usuario.
async function autenticar(req, res, next) {
  try {
    const m = BEARER.exec(req.headers.authorization || '');
    const r = m ? await auth.verificarToken(m[1]) : null;
    if (!r) {
      res.set('WWW-Authenticate', 'Bearer');
      throw new AppError(401, 'Sessão inválida ou expirada. Entre novamente.');
    }
    req.usuario = r.usuario; // o perfil vem do banco a cada requisição, não do token
    req.sessao = { jti: r.jti, exp: r.exp };
    next();
  } catch (err) {
    next(err);
  }
}

// 2) Você pode entrar aqui? Use depois de autenticar: exigirPerfil('admin') ou exigirPerfil('profissional', 'admin').
const exigirPerfil = (...perfis) => (req, res, next) => {
  if (!req.usuario) return next(new AppError(401, 'Faça login para continuar.'));
  if (!perfis.includes(req.usuario.perfil)) return next(new AppError(403, 'Você não tem permissão para acessar este recurso.'));
  next();
};

module.exports = { autenticar, exigirPerfil };
