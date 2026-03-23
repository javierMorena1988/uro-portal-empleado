/**
 * Servicio de envío de correos electrónicos
 * Usa nodemailer para enviar emails
 */

import nodemailer from 'nodemailer';

/**
 * Crea un transporter de nodemailer basado en las variables de entorno
 * @returns {Promise<nodemailer.Transporter>}
 */
function createTransporter() {
  // Configuración desde variables de entorno
  const smtpHost = process.env.SMTP_HOST || 'smtp.office.365.com'; // smtp.office.365.com
  const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10); // el puerto esta bien
  // el cifrado es tls/starttls
  const smtpSecure = process.env.SMTP_SECURE === 'true'; // true para 465, false para otros puertos
  const smtpUser = process.env.SMTP_USER || '';
  const smtpPassword = process.env.SMTP_PASSWORD || '';
  const smtpFrom = process.env.SMTP_FROM || smtpUser || 'noreply@urovesa.com';

  // Si no hay configuración, lanzar error para que el backend lo maneje
  if (!smtpUser || !smtpPassword) {
    // eslint-disable-next-line no-console
    console.warn('[Email] SMTP no configurado - SMTP_USER o SMTP_PASSWORD faltantes');
    throw new Error('SMTP no configurado. Configura SMTP_USER y SMTP_PASSWORD en el archivo .env');
  }

  // Configuración del transporter
  // Puerto 587 usa STARTTLS (secure: false, requireTLS: true) - como Python starttls()
  // Puerto 465 usa SSL directo (secure: true)
  const transporterConfig = {
    host: smtpHost,
    port: smtpPort,
    auth: {
      user: smtpUser,
      pass: smtpPassword,
    },
    // Forzar IPv4 para evitar problemas de conectividad IPv6
    // Gmail puede resolver a IPv6 pero el servidor puede no tener acceso IPv6
    family: 4, // 4 = IPv4, 6 = IPv6, 0 = ambos
  };

  if (smtpPort === 587) {
    // Puerto 587: usar STARTTLS (como Python starttls())
    transporterConfig.secure = false;
    transporterConfig.requireTLS = true;
  } else if (smtpPort === 465) {
    // Puerto 465: usar SSL directo
    transporterConfig.secure = true;
  } else {
    // Otros puertos: usar la configuración de SMTP_SECURE
    transporterConfig.secure = smtpSecure;
  }

  return nodemailer.createTransport(transporterConfig);
}

/**
 * Envía un correo con la contraseña temporal al usuario
 * @param {string} to - Email del destinatario
 * @param {string} username - Nombre de usuario
 * @param {string} password - Contraseña temporal
 * @returns {Promise<void>}
 */
