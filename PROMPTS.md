# PROMPTS.md · Registro de prompts de UniFood Rush

Proyecto 13 · José Alejandro Morales, Amir Sarmiento, Carlos Antolinez.

Fase 1 (Laboratorio 1): secciones A a D. Fase 2 (Laboratorio 2): secciones E a H, al final.

## Agente usado

El código se generó con **Claude Code** (Anthropic), no con Antigravity. Las tres habilidades de `.agents/skills/` tienen el contenido exacto de la guía; la guía indica que ese formato también sirve en Claude Code. Si el docente exige Antigravity, los prompts de la sección B se pueden volver a ejecutar allí sobre esta misma carpeta.

El agente recibió la guía completa del laboratorio en PDF y siguió sus 17 prompts en orden, con los datos de la ficha D.13.

## A. Mensajes escritos por el equipo

| N.º | Mensaje | Qué produjo |
|---|---|---|
| 1 | «Proyecto 13, Unifood Rush · José Alejandro Morales, Amir Sarmiento, Carlos Antolinez. De la anterior información necesito realizar el proyecto #13 con las especificaciones que da el profesor», con la guía en PDF adjunta | Lectura de la guía y de la ficha D.13; plan de trabajo; pasos 1 a 13 de la sección B |
| 2 | «continua» | Pasos 13 a 15 de la sección B y pruebas en el navegador |
| 3 | «continua» | Paso 16, hoja de arte, compilación, ZIP y documentos |
| 4 | «continua, pero ten en cuenta que mi profe ha enviado el siguiente mensaje: […] Ahora deben realizar el despliegue en internet (obligatorio) […] como yo tengo VPS […] quiero subirlo allí» | Paso 17 en un servidor propio: `scripts/desplegar.mjs` y `docs/despliegue.md` |
| 5 | Indicó el usuario SSH del servidor | El agente entró con la clave SSH del equipo, subió los archivos y simuló el cambio de Caddy. No usó contraseñas |
| 6 | El mismo mensaje del docente, más: «revisa en dónde quedaste, al finalizar dame la guía de cómo funciona el juego para estudiarla, no sé ni siquiera si se subió al repositorio» | El integrante ejecutó el paso con `sudo` en su terminal y el simulador quedó en https://dinamyt.org/unifood/. Guía de estudio para la sustentación y repositorio en GitHub |
| 7 | «¿Por qué UniFood no agarra la pantalla de todo el navegador?» | El contenedor pasó de 960 × 540 fijo a toda la ventana; se publicó de nuevo |
| 8 | «Al ampliarlo, todo pierde mucha calidad: textos, animaciones, todo el juego […] ¿hay manera de que se vea bien sin importar cuánto se amplíe?» | Lienzo con los píxeles reales de la pantalla y cámaras ampliadas (`src/arte/resolucion.js`), texturas y textos con más resolución y la prueba `test/resolucion.test.js`; se publicó de nuevo |
| 9 | «Revisa si lo de la imagen se cumple ya», con la lista de entregables de la sección 5.12 | Revisión de los entregables, uno por uno |
| 10 | «Crea el ZIP con el nombre como lo pide (grupo número 3, proyecto 13), completa lo de "modelos/ con .jff, PNML y capturas de PIPE2" que dice que falta, realiza el video por tu cuenta, ya que no pide que hablemos […] puedes ponerle texto para que vaya indicando lo que se pide, y realiza lo del "Informe con tablas 5.2, 5.9 y postmortem" que dice incompleto» | El integrante autorizó descargar JFLAP 7.1, PIPE2 y mp4-muxer. Se produjeron `Grupo3_UniFoodRush.zip` (`npm run zip -- 3`), 30 capturas de JFLAP y PIPE2 en `modelos/capturas/` con los programas de `modelos/verificacion/`, el video de 2 min 31 s con subtítulos y las tablas 5.2 y 5.9 de `docs/informe.md` con un borrador del postmortem |
| 11 | «Continúa desde donde quedaste», tras una pausa | El video se volvió a grabar porque un subtítulo no coincidía con el HUD abierto; además, mediciones de rendimiento y el informe terminado |

