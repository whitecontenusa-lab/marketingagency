import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const db = new PrismaClient()

// Use the proteinas session (has email) — attach it to a test credential
const SESSION_ID = 'cmm76uya9000jz2iczep0pgew'
const EMAIL = 'whitecontenusa@gmail.com'
const PASSWORD = 'test1234'

const passwordHash = await bcrypt.hash(PASSWORD, 10)

const user = await db.clientUser.upsert({
  where: { sessionId: SESSION_ID },
  update: { passwordHash },
  create: { email: EMAIL, passwordHash, sessionId: SESSION_ID, mustResetPwd: true },
})

console.log('ClientUser created:', user.id)
console.log('Login with:', EMAIL, '/', PASSWORD)
console.log('Portal URL: http://localhost:3001/cliente/portal/' + SESSION_ID)

await db.$disconnect()
