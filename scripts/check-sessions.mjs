import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()
const sessions = await db.clientSession.findMany()
console.log('ClientSessions in DB:', JSON.stringify(sessions, null, 2))
await db.$disconnect()
