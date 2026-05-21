-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Habit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "objectiveId" TEXT,
    "name" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT '⭐',
    "color" TEXT NOT NULL DEFAULT '#6366f1',
    "frequencyType" TEXT NOT NULL DEFAULT 'daily',
    "frequencyValue" TEXT NOT NULL DEFAULT '',
    "type" TEXT NOT NULL DEFAULT 'bool',
    "targetValue" REAL NOT NULL DEFAULT 1,
    "unit" TEXT NOT NULL DEFAULT '次',
    "difficulty" TEXT NOT NULL DEFAULT 'easy',
    "reminderTime" TEXT,
    "stackAfter" TEXT,
    "reward" TEXT,
    "category" TEXT NOT NULL DEFAULT '基础认知',
    "kind" TEXT NOT NULL DEFAULT '实践',
    "priority" TEXT NOT NULL DEFAULT 'P1',
    "cadence" TEXT NOT NULL DEFAULT 'daily',
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archivedAt" DATETIME,
    CONSTRAINT "Habit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Habit_objectiveId_fkey" FOREIGN KEY ("objectiveId") REFERENCES "Objective" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Habit" ("archivedAt", "color", "createdAt", "difficulty", "frequencyType", "frequencyValue", "icon", "id", "name", "objectiveId", "reminderTime", "reward", "stackAfter", "targetValue", "type", "unit", "userId") SELECT "archivedAt", "color", "createdAt", "difficulty", "frequencyType", "frequencyValue", "icon", "id", "name", "objectiveId", "reminderTime", "reward", "stackAfter", "targetValue", "type", "unit", "userId" FROM "Habit";
DROP TABLE "Habit";
ALTER TABLE "new_Habit" RENAME TO "Habit";
CREATE INDEX "Habit_userId_idx" ON "Habit"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
