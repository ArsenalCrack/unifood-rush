#!/usr/bin/env bash
# Publica UniFood Rush como subcarpeta /unifood/ de un sitio que ya atiende Caddy.
# Se ejecuta EN EL SERVIDOR, una sola vez. Los archivos del simulador deben estar
# antes en ~/unifood-rush-dist (index.html y assets/).
#
#   Simular (no cambia nada, no necesita root):  bash instalar-en-caddy.sh DOMINIO --simular
#   Instalar:                                    sudo bash instalar-en-caddy.sh DOMINIO
#
# Qué hace: copia los archivos a /var/www/unifood-rush, guarda un respaldo del
# Caddyfile, agrega 6 líneas al bloque del dominio, valida la configuración nueva
# y, solo si es válida y se confirma, recarga Caddy (recarga sin cortar el servicio).
set -euo pipefail

DOMINIO="${1:?Falta el dominio. Ejemplo: sudo bash instalar-en-caddy.sh midominio.org}"
MODO="${2:-instalar}"
DUENO="${SUDO_USER:-$(id -un)}"
ORIGEN="$(getent passwd "$DUENO" | cut -d: -f6)/unifood-rush-dist"
DESTINO=/var/www/unifood-rush
CADDYFILE=/etc/caddy/Caddyfile
MARCA='# UniFood Rush'

[ -f "$ORIGEN/index.html" ] || { echo "No encuentro los archivos del simulador en $ORIGEN"; exit 1; }

NUEVO="$(mktemp)"
trap 'rm -f "$NUEVO"' EXIT

if grep -qF "$MARCA" "$CADDYFILE"; then
  echo "El Caddyfile ya tiene el bloque de UniFood Rush: no se modifica."
  YA_ESTA=1
else
  YA_ESTA=0
  # Inserta el bloque justo después de la línea que abre el sitio del dominio.
  awk -v dominio="$DOMINIO" -v marca="$MARCA" -v destino="$DESTINO" '
    { print }
    !hecho && index($0, dominio) == 1 && $0 ~ /\{[ \t]*$/ {
      print "\t" marca ": simulador del laboratorio (archivos estaticos)"
      print "\tredir /unifood /unifood/ 301"
      print "\thandle_path /unifood/* {"
      print "\t\troot * " destino
      print "\t\tfile_server"
      print "\t}"
      print ""
      hecho = 1
    }
  ' "$CADDYFILE" > "$NUEVO"
  grep -qF "$MARCA" "$NUEVO" || { echo "No encontré el bloque del sitio $DOMINIO en $CADDYFILE. No cambio nada."; exit 1; }
  echo "Cambio en $CADDYFILE:"
  diff -u "$CADDYFILE" "$NUEVO" || true
  echo
  if caddy validate --config "$NUEVO" --adapter caddyfile >/dev/null 2>&1; then
    echo "Caddy acepta la configuración nueva."
  else
    echo "Caddy RECHAZA la configuración nueva. No cambio nada:"
    caddy validate --config "$NUEVO" --adapter caddyfile || true
    exit 1
  fi
fi

if [ "$MODO" = "--simular" ]; then
  echo "Simulación: no se cambió nada."
  exit 0
fi
[ "$(id -u)" -eq 0 ] || { echo "Para instalar hay que ejecutar con sudo."; exit 1; }

# 1) Archivos del simulador (quedan a nombre del usuario para poder actualizarlos sin sudo).
mkdir -p "$DESTINO"
cp -r "$ORIGEN/." "$DESTINO/"
chown -R "$DUENO":"$DUENO" "$DESTINO"
chmod -R a+rX "$DESTINO"
echo "Archivos copiados a $DESTINO (dueño: $DUENO)."

# 2) Configuración de Caddy, con respaldo y vuelta atrás si la recarga falla.
if [ "$YA_ESTA" -eq 0 ]; then
  read -r -p "¿Aplicar el cambio y recargar Caddy? [s/N] " respuesta
  case "$respuesta" in
    s|S|si|SI|Si) ;;
    *) echo "Cancelado: el Caddyfile no se cambió."; exit 0 ;;
  esac
  RESPALDO="$CADDYFILE.antes-unifood-$(date +%F-%H%M%S)"
  cp -p "$CADDYFILE" "$RESPALDO"
  cat "$NUEVO" > "$CADDYFILE"
  if systemctl reload caddy; then
    echo "Caddy recargado. Respaldo del Caddyfile anterior: $RESPALDO"
  else
    echo "La recarga falló: restauro el respaldo."
    cp -p "$RESPALDO" "$CADDYFILE"
    systemctl reload caddy || true
    exit 1
  fi
fi

# 3) Comprobación desde el propio servidor.
sleep 1
curl -s -o /dev/null -w "https://$DOMINIO/unifood/ -> HTTP %{http_code}\n" "https://$DOMINIO/unifood/" || true
