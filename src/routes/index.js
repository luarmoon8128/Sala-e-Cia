const router = require('express').Router();

router.use('/auth', require('./auth.routes'));
router.use('/admin', require('./admin.routes'));
// Próximas funcionalidades (Fase 5c) entram aqui, uma rota por arquivo:
// router.use('/grupos', require('./grupos.routes'));

module.exports = router;
