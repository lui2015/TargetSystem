-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Objective" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "cycle" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "parentObjectiveId" TEXT,
    "wish" TEXT,
    "outcome" TEXT,
    "obstacle" TEXT,
    "plan" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Objective_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Objective_parentObjectiveId_fkey" FOREIGN KEY ("parentObjectiveId") REFERENCES "Objective" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Objective" ("category", "createdAt", "cycle", "endDate", "id", "obstacle", "outcome", "plan", "startDate", "status", "title", "userId", "wish") SELECT "category", "createdAt", "cycle", "endDate", "id", "obstacle", "outcome", "plan", "startDate", "status", "title", "userId", "wish" FROM "Objective";
DROP TABLE "Objective";
ALTER TABLE "new_Objective" RENAME TO "Objective";
CREATE INDEX "Objective_userId_idx" ON "Objective"("userId");
CREATE INDEX "Objective_parentObjectiveId_idx" ON "Objective"("parentObjectiveId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
