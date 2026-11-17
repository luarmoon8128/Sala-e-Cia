// Servidor: entrega o site (pasta public/) e a API (/api).
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const { config, validarConfig } = require('./config/env');
const { naoEncontrado, tratarErros } = require('./middlewares/erros');

const PUBLIC = path.join(__dirname, '..', 'public');

function criarApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', config.trustProxy);

  // HTTPS em produção: atrás de proxy (Render, Heroku, Nginx...) o protocolo vem em X-Forwarded-Proto.
  if (config.isProd) {
    app.use((req, res, next) => {
      if (req.secure) return next();
      res.redirect(308, `${config.appUrl}${req.originalUrl}`);
    });
  }

  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: false,
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com'],
          imgSrc: ["'self'", 'data:', 'blob:'],
          connectSrc: ["'self'"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          frameAncestors: ["'none'"],
          ...(config.isProd ? { upgradeInsecureRequests: [] } : {}),
        },
      },
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    })
  );

  // API: JSON pequeno, nunca em cache.
  app.use('/api', (req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
  app.use('/api', express.json({ limit: '20kb' }));
  app.use('/api', require('./routes'));
  app.use('/api', naoEncontrado);

  // Site estático. "/" entrega a landing page (index.html).
  app.use(express.static(PUBLIC, { extensions: ['html'], maxAge: config.isProd ? '1h' : 0, index: 'index.html' }));
  app.use((req, res) => res.status(404).sendFile(path.join(PUBLIC, '404.html')));

  app.use(tratarErros);
  return app;
}

if (require.main === module) {
  try {
    validarConfig();
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
  criarApp().listen(config.port, () => console.log(`Pátio Escolar em ${config.appUrl} (porta ${config.port})`));
}

module.exports = { criarApp };
