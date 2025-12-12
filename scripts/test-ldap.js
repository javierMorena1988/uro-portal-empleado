/**
 * Script de prueba rápida para verificar la integración LDAP
 * 
 * Uso:
 *   node scripts/test-ldap.js
 * 
 * Requiere que el servidor esté corriendo en http://localhost:5174
 */

const API_BASE = 'http://localhost:5174';

// Colores para la consola
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testEndpoint(name, method, endpoint, body = null, token = null) {
  try {
    log(`\n🧪 Probando: ${name}`, 'blue');
    log(`   ${method} ${endpoint}`, 'blue');

    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, options);
    const data = await response.json();

    if (response.ok) {
      log(`   ✅ Éxito (${response.status})`, 'green');
      if (data.token) {
        log(`   Token: ${data.token.substring(0, 50)}...`, 'green');
      }
      return { success: true, data, token: data.token };
    } else {
      log(`   ❌ Error (${response.status}): ${data.error || 'Error desconocido'}`, 'red');
      return { success: false, error: data.error };
    }
  } catch (error) {
    log(`   ❌ Error de conexión: ${error.message}`, 'red');
    log(`   💡 Asegúrate de que el servidor esté corriendo en ${API_BASE}`, 'yellow');
    return { success: false, error: error.message };
  }
}

async function runTests() {
  log('\n═══════════════════════════════════════════════════════', 'blue');
  log('🚀 Iniciando pruebas de integración LDAP', 'blue');
  log('═══════════════════════════════════════════════════════\n', 'blue');

  // Verificar que el servidor esté corriendo
  log('📡 Verificando conexión con el servidor...', 'yellow');
  try {
    const healthCheck = await fetch(`${API_BASE}/api/auth/verify`, {
      method: 'GET',
      headers: { 'Authorization': 'Bearer invalid_token' },
    });
    log('   ✅ Servidor está corriendo', 'green');
  } catch (error) {
    log('   ❌ No se puede conectar al servidor', 'red');
    log('   💡 Ejecuta: npm run server', 'yellow');
    process.exit(1);
  }

  // Pedir credenciales de prueba
  log('\n📝 Para las pruebas, necesitamos credenciales de prueba', 'yellow');
  log('   Si no tienes LDAP configurado, las pruebas fallarán', 'yellow');
  log('   Presiona Enter para usar credenciales de ejemplo...', 'yellow');

  // Nota: En un script real, podrías usar readline para pedir credenciales
  // Por ahora, usamos valores de ejemplo
  const testUsername = process.env.TEST_USERNAME || 'usuario_test';
  const testPassword = process.env.TEST_PASSWORD || 'password_test';
  const testOldPassword = process.env.TEST_OLD_PASSWORD || testPassword;
  const testNewPassword = process.env.TEST_NEW_PASSWORD || 'nueva_password_test';

  log(`\n   Usando credenciales de prueba:`, 'yellow');
  log(`   Usuario: ${testUsername}`, 'yellow');
  log(`   (Para usar credenciales reales, exporta TEST_USERNAME y TEST_PASSWORD)`, 'yellow');

  // Test 1: Login
  const loginResult = await testEndpoint(
    'Login',
    'POST',
    '/api/auth/login',
    {
      username: testUsername,
      password: testPassword,
    }
  );

  if (!loginResult.success) {
    log('\n⚠️  Login falló. Esto puede ser normal si:', 'yellow');
    log('   - No tienes LDAP configurado aún', 'yellow');
    log('   - Las credenciales de prueba no son válidas', 'yellow');
    log('   - El servidor LDAP no es accesible', 'yellow');
    log('\n💡 Continúa con las siguientes pruebas para verificar la estructura', 'yellow');
  }

  // Test 2: Verificar token (si el login fue exitoso)
  if (loginResult.token) {
    await testEndpoint(
      'Verificar Token',
      'GET',
      '/api/auth/verify',
      null,
      loginResult.token
    );
  } else {
    log('\n⏭️  Saltando verificación de token (login falló)', 'yellow');
  }

  // Test 3: Cambiar contraseña (solo si el login fue exitoso)
  if (loginResult.success && loginResult.token) {
    log('\n⚠️  Nota: La prueba de cambio de contraseña requiere LDAP configurado', 'yellow');
    await testEndpoint(
      'Cambiar Contraseña',
      'POST',
      '/api/auth/change-password',
      {
        username: testUsername,
        oldPassword: testOldPassword,
        newPassword: testNewPassword,
      }
    );
  } else {
    log('\n⏭️  Saltando cambio de contraseña (login falló)', 'yellow');
  }

  // Test 4: Login con credenciales inválidas (debe fallar)
  log('\n🧪 Probando validación de errores...', 'blue');
  await testEndpoint(
    'Login con credenciales inválidas (debe fallar)',
    'POST',
    '/api/auth/login',
    {
      username: 'usuario_inexistente',
      password: 'contraseña_incorrecta',
    }
  );

  // Resumen
  log('\n═══════════════════════════════════════════════════════', 'blue');
  log('✅ Pruebas completadas', 'blue');
  log('═══════════════════════════════════════════════════════\n', 'blue');
  log('📚 Para más información, consulta: docs/PRUEBAS_LDAP.md', 'yellow');
}

// Ejecutar pruebas
runTests().catch((error) => {
  log(`\n❌ Error fatal: ${error.message}`, 'red');
  process.exit(1);
});









