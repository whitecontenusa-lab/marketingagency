import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const db = new PrismaClient()

async function main() {
  const hash = await bcrypt.hash('avilion2026!', 12)
  await db.user.upsert({
    where: { email: 'team@avilion.co' },
    update: {},
    create: {
      email: 'team@avilion.co',
      name: 'Avilion Team',
      passwordHash: hash,
    },
  })
  console.log('✓ Seed complete')
}

main().finally(() => db.$disconnect())
