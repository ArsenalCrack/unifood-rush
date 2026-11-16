# Despliegue en Internet (obligatorio)

El simulador está publicado en **https://dinamyt.org/unifood/** desde el 16 de noviembre de 2026. Es el enlace que se comparte con el grupo y el que pidió el docente para revisar el simulador.

| Dato | Valor |
|---|---|
| Servicio usado | Servidor propio (VPS con Ubuntu 24.04) y Caddy 2.11, con HTTPS |
| Dirección pública del simulador | https://dinamyt.org/unifood/ |
| Carpeta en el servidor | `/var/www/unifood-rush` |
| Estado | Activo desde el 16 de noviembre de 2026 |

## "Simulador (SimJam)"

La guía del laboratorio no usa la palabra SimJam. El docente llama así a la revisión de los simuladores: abre el enlace público en su computador y juega. Para eso no hay que entregar nada distinto: el mismo enlace sirve para compartirlo con los compañeros y para la revisión del docente.

## Por qué un servidor propio

La guía propone Netlify o Vercel. Un servidor propio sirve igual porque el simulador es estático: `dist/` tiene `index.html` y un archivo JavaScript de unos 115 KB, con rutas relativas (`base: './'`), y Phaser llega por CDN.

## 1. Publicar una versión nueva

Desde la carpeta del proyecto, con la clave SSH del equipo:

```bash
npm run desplegar -- usuario@servidor /var/www/unifood-rush
```

El comando ejecuta las pruebas, compila y copia `index.html` y `assets/` con `scp`. No cambia la configuración del servidor web. Los archivos de `/var/www/unifood-rush` son del usuario del equipo, así que no hace falta `sudo`.

## 2. Configuración de Caddy (se hizo una sola vez)

El 16 de noviembre de 2026 se activó la subcarpeta con `despliegue/instalar-en-caddy.sh`, ejecutado en el servidor. Primero se puede simular, sin permisos de administrador y sin cambiar nada:

```bash
bash ~/instalar-en-caddy.sh dinamyt.org --simular
```

Y luego instalar:

```bash
sudo bash ~/instalar-en-caddy.sh dinamyt.org
```

El script copia los archivos a `/var/www/unifood-rush`, guarda un respaldo del Caddyfile, muestra el cambio, valida la configuración nueva con `caddy validate`, pide confirmación y recarga Caddy sin cortar el servicio. Si la validación o la recarga fallan, deja el Caddyfile como estaba.

El cambio son estas líneas dentro del bloque del dominio:

```
dinamyt.org, www.dinamyt.org {
	# UniFood Rush: simulador del laboratorio (archivos estaticos)
	redir /unifood /unifood/ 301
	handle_path /unifood/* {
		root * /var/www/unifood-rush
		file_server
	}

	encode zstd gzip
	reverse_proxy 127.0.0.1:3000
}
```

`handle_path` atiende solo lo que empieza por `/unifood/`; el resto del sitio sigue yendo a la aplicación de siempre. La barra final importa: sin ella las rutas relativas del juego apuntarían a otra carpeta, y por eso `redir` la agrega.

Para deshacerlo: restaurar el respaldo `/etc/caddy/Caddyfile.antes-unifood-2026-11-16-162655` y ejecutar `sudo systemctl reload caddy`.

## 3. Comprobación

| Comprobación | Resultado |
|---|---|
| `/unifood/` y el archivo JavaScript responden 200; `/unifood` redirige a `/unifood/` | Sí, 16 de noviembre de 2026 |
| Turno jugado en el enlace público sin errores en la consola | Sí: turno 1 hasta 3:45 de simulación, 58 estudiantes servidos y 2 torniquetes reparados |
| El juego llena la ventana del navegador | Sí, en ventanas de 1600 × 900, 1280 × 1000 y 812 × 375 |
| Los demás sitios del dominio siguen respondiendo igual | Sí |
| Probado en un celular real | ☐ |

## 4. El juego ocupa toda la ventana

El `index.html` de la guía fija el contenedor en 960 × 540 píxeles como máximo. Con eso Phaser achica el juego en pantallas pequeñas, pero nunca lo agranda: en un monitor grande quedaba un recuadro con bordes negros.

El contenedor ahora mide lo mismo que la ventana (`100vw` × `100dvh`). El juego sigue teniendo una resolución de 960 × 540 con escala FIT, como pide la guía: Phaser lo agranda o lo achica sin deformarlo, en proporción 16:9, y lo centra. En una ventana con otra proporción quedan bandas negras a los lados o arriba y abajo.

## 5. Otros servidores

Con nginx, dentro del bloque `server` del dominio que escucha en el puerto 443:

```nginx
location = /unifood { return 301 /unifood/; }
location /unifood/ {
    alias /var/www/unifood-rush/;
    index index.html;
    add_header Cache-Control "no-cache";
}
```

Se valida con `sudo nginx -t` y solo después se recarga con `sudo systemctl reload nginx`.

Si el servidor no está disponible, la carpeta `dist/` se puede arrastrar a https://app.netlify.com/drop y Netlify entrega un enlace con HTTPS.
