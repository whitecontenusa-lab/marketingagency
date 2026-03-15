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

export async function sendMonthlyReport({
  to,
  clientName,
  brandName,
  reportContent,
  month,
  year,
  portalUrl,
  language = 'es',
}: {
  to: string
  clientName: string
  brandName: string
  reportContent: {
    headline: string
    summary: string
    achievements?: string[]
    nextMonthPreview?: string
    sections: { title: string; content: string }[]
  }
  month: number
  year: number
  portalUrl: string
  language?: 'es' | 'en'
}) {
  const monthName = new Date(year, month - 1).toLocaleString(
    language === 'en' ? 'en-US' : 'es-CO',
    { month: 'long' },
  )

  const subject = language === 'en'
    ? `Your monthly brand report — ${monthName} ${year}`
    : `Tu reporte mensual de marca — ${monthName} ${year}`

  const achievementsHtml = reportContent.achievements && reportContent.achievements.length > 0
    ? `
<p style="margin:0 0 8px;color:#71717a;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">
  ${language === 'en' ? 'Achievements' : 'Logros'}
</p>
<ul style="margin:0 0 24px;padding-left:0;list-style:none;">
  ${reportContent.achievements.map(a => `
  <li style="display:flex;align-items:flex-start;gap:8px;margin-bottom:8px;">
    <span style="color:#16a34a;font-size:14px;flex-shrink:0;margin-top:1px;">&#10003;</span>
    <span style="color:#3f3f46;font-size:14px;line-height:1.5;">${a}</span>
  </li>`).join('')}
</ul>`
    : ''

  const nextMonthHtml = reportContent.nextMonthPreview
    ? `
<div style="background:#f4f4f5;border-radius:10px;padding:20px 24px;margin-bottom:24px;">
  <p style="margin:0 0 8px;color:#71717a;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">
    ${language === 'en' ? 'What\'s Coming' : 'Lo Que Viene'}
  </p>
  <p style="margin:0;color:#3f3f46;font-size:14px;line-height:1.6;">${reportContent.nextMonthPreview}</p>
</div>`
    : ''

  const sectionsHtml = reportContent.sections.map(s => `
<h3 style="margin:0 0 8px;color:#18181b;font-size:15px;font-weight:600;">${s.title}</h3>
<p style="margin:0 0 20px;color:#52525b;font-size:14px;line-height:1.6;">${s.content}</p>`).join('')

  const html = language === 'en'
    ? `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e4e4e7;">

        <!-- Header -->
        <tr>
          <td style="background:#18181b;padding:32px 40px;">
            <p style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">Avilion</p>
            <p style="margin:6px 0 0;color:#a1a1aa;font-size:13px;">Monthly Brand Report — ${monthName} ${year}</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 40px;">
            <p style="margin:0 0 4px;color:#71717a;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Hi, ${clientName}</p>
            <p style="margin:0 0 20px;color:#18181b;font-size:22px;font-weight:700;line-height:1.3;">${reportContent.headline}</p>
            <p style="margin:0 0 28px;color:#52525b;font-size:14px;line-height:1.6;">${reportContent.summary}</p>

            ${achievementsHtml}
            ${nextMonthHtml}

            <hr style="border:none;border-top:1px solid #f4f4f5;margin:0 0 24px;">

            ${sectionsHtml}

            <!-- CTA -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;">
              <tr><td align="center">
                <a href="${portalUrl}" style="display:inline-block;background:#18181b;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:13px 32px;border-radius:10px;">
                  View my full strategy →
                </a>
              </td></tr>
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="border-top:1px solid #f4f4f5;padding:20px 40px;">
            <p style="margin:0;color:#a1a1aa;font-size:11px;">
              Monthly report for <strong>${brandName}</strong> — ${monthName} ${year}<br>
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
      <table width="100%" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e4e4e7;">

        <!-- Header -->
        <tr>
          <td style="background:#18181b;padding:32px 40px;">
            <p style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">Avilion</p>
            <p style="margin:6px 0 0;color:#a1a1aa;font-size:13px;">Reporte Mensual de Marca — ${monthName} ${year}</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 40px;">
            <p style="margin:0 0 4px;color:#71717a;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Hola, ${clientName}</p>
            <p style="margin:0 0 20px;color:#18181b;font-size:22px;font-weight:700;line-height:1.3;">${reportContent.headline}</p>
            <p style="margin:0 0 28px;color:#52525b;font-size:14px;line-height:1.6;">${reportContent.summary}</p>

            ${achievementsHtml}
            ${nextMonthHtml}

            <hr style="border:none;border-top:1px solid #f4f4f5;margin:0 0 24px;">

            ${sectionsHtml}

            <!-- CTA -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;">
              <tr><td align="center">
                <a href="${portalUrl}" style="display:inline-block;background:#18181b;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:13px 32px;border-radius:10px;">
                  Ver mi estrategia completa →
                </a>
              </td></tr>
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="border-top:1px solid #f4f4f5;padding:20px 40px;">
            <p style="margin:0;color:#a1a1aa;font-size:11px;">
              Reporte mensual para <strong>${brandName}</strong> — ${monthName} ${year}<br>
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

export async function sendContentCycleEmail({
  to,
  clientName,
  cycleNumber,
  deliveryDate,
  portalUrl,
  language = 'es',
}: {
  to: string
  clientName: string
  cycleNumber: number
  deliveryDate: Date
  portalUrl: string
  language?: 'es' | 'en'
}) {
  const dateFormatted = deliveryDate.toLocaleDateString(language === 'en' ? 'en-US' : 'es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const subject = language === 'en'
    ? `Your 30 monthly content pieces are ready — Avilion`
    : `Tus 30 contenidos del mes están listos — Avilion`

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
              Your <strong>30 content pieces for cycle #${cycleNumber}</strong> are ready and available in your portal. They've been crafted based on your approved brand strategy and are ready to publish.
            </p>

            <!-- Info box -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;border-radius:10px;margin-bottom:28px;">
              <tr><td style="padding:20px 24px;">
                <p style="margin:0 0 12px;color:#71717a;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Content cycle details</p>
                <table cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="color:#71717a;font-size:13px;padding-bottom:6px;padding-right:16px;">Cycle</td>
                    <td style="color:#18181b;font-size:13px;font-weight:500;padding-bottom:6px;">#${cycleNumber}</td>
                  </tr>
                  <tr>
                    <td style="color:#71717a;font-size:13px;padding-right:16px;">Pieces</td>
                    <td style="color:#18181b;font-size:13px;font-weight:700;">30 pieces ready</td>
                  </tr>
                  <tr>
                    <td style="color:#71717a;font-size:13px;padding-right:16px;padding-top:6px;">Available from</td>
                    <td style="color:#18181b;font-size:13px;font-weight:500;padding-top:6px;">${dateFormatted}</td>
                  </tr>
                </table>
              </td></tr>
            </table>

            <!-- CTA -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr><td align="center">
                <a href="${portalUrl}" style="display:inline-block;background:#18181b;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:13px 32px;border-radius:10px;">
                  View my content →
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
              Tus <strong>30 piezas de contenido del ciclo #${cycleNumber}</strong> están listas y disponibles en tu portal. Fueron creadas con base en tu estrategia de marca aprobada y están listas para publicar.
            </p>

            <!-- Info box -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;border-radius:10px;margin-bottom:28px;">
              <tr><td style="padding:20px 24px;">
                <p style="margin:0 0 12px;color:#71717a;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Detalles del ciclo de contenido</p>
                <table cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="color:#71717a;font-size:13px;padding-bottom:6px;padding-right:16px;">Ciclo</td>
                    <td style="color:#18181b;font-size:13px;font-weight:500;padding-bottom:6px;">#${cycleNumber}</td>
                  </tr>
                  <tr>
                    <td style="color:#71717a;font-size:13px;padding-right:16px;">Piezas</td>
                    <td style="color:#18181b;font-size:13px;font-weight:700;">30 piezas listas</td>
                  </tr>
                  <tr>
                    <td style="color:#71717a;font-size:13px;padding-right:16px;padding-top:6px;">Disponibles desde</td>
                    <td style="color:#18181b;font-size:13px;font-weight:500;padding-top:6px;">${dateFormatted}</td>
                  </tr>
                </table>
              </td></tr>
            </table>

            <!-- CTA -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr><td align="center">
                <a href="${portalUrl}" style="display:inline-block;background:#18181b;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:13px 32px;border-radius:10px;">
                  Ver mi contenido →
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
