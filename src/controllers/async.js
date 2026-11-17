// Express 4 não captura erros de funções async sozinho: este wrapper repassa para o tratador de erros.
module.exports = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
