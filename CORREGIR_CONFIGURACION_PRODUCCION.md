# 🔧 Corregir Configuración en Producción

## ⚠️ Problema Detectado

El `.env` en producción probablemente tiene `api.urovesa.com` en lugar de la URL interna correcta.

---

## 📋 Paso 1: Ver la Configuración Actual

Ejecuta en el servidor:

```bash
cd /var/www/html/Empleado/portal-empleado-backend
cat .env | grep -E "(EMPLEADOS_API_URL|EMPLEADOS_API_KEY|THEREFORE|SMTP)"
```

Esto mostrará todas las configuraciones importantes.

---

## ✅ Paso 2: Corregir EMPLEADOS_API_URL

Si ves `api.urovesa.com`, cámbialo por la URL interna:

```bash
# Si existe, reemplazarlo
sed -i 's|^EMPLEADOS_API_URL=.*|EMPLEADOS_API_URL=http://10.10.33.5:8090/qs_service/portal_empleado/devuelve_datos|' .env

# Si no existe, agregarlo
grep -q "EMPLEADOS_API_URL" .env || echo "EMPLEADOS_API_URL=http://10.10.33.5:8090/qs_service/portal_empleado/devuelve_datos" >> .env
```

---

## ✅ Paso 3: Verificar EMPLEADOS_API_KEY

```bash
# Verificar que existe
grep "EMPLEADOS_API_KEY" .env

# Si no existe o está mal, corregirlo
sed -i 's|^EMPLEADOS_API_KEY=.*|EMPLEADOS_API_KEY=bd06caaa-c3a7-4c55-8e51-3f2s50d77331|' .env
grep -q "EMPLEADOS_API_KEY" .env || echo "EMPLEADOS_API_KEY=bd06caaa-c3a7-4c55-8e51-3f2s50d77331" >> .env
```

---

## ✅ Paso 4: Verificar THEREFORE (si está configurado)

```bash
cat .env | grep THEREFORE
```

Si no está configurado o tiene valores placeholder, necesitarás los valores reales de Therefore.

---

## ✅ Paso 5: Verificar SMTP (ya lo hicimos, pero verificar)

```bash
cat .env | grep SMTP
```

Deberías ver:
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=dstavisos@gmail.com
SMTP_PASSWORD=gqwncmgntionwbpg
SMTP_FROM=Portal Empleado UROVESA <dstavisos@gmail.com>
```

---

## 🔄 Paso 6: Reiniciar el Backend

```bash
pm2 restart portal-empleado-backend
```

---

## ✅ Paso 7: Verificar Todo

```bash
# Ver todas las configuraciones importantes
cat .env | grep -E "(EMPLEADOS_API_URL|EMPLEADOS_API_KEY|THEREFORE|SMTP_HOST|SMTP_USER)"

# Ver estado del backend
pm2 status

# Ver logs
pm2 logs portal-empleado-backend --lines 30
```

---

## 📝 Configuración Correcta Esperada

```bash
# EMPLEADOS
EMPLEADOS_API_URL=http://10.10.33.5:8090/qs_service/portal_empleado/devuelve_datos
EMPLEADOS_API_KEY=bd06caaa-c3a7-4c55-8e51-3f2s50d77331

# SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=dstavisos@gmail.com
SMTP_PASSWORD=gqwncmgntionwbpg
SMTP_FROM=Portal Empleado UROVESA <dstavisos@gmail.com>
PORTAL_URL=https://portalempleado.urovesa.com/Empleado

# THEREFORE (debe tener valores reales, no placeholders)
THEREFORE_BASE_URL=https://therefore.urovesa.com:443/theservice/v0001/restun
THEREFORE_USERNAME=URO_thereforeqs
THEREFORE_PASSWORD=DST981$$89OOd
```

---

## 🚀 Comandos Rápidos (Todo en Uno)

```bash
cd /var/www/html/Empleado/portal-empleado-backend

# Corregir EMPLEADOS_API_URL
sed -i 's|^EMPLEADOS_API_URL=.*|EMPLEADOS_API_URL=http://10.10.33.5:8090/qs_service/portal_empleado/devuelve_datos|' .env
grep -q "EMPLEADOS_API_URL" .env || echo "EMPLEADOS_API_URL=http://10.10.33.5:8090/qs_service/portal_empleado/devuelve_datos" >> .env

# Verificar/corregir EMPLEADOS_API_KEY
sed -i 's|^EMPLEADOS_API_KEY=.*|EMPLEADOS_API_KEY=bd06caaa-c3a7-4c55-8e51-3f2s50d77331|' .env
grep -q "EMPLEADOS_API_KEY" .env || echo "EMPLEADOS_API_KEY=bd06caaa-c3a7-4c55-8e51-3f2s50d77331" >> .env

# Verificar todo
cat .env | grep -E "(EMPLEADOS_API_URL|EMPLEADOS_API_KEY|SMTP_HOST|SMTP_USER)"

# Reiniciar
pm2 restart portal-empleado-backend

# Ver logs
pm2 logs portal-empleado-backend --lines 30
```