## B. Los 17 prompts de la guía con los datos de la ficha D.13

Estado: **Funcionó** (a la primera) o **Corregido** (hubo que ajustar; se explica qué).

| N.º | Prompt (versión técnica, resumida) | Resultado | Estado |
|---|---|---|---|
| 1 | Crea la carpeta `unifood-rush`, inicia git y deja lista `modelos/`. Sin código todavía. | Carpeta, repositorio y estructura de carpetas | Funcionó |
| 2 | Crea la habilidad `.agents/skills/disenador-simuladores-sed/SKILL.md` con el contenido exacto de la guía. | Habilidad creada | Funcionó |
| 3 | Crea la habilidad `.agents/skills/ingeniero-sed/SKILL.md` con el contenido exacto de la guía. | Habilidad creada | Funcionó |
| 4 | Crea la habilidad `.agents/skills/director-arte-isometrico/SKILL.md` con el contenido exacto de la guía. | Habilidad creada | Funcionó |
| 5 | Lee las tres habilidades, crea `docs/`, `docs/modelo/` y `referencias/`. Regla: lo que digan `modelos/` y el GDD no se cambia. | Carpetas creadas y regla fijada | Funcionó |
| 6 | Usa ingeniero-sed para escribir `docs/modelo/automatas.md` y `petri.md`; luego disenador-simuladores-sed para `docs/GDD.md` y director-arte-isometrico para el arte. Autómatas: Estudiante (En_Fila … Salida) y Torniquete (Listo, Leyendo, Acceso, Rechazo, Bloqueado). Lenguaje: `^R(S[1-3]){2,}K$`, válida `RS1S2K`. Red: Bandeja_limpia 30, Mesa_libre 20, Espacio_carro 10, Bandeja_sucia 0, Personal_linea 2, Personal_lavado 2; t_servir, t_sentarse, t_terminar, t_lavar. Deadlock: todo el personal a la línea. Prevención: monitor Minimo_lavado. Alcance: 2 torniquetes, 2 líneas, 20 mesas, 1 lavado, 5 min con 120 estudiantes. | Modelo en Markdown, GDD y guía de arte | Corregido: la ficha no definía varios datos y el agente los propuso (ver sección C) |
| 7 | Construye la BASE: Vite, Phaser 4.2.1 por CDN, `src/config.js`, `src/sed/aleatorio.js` y `reloj.js`, `src/iso/proyeccion.js`, `src/entrada/gestorEntrada.js`, escenas Arranque, Titulo, Planta, HUDMaquina, Inspector y Resultados. Prueba `test/reloj.test.js`. | Proyecto base y 6 pruebas del reloj | Funcionó |
| 8 | Usa ingeniero-sed. Implementa el NÚCLEO en `src/sed/`: JSON de los modelos, `automata.js`, `composicion.js`, `observador.js`, `lenguaje.js`, `redPetri.js`, `cobertura.js` y pruebas contra las palabras y marcados del modelo. | Núcleo, motor de simulación y 38 pruebas | Corregido: `faltantes(t)` mezclaba tokens que faltan con capacidad llena; ahora informa primero los tokens (AND-join) |
| 9 | Construye la planta del GDD: rejilla isométrica, 2 torniquetes, 2 líneas, 20 mesas, lavado, carro; cada entidad con su Automata; tokens como objetos; eventos no controlables por el reloj con semilla. | Escena Planta, `Escenario`, `Multitud`, `Personal`, `Torniquetes` | Corregido: la pila de bandejas tapaba el torniquete 1 y pasó a un estante en el muro; el rótulo del tablero se partió en dos líneas |
| 10 | Implementa HUDMaquina: grafo del autómata desde su JSON, estado actual con glow, última transición parpadeando 0,5 s, botones de Γ(q) en verde, gris o rojo, últimos 10 eventos. | Escena HUDMaquina y `src/arte/grafo.js` | Corregido: el grafo del torniquete quedaba aplastado y se cambió su distribución (también en el `.jff`); las etiquetas de ida y vuelta chocaban; la `l` se confundía con un 1 |
| 11 | Implementa la consola de reparación en el HUD: campo de texto, botones R, S1, S2, S3, K, avance del DFA símbolo a símbolo, validación con RegExp y DFA, ayuda que cuesta puntos. | Consola dentro de HUDMaquina | Corregido: con varias teclas en el mismo cuadro Phaser volvía a despachar las anteriores y la palabra salía duplicada; ahora cada evento se atiende una vez |
| 12 | Implementa el supervisor con `composicion.js`: planta Estudiante ‖ Torniquete, especificación Registro_Acceso, estado prohibido Violacion. Botón rojo con la razón formal, intento registrado, pestaña Composición. Prueba de 10 000 eventos. | Supervisor, pestaña Composición y pruebas | Funcionó. Nota: el torniquete es compartido por la fila, así que el supervisor se calcula sobre el producto completo (90 tuplas) |
| 13 | Conecta la red con la planta: lugares como objetos con contador m/k, transiciones de jugador y automáticas, AND-join con aviso del token que falta, tweens de tokens, conflictos, desborde de En_fila, sincronización transición-evento. | Tokens físicos, avisos y desborde | Corregido: el relevo por clic sobre el personal chocaba con la zona de servir; pasó a dos flechas en el tablero, teclas L y V y botones del HUD |
| 14 | Implementa el Inspector (Pre, Post, A, ecuación de estado, probar disparo, árbol de cobertura) y el Radar con `explorar(red, M, 3)`. Game over por interbloqueo con reintento desde el último marcado verde. | Escena Inspector, radar y pantalla de interbloqueo | Corregido: las alertas del radar se repetían en cada marcado; el destello se quedaba encendido en pausa; «reintentar con monitores» ahora vuelve al inicio del turno si los monitores no caben |
| 15 | Agrega el HUD del GDD, puntaje, fin de turno, Resultados, 6 logros con aviso animado, controles táctiles y sonidos con Web Audio. | HUDPartida, Resultados, logros y `sonido.js` | Funcionó. Se añadió «Reiniciar logros» en el título |
| 16 | Pulido con Phaser 4: glow, bloom en eventos críticos, partículas, arrastre y zoom de cámara, temblor, transiciones. Juega 3 turnos a ×4, revisa los criterios y ejecuta npm test. | Efectos en `src/arte/efectos.js` | Corregido: Phaser 4.2.1 no tiene `addBloom`; el bloom se arma con filtros en paralelo (umbral, desenfoque y suma) |
| 17 | Publicar en Internet. La guía lo traía como opcional con Netlify o Vercel; el docente lo volvió obligatorio. El equipo eligió su propio servidor (VPS). | `npm run desplegar`, `despliegue/instalar-en-caddy.sh` y `docs/despliegue.md`. Simulador publicado en https://dinamyt.org/unifood/ el 16 de noviembre de 2026 | Corregido: se cambió Netlify o Vercel por un servidor propio con Caddy. La primera conexión SSH se cortó mientras esperaba la contraseña de `sudo`; se repitió con `ServerAliveInterval` |
| – | Prompt de verificación de la sección 5.10: `index.html` con Phaser por CDN, `base: './'`, sin `import Phaser`, rutas relativas, `npm test`, `npm run build`, `dist/` menor de 25 MB, preview sin 404. | 50 pruebas, `dist/` de 120 KB y preview sin errores | Funcionó |

