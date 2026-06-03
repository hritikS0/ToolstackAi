-- AlterTable
ALTER TABLE "Message" ADD COLUMN "chatMediaId" TEXT;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_chatMediaId_fkey" FOREIGN KEY ("chatMediaId") REFERENCES "ChatMedia"("id") ON DELETE SET NULL ON UPDATE CASCADE;
