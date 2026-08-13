const axios = require('axios');

const BREVO_URL = 'https://api.brevo.com/v3/smtp/email';

const normalizarTexto = (value) => String(value || '').trim();

const escaparHtml = (value) => normalizarTexto(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const getSender = () => ({
    email: normalizarTexto(process.env.BREVO_SENDER_EMAIL) || 'notificaciones@marventovermut.com',
    name: normalizarTexto(process.env.BREVO_SENDER_NAME) || 'Marvento Vermut',
});

const enviarEmailTransaccional = async ({ to, subject, htmlContent, textContent }) => {
    const apiKey = normalizarTexto(process.env.BREVO_API_KEY);
    const destinatarios = Array.isArray(to) ? to : [to];
    const toNormalizado = destinatarios
        .map((destinatario) => {
            if (typeof destinatario === 'string') {
                return { email: normalizarTexto(destinatario) };
            }

            return {
                email: normalizarTexto(destinatario?.email),
                name: normalizarTexto(destinatario?.name),
            };
        })
        .filter((destinatario) => destinatario.email);

    if (!apiKey) {
        throw new Error('Falta BREVO_API_KEY');
    }

    if (!toNormalizado.length) {
        throw new Error('Falta destinatario para enviar email');
    }

    const payload = {
        sender: getSender(),
        to: toNormalizado,
        subject,
        htmlContent,
    };

    if (textContent) {
        payload.textContent = textContent;
    }

    const response = await axios.post(BREVO_URL, payload, {
        headers: {
            'api-key': apiKey,
            'content-type': 'application/json',
            accept: 'application/json',
        },
    });

    return response.data;
};

const armarHtmlBase = ({ titulo, contenido, accion }) => `
<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8">
    <title>${titulo}</title>
  </head>
  <body style="margin:0;background:#f6f1ea;font-family:Arial,Helvetica,sans-serif;color:#2a211c;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f1ea;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #e6ddd2;">
            <tr>
              <td style="padding:28px 28px 12px;">
                <div style="font-size:13px;letter-spacing:1px;text-transform:uppercase;color:#8a4634;">Marvento Vermut</div>
                <h1 style="margin:12px 0 0;font-size:24px;line-height:1.25;color:#2a211c;">${titulo}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:0 28px 20px;font-size:15px;line-height:1.6;color:#3b3029;">
                ${contenido}
              </td>
            </tr>
            ${accion ? `
            <tr>
              <td style="padding:0 28px 28px;">
                <a href="${accion.url}" style="display:inline-block;background:#8a4634;color:#ffffff;text-decoration:none;padding:12px 18px;font-weight:bold;font-size:14px;">
                  ${accion.texto}
                </a>
              </td>
            </tr>` : ''}
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

const enviarRecuperacionPassword = ({ email, nombre, resetUrl }) => enviarEmailTransaccional({
    to: { email, name: nombre },
    subject: 'Recuperacion de contrasena - Marvento Vermut',
    htmlContent: armarHtmlBase({
        titulo: 'Recupera tu contrasena',
        contenido: `
          <p>Hola ${escaparHtml(nombre)}, recibimos una solicitud para cambiar la contrasena de tu cuenta.</p>
          <p>El enlace estara disponible por 1 hora. Si no solicitaste este cambio, podes ignorar este email.</p>
        `,
        accion: {
            texto: 'Cambiar contrasena',
            url: resetUrl,
        },
    }),
    textContent: `Recibimos una solicitud para cambiar tu contrasena. Usa este enlace durante la proxima hora: ${resetUrl}`,
});

const enviarPasswordTemporal = ({ email, nombre, passwordTemporal }) => enviarEmailTransaccional({
    to: { email, name: nombre },
    subject: 'Nuevo acceso temporal - Marvento Vermut',
    htmlContent: armarHtmlBase({
        titulo: 'Nuevo acceso temporal',
        contenido: `
          <p>Hola ${escaparHtml(nombre)}, actualizamos tu acceso con una contrasena temporal.</p>
          <p>Contrasena temporal: <strong>${escaparHtml(passwordTemporal)}</strong></p>
          <p>Al ingresar, el sistema te pedira cambiarla.</p>
        `,
    }),
    textContent: `Tu contrasena temporal de Marvento Vermut es: ${passwordTemporal}. Al ingresar, el sistema te pedira cambiarla.`,
});

const enviarAltaUsuarioSistema = ({ email, nombre, passwordTemporal, rol }) => enviarEmailTransaccional({
    to: { email, name: nombre },
    subject: 'Tu acceso a Marvento Vermut',
    htmlContent: armarHtmlBase({
        titulo: 'Tu usuario ya esta activo',
        contenido: `
          <p>Hola ${escaparHtml(nombre)}, creamos tu usuario de acceso a Marvento Vermut.</p>
          <p>Rol asignado: <strong>${escaparHtml(rol)}</strong></p>
          <p>Email: <strong>${escaparHtml(email)}</strong></p>
          <p>Contrasena temporal: <strong>${escaparHtml(passwordTemporal)}</strong></p>
          <p>Al ingresar por primera vez, el sistema te pedira cambiar esta contrasena.</p>
        `,
        accion: {
            texto: 'Ingresar',
            url: normalizarTexto(process.env.FRONTEND_URL) || 'http://localhost:5173',
        },
    }),
    textContent: `Tu usuario de Marvento Vermut ya esta activo. Email: ${email}. Rol: ${rol}. Contrasena temporal: ${passwordTemporal}. Al ingresar por primera vez, el sistema te pedira cambiarla.`,
});

const enviarBienvenida = ({ email, nombre }) => enviarEmailTransaccional({
    to: { email, name: nombre },
    subject: 'Bienvenido a Marvento Vermut',
    htmlContent: armarHtmlBase({
        titulo: 'Bienvenido a Marvento Vermut',
        contenido: `
          <p>Hola ${escaparHtml(nombre)}, tu cuenta ya esta activa.</p>
          <p>Desde ahora podes ingresar y gestionar tus datos de acceso en la tienda de Marvento Vermut.</p>
        `,
    }),
    textContent: `Hola ${nombre || ''}, tu cuenta de Marvento Vermut ya esta activa.`,
});

module.exports = {
    enviarEmailTransaccional,
    enviarAltaUsuarioSistema,
    enviarRecuperacionPassword,
    enviarPasswordTemporal,
    enviarBienvenida,
};
