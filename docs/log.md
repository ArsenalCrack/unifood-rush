# Event Log · UniFood Rush (Fase 2)

Diseño del registro de eventos de cada partida. Lo escribió la habilidad `analista-procesos` con los datos de la ficha D.13. El registrador está en `src/telemetria/registrador.js` y los exportadores en `src/telemetria/`.

## 1. Caso

**Case_ID = un estudiante**, con el formato `EST-0001`. El número es el orden de llegada en la partida. El caso empieza cuando el estudiante llega a una fila (evento externo `llegada`, +1 token en `En_fila`) y termina cuando entrega el menaje y sale (evento `entregar` del autómata Estudiante, estado Salida). Un caso sin `Entregar_menaje` terminado al exportar es un **caso incompleto**.

## 2. Actividades en orden normativo

Cada actividad sale de un cambio del núcleo (un evento de δ o el disparo de una transición), nunca de una escena:

| N.º | Activity | Empieza con | Termina con | Resource_ID |
|---|---|---|---|---|
| 1 | `Esperar_fila` | `llegada`: token nuevo en En_fila | `leer`: el torniquete toma su carné por primera vez | `Linea_1`, `Linea_2` o `Linea_3` (la fila que eligió) |
| 2 | `Pasar_torniquete` | `leer` | `acceso_ok` o `rechazo`. Cada lectura es una fila del log: un rechazo deja una fila y la nueva lectura abre otra | `Torniquete_1`, `Torniquete_2` o `Torniquete_3` |
| 3 | `Recibir_bandeja` | `servir` (disparo de t_servir) | `buscar_mesa` | `Linea_1`, `Linea_2` o `Linea_3` |
| 4 | `Buscar_mesa` | `buscar_mesa` | `sentarse` (disparo de t_sentarse) | `Mesa_01` a `Mesa_20`: la mesa que consigue |
| 5 | `Almorzar` | `sentarse` | fin del almuerzo (de 30 s a 42 s después) | `Mesa_01` a `Mesa_20` |
| 6 | `Entregar_menaje` | `terminar` (disparo de t_terminar) | `entregar`: el estudiante llega a Salida | `Lavado` |

**Orden respecto a la ficha.** La ficha lista Pasar_torniquete antes de Esperar_fila. En el modelo de la Fase 1 el torniquete lee el carné del estudiante que está en la cabeza de la fila, justo antes de servir (el supervisor exige `acceso_ok` para servir), así que en el juego la fila va antes del torniquete. Los nombres de las actividades son los de la ficha; solo cambia el orden, porque el log registra lo que el modelo hace.

**Esperas sin actividad.** El tiempo entre dos actividades seguidas de un caso es espera:

- entre `acceso_ok` y `servir`: espera al personal (o al piloto) y, si no hay bandejas limpias, a `Bandeja_limpia`;
- entre un `rechazo` y la lectura siguiente: reintento de 1 s o, si el torniquete se bloqueó, la reparación;
- entre el fin del almuerzo y `terminar`: espera a un `Espacio_carro` (carro lleno porque nadie lava).

`Esperar_fila` y `Buscar_mesa` son esperas con nombre propio (la fila y la búsqueda de mesa). En el análisis de desempeño se suman a las esperas sin actividad.

## 3. Columnas del CSV

Esquema fijo de la habilidad: una fila por actividad.

| Columna | Contenido |
|---|---|
| `Case_ID` | `EST-0001` |
| `Activity` | Nombre exacto de la tabla anterior |
| `Timestamp_Inicio` | `FECHA_BASE_LOG` + tiempo de simulación del inicio, ISO 8601 con milisegundos: `2026-01-01T11:30:05.400Z` |
| `Timestamp_Fin` | Lo mismo para el fin; vacío si la actividad seguía abierta al exportar |
| `Resource_ID` | Recurso de la tabla anterior |
| `Markov_State` | Estado de la cadena Oleada al empezar la actividad: `Baja`, `Media` o `Alta` (`-` en el modo «Ola fija (Fase 1)») |
| `Lifecycle` | `complete` si la actividad terminó; `start` si seguía abierta |

`FECHA_BASE_LOG = 2026-01-01T11:30:00Z` (`src/config.js`): el comedor abre a las 11:30, como dice la ficha. Las marcas de tiempo nunca usan la hora del computador; solo el nombre del archivo lleva la fecha real de la exportación.

El CSV va en UTF-8 con BOM (para que Excel lea las tildes), separado por comas, y los textos con coma, comillas o saltos de línea van entre comillas.

## 4. XES

