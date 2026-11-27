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

Esta tabla es la del modo «Ola fija (Fase 1)». En la Fase 2 las llegadas las decide la cadena de Markov Oleada y cada turno dura un número de pasos k (sección 16.4).

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
| Relevo a la línea (t_a_linea) | Clic en la flecha LÍNEA → del tablero de relevo | → (en la Fase 1 era L) | Flecha del tablero o botón →LÍN |
| Relevo al lavado (t_a_lavado) | Clic en la flecha ← LAVADO del tablero de relevo | ← o V | Flecha del tablero o botón →LAV |
| Ver qué token le falta a una estación | Clic en el lavado, el carro o el estante de bandejas | – | Tocar |
| Ver los conflictos (choice) del marcado | Clic en el tablero de relevo | – | Tocar |
| Pausa | Botón ⏸ | P | Botón ⏸ |
| Inspector de la red | Botón I | I | Botón I |
| Velocidad ×1, ×2, ×4, ×8 | Botón de velocidad | 1, 2, 4, 8 | Botón de velocidad |
| Piloto automático de servir | Botón AUTO | A | Botón AUTO |
| Regla de prevención (monitores) | Botón MON | N (en la Fase 1 era M) | Botón MON |
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

Producción (estudiantes en Salida sobre el total y servidos), fallos reparados, intentos bloqueados, desbordes, deadlocks evitados (veces que, tras un relevo decidido con el radar en amarillo, el radar volvió a verde), lavados, puntaje, bono de riesgo y logros.

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

---

## 16. Fase 2: azar controlado y registro de la partida

Agregada con las habilidades `ingeniero-estocastico` (cadenas, `docs/modelo/markov.md`), `analista-procesos` (registro, `docs/log.md`), `disenador-simuladores-sed` (este capítulo) y `director-arte-isometrico` (`docs/arte.md`, sección 9). Las secciones 1 a 15 siguen vigentes; esta solo agrega.

### 16.1 Qué cambia

En la Fase 1 los estudiantes llegaban con una ola fija. Ahora llegan por **oleadas** que decide una Cadena de Markov en tiempo discreto: en cada paso k (30 s de simulación) la oleada es Baja, Media o Alta y trae 4, 10 o 18 estudiantes. El jugador no sabe cuál viene, pero el **panel de Markov** le dice con qué probabilidad: con π^(n) puede abrir la **línea 3** antes de que llegue la oleada alta y cerrarla cuando ya no hace falta, porque cada paso abierta cuesta puntos. Además, cada partida deja un **Event Log** (un caso por estudiante) que se descarga en CSV y XES para analizarlo con minería de procesos.

### 16.2 Ciclo de juego con incertidumbre

| Ciclo | Duración | Qué hace el jugador | Elemento matemático |
|---|---|---|---|
| Corto: atender a un estudiante | 2 s a 6 s | Igual que en la Fase 1 | Autómatas, supervisor, t_servir |
| Paso k: leer el pronóstico | 30 s | Mira la oleada nueva y el riesgo P(Alta en ≤ 3 pasos) del HUD | Fila activa de P, π^(n) |
| Medio: dimensionar la línea | 1 a 3 min | Abre o cierra la línea 3 según el riesgo; compra un permiso de relevo si hace falta | Riesgo de llegar a Alta, π y la calculadora de dimensionamiento |
| Largo: el turno | 7 a 13 pasos | Termina el turno con la fila bajo control y el menor gasto | Estado estacionario: la línea 3 debería estar abierta cerca del 29 % del tiempo (π_Alta) |
| Después del turno | – | Descarga el Event Log y lo analiza | Minería de procesos |

### 16.3 Mecánica y elemento matemático

| Mecánica | Elemento matemático |
|---|---|
| Cada 30 s cambia la oleada de llegada | Paso k de la cadena Oleada: fila activa de P, u ~ U(0, 1) del generador con semilla, primer estado con acumulada ≥ u |
| Llegan 4, 10 o 18 estudiantes en el paso | Efecto del estado: eventos externos `llegada` de la Fase 1 |
| El indicador de Markov parpadea en amarillo | P(Alta en ≤ 3 pasos) ≥ 0,5: primera llegada a Alta, con Alta absorbente |
| El panel anticipa la oleada en n pasos | π^(n) = e_actual · P^n (Chapman-Kolmogorov) |
| La línea 3 debería abrirse cerca del 29 % del tiempo | π_Alta = 0,2890 del estado estacionario |
| La oleada alta vuelve cada 3,46 pasos | Tiempo medio de retorno 1/π_Alta |
| El juego respeta P | P estimada p̂_ij = n_ij / n_i y prueba χ² con α = 0,05 |
| La ocupación de las mesas se compara con su modelo | Cadena Mesas: ocupación observada de Mesa_libre por cuartos contra P de Mesas |
| Cada estudiante deja su traza | Event Log: Case_ID, Activity, Timestamp_Inicio, Timestamp_Fin, Resource_ID, Markov_State, Lifecycle |

