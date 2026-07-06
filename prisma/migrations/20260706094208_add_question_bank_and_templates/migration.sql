-- CreateEnum
CREATE TYPE "QuestionCategory" AS ENUM ('WORK_STYLE', 'COLLABORATION', 'IMPACT', 'LEADERSHIP', 'INTEGRITY', 'OTHER');

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "helpText" TEXT,
    "category" "QuestionCategory" NOT NULL,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionnaireTemplate" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "roleCategory" TEXT NOT NULL,
    "description" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuestionnaireTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionnaireTemplateItem" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "QuestionnaireTemplateItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Question_tenantId_idx" ON "Question"("tenantId");

-- CreateIndex
CREATE INDEX "Question_category_idx" ON "Question"("category");

-- CreateIndex
CREATE INDEX "Question_isArchived_idx" ON "Question"("isArchived");

-- CreateIndex
CREATE INDEX "QuestionnaireTemplate_tenantId_idx" ON "QuestionnaireTemplate"("tenantId");

-- CreateIndex
CREATE INDEX "QuestionnaireTemplate_isArchived_idx" ON "QuestionnaireTemplate"("isArchived");

-- CreateIndex
CREATE INDEX "QuestionnaireTemplateItem_templateId_idx" ON "QuestionnaireTemplateItem"("templateId");

-- CreateIndex
CREATE INDEX "QuestionnaireTemplateItem_questionId_idx" ON "QuestionnaireTemplateItem"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "QuestionnaireTemplateItem_templateId_questionId_key" ON "QuestionnaireTemplateItem"("templateId", "questionId");

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionnaireTemplate" ADD CONSTRAINT "QuestionnaireTemplate_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionnaireTemplateItem" ADD CONSTRAINT "QuestionnaireTemplateItem_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionnaireTemplateItem" ADD CONSTRAINT "QuestionnaireTemplateItem_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "QuestionnaireTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
