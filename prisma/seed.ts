import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash("humind2026", 10);

  const user = await db.user.upsert({
    where: { email: "admin@avilion.com" },
    update: { passwordHash: hash },
    create: {
      id: crypto.randomUUID(),
      email: "admin@avilion.com",
      name: "Admin Avilion",
      passwordHash: hash,
    },
  });

  console.log("✓ Admin user ready:", user.email);
  console.log("  Password: humind2026");
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
