# GDD · UniFood Rush

Documento de diseño del simulador. Proyecto 13, bloque C (comedor universitario), dificultad baja.
Equipo: José Alejandro Morales, Amir Sarmiento, Carlos Antolinez.
El modelo formal manda: este documento no define reglas que no estén en `docs/modelo/`. Los valores están en `src/config.js`.

## 1. Concepto

Eres quien coordina el comedor universitario en la hora pico. Los estudiantes llegan en oleadas a dos filas. Cada uno pasa su carné por el torniquete, recibe su bandeja, busca mesa, almuerza y entrega el menaje. Tú sirves, reparas los torniquetes que se bloquean y decides cuántas personas trabajan en la línea y cuántas lavan. Si dejas el lavado sin personal, el ciclo de bandejas se rompe y el comedor queda en interbloqueo.

Vista isométrica 2.5D, 960 × 540 px, en el navegador con Phaser 4.2.1.

## 2. Pilares

1. **El modelo se ve.** Cada estudiante y cada torniquete muestran su autómata; cada recurso es un token que se puede contar.
2. **Decidir con recursos finitos.** 30 bandejas, 20 mesas, 10 huecos en el carro y 4 personas. Lo que das a la línea se lo quitas al lavado.
3. **El bloqueo se anuncia.** El radar mira 3 disparos adelante. Un interbloqueo nunca llega sin aviso.

## 3. MDA

| Capa | En UniFood Rush |
|---|---|
| Mecánicas | Un evento solo ocurre si δ lo define y el supervisor lo permite. Una transición solo se dispara con todos sus tokens (AND-join). Los relevos consumen permisos. |
| Dinámicas | Se forman filas cuando la línea no da abasto. El jugador se tienta a pasar todo el personal a la línea y provoca el interbloqueo. Guardar un permiso de relevo permite corregir a tiempo. Pulsar servir antes de la luz verde cuesta puntos. |
| Estética | La presión de la hora pico, el alivio de ver salir la fila, la alarma del radar en amarillo y el corte seco del rojo. |

## 4. Ciclo de juego

| Ciclo | Duración | Qué hace el jugador | Elemento formal |
|---|---|---|---|
| Corto: atender a un estudiante | 2 s a 6 s | Espera el `acceso_ok` del torniquete y pulsa servir en el mostrador. | Evento `servir`, transición t_servir, supervisor |
| Medio: mantener el ciclo de bandejas | 30 s a 60 s | Repara torniquetes bloqueados y vigila bandejas, mesas y carro. | Lenguaje de reparación, invariante de bandejas, t_lavar |
| Largo: terminar el turno | 240 s a 390 s | Decide el relevo del personal cada 120 s sin romper el ciclo. | Lugar Relevo, t_a_linea, t_a_lavado, radar |

## 5. Mecánicas y su elemento formal

| Mecánica | Elemento formal que la produce |
|---|---|
| El estudiante avanza por el comedor | Autómata Estudiante: En_Fila → Recibiendo_Bandeja → Buscando_Mesa → Almorzando → Entregando_Menaje → Salida |
| El torniquete lee, acepta, rechaza o se bloquea | Autómata Torniquete: eventos leer, acceso_ok, rechazo, bloqueo (no controlables) |
| El torniquete se bloquea al tercer rechazo | Composición Torniquete ‖ Contador_Rechazos: `bloqueo` solo está habilitado en C3 |
| Servir exige la luz verde del torniquete | Supervisor sobre Estudiante ‖ Torniquete ‖ Registro_Acceso: `servir` deshabilitado si Registro = Sin_acceso |
| Insistir en servir sin acceso | Intento bloqueado: no cambia ningún estado, tiembla la cámara, −5 puntos |
| Servir consume una bandeja limpia | t_servir: En_fila + Bandeja_limpia + Personal_linea → Con_bandeja + Personal_linea |
| Sentarse ocupa una mesa | t_sentarse: Con_bandeja + Mesa_libre → Almorzando |
| Entregar el menaje libera la mesa y llena el carro | t_terminar: Almorzando + Espacio_carro → Mesa_libre + Bandeja_sucia + Salida |
| El lavado recicla bandejas de 5 en 5 | t_lavar: Bandeja_sucia ×5 + Personal_lavado → Bandeja_limpia ×5 + Espacio_carro ×5 + Personal_lavado |
| El carro lleno detiene a los que terminan | Espacio_carro = 0 deshabilita t_terminar (carro 10-acotado) |
| Reparar el torniquete con una secuencia de comandos | Palabra w ∈ L, L = `^R(S[1-3]){2,}K$`; si pertenece se ejecuta `reiniciar` |
| Relevo del personal cada 120 s | Evento externo que completa Relevo hasta k = 2; t_a_linea y t_a_lavado consumen 1 permiso |
| La fila que no cabe penaliza | En_fila con k = 16 y capacidad desborde: −3 puntos por llegada en exceso |
| Regla de prevención | Lugares monitor Minimo_lavado y Minimo_linea: siempre 1 persona o más en cada puesto |
| Radar de bloqueos | `explorar(red, M, 3)` tras cada disparo: verde, amarillo o rojo |
| Game over | Marcado muerto con estudiantes en proceso (interbloqueo) |

