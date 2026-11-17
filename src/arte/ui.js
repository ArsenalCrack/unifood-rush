// Piezas de interfaz dibujadas en código: paneles y botones.

import { PALETA, TEXTO, estilo, sombra } from './paleta.js';

// Panel oscuro con borde redondeado. Devuelve el Graphics.
export function panel(escena, x, y, ancho, alto, { alfa = 0.9, borde = 0xffffff, alfaBorde = 0.18, radio = 8, color = 0x0f1524 } = {}) {
  const g = escena.add.graphics();
  g.fillStyle(color, alfa);
  g.fillRoundedRect(x, y, ancho, alto, radio);
  g.lineStyle(1.5, borde, alfaBorde);
  g.strokeRoundedRect(x, y, ancho, alto, radio);
  return g;
}

// Botón con texto. alPulsar se llama con el propio botón.
// Métodos extra: fijarTexto, fijarColor, activar(false) para dejarlo inactivo.
// opciones.resolucion: para botones que viven en la planta, cuya cámara se acerca.
export function boton(escena, x, y, etiqueta, opciones = {}, alPulsar = null) {
  const { ancho = 120, alto = 28, tam = 13, colorTexto = TEXTO.claro, resolucion = null } = opciones;
  let color = opciones.color ?? PALETA.mantenimiento;
  let activo = true;
  const fondo = escena.add.graphics();
  const pintar = (c) => {
    fondo.clear();
    fondo.fillStyle(c, activo ? 1 : 0.45);
    fondo.fillRoundedRect(-ancho / 2, -alto / 2, ancho, alto, 6);
    fondo.lineStyle(1.2, 0xffffff, 0.3);
    fondo.strokeRoundedRect(-ancho / 2, -alto / 2, ancho, alto, 6);
  };
  pintar(color);
  const extra = resolucion ? { fontStyle: 'bold', resolution: resolucion } : { fontStyle: 'bold' };
  const texto = escena.add.text(0, 0, etiqueta, estilo(tam, colorTexto, extra)).setOrigin(0.5);
  const b = escena.add.container(x, y, [fondo, texto]);
  b.setSize(ancho, alto);
  b.setInteractive({ useHandCursor: true });
  b.on('pointerover', () => pintar(sombra(color, 0.22)));
  b.on('pointerout', () => pintar(color));
  b.on('pointerdown', (puntero, lx, ly, evento) => {
    evento?.stopPropagation();
    if (activo && alPulsar) alPulsar(b);
  });
  b.fijarTexto = (t) => { texto.setText(t); return b; };
  b.fijarColor = (c) => { color = c; pintar(c); return b; };
  b.activar = (si) => { activo = si; texto.setAlpha(si ? 1 : 0.55); pintar(color); return b; };
  b.texto = texto;
  return b;
}
