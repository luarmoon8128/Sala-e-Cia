// Lê o .env e valida o que é obrigatório. As chaves secretas vêm só daqui,
// nunca do código-fonte.
require('dotenv').config();

const env = process.env;
const isProd = env.NODE_ENV === 'production';

const config = {
  isProd,
  port: Number(env.PORT) || 3000,
  appUrl: (env.APP_URL || `http://localhost:${Number(env.PORT) || 3000}`).replace(/\/+$/, ''),
  trustProxy: env.TRUST_PROXY !== undefined ? Number(env.TRUST_PROXY) : (isProd ? 1 : 0),
  jwt: {
    secret: env.JWT_SECRET || '',
    expiresIn: env.JWT_EXPIRES_IN || '1d',
    issuer: 'patio-escolar',
  },
  bcryptCost: Number(env.BCRYPT_COST) || 12,
  resetTtlMin: Number(env.RESET_TTL_MIN) || 30,
  politicaVersao: '2026-11',
  // Limites de tentativas (por IP; o de login também é por conta).
  limites: {
    loginMax: Number(env.LOGIN_MAX_TENTATIVAS) || 5,
    loginJanelaMin: Number(env.LOGIN_JANELA_MIN) || 15,
    geralMax: Number(env.AUTH_MAX_REQ) || 20,
    geralJanelaMin: 15,
  },
  mail: {
    host: env.SMTP_HOST || '',
    port: Number(env.SMTP_PORT) || 587,
    user: env.SMTP_USER || '',
    pass: env.SMTP_PASS || '',
    from: env.MAIL_FROM || 'Pátio Escolar <nao-responda@localhost>',
  },
};

// Chamado ao subir o servidor: melhor falhar na partida do que rodar inseguro.
function validarConfig() {
  const erros = [];
  if (config.jwt.secret.length < 32) {
    erros.push('JWT_SECRET ausente ou curto demais (mínimo 32 caracteres). Gere um com: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"');
  }
  if (isProd && !config.mail.host) erros.push('SMTP_HOST é obrigatório em produção (e-mail de recuperação de senha).');
  if (isProd && !/^https:\/\//.test(config.appUrl)) erros.push('APP_URL precisa começar com https:// em produção.');
  if (config.bcryptCost < 10 && isProd) erros.push('BCRYPT_COST abaixo de 10 não é permitido em produção.');
  if (erros.length) throw new Error('Configuração inválida:\n - ' + erros.join('\n - '));
}

module.exports = { config, validarConfig };