export async function sendPasswordEmail(to, username, password) {
  try {
    const transporter = createTransporter();
    const smtpUser = process.env.SMTP_USER || '';
    const smtpFromConfig = process.env.SMTP_FROM || '';
    const portalUrl = process.env.PORTAL_URL || 'https://portalempleado.urovesa.com/Empleado';

    // Gmail requiere que el remitente sea exactamente el mismo que SMTP_USER
    // Extraer solo el email del SMTP_FROM si tiene formato "Nombre <email>"
    let fromEmail = smtpUser; // Por defecto usar SMTP_USER
    
    if (smtpFromConfig) {
      // Si SMTP_FROM tiene formato "Nombre <email>", extraer solo el email
      const emailMatch = smtpFromConfig.match(/<(.+)>/);
      if (emailMatch) {
        fromEmail = emailMatch[1];
      } else if (smtpFromConfig.includes('@')) {
        // Si es solo un email sin formato
        fromEmail = smtpFromConfig;
      }
    }
    
    // Asegurar que el remitente sea exactamente SMTP_USER (requisito de Gmail)
    if (fromEmail !== smtpUser) {
      // eslint-disable-next-line no-console
      console.warn('[Email] ⚠️ SMTP_FROM no coincide con SMTP_USER. Usando SMTP_USER como remitente:', smtpUser);
      fromEmail = smtpUser;
    }
    
    const mailOptions = {
      from: `Portal Empleado UROVESA <${fromEmail}>`,
      replyTo: fromEmail, // Agregar reply-to
      to,
      subject: 'Bienvenido al Portal Empleado - Tu contraseña de acceso',
      // Headers adicionales para mejorar la entrega
      headers: {
        'X-Priority': '1',
        'X-MSMail-Priority': 'High',
        'Importance': 'high',
        'List-Unsubscribe': `<mailto:${fromEmail}?subject=unsubscribe>`,
      },
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background-color: #1a5490;
              color: white;
              padding: 20px;
              text-align: center;
              border-radius: 5px 5px 0 0;
            }
            .content {
              background-color: #f9f9f9;
              padding: 30px;
              border: 1px solid #ddd;
              border-top: none;
            }
            .password-box {
              background-color: #fff;
              border: 2px solid #1a5490;
              border-radius: 5px;
              padding: 15px;
              margin: 20px 0;
              text-align: center;
              font-size: 18px;
              font-weight: bold;
              color: #1a5490;
            }
            .warning {
              background-color: #fff3cd;
              border-left: 4px solid #ffc107;
              padding: 15px;
              margin: 20px 0;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              color: #666;
              font-size: 12px;
            }
            .button {
              display: inline-block;
              background-color: #1a5490;
              color: white !important;
              padding: 12px 30px;
              text-decoration: none;
              border-radius: 5px;
              margin: 20px 0;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Portal Empleado UROVESA</h1>
          </div>
          <div class="content">
            <h2>Bienvenido al Portal Empleado</h2>
            <p>Hola,</p>
            <p>Se ha creado tu cuenta en el Portal Empleado de UROVESA. A continuación encontrarás tus credenciales de acceso:</p>
            
            <div class="password-box">
              <strong>Usuario:</strong> ${username}<br>
              <strong>Contraseña:</strong> ${password}
            </div>

            <div class="warning">
              <strong>⚠️ Importante:</strong> Por seguridad, te recomendamos cambiar esta contraseña después de tu primer acceso.
            </div>

            <p>Puedes acceder al portal en:</p>
            <p style="text-align: center;">
              <a href="${portalUrl}" class="button">Acceder al Portal</a>
            </p>

            <p>Si no has solicitado esta cuenta, por favor contacta con el administrador del sistema.</p>
          </div>
          <div class="footer">
            <p>Este es un correo automático, por favor no respondas a este mensaje.</p>
            <p>Portal Empleado UROVESA</p>
          </div>
        </body>
        </html>
      `,
      text: `
Bienvenido al Portal Empleado UROVESA

Se ha creado tu cuenta en el Portal Empleado. Tus credenciales de acceso son:

Usuario: ${username}
Contraseña: ${password}

⚠️ IMPORTANTE: Por seguridad, te recomendamos cambiar esta contraseña después de tu primer acceso.

Puedes acceder al portal en: ${portalUrl}

Si no has solicitado esta cuenta, por favor contacta con el administrador del sistema.

Este es un correo automático, por favor no respondas a este mensaje.
      `,
    };

    // eslint-disable-next-line no-console
    console.log('[Email] Intentando enviar correo...');
    // eslint-disable-next-line no-console
    console.log('[Email] De:', mailOptions.from);
    // eslint-disable-next-line no-console
    console.log('[Email] Para:', mailOptions.to);
    // eslint-disable-next-line no-console
    console.log('[Email] SMTP Host:', process.env.SMTP_HOST);
    // eslint-disable-next-line no-console
    console.log('[Email] SMTP Port:', process.env.SMTP_PORT);
    // eslint-disable-next-line no-console
    console.log('[Email] SMTP User:', process.env.SMTP_USER);
    
    const info = await transporter.sendMail(mailOptions);
    
    // eslint-disable-next-line no-console
    console.log('[Email] Correo enviado exitosamente');
    // eslint-disable-next-line no-console
    console.log('[Email] MessageId:', info.messageId);
    // eslint-disable-next-line no-console
    console.log('[Email] Response:', info.response);
    // eslint-disable-next-line no-console
    console.log('[Email] Accepted:', info.accepted);
    // eslint-disable-next-line no-console
    console.log('[Email] Rejected:', info.rejected);
    // eslint-disable-next-line no-console
    console.log('[Email] Pending:', info.pending);
    
    // Si es modo de prueba, mostrar la URL de preview
    if (info.messageId && nodemailer.getTestMessageUrl) {
      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        // eslint-disable-next-line no-console
        console.log('[Email] Preview URL (modo de prueba):', previewUrl);
      }
    }
    
    // Verificar si el correo fue rechazado
    if (info.rejected && info.rejected.length > 0) {
      // eslint-disable-next-line no-console
      console.error('[Email] ⚠️ Correo rechazado para:', info.rejected);
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[Email] Error al enviar correo:', error.message);
    throw new Error(`Error al enviar correo: ${error.message}`);
  }
}