### 16.4 Turnos con llegadas por Markov

La pantalla de título tiene la opción **Llegadas**: «Cadena de Markov (Fase 2)» (por omisión) u «Ola fija (Fase 1)», que deja el juego exactamente como en la Fase 1. Con Markov, cada turno dura un número de pasos con llegadas y después 90 s de cierre, como antes. El número de estudiantes depende de las oleadas; en promedio es el de la Fase 1:

| Turno | Pasos con llegadas | Duración de las llegadas | Estudiantes esperados (Python) |
|---|---|---|---|
| 1 · Desayuno | 7 | 210 s | 60,3 |
| 2 · Almuerzo | 10 | 300 s | 91,5 |
| 3 · Hora pico (ficha) | 13 | 390 s | 122,7 |
| 4 · Servicio continuo | sin fin | hasta que el jugador lo termina | 10,4 por paso |

Todos empiezan en Baja (π^(0) de la ficha). El turno 4 sirve para dejar correr cientos de pasos a ×8 sin intervenir: el piloto sirve y repara los torniquetes con la política automática (16.7). La meta sigue siendo 75 % de los que llegaron en Salida.

### 16.5 Línea 3 y compras

| Decisión | Efecto | Costo |
|---|---|---|
| Abrir la línea 3 (tecla 3, botón LÍNEA 3 o la calculadora del panel) | Abre el torniquete T3 y su fila (y = 5). Los estudiantes nuevos eligen la fila más corta entre las abiertas | 20 puntos al abrirla y 3 por cada paso k que siga abierta |
| Cerrar la línea 3 | Los estudiantes nuevos ya no la eligen; los que estaban en su fila se atienden | – |
| Comprar un permiso de relevo (calculadora del panel) | +1 token en Relevo (evento externo, máximo k = 2) | 25 puntos |

La línea 3 no está en la red de Petri: t_servir ya representa a cualquier mostrador. Lo que cambia es cuántos estudiantes se sirven al mismo tiempo. Con la línea 3 abierta la capacidad pasa de 12,5 a 18,75 estudiantes por paso: alcanza para la oleada alta (18).

### 16.6 Puntaje de la Fase 2

Se suma al de la sección 8:

| Hecho | Puntos |
|---|---|
| Abrir la línea 3 | −20 |
| Cada paso k con la línea 3 abierta | −3 |
| Pronóstico acertado: empieza un paso de oleada Alta y la línea 3 ya estaba abierta desde antes | +15 |
| Paso de oleada Alta que termina sin desborde de En_fila | +5 |
| Permiso de relevo comprado | −25 |
| Línea bien dimensionada: al cerrar el turno, la línea 3 estuvo abierta en todos los pasos Alta y cerrada en todos los Baja (al menos un paso Alta) | +30 |

### 16.7 Política automática

La usan la simulación acelerada («Generar log») y el turno 4. El piloto sirve en cuanto el supervisor y la red lo permiten (0,6 s de reacción); un torniquete bloqueado se repara 6 s después con `RS1S2K`; los monitores están activos y el personal queda 2 en la línea y 2 en el lavado.

- Política **base**: la línea 3 nunca se abre.
- Política **mejorada**: al empezar cada paso, si P(Alta en ≤ 3 pasos) ≥ 0,5 abre la línea 3; si la oleada es Baja y el riesgo es menor que 0,5, la cierra.

Con la misma semilla las dos políticas reciben las mismas oleadas y las mismas llegadas: la diferencia entre sus logs es el efecto de la línea 3.

### 16.8 Controles nuevos y cambiados

| Acción | Mouse | Teclado | Táctil |
|---|---|---|---|
| Panel de Markov | Botón MARKOV; clic derecho sobre la entrada (Oleada) o sobre las mesas (Mesas) | M | Botón MARKOV |
| Últimos 10 eventos del log | Botón LOG | L | Botón LOG |
| Exportar el Event Log | Botón EXPORTAR | E | Botón EXPORTAR |
| Abrir o cerrar la línea 3 | Botón LÍNEA 3 | 3 | Botón LÍNEA 3 |
| Mapa de calor de las esperas | Botón CALOR | H | Botón CALOR |
| Red de Petri en vivo | Clic en «Tokens por lugar» | R | Tocar «Tokens por lugar» |
| Velocidad ×8 | Botón de velocidad | 8 | Botón de velocidad |
| Terminar el turno 4 | Botón FIN | – | Botón FIN |
| Regla de prevención (antes M) | Botón MON | N | Botón MON |
| Relevo a la línea (antes L) | Flecha LÍNEA → | → | Botón →LÍN |
| Relevo al lavado | Flecha ← LAVADO | ← o V | Botón →LAV |

