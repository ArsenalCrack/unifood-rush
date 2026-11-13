// Punto único de carga de los modelos formales en JSON.
// Se importan como módulos para que entren en el build de Vite y para que
// las pruebas de Node usen exactamente los mismos datos que el juego.
import estudiante from './estudiante.json' with { type: 'json' };
import torniquete from './torniquete.json' with { type: 'json' };
import contadorRechazos from './contador_rechazos.json' with { type: 'json' };
import registroAcceso from './registro_acceso.json' with { type: 'json' };
import reparacion from './reparacion.json' with { type: 'json' };
import comedor from './comedor.json' with { type: 'json' };
import comedorMonitor from './comedor_monitor.json' with { type: 'json' };

export const MODELOS = {
  estudiante,        // autómata de la ficha (uno por estudiante)
  torniquete,        // autómata de la ficha (uno por línea)
  contadorRechazos,  // extensión: bloqueo tras 3 rechazos
  registroAcceso,    // especificación del supervisor
  reparacion,        // lenguaje de reparación (RegExp + DFA)
  comedor,           // red de Petri de la ficha
  comedorMonitor     // red con la regla de prevención
};

export {
  estudiante, torniquete, contadorRechazos, registroAcceso,
  reparacion, comedor, comedorMonitor
};
