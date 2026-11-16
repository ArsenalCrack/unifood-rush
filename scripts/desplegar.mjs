// Publica el simulador en un servidor propio por SSH: prueba, compila y copia
// el contenido de dist/ (index.html y assets/). No toca la configuración del
// servidor web: eso se hace una sola vez con docs/despliegue.md.
//
// Uso:  npm run desplegar -- usuario@servidor /var/www/unifood-rush
//   o:  definir UNIFOOD_SSH y UNIFOOD_RUTA y ejecutar npm run desplegar
//
// Usa los comandos ssh y scp del sistema, con la clave SSH del equipo.

import { spawnSync } from 'node:child_process';

const destino = process.argv[2] ?? process.env.UNIFOOD_SSH;
// Git Bash en Windows convierte "/var/www/..." en "C:/Program Files/Git/var/www/...": se deshace.
const ruta = (process.argv[3] ?? process.env.UNIFOOD_RUTA ?? '/var/www/unifood-rush')
  .replaceAll('\\', '/')
  .replace(/^[A-Za-z]:\/(?:Program Files\/)?Git(?=\/)/, '');

if (!destino || !/^[\w.-]+@[\w.-]+$/.test(destino)) {
  console.error('Falta el destino. Ejemplo: npm run desplegar -- usuario@servidor /var/www/unifood-rush');
  process.exit(1);
}
// Seguridad: la carpeta remota debe ser absoluta y llamarse como el proyecto,
// para que la limpieza de versiones viejas nunca toque otra carpeta.
if (!/^\/[\w./-]+$/.test(ruta) || !ruta.includes('unifood')) {
  console.error(`Ruta remota no válida: ${ruta}. Debe ser absoluta y contener "unifood".`);
  process.exit(1);
}

function correr(comando, argumentos) {
  console.log(`\n> ${comando} ${argumentos.join(' ')}`);
  const resultado = spawnSync(comando, argumentos, { stdio: 'inherit' });
  if (resultado.status !== 0) {
    console.error(`El comando falló (código ${resultado.status}). No se publicó.`);
    process.exit(resultado.status ?? 1);
  }
}

// 1) El modelo debe pasar todas las pruebas antes de publicar.
correr(process.execPath, ['--test']);
// 2) Versión final en dist/ (rutas relativas: sirve en una subcarpeta o en un subdominio).
correr(process.execPath, ['node_modules/vite/bin/vite.js', 'build']);
// 3) Carpeta remota y limpieza de los bundles de versiones anteriores.
correr('ssh', [destino, `mkdir -p ${ruta}/assets && rm -f ${ruta}/assets/index-*.js`]);
// 4) Copia de index.html y assets/.
correr('scp', ['-r', 'dist/index.html', 'dist/assets', `${destino}:${ruta}/`]);

console.log(`\nPublicado en ${destino}:${ruta}`);
console.log('Abre la dirección pública y juega un turno para comprobarlo.');
