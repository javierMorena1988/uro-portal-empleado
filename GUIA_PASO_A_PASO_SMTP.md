# 📧 Guía Paso a Paso: Configurar SMTP en Producción

## ✅ Comandos a Ejecutar (Copia y Pega)

### 1️⃣ Conectarse al servidor
```bash
ssh root@portalempleado.urovesa.com
```

### 2️⃣ Ir al directorio del backend
```bash
cd /var/www/html/Empleado/portal-empleado-backend
```

### 3️⃣ Ver el contenido actual (OPCIONAL - para verificar)
```bash
cat .env
```

### 4️⃣ Crear backup del .env
```bash
cp .env .env.backup
```

### 5️⃣ Agregar configuración SMTP (ejecuta todos estos comandos)
```bash
echo "" >> .env
echo "# ==================== CONFIGURACIÓN EMAIL (Para registro) ====================" >> .env
echo "SMTP_HOST=smtp.gmail.com" >> .env
echo "SMTP_PORT=587" >> .env
echo "SMTP_SECURE=false" >> .env
echo "SMTP_USER=dstavisos@gmail.com" >> .env
echo "SMTP_PASSWORD=gqwncmgntionwbpg" >> .env
echo "SMTP_FROM=Portal Empleado UROVESA <dstavisos@gmail.com>" >> .env
echo "PORTAL_URL=https://portalempleado.urovesa.com/Empleado" >> .env
```

### 6️⃣ Verificar que se agregaron correctamente
```bash
cat .env | grep SMTP
```

**Deberías ver:**
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=dstavisos@gmail.com
SMTP_PASSWORD=gqwncmgntionwbpg
SMTP_FROM=Portal Empleado UROVESA <dstavisos@gmail.com>
```

### 7️⃣ Reiniciar el backend
```bash
pm2 restart portal-empleado-backend
```

### 8️⃣ Verificar estado
```bash
pm2 status
```

**Deberías ver:** `portal-empleado-backend` con estado `online`

### 9️⃣ Ver logs (para confirmar que funciona)
```bash
pm2 logs portal-empleado-backend --lines 30
```

### 🔟 Probar el registro
1. Ve a: `https://portalempleado.urovesa.com/Empleado/register`
2. Ingresa un email válido
3. Verifica que llegue el correo

---

## ⚠️ Si algo sale mal

### Ver el contenido completo del .env
```bash
cat .env
```

### Restaurar el backup
```bash
cp .env.backup .env
pm2 restart portal-empleado-backend
```

### Ver todos los logs
```bash
pm2 logs portal-empleado-backend --lines 100
```

---

## ✅ Checklist

- [ ] Backup creado
- [ ] Variables SMTP agregadas al .env
- [ ] Verificación con `grep SMTP` muestra las variables
- [ ] Backend reiniciado con PM2
- [ ] Estado de PM2 muestra `online`
- [ ] Prueba de registro funciona

---

**¡Listo!** Una vez completados estos pasos, el sistema debería enviar correos correctamente.
