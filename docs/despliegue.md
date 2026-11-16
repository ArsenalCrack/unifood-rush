# Despliegue en Internet (obligatorio)

El docente pidió publicar el simulador en una dirección pública para que los compañeros lo prueben y para su revisión. El enlace público es lo que se entrega; "Simulador (SimJam)" es el mismo simulador abierto desde ese enlace.

La guía propone Netlify o Vercel. Este equipo lo publica en un **servidor propio** (VPS). Sirve igual porque el simulador es estático: `dist/` tiene `index.html` y un archivo JavaScript de unos 115 KB, con rutas relativas (`base: './'`), y Phaser llega por CDN.

## 1. Qué se necesita

| Dato | Valor |
|---|---|
| Acceso SSH al servidor | `usuario@servidor` |
| Carpeta en el servidor | `/var/www/unifood-rush` |
| Dirección pública | con HTTPS, por ejemplo `https://DOMINIO/unifood/` |
| Servidor web | nginx (o Caddy) |

## 2. Publicar los archivos

```bash
npm run desplegar -- usuario@servidor /var/www/unifood-rush
```

El comando ejecuta las pruebas, compila y copia `index.html` y `assets/` con `scp`. No cambia la configuración del servidor web. Se repite cada vez que haya una versión nueva.

## 3. Configurar el servidor web (una sola vez)

### Opción A · Subcarpeta de un dominio que ya tiene HTTPS (nginx)

Dentro del bloque `server { ... }` del dominio, el que escucha en el puerto 443:

```nginx
# UniFood Rush en https://DOMINIO/unifood/
location = /unifood { return 301 /unifood/; }
location /unifood/ {
    alias /var/www/unifood-rush/;
    index index.html;
    add_header Cache-Control "no-cache";
}
```

La barra final importa: sin ella las rutas relativas del juego apuntarían a otra carpeta. La primera línea la agrega sola.

### Opción B · Subdominio propio (nginx)

Crear el registro DNS de tipo A para `unifood.DOMINIO` y un bloque nuevo:

```nginx
server {
    listen 80;
    server_name unifood.DOMINIO;
    root /var/www/unifood-rush;
    index index.html;
    location / {
        try_files $uri $uri/ =404;
        add_header Cache-Control "no-cache";
    }
}
```

Después se pide el certificado: `certbot --nginx -d unifood.DOMINIO`.

### Opción C · Caddy

```
DOMINIO {
    redir /unifood /unifood/ 301
    handle_path /unifood/* {
        root * /var/www/unifood-rush
        file_server
    }
}
```

### Aplicar el cambio en nginx

Primero se valida y solo después se recarga, para no afectar los otros sitios del servidor:

```bash
sudo nginx -t
```

```bash
sudo systemctl reload nginx
```

Si `nginx -t` informa un error, se deshace el cambio y no se recarga.

## 4. Comprobar

1. Abrir la dirección pública en el computador: debe verse el título y poder jugarse un turno.
2. Abrirla en un celular.
3. Con F12, pestaña Red: `index.html` y `assets/index-….js` responden 200 y Phaser se descarga de `cdn.jsdelivr.net`.

| Dato | Valor |
|---|---|
| Servicio usado | Servidor propio (VPS) |
| Dirección pública del simulador | ☐ https:// |
| Fecha de publicación | ☐ |

## 5. Alternativa rápida

Si el servidor no está disponible, la carpeta `dist/` se puede arrastrar a https://app.netlify.com/drop y Netlify entrega un enlace con HTTPS.
