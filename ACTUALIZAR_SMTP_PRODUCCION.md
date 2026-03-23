# 📧 Guía para Actualizar Configuración SMTP en Producción

## ✅ Credenciales proporcionadas por Backend

```
Correo: dstavisos@gmail.com
Contraseña: gqwncmgntionwbpg
Servidor: smtp.gmail.com
Puerto: 587
SSL: True (pero usaremos STARTTLS con puerto 587)
```

---

## 🔧 Paso 1: Conectarse al Servidor

```bash
ssh root@portalempleado.urovesa.com
```

O si usas otro método de acceso (FTP, panel, etc.), accede al servidor.

---

## 📝 Paso 2: Navegar al Directorio del Backend

```bash
cd /var/www/html/Empleado/portal-empleado-backend
```

---

## ✏️ Paso 3: Editar el Archivo .env

```bash
nano .env
```

O si prefieres usar `vi`:
```bash
vi .env
```

---

## 📋 Paso 4: Agregar/Actualizar las Variables SMTP

Busca la sección de configuración de email y agrega o actualiza estas líneas:

```bash
# ==================== CONFIGURACIÓN EMAIL (Para registro) ====================
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=dstavisos@gmail.com
SMTP_PASSWORD=gqwncmgntionwbpg
SMTP_FROM=Portal Empleado UROVESA <dstavisos@gmail.com>
PORTAL_URL=https://portalempleado.urovesa.com/Empleado
```

### 📌 Notas importantes:

- **SMTP_SECURE=false**: Para el puerto 587, Gmail usa STARTTLS (no SSL directo)
- Si el puerto 587 no funciona, prueba con:
  - Puerto: `465`
  - SMTP_SECURE: `true`

---

## 💾 Paso 5: Guardar el Archivo

Si usas `nano`:
- Presiona `Ctrl + O` para guardar
- Presiona `Enter` para confirmar
- Presiona `Ctrl + X` para salir

Si usas `vi`:
- Presiona `Esc` para asegurarte de estar en modo comando
- Escribe `:wq` y presiona `Enter` para guardar y salir

---

## 🔄 Paso 6: Reiniciar el Backend con PM2

```bash
pm2 restart portal-empleado-backend
```

O si el proceso tiene otro nombre:
```bash
pm2 restart all
```

---

## ✅ Paso 7: Verificar que Funciona

### 7.1. Ver los logs en tiempo real:

```bash
pm2 logs portal-empleado-backend --lines 50
```

### 7.2. Verificar el estado de PM2:

```bash
pm2 status
```

Deberías ver el proceso `portal-empleado-backend` con estado `online`.

---

## 🧪 Paso 8: Probar el Registro

1. Ve a: `https://portalempleado.urovesa.com/Empleado/register`
2. Ingresa un email válido de la lista de empleados
3. Verifica que se envíe el correo correctamente

---

## 🔍 Verificar la Configuración Actual

Si quieres ver qué valores tiene actualmente el `.env`:

```bash
cat .env | grep SMTP
```

Deberías ver algo como:
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=dstavisos@gmail.com
SMTP_PASSWORD=gqwncmgntionwbpg
SMTP_FROM=Portal Empleado UROVESA <dstavisos@gmail.com>
PORTAL_URL=https://portalempleado.urovesa.com/Empleado
```

---

## ⚠️ Solución de Problemas

### Error: "Invalid login: 535 Authentication failed"

**Causa**: Las credenciales son incorrectas o Gmail requiere una "Contraseña de aplicación".

**Solución**:
1. Verifica que las credenciales sean correctas
2. Si es una cuenta de Gmail, puede que necesites generar una "Contraseña de aplicación" desde:
   - https://myaccount.google.com/apppasswords
   - Usa esa contraseña en lugar de la contraseña normal

### Error: "Connection timeout"

**Causa**: El puerto 587 puede estar bloqueado por el firewall.

**Solución**:
1. Prueba con el puerto 465 y `SMTP_SECURE=true`
2. O verifica que el firewall permita conexiones salientes al puerto 587

### El correo no se envía pero no hay error

**Solución**:
1. Revisa los logs: `pm2 logs portal-empleado-backend --lines 100`
2. Busca mensajes que empiecen con `[Email]`
3. Verifica que las variables de entorno estén correctas: `cat .env | grep SMTP`

---

## 📞 Comandos Rápidos de Referencia

```bash
# Ver configuración SMTP actual
cat .env | grep SMTP

# Editar .env
nano .env

# Reiniciar backend
pm2 restart portal-empleado-backend

# Ver logs
pm2 logs portal-empleado-backend --lines 50

# Ver estado de PM2
pm2 status

# Ver todos los procesos PM2
pm2 list
```

---

## ✅ Checklist Final

- [ ] Archivo `.env` actualizado con las credenciales SMTP
- [ ] Backend reiniciado con PM2
- [ ] Logs muestran que el servidor está corriendo
- [ ] Prueba de registro funciona correctamente
- [ ] El correo se envía sin errores

---

**¡Listo!** Una vez completados estos pasos, el sistema de registro debería funcionar correctamente y enviar correos a los usuarios que se registren.
