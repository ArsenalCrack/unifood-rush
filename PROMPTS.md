# PROMPTS.md · Registro de prompts de UniFood Rush

Proyecto 13 · José Alejandro Morales, Amir Sarmiento, Carlos Antolinez.

## Agente usado

El desarrollo se realizó con **Antigravity** y **Claude Code** siguiendo las tres habilidades de `.agents/skills/` con el contenido exacto de la guía del laboratorio. El agente recibió la guía completa del laboratorio en PDF y siguió sus 17 prompts en orden con los datos de la ficha D.13.

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
| 12 | «revisa Entregables.jpeg, Guia_Laboratorio1_SED_Phaser_Automatas_Petri.pdf estoy realizando con mis compañeros el Proyecto 13, Unifood Rush, entonces revisa y me dices que nos falta y que se puede mejorar» y «el informe.md en postmorten mejoralo o cambialo segun mi compañero esta mal» / «bueno papu arregla todo exeptuando el video» (en Antigravity) | Auditoría completa contra las secciones 5.12 y 5.13 de la guía, reescritura integral del Postmortem y cierre de tablas en `docs/informe.md`, atajo `F2` para alternar efectos visuales y `ms/cuadro` en `F1`, empaquetado final de `Grupo3_UniFoodRush.zip` y actualización de `Grupo3_UniFoodRush_informe.pdf` |

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

La guía pide aceptar o rechazar de forma explícita lo que el agente proponga. Todas las decisiones fueron revisadas y validadas por el equipo:

| Decisión del agente | Motivo | ¿Aceptada por el equipo? |
|---|---|---|
| Torniquete: `leer` también sale de Acceso y de Rechazo; Qm = {Listo, Acceso} | La ficha da 5 eventos y ninguno de «paso» | ☑ Sí (aceptada) |
| Autómata Contador_Rechazos compuesto con el torniquete | «Bloqueo tras 3 rechazos» sin usar un `if` | ☑ Sí (aceptada) |
| Especificación Registro_Acceso con estado prohibido Violacion, una por estudiante | Formaliza «servir se deshabilita si no hubo acceso_ok para ese estudiante» | ☑ Sí (aceptada) |
| Lugar Relevo (M0 = 2, k = 2) y transiciones t_a_linea y t_a_lavado | «El personal solo se reasigna en el cambio de turno» | ☑ Sí (aceptada) |
| En_fila con k = 16 y capacidad desborde | La guía exige demostrar un desborde y la ficha no fija k | ☑ Sí (aceptada) |
| Reposo distinto de interbloqueo | Las llegadas son externas: sin estudiantes ninguna transición está habilitada y eso no es un bloqueo | ☑ Sí (aceptada) |
| Segundo monitor Minimo_linea | El árbol de cobertura mostró el bloqueo simétrico (todo el personal al lavado) | ☑ Sí (aceptada) |
| Tiempos, puntajes, 3 turnos y 6 logros del GDD | La ficha solo fija 5 min y 120 estudiantes | ☑ Sí (aceptada) |
| Semilla 96 | Da un primer bloqueo de torniquete a los 39 s del turno 1 | ☑ Sí (aceptada) |
| Piloto automático de servir (tecla A) | Permite cumplir «sin intervenir» y las pruebas a ×4 | ☑ Sí (aceptada) |
| El contenedor del juego ocupa toda la ventana (`100vw` × `100dvh`) en lugar de 960 × 540 fijo | El `index.html` de la guía nunca agranda el juego; la resolución de 960 × 540 y la escala FIT no cambian | ☑ Sí (aceptada) |
| Lienzo con los píxeles reales de la pantalla (factor 2 o 3) y cámaras ampliadas en la misma proporción | Al llenar la ventana, el navegador estiraba un lienzo de 960 × 540 y todo se veía borroso; el mundo sigue midiendo 960 × 540 | ☑ Sí (aceptada) |
| Factor 2 cuando el navegador no informa el tamaño de la pantalla | Un navegador en segundo plano informó 0 × 0 y el juego se dibujaba con factor 1 | ☑ Sí (aceptada) |
| Verificación con programas que pulsan los botones de JFLAP y PIPE2 (`modelos/verificacion/`) | Es repetible y no hay errores al copiar resultados: los calcula el software académico | ☑ Sí (aceptada) |
| PIPE2 4.3.0 en lugar de la versión 5.0.2 | La 5.0.2 no trae Incidence & Marking ni Invariant Analysis | ☑ Sí (aceptada) |
| Video sin voz, con subtítulos y la lista de los 4 requisitos; grabado cuadro a cuadro desde el juego, con clics y teclas simulados | La guía pide el video, no narración; cada subtítulo se comprobó contra lo que muestra la pantalla | ☑ Sí (aceptada) |
| Rendimiento medido como tiempo por cuadro (fps de capacidad) y atajo F2 para efectos | El contador F1 muestra fps, ms por cuadro y el estado de los efectos [F2] | ☑ Sí (aceptada) |

## D. Tareas manuales realizadas directamente por el equipo

- Prueba en dispositivo móvil real y sesión de playtest cruzado sobre `https://dinamyt.org/unifood/`.
- Carga de `Grupo3_UniFoodRush.zip`, `Grupo3_UniFoodRush_informe.pdf` y el video en el aula virtual.
- Revisión y aprobación final del Postmortem (`docs/informe.md`) y de la tabla de decisiones de diseño (sección C).
- Ejecución del comando administrativo `sudo bash ~/instalar-en-caddy.sh dinamyt.org` en la terminal del VPS del equipo (sin compartir contraseñas con el agente).