## C. Decisiones que no estaban en la ficha

La guía pide aceptar o rechazar de forma explícita lo que el agente proponga. Esto fue lo que propuso. **Pendiente: el equipo debe revisarlo y marcar su decisión.**

| Decisión del agente | Motivo | ¿Aceptada por el equipo? |
|---|---|---|
| Torniquete: `leer` también sale de Acceso y de Rechazo; Qm = {Listo, Acceso} | La ficha da 5 eventos y ninguno de «paso» | ☐ |
| Autómata Contador_Rechazos compuesto con el torniquete | «Bloqueo tras 3 rechazos» sin usar un `if` | ☐ |
| Especificación Registro_Acceso con estado prohibido Violacion, una por estudiante | Formaliza «servir se deshabilita si no hubo acceso_ok para ese estudiante» | ☐ |
| Lugar Relevo (M0 = 2, k = 2) y transiciones t_a_linea y t_a_lavado | «El personal solo se reasigna en el cambio de turno» | ☐ |
| En_fila con k = 16 y capacidad desborde | La guía exige demostrar un desborde y la ficha no fija k | ☐ |
| Reposo distinto de interbloqueo | Las llegadas son externas: sin estudiantes ninguna transición está habilitada y eso no es un bloqueo | ☐ |
| Segundo monitor Minimo_linea | El árbol de cobertura mostró el bloqueo simétrico (todo el personal al lavado) | ☐ |
| Tiempos, puntajes, 3 turnos y 6 logros del GDD | La ficha solo fija 5 min y 120 estudiantes | ☐ |
| Semilla 96 | Da un primer bloqueo de torniquete a los 39 s del turno 1 | ☐ |
| Piloto automático de servir (tecla A) | Permite cumplir «sin intervenir» y las pruebas a ×4 | ☐ |
| El contenedor del juego ocupa toda la ventana (`100vw` × `100dvh`) en lugar de 960 × 540 fijo | El `index.html` de la guía nunca agranda el juego; la resolución de 960 × 540 y la escala FIT no cambian | ☐ |
| Lienzo con los píxeles reales de la pantalla (factor 2 o 3) y cámaras ampliadas en la misma proporción | Al llenar la ventana, el navegador estiraba un lienzo de 960 × 540 y todo se veía borroso; el mundo sigue midiendo 960 × 540 | ☐ |
| Factor 2 cuando el navegador no informa el tamaño de la pantalla | Un navegador en segundo plano informó 0 × 0 y el juego se dibujaba con factor 1 | ☐ |
| Verificación con programas que pulsan los botones de JFLAP y PIPE2 (`modelos/verificacion/`) | Es repetible y no hay errores al copiar resultados: los calcula el software académico | ☐ |
| PIPE2 4.3.0 en lugar de la versión 5.0.2 | La 5.0.2 no trae Incidence & Marking ni Invariant Analysis | ☐ |
| Video sin voz, con subtítulos y la lista de los 4 requisitos; grabado cuadro a cuadro desde el juego, con clics y teclas simulados | La guía pide el video, no narración; cada subtítulo se comprobó contra lo que muestra la pantalla | ☐ |
| Rendimiento medido como tiempo por cuadro (fps de capacidad) | El contador F1 queda en la frecuencia del monitor; el tiempo por cuadro muestra cuánto margen queda | ☐ |