M y L eran de la Fase 1 (monitores y relevo a la línea). La guía del Laboratorio 2 asigna M al panel de Markov y L a la lista de eventos, así que esas dos acciones pasaron a N y →. Las demás teclas de la Fase 1 no cambian.

### 16.9 HUD de la Fase 2

| Zona | Contenido nuevo |
|---|---|
| Arriba a la izquierda, junto al reloj | Paso k (y el total del turno), estado de la oleada con su color e ícono, riesgo P(Alta en ≤ 3 pasos) que parpadea en amarillo desde 0,5 y la ocupación observada de las mesas |
| Abajo a la derecha, junto a las alertas | «Casos: abiertos / cerrados · Eventos: n» |
| Abajo al centro | Segunda fila de botones: MARKOV, LOG, EXPORTAR, LÍNEA 3, CALOR (y FIN en el turno 4) |

El radar, los tokens por lugar, el puntaje y las alertas de la Fase 1 no se mueven.

### 16.10 Panel de Markov

Escena superpuesta de 640 × 400 que no pausa la simulación. Selector de cadena (Oleada o Mesas) y cinco pestañas:

1. **Matriz**: mapa de calor de P con los valores a dos decimales y la fila del estado actual resaltada.
2. **Transitorio**: barras de π^(n) desde el estado actual con un deslizador n = 0..10, la cuenta escrita debajo y, en grande, P(Alta en ≤ 1, 3 y 5 pasos).
3. **Chapman-Kolmogorov**: P^(m+n) y P^m · P^n lado a lado para m y n elegidos, con la diferencia máxima.
4. **Largo plazo**: clasificación de estados, π contra las frecuencias observadas, tiempo medio de retorno y la calculadora de dimensionamiento con sus dos compras.
5. **Datos de la partida**: P estimada con n_ij, diferencia con P y la prueba χ² (estadístico, grados de libertad, valor p y conclusión).

### 16.11 Logros nuevos

| Logro | Condición verificable |
|---|---|
| Pronóstico certero | Un pronóstico acertado: la línea 3 ya estaba abierta cuando empezó una oleada Alta. |
| Oleada contenida | 3 pasos seguidos de oleada Alta sin desborde de En_fila. |
| Línea justa | Terminar un turno con la línea 3 abierta en todos los pasos Alta y cerrada en todos los Baja (al menos un paso Alta). |
| Registro completo | Exportar un Event Log con 200 casos cerrados o más. |

### 16.12 Resultados

Además de lo de la sección 13: casos cerrados, tiempo medio de ciclo (de la llegada a Salida), frecuencias de cada estado de la oleada frente a π, pasos con la línea 3 abierta y el botón para exportar el log.

### 16.13 Criterios de aceptación de la Fase 2

Se comprueban jugando, con el log o con `npm test`.

1. `npm test` pasa completo (pruebas de la Fase 1 y de la Fase 2) y no hay `Math.random()` en `src/`.
2. En cada paso k el indicador de la oleada cambia de color e ícono con un tween de 300 ms y aparece una etiqueta flotante; en ese paso llegan 4, 10 o 18 estudiantes según el estado.
3. La misma semilla produce la misma secuencia de oleadas y el mismo log.
4. El panel muestra P, π^(n) y π iguales a `analisis/resultados_python.json` (π^(5) desde Baja = 0,3313; 0,3910; 0,2777).
5. La pestaña Chapman-Kolmogorov muestra P^(m+n) = P^m · P^n.
6. Con la oleada en Media el indicador de Markov parpadea en amarillo (riesgo 0,509).
7. En el turno 4, tras 100 pasos o más, la P estimada de la oleada no se rechaza con χ² y α = 0,05.
8. La línea 3 se abre y se cierra con la tecla 3 y cobra 20 + 3 por paso; el permiso de relevo comprado aparece en el tablero.
9. El CSV abre en Excel con las 7 columnas y el XES carga en PM4Py; cada Case_ID es único, los tiempos crecen y ningún Timestamp_Fin es anterior a su Timestamp_Inicio.
10. «Generar log» produce 300 casos cerrados y 1000 eventos o más.
11. El HUD ocupa las zonas de 16.9 y los 4 logros nuevos muestran su aviso animado.
12. Resultados muestra casos cerrados, tiempo medio de ciclo, frecuencias frente a π y el botón para exportar.
13. H muestra el mapa de calor de las esperas; M, L, E, 3 y H funcionan con teclado, mouse y botones táctiles.
14. Con el panel abierto el juego se mantiene cerca de 60 fps (F1).
15. R muestra la red de Petri en vivo con la distribución de PIPE2, como el HUD de máquina muestra el autómata como en JFLAP: los tokens coinciden con «Tokens por lugar» y cada disparo parpadea.
