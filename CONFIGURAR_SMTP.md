# 📧 Configuración de SMTP para Envío de Correos

## ❌ Error Actual

```
Error: 535 Authentication failed
```

**Causa:** Las credenciales SMTP no están configuradas o son incorrectas.

---

## ✅ Solución: Configurar SMTP

### Opción 1: Gmail (Para Desarrollo/Pruebas)

Si quieres usar Gmail para pruebas:

1. **Habilitar "Contraseñas de aplicaciones" en Gmail:**
   - Ve a: https://myaccount.google.com/apppasswords
   - Genera una contraseña de aplicación
   - Usa esa contraseña (no tu contraseña normal)

2. **Configurar en `.env`:**
   ```bash
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=tu_email@gmail.com
   SMTP_PASSWORD=xxxx xxxx xxxx xxxx  # La contraseña de aplicación de 16 caracteres
   SMTP_FROM=tu_email@gmail.com
   ```

### Opción 2: Servidor SMTP de UROVESA

Si UROVESA tiene un servidor SMTP interno:

```bash
SMTP_HOST=smtp.urovesa.com  # O la IP del servidor SMTP
SMTP_PORT=587  # O 25, 465, etc.
SMTP_SECURE=false  # true para 465, false para otros
SMTP_USER=usuario_smtp@urovesa.com
SMTP_PASSWORD=contraseña_smtp
SMTP_FROM=noreply@urovesa.com
```

### Opción 3: Modo Desarrollo (Sin Enviar Correos Reales)

En desarrollo, si no configuras SMTP, el sistema mostrará la contraseña en la respuesta cuando falle el envío.

**Para activar esto, asegúrate de tener:**
```bash
NODE_ENV=development
```

Y **NO** configures `SMTP_USER` y `SMTP_PASSWORD` (o déjalos vacíos).

---

## 🔧 Pasos para Configurar

### 1. Editar el `.env` en local

```bash
# En tu máquina local
nano .env
```

### 2. Agregar configuración SMTP

```bash
# ==================== CONFIGURACIÓN EMAIL ====================
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=tu_email@gmail.com
SMTP_PASSWORD=tu_contraseña_de_aplicación
SMTP_FROM=tu_email@gmail.com
PORTAL_URL=http://localhost:5173
```

### 3. Reiniciar el backend

```bash
npm run dev:server
```

---

## 🧪 Probar el Registro

1. Accede a `/register` o haz clic en "Regístrate aquí" desde el login
2. Ingresa un email que esté en la lista de empleados
3. Si SMTP está configurado: recibirás el correo
4. Si SMTP NO está configurado (modo desarrollo): verás la contraseña en la respuesta

---

## 📝 Nota Importante

**En producción**, asegúrate de:
- ✅ Configurar SMTP correctamente
- ✅ NO mostrar la contraseña en la respuesta
- ✅ Usar un servidor SMTP corporativo de UROVESA

---

**Última actualización:** $(date)
