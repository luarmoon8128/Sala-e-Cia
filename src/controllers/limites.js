// Limite de tentativas (força bruta e abuso). Contador em memória: se o site rodar em
// mais de um servidor, troque o "store" por um compartilhado (ex.: Redis).
const rateLimit = require('express-rate-limit');
const { config } = require('../config/env');

const minutos = (n) => n * 60 * 1000;

function limitador(opcoes) {
  return rateLimit({
    standardHeaders: true,
    legacyHeaders: false,
    ...opcoes,
    handler: (req, res) => {
      res.status(429).json({ erro: opcoes.mensagem || 'Muitas tentativas. Aguarde um pouco e tente de novo.' });
    },
  });
}

const { limites } = config;

// Login: 5 tentativas erradas a cada 15 minutos para cada par IP + conta.
// Só as tentativas que falham contam (skipSuccessfulRequests).
const login = limitador({
  windowMs: minutos(limites.loginJanelaMin),
  limit: limites.loginMax,
  skipSuccessfulRequests: true,
  mensagem: `Muitas tentativas de login. Tente de novo em ${limites.loginJanelaMin} minutos.`,
  keyGenerator: (req) => {
    const b = req.body || {};
    const id = String(b.email ?? b.login ?? b.telefone ?? '').trim().toLowerCase().slice(0, 254);
    return `${req.ip}|${id}`;
  },
});

// Trava extra por IP (cadastro, esqueci a senha, redefinir): impede varrer contas ou lotar a caixa de e-mail de alguém.
const geral = limitador({
  windowMs: minutos(limites.geralJanelaMin),
  limit: limites.geralMax,
  mensagem: 'Muitas solicitações. Aguarde alguns minutos e tente de novo.',
});

module.exports = { login, geral };
