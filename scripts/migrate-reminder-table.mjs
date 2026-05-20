/**
 * One-time SQLite fix: old Reminder table lacked scheduledFor + status (Prisma schema drift).
 * Run: npx tsx --env-file=.env scripts/migrate-reminder-table.mjs
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const cols = await prisma.$queryRaw`PRAGMA table_info('Reminder');`;
  const names = cols.map((c) => c.name);
  if (names.includes('scheduledFor') && names.includes('status')) {
    console.log('Reminder table already matches schema. Nothing to do.');
    return;
  }

  console.log('Migrating Reminder table to add scheduledFor + status...');

  await prisma.$executeRawUnsafe(`
    CREATE TABLE "Reminder_new" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "assignmentId" TEXT NOT NULL,
      "reminderType" TEXT NOT NULL,
      "message" TEXT NOT NULL,
      "scheduledFor" DATETIME NOT NULL,
      "sentAt" DATETIME,
      "status" TEXT NOT NULL DEFAULT 'pending'
    );
  `);

  await prisma.$executeRawUnsafe(`
    INSERT INTO "Reminder_new" ("id", "assignmentId", "reminderType", "message", "scheduledFor", "sentAt", "status")
    SELECT "id", "assignmentId", "reminderType", "message", "sentAt", "sentAt", 'sent'
    FROM "Reminder";
  `);

  await prisma.$executeRawUnsafe(`DROP TABLE "Reminder";`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "Reminder_new" RENAME TO "Reminder";`);

  console.log('Done. Run: npx prisma generate (if needed), then npm run bot');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
