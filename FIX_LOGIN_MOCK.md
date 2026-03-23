# 🔧 Fix: Permitir login con admin@admin.com en modo MOCK

## Problema
El sistema verifica SIEMPRE si el email está en la lista de empleados, incluso en modo MOCK. Esto impide que `admin@admin.com` haga login porque no está en la lista.

## Solución
Modificar `server/index.js` para que en modo MOCK, los usuarios de prueba (`admin`, `testuser`) no requieran verificación de empleados.

## Comandos para ejecutar en el servidor

```bash
cd /var/www/html/Empleado/portal-empleado-backend

# Hacer backup
cp server/index.js server/index.js.backup

# Buscar la línea exacta donde está la verificación
grep -n "Verificando acceso del empleado" server/index.js

# Modificar el código (reemplazar las líneas 756-768 aproximadamente)
# Usar sed para hacer el cambio
```

## Cambio necesario

Reemplazar esta sección (aproximadamente líneas 756-768):

```javascript
// PASO 1: Verificar que el email está en la lista de empleados con acceso
console.log('[Login] Verificando acceso del empleado...');
const empleado = await findEmpleadoByEmail(userEmail);

if (!empleado) {
  console.log('[Login] Empleado no encontrado o sin acceso:', userEmail);
  return res.status(403).json({
    success: false,
    error: 'No tienes acceso al portal. Contacta con el administrador si crees que esto es un error.',
  });
}
```

Por esta:

```javascript
// PASO 1: Verificar que el email está en la lista de empleados con acceso
// En modo MOCK, permitir usuarios de prueba sin verificación
let empleado = null;
const isMockTestUser = useMockAuth && (cleanUsername === 'admin' || cleanUsername === 'testuser');

if (isMockTestUser) {
  console.log('[Login] Usuario de prueba MOCK, saltando verificación de empleados');
  // Crear un empleado mock para usuarios de prueba
  empleado = {
    IdEmpleado: cleanUsername === 'admin' ? '1401' : '1402',
    Email: userEmail,
    accesototal: true,
    accesoLimitado: false,
  };
} else {
  console.log('[Login] Verificando acceso del empleado...');
  empleado = await findEmpleadoByEmail(userEmail);
  
  if (!empleado) {
    console.log('[Login] Empleado no encontrado o sin acceso:', userEmail);
    return res.status(403).json({
      success: false,
      error: 'No tienes acceso al portal. Contacta con el administrador si crees que esto es un error.',
    });
  }
}
```

## Alternativa: Editar manualmente

Si prefieres, edita el archivo manualmente con `nano`:

```bash
cd /var/www/html/Empleado/portal-empleado-backend
nano server/index.js
```

Busca la línea que dice `// PASO 1: Verificar que el email está en la lista de empleados con acceso` (alrededor de la línea 756) y reemplaza el bloque como se indica arriba.

Después de modificar:
```bash
# Reiniciar PM2
pm2 restart portal-empleado-backend

# Ver logs
pm2 logs portal-empleado-backend --lines 30
```