## 6. Tiempos (segundos de simulación)

| Tiempo | Valor |
|---|---|
| Acercar el carné al lector | 0,4 s |
| Lectura del torniquete (leer → acceso_ok o rechazo) | 0,8 s |
| Reintento tras un rechazo | 1,0 s |
| Bloqueo tras el tercer rechazo | 0,5 s |
| Servir (el estudiante ocupa el mostrador) | 3,0 s × 2 / M(Personal_linea): 6,0 s con 1 persona, 3,0 s con 2, 2,0 s con 3, 1,5 s con 4 |
| Almuerzo | uniforme entre 30 s y 42 s |
| Entregar el menaje | 3,0 s |
| Lavar un lote de 5 bandejas | 10 s por persona de lavado |
| Cambio de turno del personal | cada 120 s |
| Piloto automático: demora antes de servir | 0,6 s |
| Velocidad de simulación | ×1, ×2 o ×4 |

## 7. Turnos (dificultad creciente)

| Turno | Estudiantes | Llegan durante | Cierre máximo | Probabilidad de rechazo por lectura | Meta |
|---|---|---|---|---|---|
| 1 · Desayuno | 60 | 240 s | 330 s | 10 % | 75 % en Salida |
| 2 · Almuerzo | 90 | 300 s | 390 s | 10 % | 75 % en Salida |
| 3 · Hora pico (ficha) | 120 | 300 s (5 min) | 390 s | 10 % | 75 % en Salida |

El turno termina cuando todos salieron o al llegar al cierre máximo. Las llegadas siguen una ola con su pico a mitad del turno. Semilla fija 96: la partida es reproducible y el primer bloqueo de torniquete del turno 1 ocurre cerca de los 39 s.

## 8. Puntaje

| Hecho | Puntos |
|---|---|
| Estudiante que llega a Salida (palabra `sbmte`) | +10 |
| Además, si esperó menos de 20 s en la fila | +5 |
| Torniquete reparado con una palabra de L | +15 |
| Disparo de t_lavar | +2 |
| Turno terminado sin interbloqueo | +50 |
| Turno completo sin monitores y sin interbloqueo | +20 % del puntaje del turno |
| Intento bloqueado por el supervisor | −5 |
| Palabra de reparación que no pertenece a L | −10 |
| Pedir ayuda en la consola (una vez por bloqueo) | −15 |
| Llegada con En_fila por encima de k = 16 | −3 |

## 9. Victoria y derrota

- **Victoria:** el turno termina sin interbloqueo y con 75 % o más de los estudiantes en Salida.
- **Derrota por meta:** el turno termina con menos de 75 % en Salida.
- **Game over por interbloqueo:** la red llega a un marcado muerto con estudiantes en proceso. La simulación se detiene. La pantalla muestra el marcado muerto, la secuencia de disparos y la regla de prevención. El jugador puede reintentar desde el último marcado verde guardado (inicio del turno o último cambio de turno del personal).

Balance. Con 2 y 2 nunca hay interbloqueo, pero en la hora pico la fila se desborda. Con 3 en línea y 1 en lavado la fila baja y el lavado va justo. Con 4 y 0 se sirve más rápido durante unos 90 s y luego llega el interbloqueo de la ficha. Con 0 y 4 nadie sirve y el bloqueo es inmediato. Jugar sin monitores da 20 % más de puntaje y permite el error.

## 10. Controles

