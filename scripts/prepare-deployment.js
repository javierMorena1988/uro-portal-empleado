#!/usr/bin/env node

/**
 * Script para preparar el proyecto para despliegue
 * Crea una carpeta deploy/ con los archivos necesarios para producción
 */

import { execSync } from 'child_process';
import { existsSync, mkdirSync, readdirSync, statSync, readFileSync, writeFileSync } from 'fs';
import { join, relative, dirname } from 'path';

const PROJECT_ROOT = process.cwd();
const DEPLOY_DIR = join(PROJECT_ROOT, 'deploy');

// Archivos y carpetas a incluir
const INCLUDED_PATHS = [
  'dist',
  'server',
  'package.json',
  'package-lock.json',
  'README.md',
];

// Archivos y carpetas a excluir
const EXCLUDED_PATHS = [
  'node_modules',
  '.env',
  '.git',
  'src',
  'deploy',
  'dist',
  '.vite',
  '*.log',
  '.DS_Store',
  'Thumbs.db',
];

console.log('🚀 Preparando despliegue...\n');

// Verificar que dist existe
if (!existsSync(join(PROJECT_ROOT, 'dist'))) {
  console.error('❌ Error: La carpeta dist/ no existe.');
  console.log('💡 Ejecuta primero: npm run build\n');
  process.exit(1);
}

// Crear directorio de despliegue
if (existsSync(DEPLOY_DIR)) {
  console.log('📁 Limpiando directorio de despliegue anterior...');
  execSync(`rm -rf "${DEPLOY_DIR}"`, { stdio: 'inherit' });
}
mkdirSync(DEPLOY_DIR, { recursive: true });

console.log('📦 Copiando archivos necesarios...\n');

// Función para copiar archivos
function copyFile(src, dest) {
  mkdirSync(dirname(dest), { recursive: true });
  const content = readFileSync(src);
  writeFileSync(dest, content);
}

// Función para copiar directorio recursivamente
function copyDir(src, dest) {
  if (!existsSync(src)) {
    console.warn(`⚠️  No existe: ${src}`);
    return;
  }
  
  const entries = readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);
    
    // Verificar exclusiones
    const relativePath = relative(PROJECT_ROOT, srcPath);
    if (EXCLUDED_PATHS.some(pattern => relativePath.includes(pattern))) {
      continue;
    }
    
    if (entry.isDirectory()) {
      mkdirSync(destPath, { recursive: true });
      copyDir(srcPath, destPath);
    } else {
      copyFile(srcPath, destPath);
    }
  }
}

// Copiar archivos incluidos
for (const path of INCLUDED_PATHS) {
  const srcPath = join(PROJECT_ROOT, path);
  const destPath = join(DEPLOY_DIR, path);
  
  if (!existsSync(srcPath)) {
    console.warn(`⚠️  No existe: ${path}`);
    continue;
  }
  
  const stat = statSync(srcPath);
  if (stat.isDirectory()) {
    console.log(`📁 Copiando carpeta: ${path}/`);
    copyDir(srcPath, destPath);
  } else {
    console.log(`📄 Copiando archivo: ${path}`);
    copyFile(srcPath, destPath);
  }
}

// Crear archivo .env.example para producción
const envExample = `# ==================== CONFIGURACIÓN SERVIDOR ====================
PORT=5174
NODE_ENV=production

# Autenticación (LDAP real en producción)
MOCK_AUTH=false

# ==================== CONFIGURACIÓN LDAP/ACTIVE DIRECTORY ====================
LDAP_URL=ldaps://ad.urovesa.com:636
LDAP_BASE_DN=dc=urovesa,dc=com
LDAP_USER_DN_FORMAT=CN={username},CN=Users,{baseDN}
LDAP_SEARCH_FILTER=(sAMAccountName={username})
LDAP_ADMIN_DN=CN=svc_ldap_api,CN=Users,DC=urovesa,DC=com
LDAP_ADMIN_PASSWORD=contraseña_segura_aqui
LDAP_REJECT_UNAUTHORIZED=true
LDAP_PASSWORD_MIN_LENGTH=8

# ==================== CONFIGURACIÓN JWT ====================
JWT_SECRET=secreto_super_seguro_cambiar_en_produccion
JWT_EXPIRES_IN=24h

# ==================== CONFIGURACIÓN THEREFORE ====================
THEREFORE_BASE_URL=https://therefore.urovesa.com:443/theservice/v0001/restun
THEREFORE_USERNAME=usuario_therefore
THEREFORE_PASSWORD=contraseña_therefore
THEREFORE_TENANT=nombre_tenant
`;

const envExamplePath = join(DEPLOY_DIR, '.env.example');
writeFileSync(envExamplePath, envExample);
console.log('📄 Creando: .env.example\n');

// Crear archivo de instrucciones
const instructions = `# Instrucciones de Despliegue

## 1. Subir archivos por FTP
Sube TODO el contenido de esta carpeta al servidor.

## 2. Conectarse por SSH
ssh usuario@servidor.com
cd /ruta/del/proyecto

## 3. Instalar dependencias
npm install --production

## 4. Configurar variables de entorno
cp .env.example .env
nano .env
# Edita las variables con los valores reales

## 5. Crear carpeta data con permisos
mkdir -p data
chmod 755 data

## 6. Iniciar servidor con PM2
npm install -g pm2
pm2 start server/index.js --name portal-empleado
pm2 startup
pm2 save

## 7. Configurar servidor web (Apache)
Ver documentación completa en docs/APACHE_CONFIG.md

¡Listo! 🎉
`;

writeFileSync(join(DEPLOY_DIR, 'INSTRUCCIONES.txt'), instructions);
console.log('📄 Creando: INSTRUCCIONES.txt\n');

// Copiar .htaccess a dist/ si existe
const htaccessSource = join(PROJECT_ROOT, 'deploy', '.htaccess');
const htaccessDest = join(DEPLOY_DIR, 'dist', '.htaccess');
if (existsSync(htaccessSource)) {
  copyFile(htaccessSource, htaccessDest);
  console.log('📄 Copiando .htaccess a dist/\n');
} else {
  // Crear .htaccess básico si no existe
  const basicHtaccess = `# Configuración Apache para Portal Empleado
RewriteEngine On
RewriteBase /PortalEmpleado/
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^ index.html [L]
`;
  writeFileSync(htaccessDest, basicHtaccess);
  console.log('📄 Creando .htaccess básico en dist/\n');
}

console.log('✅ Preparación completada!\n');
console.log(`📁 Carpeta de despliegue creada: ${DEPLOY_DIR}\n`);
console.log('📤 Siguiente paso: Sube TODO el contenido de la carpeta deploy/ al servidor por FTP\n');
console.log('💡 Puedes comprimir la carpeta deploy/ en un ZIP si lo prefieres\n');
console.log('📖 Lee docs/APACHE_CONFIG.md para configurar Apache correctamente\n');