## D. Lo que el agente no hizo

- Probar el juego en un celular real y con otro equipo (playtest).
- Subir el ZIP y el video al aula virtual.
- Responder con sus palabras las preguntas 4 y 5 del postmortem (`docs/informe.md` trae un borrador) y marcar las decisiones de la sección C.
- Repetir a mano, para la sustentación, alguna verificación de JFLAP y de PIPE2: las capturas las tomaron los programas de `modelos/verificacion/`.
- Escribir la contraseña de administrador del servidor: el paso `sudo bash ~/instalar-en-caddy.sh dinamyt.org` lo ejecutó el integrante en su terminal, porque el agente no escribe contraseñas.

---

# Fase 2 · Laboratorio 2 (Cadenas de Markov y minería de procesos)

Rama `fase2`. Agente: **Claude Code** (Anthropic), igual que en la Fase 1. Las dos habilidades nuevas (`.agents/skills/ingeniero-estocastico/` y `.agents/skills/analista-procesos/`) tienen el contenido exacto de la guía. Las capturas de verificación se tomaron con Chrome sin ventana (protocolo de depuración), porque la ventana del navegador integrado no siempre estaba visible.

## E. Mensajes escritos por el equipo

| N.º | Mensaje | Qué produjo |
|---|---|---|
| 1 | «ahora debemos actualizar el proyecto con las indicaciones que ha pedido el profesor, dime que cosas debo tener en cuenta y empieza a realizar lo que puedas», con la guía del Laboratorio 2 en PDF | Lectura de la guía y de la ficha D.13; los prompts 1 a 15 de la sección F; la lista de decisiones que el equipo debe revisar (sección G) |
| 2 | «Sí, instálalos» (PM4Py y Graphviz) y «también puedes hacer el video» | Entorno `.venv` con PM4Py 2.7.23 (`analisis/requirements.txt`), Graphviz 16.1.2 oficial (ZIP de 9,3 MB con su suma SHA-256 verificada), descubrimiento y conformidad del prompt 15 y el video de la entrega |
| 3 | «Sí, súbela» (la rama `fase2` a GitHub) | La rama `fase2` en `origin`, sin integrar a `master` |
| 4 | «dime que es lo que deben saber mis compañeros, donde encontrarlo y que deben hacer», después del botón «Abrir PR» | El pull request de `fase2` a `master` y un documento para el equipo con lo que debe saber, dónde está cada cosa y las tareas pendientes |
| 5 | «dos cosas, al igual que se muestra los automatas de esa manera grafica, los apartados de red de petri también debemos mostrarlos, sube la actualización a git, vuelve hacer el video y dame los comandos para la vps» | La red de Petri en vivo (tecla R), el commit y el push, el video otra vez y los comandos para publicar la Fase 2 en la VPS |

