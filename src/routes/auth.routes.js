// Rotas da API de autenticação (prefixo /api/auth).
const router = require('express').Router();
const ctrl = require('../controllers/auth.controller');
const wrap = require('../middlewares/async');
const { autenticar } = require('../middlewares/auth');
const limites = require('../middlewares/limites');

router.post('/register', limites.geral, wrap(ctrl.registrar));                  // 201 Created
router.post('/login', limites.login, wrap(ctrl.login));                         // 200 OK + token
router.post('/logout', autenticar, wrap(ctrl.logout));                          // 204 No Content
router.post('/forgot-password', limites.geral, ctrl.esqueciSenha);              // 200 OK (sempre)
router.post('/reset-password', limites.geral, wrap(ctrl.redefinirSenha));       // 200 OK
router.get('/me', autenticar, ctrl.eu);                                         // 200 OK ou 401

module.exports = router;
