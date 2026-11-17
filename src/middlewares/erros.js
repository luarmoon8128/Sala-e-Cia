// Tratamento central de erros: resposta sempre em JSON, sem vazar detalhes internos.
const { AppError } = require('../utils/erros');

function naoEncontrado(req, res) {
  res.status(404).json({ erro: 'Rota não encontrada.' });
}

// eslint-disable-next-line no-unused-vars
function tratarErros(err, req, res, next) {
  if (res.headersSent) return next(err);
  if (err instanceof AppError) {
    const corpo = { erro: err.message };
    if (err.campos) corpo.campos = err.campos;
    return res.status(err.status).json(corpo);
  }
  if (err && err.type === 'entity.parse.failed') return res.status(400).json({ erro: 'JSON inválido.' });
  if (err && err.type === 'entity.too.large') return res.status(413).json({ erro: 'Requisição grande demais.' });
  console.error('[erro]', req.method, req.path, err && err.message);
  res.status(500).json({ erro: 'Erro interno. Tente novamente em instantes.' });
}

module.exports = { naoEncontrado, tratarErros };