## F. Los 16 prompts de la guía con los datos de la ficha D.13

Estado: **Funcionó** (a la primera) o **Corregido** (hubo que ajustar; se explica qué). El commit es el que registra el resultado.

| N.º | Prompt (resumen) | Resultado | Estado | Commit |
|---|---|---|---|---|
| 1 | Preparar la Fase 2: comprobar `npm test` (52 pruebas), crear la rama `fase2`, carpeta `analisis/` | Rama `fase2` desde `master`; `analisis/markov_validacion.py` con las cadenas Oleada y Mesas y `resultados_python.json` | Funcionó | Fase 2: modelo estocastico, log, habilidades y GDD |
| 2 | Crear la habilidad `ingeniero-estocastico` con el texto exacto de la guía | `.agents/skills/ingeniero-estocastico/SKILL.md` | Funcionó | ídem |
| 3 | Crear la habilidad `analista-procesos` con el texto exacto de la guía | `.agents/skills/analista-procesos/SKILL.md` | Funcionó | ídem |
| 4 | Leer las cinco habilidades, crear `analisis/logs/` y `docs/modelo/` | Carpetas y regla: lo que digan `modelos/`, `analisis/` y el GDD no se cambia | Funcionó | ídem |
| 5 | Actualizar el modelo y el GDD: `docs/modelo/markov.md`, `docs/log.md`, capítulo 16 del GDD, controles M, L y E, HUD, 4 logros y criterios | Documentos con los valores de Python sin cambios | Corregido: M y L ya eran de la Fase 1 (monitores y relevo); pasaron a N y → (sección G) | ídem |
| 6 | Base de la Fase 2: `PASO_K_MS`, `SEMILLA_MARKOV`, `FECHA_BASE_LOG`, `markov.js`, `src/telemetria/`, panel con M, botón con E, `TimerEvent` con `delay = PASO_K_MS / velocidad`, velocidad ×8, «k = …» en el HUD | Constantes en `src/config.js` y ×8 en el reloj | Corregido: un `TimerEvent` suelto haría que el paso k dependiera del cuadro y la semilla ya no repetiría la partida. El reloj del núcleo espera en el borde del paso hasta que el `TimerEvent` lo da (prueba con ×1, ×4 y ×8 y cuadros irregulares) | Nucleo estocastico; Reloj discreto, linea 3, … |
| 7 | Núcleo estocástico: `CadenaMarkov(json, rng)` con `paso()`, `distribucion()`, `estacionaria()`, `clasificar()`, `absorcion()`, `matrizEstimada()` y `chiCuadrado()`, franjas, sin `Math.random()`, pruebas contra Python | `src/sed/markov.js` y `test/markov.test.js` (14 pruebas, tolerancia 1e-6) | Corregido: la ficha redondea π^(4) a 4 decimales y la prueba usaba 1e-12 | Nucleo estocastico |
| 8 | Reloj discreto y entidades estocásticas en el mapa; vínculo con la Fase 1; criterio de 300 pasos a ×8 | La oleada decide las llegadas (evento externo `llegada` de la Fase 1); la cadena Mesas observa M(Almorzando); indicadores con tween de 300 ms; turno 4 continuo | Corregido: la secuencia de oleadas dependía solo de la semilla y todos los turnos empezaban igual; ahora también depende del turno | Llegadas por Markov, linea 3 y registrador; Reloj discreto, … |
| 9 | Panel de Chapman-Kolmogorov (M, sin pausa): Matriz, Transitorio con deslizador y riesgo en 1, 3 y 5 pasos, Chapman-Kolmogorov, aviso amarillo con el umbral | `src/escenas/PanelMarkov.js` y el indicador del HUD | Corregido: el deslizador se destruía al redibujar mientras se arrastraba; ahora las barras se redibujan al soltar | Reloj discreto, linea 3, panel de Markov, HUD y resultados |
| 10 | Largo plazo y Datos de la partida: clasificación, π contra frecuencias, χ², calculadora de dimensionamiento con compra en la red de la Fase 1 | Pestañas 4 y 5; compra de la línea 3 y de un permiso de relevo (+1 token en Relevo) | Corregido: con pocos pasos χ² rechazaba por azar; la conclusión ahora avisa cuando hay valores esperados menores que 5 (regla de Cochran) | ídem |
| 11 | Registrador de eventos: Case_ID legible, 7 columnas, tiempos del reloj de simulación, eventos desde el núcleo, contador en el HUD, lista con L, pruebas | `src/telemetria/registrador.js` y `test/registrador.test.js` | Corregido: guardar el log en cada punto verde copiaba el log entero (40 s para 1000 pasos); ahora guarda cuántas filas había y las filas abiertas | Llegadas por Markov, linea 3 y registrador |
| 12 | Exportación CSV y XES, descarga con Blob, menú con «Solo casos cerrados», simulación acelerada de 300 casos, prueba de 5 trazas | `exportarCSV.js`, `exportarXES.js`, `descarga.js`, `src/simulacion/acelerada.js`, `npm run log` y la escena GenerarLog | Corregido: la regla `entrega/` del `.gitignore` de la Fase 1 ocultaba `analisis/logs/entrega/`; ahora es `/entrega/` | Exportacion CSV y XES y simulacion acelerada |
| 13 | HUD, puntaje, 4 logros, Resultados con ciclo y frecuencias, táctil y sonido | Segunda fila de botones, puntaje de la Fase 2, Resultados y sonidos de oleada alta, riesgo y mesas llenas | Corregido: el letrero de la línea 3, el chip de Mesas y los botones de Resultados quedaban encima de otros rótulos | Reloj discreto, linea 3, panel de Markov, HUD y resultados |
| 14 | Pulido con Phaser 4: tweens de color, destello, bloom y temblor en Alta, barras animadas, mapa de calor (H), barrido a Resultados; pruebas y 60 fps | Efectos de `docs/arte.md`, sección 9 | Corregido: el barrido no se puede dibujar en la cámara de la planta (se acerca y se mueve); se dibuja en el HUD. Falta medir los fps en una pantalla real (sección H) | ídem |
| 15 | Analizar el registro: `analisis/mineria.py`, descubrimiento, conformidad, desempeño y mejora con dos logs | `mineria.py` adaptado a `docs/log.md`, `modelo_normativo.pnml`, logs base y mejorado; con PM4Py 2.7.23: Inductive Miner `→(Esperar_fila, ⟲(Pasar_torniquete, τ), …)`, fitness 0,983 (tokens) y 0,990 (alineamientos), precisión 1,000; Alpha Miner falla con el lazo de longitud 1 | Corregido: Graphviz quedó fuera del PATH (instalado sin administrador en `%LOCALAPPDATA%\Programs\Graphviz`); `mineria.py` ahora lo busca en las carpetas usuales | Analisis de mineria de procesos; Analisis con PM4Py; Figura del modelo normativo desde mineria.py |
| 16 | Publicar en Netlify o Vercel (opcional) | – | No se hizo: decide el equipo | – |
| – | Prompt de verificación de la sección 5.11 | `npm test` 93 de 93, `dist/` de 184 KB, `Grupo3_UniFoodRush_Fase2.zip` de 59 KB y la vista previa sin errores; el log se descarga desde el build | Corregido: el navegador pedía `favicon.ico` (404); ahora el ícono va en línea | Analisis de mineria de procesos |
| – | Video de la guía (5.13): el panel de Markov anticipando un fallo, la exportación del log y su análisis en PM4Py | `entrega/Grupo3_UniFoodRush_Fase2_video.mp4`: 3 min 36 s, 1920 × 1080, sin voz y con subtítulos; desde el mensaje 5 muestra también la red de Petri en vivo (1:45). Se grabó cuadro a cuadro desde el juego en Chrome sin ventana, con teclas y clics simulados; `mp4-muxer` 5.2.2 se cargó de jsDelivr solo para grabar. Cada subtítulo se comprobó contra un cuadro sacado del MP4 | Corregido: la primera toma, en el turno 3, dejó los torniquetes bloqueados sin reparar (ahí el piloto solo sirve) y la fila llegó a 92; se volvió a grabar en el turno 4, donde el piloto repara. Las capturas de control salían negras porque WebGL borra su imagen fuera del cuadro; se revisaron cuadros del MP4. «Generar log» mostraba χ² sin decir que con 30 pasos no es confiable; ahora lo dice | Aviso de chi-cuadrado no confiable en Generar log; Video de la Fase 2 en el informe |
| – | Pedido del equipo: mostrar la red de Petri de forma gráfica, como los autómatas | `src/escenas/HUDRed.js`, `src/arte/grafoRed.js` y `src/arte/geometriaRed.js`: la red en vivo con la tecla R o un clic en «Tokens por lugar», dibujada desde el JSON con la distribución de PIPE2; `test/grafoRed.test.js` comprueba posiciones, arcos y pesos contra `modelos/petri/` (97 pruebas en total) | Corregido: los nombres de tres lugares chocaban con los de las transiciones y un peso quedaba tapado; ahora el nombre pasa arriba del lugar cuando choca y cada peso va del lado más libre del arco | Red de Petri en vivo, como los autómatas |