| Acción | Mouse | Teclado | Táctil |
|---|---|---|---|
| Servir al primero de una fila | Clic en el mostrador | Q (línea 1), W (línea 2) | Tocar el mostrador |
| Abrir el HUD de un torniquete o de un estudiante | Clic sobre él | – | Tocarlo |
| Disparar un evento desde el HUD | Clic en el botón | – | Tocar el botón |
| Escribir en la consola de reparación | Clic en los comandos | R, S, 1, 2, 3, K, Retroceso, Enter | Botones de comandos |
| Relevo a la línea (t_a_linea) | Clic en una persona de lavado | L | Tocarla |
| Relevo al lavado (t_a_lavado) | Clic en una persona de línea | V | Tocarla |
| Ver qué token le falta a una estación | Clic en lavado, carro o pila | – | Tocar |
| Pausa | Botón ⏸ | P | Botón ⏸ |
| Inspector de la red | Botón I | I | Botón I |
| Velocidad ×1, ×2, ×4 | Botón de velocidad | 1, 2, 4 | Botón de velocidad |
| Piloto automático de servir | Botón AUTO | A | Botón AUTO |
| Regla de prevención (monitores) | Botón MON | M | Botón MON |
| Mover y acercar la cámara | Arrastre y rueda | – | Arrastre y pellizco |
| Cerrar el panel abierto | Botón ✕ | Esc | Botón ✕ |
| Mostrar fps y tiempo de simulación | – | F1 | – |

## 11. HUD por zonas

| Zona | Contenido |
|---|---|
| Arriba a la izquierda | Reloj de simulación, turno, velocidad y próximo cambio de turno del personal |
| Arriba al centro | Puntaje y estudiantes en Salida sobre el total |
| Arriba a la derecha | Radar del Árbol de Cobertura: color, distancia al bloqueo y mini-grafo de los últimos marcados |
| Abajo a la izquierda | Tokens por lugar con su contador m/k |
| Abajo a la derecha | Alertas: bloqueos de torniquete, intentos bloqueados, desbordes, tokens que faltan, relevos |
| Abajo al centro | Botones táctiles: pausa, inspector, velocidad, AUTO y MON |

Sin textos de ayuda fijos durante la partida. Los controles se explican en la pantalla de título.

## 12. Logros

| Logro | Condición verificable |
|---|---|
| Primera bandeja | Un estudiante completa el ciclo y llega a Salida. |
| Técnico de torniquetes | Reparar un torniquete al primer intento y sin pedir ayuda. |
| Fila legal | 15 `servir` seguidos sin intentos bloqueados por el supervisor. |
| Ciclo cerrado | 6 disparos de t_lavar en un turno (30 bandejas recicladas). |
| Sin red de seguridad | Terminar un turno con los monitores desactivados y sin interbloqueo. |
| Hora pico superada | Terminar un turno sin interbloqueo con 90 % o más en Salida. |

## 13. Pantalla de resultados

Producción (estudiantes en Salida sobre el total y servidos), fallos reparados, intentos bloqueados, desbordes, deadlocks evitados (veces que una acción del jugador llevó el radar de amarillo a verde), lavados, puntaje, bono de riesgo y logros.

## 14. Arte

La guía de estilo está en `docs/arte.md`: paleta, rejilla 2:1 de 64 × 32 px, un color e ícono por estado y una forma por tipo de token. Capacidad de Phaser 4 de la ficha: grupos de objetos para la multitud y orden de profundidad por (x + y).

Alcance mínimo de la ficha: 2 torniquetes, 2 líneas de servido, 20 mesas, 1 zona de lavado, hora pico de 5 min con 120 estudiantes.

## 15. Criterios de aceptación

Se comprueban jugando o con `npm test`.

1. El color y el ícono de cada estudiante y torniquete coinciden con el estado de su autómata.
2. El grafo del HUD de máquina es igual al del archivo `.jff`: mismos estados, flechas y códigos.
3. Ningún estudiante ni torniquete cambia de estado sin un evento de δ (se ve en su historial).
4. Pulsar servir antes del `acceso_ok` no sirve, muestra la razón formal en rojo y descuenta 5 puntos.
5. El torniquete se bloquea exactamente al tercer rechazo.
6. La consola repara con `RS1S2K` y rechaza `RS1K` y `RS4S1K`; el progreso del DFA se ve símbolo a símbolo.
7. Sin bandejas limpias no se puede servir y la estación dice que falta Bandeja_limpia.
8. Con el carro lleno (10 de 10) los estudiantes que terminan esperan en su mesa.
9. Con 17 o más estudiantes en En_fila la zona de filas parpadea y cada llegada descuenta 3 puntos.
10. El inspector muestra Pre, Post, A y la cuenta M_k = M_{k−1} + Aᵀ · u_k con números correctos.
11. Sin monitores, pasar todo el personal a la línea lleva el radar a amarillo y luego a rojo, y termina la partida.
12. Con monitores, el segundo relevo a la línea no se dispara y la estación dice que falta Minimo_lavado.
13. El HUD ocupa las zonas de la sección 11 y los 6 logros muestran un aviso animado.
14. El turno 3 dura 5 min de llegadas con 120 estudiantes y se puede jugar con mouse, teclado y táctil.
15. `npm test` pasa completo y `src/sed/` no menciona Phaser.
