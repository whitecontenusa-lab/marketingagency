/**
 * One-time seed: create the default Avilion workspace and assign all existing
 * Users and OnboardingSessions that have no workspaceId yet.
 */
import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

async function main() {
  // Create (or find) the default Avilion workspace
  let workspace = await db.workspace.findUnique({ where: { slug: 'avilion' } })
  if (!workspace) {
    workspace = await db.workspace.create({
      data: {
        name: 'Avilion',
        slug: 'avilion',
        plan: 'agency',
        planMaxClients: 999,
        primaryColor: '#18181b',
      },
    })
    console.log('✅ Created workspace: Avilion (id:', workspace.id, ')')
  } else {
    console.log('ℹ Workspace already exists:', workspace.id)
  }

  // Backfill Users
  const usersUpdated = await db.user.updateMany({
    where: { workspaceId: null },
    data: { workspaceId: workspace.id },
  })
  console.log(`✅ Backfilled ${usersUpdated.count} user(s)`)

  // Backfill OnboardingSessions
  const sessionsUpdated = await db.onboardingSession.updateMany({
    where: { workspaceId: null },
    data: { workspaceId: workspace.id },
  })
  console.log(`✅ Backfilled ${sessionsUpdated.count} onboarding session(s)`)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => db.$disconnect())
