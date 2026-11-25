/* ═══════════════════════════════════════════════════════════════
   Build del frontend: genera dist/ sin dependencias.
   API_URL (opcional) = origen de la API, p. ej. https://api.midominio.com
   Si no se define, se usa /api del mismo origen (modo local).
   ═══════════════════════════════════════════════════════════════ */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const dist = path.join(root, 'dist');
const apiOrigen = (process.env.API_URL || '').trim().replace(/\/+$/, '');

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(path.join(dist, 'css'), { recursive: true });
fs.mkdirSync(path.join(dist, 'js'), { recursive: true });

fs.copyFileSync(path.join(root, 'index.html'), path.join(dist, 'index.html'));
fs.copyFileSync(path.join(root, 'css', 'styles.css'), path.join(dist, 'css', 'styles.css'));
fs.copyFileSync(path.join(root, 'js', 'app.js'), path.join(dist, 'js', 'app.js'));
fs.writeFileSync(
  path.join(dist, 'js', 'api-config.js'),
  '// Generado por scripts/build.js desde API_URL. No editar a mano.\n' +
    'window.ACADEMIA_API_ORIGIN = ' +
    JSON.stringify(apiOrigen) +
    ';\n'
);

console.log('Frontend generado en dist/ · API: ' + (apiOrigen || '/api (mismo origen)'));
