# Cadenas de Markov · UniFood Rush (Fase 2)

Modelo estocástico del proyecto 13, ficha D.13 de la guía del Laboratorio 2. Lo escribió la habilidad `ingeniero-estocastico` a partir de `analisis/markov_validacion.py` y de `analisis/resultados_python.json`. Los números de este documento son los de Python; `test/markov.test.js` comprueba que el núcleo `src/sed/markov.js` da los mismos con tolerancia 1e-6.

La cadena no reemplaza a los autómatas ni a la red de Petri de la Fase 1: decide **cuándo ocurren las llegadas**, que son eventos externos del reloj. Cada llegada sigue entrando por `llegada()`: agrega un token a `En_fila` y crea un autómata Estudiante nuevo. Todo cambio de estado sigue pasando por δ y todo recurso por el disparo de una transición.

## 1. Resumen

| Cadena | Estados | Paso k (tiempo de juego) | π^(0) | ¿Ergódica o absorbente? | Clases y periodo | Archivo |
|---|---|---|---|---|---|---|
| Oleada | Baja, Media, Alta | 1 paso = 30 s de simulación (2 min del comedor) | (1; 0; 0): el comedor abre a las 11:30 en Baja | Ergódica | Una clase recurrente {Baja, Media, Alta}, periodo 1 | `src/sed/modelos/markov/oleada.json` |
| Mesas | 0-25%, 25-50%, 50-75%, 75-100% | 1 paso = 30 s de simulación | (1; 0; 0; 0): al abrir, las 20 mesas están libres | Ergódica | Una clase recurrente con los 4 estados, periodo 1 | `src/sed/modelos/markov/mesas.json` |

Semilla de las cadenas: `SEMILLA_MARKOV = 2026` en `src/config.js`, la misma de la simulación de Python. En una partida, el generador de la cadena se inicia con `SEMILLA_MARKOV · 100000 + semilla · 10 + turno`: con la semilla 96 del GDD cada turno tiene siempre la misma secuencia de oleadas, haga lo que haga el jugador.

## 2. Paso k

1 paso k = 30 s del reloj de simulación (`PASO_K_MS = 30000`). La ficha dice «1 paso = 2 minutos simulados»: el juego comprime el tiempo del comedor 4 veces, como ya lo hacía la Fase 1 (la hora pico de 5 min de la ficha dura 300 s de simulación).

Por qué 30 s y no 120 s: con los tiempos de la Fase 1 (servir 3 s con 2 personas, almorzar de 30 s a 42 s), un paso de 120 s daría 0,09 llegadas por segundo y nunca se formaría fila. Con 30 s, la oleada media de 10,4 estudiantes por paso usa el 83 % de la capacidad de servido de 2 líneas, y los turnos de 7, 10 y 13 pasos traen en promedio 60, 91 y 123 estudiantes, casi los 60, 90 y 120 de la Fase 1.

## 3. Cadena Oleada (gobierna las llegadas)

### Estados y efecto en el juego

| Estado | Estudiantes que llegan en el paso | Efecto en el juego | Color e ícono (`docs/arte.md`) |
|---|---|---|---|
| Baja | 4 | 0,13 llegadas por segundo: la fila se vacía | verde de operación, 1 persona |
| Media | 10 | 0,33 llegadas por segundo: la línea trabaja al 80 % | amarillo de espera, 2 personas |
| Alta | 18 | 0,60 llegadas por segundo: con 2 líneas la fila crece unos 5,5 estudiantes por paso y se desborda | rojo de fallo, 3 personas |

Las llegadas de un paso se reparten al azar (uniforme, con el generador de la cadena) dentro de los 30 s del paso.

### Matriz P

| Desde \ hacia | Baja | Media | Alta | Justificación de la fila |
|---|---|---|---|---|
| Baja | 0,60 | 0,30 | 0,10 | Fuera de los cambios de clase la oleada sigue baja; al terminar una clase sube a media y rara vez salta directo a alta. |
| Media | 0,25 | 0,50 | 0,25 | Una oleada media dura la mitad del tiempo y es igual de probable que se disuelva o que crezca. |
| Alta | 0,10 | 0,35 | 0,55 | Una oleada alta tiende a seguir; casi siempre baja primero a media y casi nunca cae de golpe a baja. |

Cada fila suma 1 y no hay valores negativos (el núcleo lanza un error si una fila no suma 1 con tolerancia 1e-9).

### Clasificación