## G. Decisiones que no estaban en la ficha

La guía pide aceptar o rechazar de forma explícita lo que propone el agente. **Pendiente: el equipo debe revisarlas y marcar su decisión.**

| Decisión del agente | Motivo | ¿Aceptada por el equipo? |
|---|---|---|
| 1 paso k = 30 s de simulación (la ficha dice «2 minutos simulados») | Con los tiempos de la Fase 1, un paso de 120 s daría 0,09 llegadas por segundo y nunca habría fila; con 30 s la oleada media usa el 83 % de la capacidad y los turnos traen 60, 91 y 123 estudiantes en promedio, como la Fase 1 | ☐ |
| Una sola matriz de oleada, sin franjas | La guía menciona franjas para el proyecto 13, pero la ficha D.13 trae una sola matriz con sus valores de referencia. El núcleo ya acepta franjas si el equipo define una P de pico | ☐ |
| La cadena Mesas no se sortea: se observa M(Almorzando) en cada paso | La ficha la llama «modelo de referencia para comparar con la red de Petri» | ☐ |
| Orden del log: `Esperar_fila` antes de `Pasar_torniquete`, y una fila de `Pasar_torniquete` por cada lectura | En el modelo de la Fase 1 el torniquete lee el carné del primero de la fila, justo antes de servir; cada rechazo es una lectura más | ☐ |
| Recursos: fila y mostrador → `Linea_n`; `Buscar_mesa` → la mesa que consigue (`Sin_mesa` mientras busca); `Entregar_menaje` → `Lavado` | La ficha lista los recursos pero no dice cuál usa cada actividad | ☐ |
| `FECHA_BASE_LOG = 2026-01-01T11:30:00Z` | La ficha dice que el comedor abre a las 11:30; el ejemplo de la guía usa 06:00 | ☐ |
| Turnos de 7, 10 y 13 pasos y un turno 4 continuo con la política automática | Reproducen en promedio los 60, 90 y 120 estudiantes de la Fase 1; el turno 4 permite los 300 pasos sin intervenir | ☐ |
| Línea 3 como tercera fila con su torniquete T3 en y = 5; abrirla cuesta 20 puntos y 3 por paso; el tablero de relevo pasó a (3,5; 7,05) | La ficha pide «abrir una tercera línea… se paga con puntos»; t_servir ya representa cualquier mostrador, así que la red no cambia | ☐ |
| Compra de un permiso de relevo (+1 token en Relevo, 25 puntos) | La guía pide que la compra del dimensionamiento cambie tokens de la red de la Fase 1; la línea 3 no es un token | ☐ |
| Teclas: M panel de Markov, L lista de eventos, E exportar, 3 línea 3, H calor; monitores pasan a N y el relevo a la línea a → (← o V al lavado) | La guía fija M, L y E, que ya eran de la Fase 1 | ☐ |
| Umbral 0,5 para P(oleada Alta al menos una vez en 3 pasos) | Con la P de la ficha el riesgo es 0,361 desde Baja y 0,509 desde Media: el aviso sale en Media | ☐ |
| Puntaje de la Fase 2 y logros Pronóstico certero, Oleada contenida, Línea justa y Registro completo | La guía pide criterios de anticipación, mantenimiento a tiempo y dimensionamiento, y 4 logros | ☐ |
| Política automática base y mejorada para los logs | La guía pide la «política automática del GDD» y validar la mejora con dos logs de la misma semilla | ☐ |
| Red de Petri en vivo con la tecla R o un clic en «Tokens por lugar», en un panel a la izquierda que no pausa | R estaba libre y ese panel ya muestra el marcado; a la izquierda se puede abrir junto al HUD de máquina | ☐ |
| Semilla de la cadena: `SEMILLA_MARKOV · 100000 + semilla · 10 + turno` | La secuencia de oleadas no cambia con lo que haga el jugador y cada turno tiene la suya | ☐ |
| Opción «Ola fija (Fase 1)» en el título | La Fase 1 se puede mostrar exactamente igual que en su sustentación | ☐ |
| La simulación acelerada exporta solo los casos cerrados, y al reintentar tras un interbloqueo el log vuelve al punto guardado | Así el análisis no recibe actividades sin fin ni una parte de la partida que ya no ocurrió; el resumen dice cuántos casos se quitaron | ☐ |
| Los logs de la entrega (`analisis/logs/entrega/`) van en git, 1,2 MB cada XES | La guía pide entregarlos en el repositorio | ☐ |

## H. Lo que el agente no hizo

- Instalar Jupyter (opcional: el análisis está en `mineria.py`, no en un cuaderno) y repetir el análisis en ProM o Disco.
- Medir los fps con F1 en una pantalla real (el navegador sin ventana usa WebGL por software).
- Probar en un celular, el playtest con otro equipo y subir el ZIP y el video al aula virtual.
- Publicar la Fase 2 en Internet e integrar `fase2` a `master`: esperan la decisión del equipo (la rama `fase2` ya está en GitHub).
- Responder con sus palabras el postmortem (`docs/informe.md` trae un borrador) y marcar las decisiones de la sección G.
