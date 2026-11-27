# analisis/ · Formulación y minería de procesos (Fase 2)

Carpeta de las secciones 5.2 y 5.9 de la guía del Laboratorio 2. No entra en el build ni en el ZIP.

| Archivo | Qué es |
|---|---|
| `markov_validacion.py` | Validación de las cadenas Oleada y Mesas (ficha D.13): Chapman-Kolmogorov, π^(n), clasificación, estado estacionario, riesgo de llegar a un estado peligroso, 10 000 pasos con semilla 2026 y prueba χ² |
| `resultados_python.json` | Sus resultados: la referencia contra la que `test/markov.test.js` prueba el núcleo JavaScript (tolerancia 1e-6) |
| `modelo_normativo.pnml` | Workflow Net normativa del caso Estudiante (PNML estándar con marcado final, para PM4Py y WoPeD) |
| `modelo_normativo_pipe.xml` | La misma red en el formato de PIPE2 4.3 |
| `mineria.py` | Descubrimiento, conformidad y desempeño del Event Log; con dos logs, comparación base contra mejorado |
| `requirements.txt` | Librerías del análisis |
| `logs/entrega/base.csv` y `.xes` | Log base: 300 casos cerrados, semilla 96, política base (línea 3 cerrada) |
| `logs/entrega/mejorado.csv` y `.xes` | Log mejorado: misma semilla, política mejorada (línea 3 anticipada con π^(n)) |
| `logs/validacion_1000_pasos.json` | Validación estadística de la guía 5.10 b: 1000 pasos k con la semilla del GDD |
| `salidas/` | Tablas, figuras y resúmenes que escribe `mineria.py` |

## Cómo se reproduce

Desde la raíz del proyecto:

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r analisis/requirements.txt
```

1. Cadenas de Markov (solo necesita NumPy; con SciPy el valor p sale de `scipy.stats`):

   ```bash
   python analisis/markov_validacion.py
   ```

2. Logs de la entrega (sin navegador, con el mismo núcleo del juego) y la red normativa:

   ```bash
   npm run log
   npm run log -- --pasos 1000
   npm run normativo
   ```

   En el juego se obtiene lo mismo con «Generar log» en la pantalla de título: el CSV y el XES descargados son idénticos byte a byte a los de `npm run log` con la misma semilla y política.

3. Minería de procesos:

   ```bash
   python analisis/mineria.py analisis/logs/entrega/base.csv analisis/logs/entrega/mejorado.csv
   ```

   El desempeño y la pregunta de la ficha (tiempo hasta la bandeja por oleada) solo necesitan pandas. El descubrimiento (DFG, Alpha, Heuristic e Inductive Miner, BPMN) y la conformidad (replay de tokens, alineamientos y precisión contra `modelo_normativo.pnml`) necesitan PM4Py; sus figuras, además, Graphviz (`dot -V`). Si `dot` no está en el PATH, `mineria.py` lo busca en `%LOCALAPPDATA%\Programs\Graphviz\bin` y en `%ProgramFiles%\Graphviz\bin`.

   Resultado con los logs de la entrega: el Inductive Miner descubre `→(Esperar_fila, ⟲(Pasar_torniquete, τ), Recibir_bandeja, Buscar_mesa, Almorzar, Entregar_menaje)`, el Alpha Miner falla con el lazo de longitud 1, la conformidad da fitness 0,983 por tokens y 0,990 por alineamientos con precisión 1,000, y el cuello de botella es `Esperar_fila`. Las figuras están en `salidas/base/` y `salidas/mejorado/`, y la red normativa dibujada por PM4Py en `salidas/modelo_normativo.png`.

## ProM y Disco

- ProM: File > Import con `logs/entrega/base.xes`; Mine with Inductive Visual Miner; Replay a Log on Petri Net for Conformance Analysis con `modelo_normativo.pnml`.
- Disco: abrir `logs/entrega/base.csv` y asignar Case_ID como Case, Activity como Activity, Timestamp_Inicio como Timestamp (start), Timestamp_Fin como Timestamp (end) y Resource_ID como Resource.