Todos los p_ij son positivos: desde cualquier estado se llega a cualquier otro en un paso. Hay una sola clase {Baja, Media, Alta}, cerrada y por tanto recurrente. Como p_ii > 0, el periodo es 1. La cadena es irreducible y aperiódica: **ergódica**.

### Resultados de referencia (Python)

| Resultado | Valor en Python | Interpretación en el juego |
|---|---|---|
| π^(1) desde Baja | (0,60; 0,30; 0,10) | En el primer paso hay 10 % de probabilidad de oleada alta. |
| π^(2) desde Baja | (0,445; 0,365; 0,19) | |
| π^(4) desde Baja | (0,3460; 0,3885; 0,2655) | |
| π^(5) desde Baja | (0,3313; 0,3910; 0,2777) | Tras 2 min 30 s ya casi no importa que el comedor abriera en Baja. |
| π^(8) desde Baja | (0,3194; 0,3928; 0,2878) | ≈ π |
| π (estado estacionario) | (0,3179; 0,3931; 0,2890) | A largo plazo el comedor pasa el 28,9 % del tiempo en oleada alta. |
| Tiempo medio de retorno 1/π | (3,15; 2,54; 3,46) pasos | Una oleada alta vuelve en promedio cada 3,46 pasos (1 min 44 s). |
| Frecuencias en 10 000 pasos (semilla 2026) | (0,3068; 0,3975; 0,2957) | Diferencia máxima con π: 0,0111 (menor que 0,02). |
| P estimada en 10 000 pasos | (0,598; 0,299; 0,103) · (0,243; 0,506; 0,251) · (0,090; 0,354; 0,556) | χ² = 4,845 con 6 gl, valor p = 0,564: no se rechaza P con α = 0,05. |
| Chapman-Kolmogorov | P^5 = P^2 · P^3; diferencia máxima entre P^(m+n) y P^m · P^n para m, n = 1..5: 1,1 · 10^−16 | Error de redondeo. |

### Riesgo: llegar a oleada Alta en los próximos k pasos

Probabilidad de que la oleada sea Alta al menos una vez en los próximos k pasos (Alta se vuelve absorbente para contar la primera llegada):

| Desde | k = 1 | k = 3 | k = 5 |
|---|---|---|---|
| Baja | 0,1000 | 0,3610 | 0,5599 |
| Media | 0,2500 | 0,5088 | 0,6646 |
| Alta | 1 | 1 | 1 |

Umbral del GDD: `UMBRAL_RIESGO = 0,5` para k = 3. En Media el riesgo es 0,509 y el indicador de Markov del HUD parpadea en amarillo: es el momento de abrir la línea 3.

### Dimensionamiento con π

Demanda media: π · (4; 10; 18) = **10,40 estudiantes por paso**. Capacidad de servido por paso de 30 s con los tiempos del GDD (acercar el carné 0,4 s, lectura 0,8 s, reacción del piloto 0,6 s y servir 3,0 s × 2 / personas en la línea):

| Configuración | Estudiantes por paso | Utilización media (10,40) | Utilización en Alta (18) |
|---|---|---|---|
| 2 líneas, 2 personas en la línea | 12,50 | 0,83 | 1,44: la fila crece |
| 2 líneas, 3 personas en la línea | 15,79 | 0,66 | 1,14: la fila crece despacio |
| 3 líneas, 2 personas en la línea | 18,75 | 0,55 | 0,96: la fila no crece |
| 3 líneas, 3 personas en la línea | 23,68 | 0,44 | 0,76 |

Conclusión: con 2 líneas el comedor aguanta la oleada media pero no la alta. La línea 3 se justifica solo mientras la oleada es Alta o hay riesgo de que lo sea, porque cuesta puntos por cada paso abierta (GDD, sección 16).

## 4. Cadena Mesas (modelo de referencia)

La ficha la define como «modelo de referencia para comparar con la red de Petri». En el juego **no se sortea**: en cada paso k se observa la ocupación real, 20 − M(Mesa_libre) = M(Almorzando), se discretiza en cuartos y se registra la transición observada. Así se compara lo que hace la red de Petri con lo que predice la cadena: frecuencias contra π, P estimada contra P y prueba χ².

| Estado | Mesas ocupadas | Significado |
|---|---|---|
| 0-25% | 0 a 4 | Comedor casi vacío |
| 25-50% | 5 a 9 | Ocupación baja |
| 50-75% | 10 a 14 | Ocupación alta |
| 75-100% | 15 a 20 | Comedor lleno: los que llegan con bandeja esperan mesa (Buscar_mesa) |

### Matriz P

