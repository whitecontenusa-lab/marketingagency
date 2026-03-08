-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_EmotionalCheckin" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',
    "triggeredBy" TEXT NOT NULL DEFAULT 'manual',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EmotionalCheckin_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_EmotionalCheckin" ("clientId", "createdAt", "id", "level", "notes", "triggeredBy") SELECT "clientId", "createdAt", "id", "level", "notes", "triggeredBy" FROM "EmotionalCheckin";
DROP TABLE "EmotionalCheckin";
ALTER TABLE "new_EmotionalCheckin" RENAME TO "EmotionalCheckin";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
