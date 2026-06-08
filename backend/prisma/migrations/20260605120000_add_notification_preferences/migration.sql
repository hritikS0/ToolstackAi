-- CreateTable
CREATE TABLE "NotificationPreferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "reminderNotifications" BOOLEAN NOT NULL DEFAULT true,
    "taskNotifications" BOOLEAN NOT NULL DEFAULT true,
    "goalNotifications" BOOLEAN NOT NULL DEFAULT true,
    "habitNotifications" BOOLEAN NOT NULL DEFAULT true,
    "browserNotifications" BOOLEAN NOT NULL DEFAULT false,
    "dailyBriefingEnabled" BOOLEAN NOT NULL DEFAULT true,
    "dailyBriefingTime" TEXT NOT NULL DEFAULT '08:00',
    "quietHoursEnabled" BOOLEAN NOT NULL DEFAULT false,
    "quietHoursStart" TEXT NOT NULL DEFAULT '22:00',
    "quietHoursEnd" TEXT NOT NULL DEFAULT '08:00',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationPreferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NotificationPreferences_userId_key" ON "NotificationPreferences"("userId");

-- AddForeignKey
ALTER TABLE "NotificationPreferences" ADD CONSTRAINT "NotificationPreferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
