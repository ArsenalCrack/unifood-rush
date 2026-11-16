# Despliegue en Internet (obligatorio)

El docente pidió publicar el simulador en una dirección pública para que los compañeros lo prueben y para su revisión. El enlace público es lo que se entrega; "Simulador (SimJam)" es el mismo simulador abierto desde ese enlace.

La guía propone Netlify o Vercel. Este equipo lo publica en un **servidor propio** (VPS con Ubuntu y Caddy). Sirve igual porque el simulador es estático: `dist/` tiene `index.html` y un archivo JavaScript de unos 115 KB, con rutas relativas (`base: './'`), y Phaser llega por CDN.

| Dato | Valor |
|---|---|
| Servicio usado | Servidor propio (VPS) con Caddy y HTTPS |
| Dirección pública del simulador | https://dinamyt.org/unifood/ |
| Carpeta en el servidor | `/var/www/unifood-rush` |
| Estado | Pendiente de activar: falta ejecutar el paso 2 |

## 1. Subir los archivos

Desde la carpeta del proyecto, con la clave SSH del equipo:

```bash
npm run desplegar -- usuario@servidor /var/www/unifood-rush
```

El comando ejecuta las pruebas, compila y copia `index.html` y `assets/` con `scp`. No cambia la configuración del servidor web. Se repite cada vez que haya una versión nueva.

La primera vez la carpeta `/var/www/unifood-rush` todavía no existe: los archivos se suben a `~/unifood-rush-dist` y el paso 2 los copia.

## 2. Activar la subcarpeta en Caddy (una sola vez)

En el servidor, `despliegue/instalar-en-caddy.sh` hace todo el paso. Primero se puede simular, sin permisos de administrador y sin cambiar nada:

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

Para deshacerlo: restaurar el respaldo `/etc/caddy/Caddyfile.antes-unifood-FECHA` y ejecutar `sudo systemctl reload caddy`.

## 3. Comprobar

1. Abrir https://dinamyt.org/unifood/ en el computador: debe verse el título y poder jugarse un turno.
2. Abrirla en un celular.
3. Con F12, pestaña Red: `index.html` y `assets/index-….js` responden 200 y Phaser se descarga de `cdn.jsdelivr.net`.

| Comprobación | Resultado |
|---|---|
| Probado en computador | ☐ |
| Probado en celular | ☐ |
| Fecha de publicación | ☐ |

## 4. Otros servidores

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
