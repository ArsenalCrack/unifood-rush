// Empaqueta el contenido de dist/ para el aula virtual: index.html y assets/ en la
// raíz del ZIP. Escribe el ZIP con zlib para que las rutas usen "/" en cualquier
// sistema. Compress-Archive de Windows PowerShell 5.1 las escribe con "\" y, al
// descomprimir en el aula virtual (Linux), no aparece la carpeta assets/.
//
// Uso:  npm run zip -- 7   (compila y crea Grupo7_UniFoodRush.zip)
//       npm run zip        (crea GrupoN_UniFoodRush.zip)

import { readdirSync, readFileSync, writeFileSync, statSync, existsSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { deflateRawSync } from 'node:zlib';

const RAIZ = 'dist';
const grupo = process.argv[2] ?? 'N';
const salida = `Grupo${grupo}_UniFoodRush.zip`;
const LIMITE = 25 * 1024 * 1024; // tamaño máximo que acepta el aula virtual

if (!existsSync(join(RAIZ, 'index.html'))) {
  console.error('No existe dist/index.html. Ejecuta primero npm run build.');
  process.exit(1);
}

// CRC-32 (el mismo de PNG y ZIP).
const TABLA = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (datos) => {
  let c = 0xffffffff;
  for (const byte of datos) c = TABLA[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

// Fecha y hora en el formato de MS-DOS que usa el ZIP.
const dos = (d) => ({
  hora: (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2),
  fecha: ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()
});

const archivos = (carpeta) => readdirSync(carpeta, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? archivos(join(carpeta, e.name)) : [join(carpeta, e.name)]);

const partes = [];
const directorio = [];
let desplazamiento = 0;
for (const ruta of archivos(RAIZ).sort()) {
  const nombre = Buffer.from(relative(RAIZ, ruta).split(sep).join('/'), 'utf8');
  const datos = readFileSync(ruta);
  const comprimidos = deflateRawSync(datos, { level: 9 });
  const crc = crc32(datos);
  const { hora, fecha } = dos(statSync(ruta).mtime);

  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0);   // firma de cabecera local
  local.writeUInt16LE(20, 4);           // versión necesaria (2.0)
  local.writeUInt16LE(0x0800, 6);       // nombres en UTF-8
  local.writeUInt16LE(8, 8);            // método: deflate
  local.writeUInt16LE(hora, 10);
  local.writeUInt16LE(fecha, 12);
  local.writeUInt32LE(crc, 14);
  local.writeUInt32LE(comprimidos.length, 18);
  local.writeUInt32LE(datos.length, 22);
  local.writeUInt16LE(nombre.length, 26);
  local.writeUInt16LE(0, 28);           // sin campo extra
  partes.push(local, nombre, comprimidos);

  const central = Buffer.alloc(46);
  central.writeUInt32LE(0x02014b50, 0); // firma del directorio central
  central.writeUInt16LE(20, 4);         // versión que lo creó
  central.writeUInt16LE(20, 6);         // versión necesaria
  central.writeUInt16LE(0x0800, 8);
  central.writeUInt16LE(8, 10);
  central.writeUInt16LE(hora, 12);
  central.writeUInt16LE(fecha, 14);
  central.writeUInt32LE(crc, 16);
  central.writeUInt32LE(comprimidos.length, 20);
  central.writeUInt32LE(datos.length, 24);
  central.writeUInt16LE(nombre.length, 28);
  central.writeUInt32LE(desplazamiento, 42); // dónde empieza su cabecera local
  directorio.push(central, nombre);

  desplazamiento += local.length + nombre.length + comprimidos.length;
  console.log(`  ${nombre.toString()} (${datos.length} B)`);
}

const tamanoDirectorio = directorio.reduce((s, b) => s + b.length, 0);
const fin = Buffer.alloc(22);
fin.writeUInt32LE(0x06054b50, 0);       // fin del directorio central
fin.writeUInt16LE(directorio.length / 2, 8);
fin.writeUInt16LE(directorio.length / 2, 10);
fin.writeUInt32LE(tamanoDirectorio, 12);
fin.writeUInt32LE(desplazamiento, 16);

const zip = Buffer.concat([...partes, ...directorio, fin]);
writeFileSync(salida, zip);
console.log(`${salida}: ${(zip.length / 1024).toFixed(1)} KB${zip.length > LIMITE ? ' · SUPERA 25 MB' : ''}`);
if (zip.length > LIMITE) process.exit(1);
