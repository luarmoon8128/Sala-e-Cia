// Painel administrativo (prefixo /api/admin). O perfil é checado no back-end em toda rota.
const router = require('express').Router();
const ctrl = require('../controllers/admin.controller');
const wrap = require('../middlewares/async');
const { autenticar, exigirPerfil } = require('../middlewares/auth');

router.use(autenticar);
router.get('/usuarios', exigirPerfil('admin', 'profissional'), wrap(ctrl.listar)); // profissional só consulta
router.post('/usuarios', exigirPerfil('admin'), wrap(ctrl.criar));
router.patch('/usuarios/:id', exigirPerfil('admin'), wrap(ctrl.atualizar));

module.exports = router;
