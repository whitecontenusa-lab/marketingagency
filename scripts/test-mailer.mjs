import nodemailer from 'nodemailer'
import 'dotenv/config'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

console.log('Verifying SMTP connection...')
await transporter.verify()
console.log('✅ SMTP connection OK')

console.log('Sending test email to', process.env.SMTP_USER)
await transporter.sendMail({
  from: `"Avilion Test" <${process.env.SMTP_USER}>`,
  to: process.env.SMTP_USER,
  subject: 'Test SMTP — Avilion Portal',
  text: 'Si recibes este correo, el SMTP de Hostinger está configurado correctamente.',
})
console.log('✅ Test email sent')