IEEE 1849-2016, con las extensiones Concept, Time, Organizational y Lifecycle. Una `<trace>` por caso y, por cada fila del CSV, un `<event>` de inicio (`lifecycle:transition = start`) y otro de fin (`complete`). Cada evento lleva `concept:name`, `time:timestamp`, `org:resource`, `lifecycle:transition` y `markov:state`.

Atributos de caso (en la traza): `concept:name` (Case_ID), `oleada_llegada` (estado de la oleada cuando llegó), `linea`, `turno`, `semilla` y `completo` (falso si es un caso incompleto). La ficha D.13 no define tipo ni prioridad del estudiante.

## 5. Modelo normativo

Workflow Net con un lugar inicial, un lugar final y una transición por actividad, etiquetada con el nombre exacto del log:

```
i → [Esperar_fila] → p1 → [Pasar_torniquete] → p2 → [Recibir_bandeja] → p3 → [Buscar_mesa] → p4 → [Almorzar] → p5 → [Entregar_menaje] → o
```

Sale del modelo de la Fase 1: el autómata Estudiante (En_Fila → Recibiendo_Bandeja → Buscando_Mesa → Almorzando → Entregando_Menaje → Salida, palabra `sbmte`) y la especificación Registro_Acceso (`acceso_ok` antes de `servir`). Archivo: `analisis/modelo_normativo.pnml`.

Desvíos que el modelo de la Fase 1 sí permite y que el log debe mostrar:

| Desvío | Causa en el juego | Frecuencia esperada |
|---|---|---|
| `Pasar_torniquete` repetido | `rechazo` del lector (probabilidad 0,10 por lectura en los 3 turnos) | Cerca del 10 % de los casos |
| `Pasar_torniquete` repetido con una espera larga entre lecturas | Bloqueo del torniquete al tercer rechazo hasta que el jugador lo repara | Uno de cada 3 rechazos de cada torniquete |

Cualquier otro desvío (por ejemplo `Almorzar` antes de `Recibir_bandeja`) es imposible en el modelo formal: si aparece, es un error del juego y se corrige.

## 6. Exportación

| Opción | Qué incluye |
|---|---|
| Botón «Exportar Event Log» o tecla E | Menú con CSV, XES y la casilla «Solo casos cerrados» |
| CSV o XES con «Solo casos cerrados» apagado | Todos los casos; los incompletos con su actividad abierta (`start`) |
| CSV o XES con «Solo casos cerrados» encendido | Solo los casos que llegaron a Salida. El aviso dice cuántos casos se quitaron |
| «Generar log» en el título (simulación acelerada) | Corre el núcleo sin dibujar hasta 300 casos cerrados y descarga CSV y XES solo con los casos cerrados |

Nombre de los archivos: `UniFoodRush_semilla<S>_<fecha>.csv` y `.xes`, con S la semilla de la partida y la fecha de la exportación (`20261126-1530`).

La descarga se hace en el navegador con un `Blob` y un enlace temporal (`src/telemetria/descarga.js`): no hay servidor, así que funciona en la previsualización del aula virtual.

## 7. Reglas del registro

- Si el jugador reintenta tras un interbloqueo, la partida vuelve al último marcado verde y el registro vuelve al mismo punto: se quitan los eventos posteriores, porque esa parte de la partida ya no ocurrió. El HUD avisa cuántos se quitaron.
- La simulación acelerada usa la política automática del GDD (sección 16.7). La política base deja la línea 3 cerrada; la mejorada la abre cuando P(Alta en ≤ 3 pasos) ≥ 0,5. Con la misma semilla, las dos partidas reciben exactamente las mismas oleadas y las mismas llegadas.
- Logs de la entrega: `analisis/logs/entrega/base.csv`, `base.xes`, `mejorado.csv` y `mejorado.xes`.

## 8. Preguntas del análisis (ficha D.13)

Performance y Enhancement: ¿cuánto tarda un estudiante desde el torniquete hasta la bandeja en cada oleada, y cuánto baja al abrir la tercera línea?

Como el torniquete está en la cabeza de la fila, se miden dos tiempos por caso y se agrupan por `oleada_llegada` (el Markov_State de Esperar_fila):

1. Desde la llegada a la fila hasta que recibe la bandeja: inicio de `Esperar_fila` → inicio de `Recibir_bandeja`.
2. Desde la primera lectura del torniquete hasta la bandeja: inicio del primer `Pasar_torniquete` → inicio de `Recibir_bandeja`.

La mejora (línea 3) se valida con los logs base y mejorado de la misma semilla.
