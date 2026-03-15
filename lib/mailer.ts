import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT ?? 465),
  secure: true, // port 465 SSL
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

export async function sendClientCredentials({
  to,
  clientName,
  brandName,
  password,
  portalUrl,
  language = 'es',
}: {
  to: string
  clientName: string
  brandName: string
  password: string
  portalUrl: string
  language?: 'es' | 'en'
}) {
  const displayName = brandName || clientName

  const subject = language === 'en'
    ? `Your brand strategy is ready — ${displayName}`
    : `Tu estrategia de marca está lista — ${displayName}`

  const html = language === 'en'
    ? `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e4e4e7;">

        <!-- Header -->
        <tr>
          <td style="background:#18181b;padding:32px 40px;">
            <p style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">Avilion</p>
            <p style="margin:6px 0 0;color:#a1a1aa;font-size:13px;">Strategic Marketing Ecosystem</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 40px;">
            <p style="margin:0 0 8px;color:#18181b;font-size:18px;font-weight:600;">Hi, ${clientName} 👋</p>
            <p style="margin:0 0 24px;color:#52525b;font-size:14px;line-height:1.6;">
              Your brand strategy for <strong>${displayName}</strong> has been reviewed and approved by the Avilion team. You can now access your exclusive portal.
            </p>

            <!-- Credentials box -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;border-radius:10px;margin-bottom:28px;">
              <tr><td style="padding:20px 24px;">
                <p style="margin:0 0 12px;color:#71717a;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Your access credentials</p>
                <table cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="color:#71717a;font-size:13px;padding-bottom:6px;padding-right:16px;">Email</td>
                    <td style="color:#18181b;font-size:13px;font-weight:500;font-family:monospace;padding-bottom:6px;">${to}</td>
                  </tr>
                  <tr>
                    <td style="color:#71717a;font-size:13px;padding-right:16px;">Password</td>
                    <td style="color:#18181b;font-size:13px;font-weight:700;font-family:monospace;">${password}</td>
                  </tr>
                </table>
              </td></tr>
            </table>

            <!-- CTA -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr><td align="center">
                <a href="${portalUrl}" style="display:inline-block;background:#18181b;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:13px 32px;border-radius:10px;">
                  Access my strategy →
                </a>
              </td></tr>
            </table>

            <p style="margin:24px 0 0;color:#a1a1aa;font-size:12px;line-height:1.6;text-align:center;">
              Or copy this link into your browser:<br>
              <span style="color:#52525b;font-family:monospace;">${portalUrl}</span>
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="border-top:1px solid #f4f4f5;padding:20px 40px;">
            <p style="margin:0;color:#a1a1aa;font-size:11px;">
              This email contains confidential information.<br>
              © Avilion — <a href="https://avilion.io" style="color:#a1a1aa;">avilion.io</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
    `.trim()
    : `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e4e4e7;">

        <!-- Header -->
        <tr>
          <td style="background:#18181b;padding:32px 40px;">
            <p style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">Avilion</p>
            <p style="margin:6px 0 0;color:#a1a1aa;font-size:13px;">Ecosistema de Marketing Estratégico</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 40px;">
            <p style="margin:0 0 8px;color:#18181b;font-size:18px;font-weight:600;">Hola, ${clientName} 👋</p>
            <p style="margin:0 0 24px;color:#52525b;font-size:14px;line-height:1.6;">
              Tu estrategia de marca para <strong>${displayName}</strong> ha sido revisada y aprobada por el equipo de Avilion. Ya puedes acceder a tu portal exclusivo.
            </p>

            <!-- Credentials box -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;border-radius:10px;margin-bottom:28px;">
              <tr><td style="padding:20px 24px;">
                <p style="margin:0 0 12px;color:#71717a;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Tus credenciales de acceso</p>
                <table cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="color:#71717a;font-size:13px;padding-bottom:6px;padding-right:16px;">Email</td>
                    <td style="color:#18181b;font-size:13px;font-weight:500;font-family:monospace;padding-bottom:6px;">${to}</td>
                  </tr>
                  <tr>
                    <td style="color:#71717a;font-size:13px;padding-right:16px;">Contraseña</td>
                    <td style="color:#18181b;font-size:13px;font-weight:700;font-family:monospace;">${password}</td>
                  </tr>
                </table>
              </td></tr>
            </table>

            <!-- CTA -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr><td align="center">
                <a href="${portalUrl}" style="display:inline-block;background:#18181b;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:13px 32px;border-radius:10px;">
                  Acceder a mi estrategia →
                </a>
              </td></tr>
            </table>

            <p style="margin:24px 0 0;color:#a1a1aa;font-size:12px;line-height:1.6;text-align:center;">
              O copia este enlace en tu navegador:<br>
              <span style="color:#52525b;font-family:monospace;">${portalUrl}</span>
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="border-top:1px solid #f4f4f5;padding:20px 40px;">
            <p style="margin:0;color:#a1a1aa;font-size:11px;">
              Este correo es confidencial. Si no esperabas este mensaje, ignóralo.<br>
              © Avilion — <a href="https://avilion.io" style="color:#a1a1aa;">avilion.io</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
    `.trim()

  await transporter.sendMail({
    from: `"Avilion" <${process.env.SMTP_USER}>`,
    to,
    subject,
    html,
  })
}
