// Erro "esperado" (validação, permissão...): vira resposta JSON com o status certo.
class AppError extends Error {
  constructor(status, mensagem, campos) {
    super(mensagem);
    this.status = status;
    this.campos = campos || undefined;
  }
}
module.exports = { AppError };