| Desde \ hacia | 0-25% | 25-50% | 50-75% | 75-100% | Justificación de la fila |
|---|---|---|---|---|---|
| 0-25% | 0,50 | 0,40 | 0,10 | 0 | Casi vacío, se llena de a un cuarto por paso; no se llena en un solo paso. |
| 25-50% | 0,20 | 0,50 | 0,25 | 0,05 | Tiende a seguir igual; sube un poco más de lo que baja. |
| 50-75% | 0,05 | 0,25 | 0,50 | 0,20 | Simétrica a la anterior. |
| 75-100% | 0 | 0,10 | 0,40 | 0,50 | Lleno, se vacía de a poco: nunca pasa de lleno a casi vacío en un paso. |

### Clasificación y resultados

Desde 0-25% se llega a 75-100% en dos pasos y al revés también, así que hay una sola clase recurrente; p_ii > 0 da periodo 1. Cadena **ergódica**.

| Resultado | Valor en Python | Interpretación |
|---|---|---|
| π^(5) desde 0-25% | (0,2019; 0,3612; 0,3048; 0,1321) | |
| π (estado estacionario) | (0,1667; 0,3333; 0,3333; 0,1667) | La matriz es simétrica respecto al centro: la ocupación media es la mitad de las mesas. |
| Tiempo medio de retorno | (6; 3; 3; 6) pasos | El comedor se llena (75-100%) en promedio cada 6 pasos (3 min). |
| Frecuencias en 10 000 pasos | (0,1545; 0,3321; 0,3371; 0,1763) | Diferencia máxima con π: 0,0122. |
| χ² de la P estimada | 12,376 con 10 gl, valor p = 0,261 | No se rechaza P. |
| Riesgo de llegar a 75-100% en ≤ 3 pasos | 0,1013; 0,1986; 0,3895; 1 desde cada estado | |

En el juego la P estimada de Mesas sale de la red de Petri, no de la cadena. Si la prueba χ² la rechaza, el resultado no es un error del juego: dice que la ocupación real no sigue la cadena de referencia. Las pruebas que sí deben pasar χ² son las de la cadena Oleada, que es la que se sortea.

## 5. Vínculo con la Fase 1

| Cadena y estado | Elemento de la Fase 1 | Cómo pasa |
|---|---|---|
| Oleada en cualquier estado | Evento externo `llegada`: +1 token en `En_fila` y un autómata Estudiante nuevo en En_Fila | En cada paso llegan 4, 10 o 18 estudiantes; cada llegada usa el mismo `llegada()` de la Fase 1 |
| Oleada Alta | Desborde de `En_fila` (k = 16) y espera por `Bandeja_limpia` | Consecuencia de la red, no un atajo: con 18 llegadas por paso la fila supera k |
| Mesas | Lugar `Mesa_libre` | Se observa M(Mesa_libre) al final de cada paso; la cadena no cambia el marcado |

Los torniquetes, el supervisor, la consola de reparación, el lavado y el radar siguen igual. Con el modo «Ola fija (Fase 1)» de la pantalla de título el juego vuelve a las llegadas de la Fase 1.

## 6. Decisión del jugador

Abrir la **línea 3** (tecla 3, botón LÍNEA 3 o la calculadora del panel) cuando π^(n) anticipa oleada Alta. Abrirla cuesta 20 puntos y cada paso abierta cuesta 3 más. La línea 3 tiene su propio torniquete (autómata Torniquete T3 con su Contador_Rechazos) y su fila. No agrega lugares ni tokens a la red: t_servir ya representa a cualquier mostrador.

La compra que sí cambia tokens de la red de la Fase 1 es el **permiso de relevo extra**: +1 token en `Relevo` (evento externo, como el cambio de turno; respeta k = 2) por 25 puntos, para pasar una persona a la línea antes del cambio de turno.

## 7. Reloj discreto

La escena Planta crea un `Phaser.Time.TimerEvent` con `delay = PASO_K_MS / velocidad` y `loop: true` que llama a `comedor.pasoMarkov()`. El reloj de simulación del núcleo nunca pasa del borde del paso siguiente hasta que el temporizador lo avanza, así que el paso ocurre siempre en el mismo instante de simulación (k · 30 s) y en el mismo orden respecto a los demás eventos: la misma semilla da la misma partida a ×1, ×2, ×4 u ×8. En Node (pruebas y simulación acelerada) el núcleo da los pasos solo, en el mismo orden.

En cada paso, en este orden fijo: (1) la cadena Oleada sortea su estado nuevo con la acumulada de su fila y u = rng(); (2) se observa la cuarta parte de ocupación de las mesas; (3) se programan las llegadas del paso.
