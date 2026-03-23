#!/bin/bash
# Script para actualizar configuración SMTP en el servidor

cd /var/www/html/Empleado/portal-empleado-backend

echo "=== Verificando configuración actual ==="
echo ""
cat .env | grep -E "(SMTP|PORTAL_URL)" || echo "No se encontraron variables SMTP"

echo ""
echo "=== Agregando/Actualizando configuración SMTP ==="
echo ""

# Crear backup
cp .env .env.backup.$(date +%Y%m%d_%H%M%S)

# Eliminar líneas SMTP existentes si las hay
sed -i '/^SMTP_HOST=/d' .env
sed -i '/^SMTP_PORT=/d' .env
sed -i '/^SMTP_SECURE=/d' .env
sed -i '/^SMTP_USER=/d' .env
sed -i '/^SMTP_PASSWORD=/d' .env
sed -i '/^SMTP_FROM=/d' .env
sed -i '/^PORTAL_URL=/d' .env

# Agregar nueva configuración al final del archivo
echo "" >> .env
echo "# ==================== CONFIGURACIÓN EMAIL (Para registro) ====================" >> .env
echo "SMTP_HOST=smtp.gmail.com" >> .env
echo "SMTP_PORT=587" >> .env
echo "SMTP_SECURE=false" >> .env
echo "SMTP_USER=dstavisos@gmail.com" >> .env
echo "SMTP_PASSWORD=gqwncmgntionwbpg" >> .env
echo "SMTP_FROM=Portal Empleado UROVESA <dstavisos@gmail.com>" >> .env
echo "PORTAL_URL=https://portalempleado.urovesa.com/Empleado" >> .env

echo ""
echo "=== Configuración actualizada ==="
echo ""
cat .env | grep -E "(SMTP|PORTAL_URL)"

echo ""
echo "=== Reiniciando backend ==="
pm2 restart portal-empleado-backend

echo ""
echo "=== Verificando logs ==="
pm2 logs portal-empleado-backend --lines 20 --nostream
