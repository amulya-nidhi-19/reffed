-- CreateEnum
CREATE TYPE "CandidateStatus" AS ENUM ('ACTIVE', 'ARCHIVED', 'DELETED_DPDP');

-- CreateEnum
CREATE TYPE "RefereeStatus" AS ENUM ('INVITED', 'REMINDED', 'SUBMITTED', 'REVOKED');

-- CreateTable
CREATE TABLE "Candidate" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "roleTitle" TEXT NOT NULL,
    "notes" TEXT,
    "status" "CandidateStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Candidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CandidateQuestionnaire" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "frozenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "templateSnapshot" JSONB NOT NULL,

    CONSTRAINT "CandidateQuestionnaire_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Referee" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "relationship" TEXT NOT NULL,
    "inviteToken" TEXT NOT NULL,
    "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "remindedAt" TIMESTAMP(3),
    "lastReminderAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "status" "RefereeStatus" NOT NULL DEFAULT 'INVITED',

    CONSTRAINT "Referee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefereeResponse" (
    "id" TEXT NOT NULL,
    "refereeId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "questionTextSnapshot" TEXT NOT NULL,
    "answerText" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefereeResponse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Candidate_tenantId_idx" ON "Candidate"("tenantId");

-- CreateIndex
CREATE INDEX "Candidate_status_idx" ON "Candidate"("status");

-- CreateIndex
CREATE INDEX "Candidate_email_idx" ON "Candidate"("email");

-- CreateIndex
CREATE UNIQUE INDEX "CandidateQuestionnaire_candidateId_key" ON "CandidateQuestionnaire"("candidateId");

-- CreateIndex
CREATE INDEX "CandidateQuestionnaire_tenantId_idx" ON "CandidateQuestionnaire"("tenantId");

-- CreateIndex
CREATE INDEX "CandidateQuestionnaire_candidateId_idx" ON "CandidateQuestionnaire"("candidateId");

-- CreateIndex
CREATE UNIQUE INDEX "Referee_inviteToken_key" ON "Referee"("inviteToken");

-- CreateIndex
CREATE INDEX "Referee_tenantId_idx" ON "Referee"("tenantId");

-- CreateIndex
CREATE INDEX "Referee_candidateId_idx" ON "Referee"("candidateId");

-- CreateIndex
CREATE INDEX "Referee_inviteToken_idx" ON "Referee"("inviteToken");

-- CreateIndex
CREATE INDEX "Referee_status_idx" ON "Referee"("status");

-- CreateIndex
CREATE INDEX "RefereeResponse_tenantId_idx" ON "RefereeResponse"("tenantId");

-- CreateIndex
CREATE INDEX "RefereeResponse_refereeId_idx" ON "RefereeResponse"("refereeId");

-- CreateIndex
CREATE INDEX "RefereeResponse_questionId_idx" ON "RefereeResponse"("questionId");

-- AddForeignKey
ALTER TABLE "Candidate" ADD CONSTRAINT "Candidate_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Candidate" ADD CONSTRAINT "Candidate_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateQuestionnaire" ADD CONSTRAINT "CandidateQuestionnaire_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateQuestionnaire" ADD CONSTRAINT "CandidateQuestionnaire_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referee" ADD CONSTRAINT "Referee_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referee" ADD CONSTRAINT "Referee_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefereeResponse" ADD CONSTRAINT "RefereeResponse_refereeId_fkey" FOREIGN KEY ("refereeId") REFERENCES "Referee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefereeResponse" ADD CONSTRAINT "RefereeResponse_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
