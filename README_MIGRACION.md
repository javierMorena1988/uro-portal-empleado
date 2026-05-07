# Migracion y Traspaso - Portal Empleado (Ubuntu)

Este documento sirve para traspasar el proyecto a otro tecnico sin rehacer la instalacion.

## 1) Estado actual conocido

- Frontend publicado en: `/var/www/html/Empleado`
- Backend en: `/var/www/html/Empleado/portal-empleado-backend`
- Config Apache: `/etc/apache2/sites-enabled/000-default-ssl.conf`
- Ruta publica: `/Empleado`
- Proxy API: `/Empleado/api` -> `http://localhost:5174/api`
- Node: `v20.20.0`
- npm: `10.8.2`
- PM2 instalado (puede estar vacio si no hay proceso levantado)

## 2) Comprobaciones iniciales (obligatorio)

Ejecutar y guardar salida:

```bash
node -v
npm -v
pm2 -v
pm2 list
sudo apache2ctl -S
sudo cat /etc/apache2/sites-enabled/000-default-ssl.conf
```

Comprobar si algo escucha en 5174:

```bash
sudo ss -ltnp | grep 5174
sudo lsof -i :5174 -n -P
```

## 3) Arrancar backend con PM2

```bash
cd /var/www/html/Empleado/portal-empleado-backend
npm install
pm2 start server/index.js --name PortalEmpleado
pm2 save
pm2 list
pm2 logs PortalEmpleado --lines 100
sudo ss -ltnp | grep 5174
```

Si el puerto backend final no es 5174, ajustar Apache (ProxyPass/ProxyPassReverse).

## 4) Publicar frontend (si hay nuevo build)

Si el `dist` se genera en otro entorno (local/CI), copiar su contenido a:

`/var/www/html/Empleado/`

Ejemplo:

```bash
cp -r dist/* /var/www/html/Empleado/
sudo systemctl reload apache2
```

Forzar recarga en navegador: `Ctrl + F5`.

## 5) Validacion funcional minima

1. Login correcto.
2. Dashboard carga sin errores.
3. Documentacion Laboral carga documentos.
4. Nominas carga documentos (categoria 74).
5. En Inicio se muestran hasta 3 ultimas nominas.
6. Contadores en sidebar para Nominas y Documentacion Laboral.
7. Registro: genera password temporal de 8 digitos numericos.
8. Reset admin: genera password temporal de 8 digitos numericos.

## 6) Puntos tecnicos importantes del proyecto

- Frontend servido estaticamente por Apache desde `/var/www/html/Empleado`.
- Backend Node expone API en `localhost:5174` y Apache hace proxy por `/Empleado/api`.
- El backend no necesita compilar TypeScript para arrancar (`server/index.js`).
- Si se compila frontend con script `npm run build`, requiere `cross-env` instalado en dependencias.

## 7) Cambio de ruta del proyecto (migracion a otro directorio)

Ejemplo de nueva ruta:

- Front: `/opt/portal-empleado/frontend`
- Back: `/opt/portal-empleado/backend`

Copiar:

```bash
sudo mkdir -p /opt/portal-empleado/frontend /opt/portal-empleado/backend
sudo rsync -av --delete /var/www/html/Empleado/ /opt/portal-empleado/frontend/
sudo rsync -av --delete /var/www/html/Empleado/portal-empleado-backend/ /opt/portal-empleado/backend/
```

Actualizar Apache:

- `Alias /Empleado /opt/portal-empleado/frontend`
- `<Directory /opt/portal-empleado/frontend> ...`
- Mantener proxy API apuntando al puerto real del backend.

Validar y recargar:

```bash
sudo apache2ctl configtest
sudo systemctl reload apache2
```

Rearrancar backend desde nueva ruta:

```bash
pm2 delete PortalEmpleado
cd /opt/portal-empleado/backend
pm2 start server/index.js --name PortalEmpleado
pm2 save
pm2 list
```

## 8) Rollback rapido

Si algo falla:

1. Restaurar rutas antiguas en Apache (`/var/www/html/Empleado`).
2. Recargar Apache.
3. Levantar PM2 desde ruta antigua.
4. Verificar logs y puerto.

```bash
sudo apache2ctl configtest
sudo systemctl reload apache2
pm2 list
pm2 logs PortalEmpleado --lines 100
```

