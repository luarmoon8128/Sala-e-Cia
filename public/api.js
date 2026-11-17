/* Cliente da API do Pátio Escolar. Todas as chamadas passam por aqui:
   cuida do token, do JSON e dos erros (com mensagem pronta para mostrar na tela). */
(function (w) {
  'use strict';
  var TK = 'patio.token';
  var mem = null; // se o navegador bloquear o armazenamento, o token vive só nesta aba

  function getToken() { try { return localStorage.getItem(TK) || mem; } catch (e) { return mem; } }
  function setToken(t) {
    mem = t || null;
    try { if (t) localStorage.setItem(TK, t); else localStorage.removeItem(TK); } catch (e) { /* ok */ }
  }

  function call(method, path, body) {
    var headers = { Accept: 'application/json' };
    var tk = getToken();
    if (tk) headers.Authorization = 'Bearer ' + tk;
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    return fetch('/api' + path, { method: method, headers: headers, body: body === undefined ? undefined : JSON.stringify(body) })
      .catch(function () {
        var e = new Error('Sem conexão com o servidor. Confira sua internet e tente de novo.');
        e.status = 0; throw e;
      })
      .then(function (r) {
        if (r.status === 204) return null;
        return r.text().then(function (txt) {
          var json = null;
          try { json = txt ? JSON.parse(txt) : null; } catch (e) { /* não era JSON */ }
          if (r.ok) return json;
          var err = new Error((json && json.erro) || 'Algo deu errado. Tente de novo em instantes.');
          err.status = r.status; err.campos = json && json.campos;
          // Sessão vencida ou encerrada em outro lugar: avisa o app (login e cadastro não entram aqui).
          if (r.status === 401 && tk && path !== '/auth/login') {
            setToken(null);
            w.dispatchEvent(new CustomEvent('patio:expirou'));
          }
          throw err;
        });
      });
  }

  w.PatioAPI = {
    getToken: getToken,
    registrar: function (d) { return call('POST', '/auth/register', d); },
    entrar: function (d) {
      return call('POST', '/auth/login', d).then(function (r) { setToken(r.token); return r; });
    },
    sair: function () {
      var p = getToken() ? call('POST', '/auth/logout') : Promise.resolve();
      setToken(null);
      return p.catch(function () { /* o token já foi descartado aqui; o servidor limpa o resto sozinho */ });
    },
    esqueciSenha: function (email) { return call('POST', '/auth/forgot-password', { email: email }); },
    redefinirSenha: function (d) { return call('POST', '/auth/reset-password', d); },
    eu: function () { return call('GET', '/auth/me'); },
    admin: {
      listar: function (q) {
        var s = '?pagina=' + (q.pagina || 1) + '&porPagina=' + (q.porPagina || 10) + (q.busca ? '&busca=' + encodeURIComponent(q.busca) : '');
        return call('GET', '/admin/usuarios' + s);
      },
      criar: function (d) { return call('POST', '/admin/usuarios', d); },
      atualizar: function (id, d) { return call('PATCH', '/admin/usuarios/' + encodeURIComponent(id), d); }
    }
  };
})(window);
