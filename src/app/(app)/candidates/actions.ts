'use server'

import { CandidateStatus, Role, RefereeStatus } from '@prisma/client'
import { z } from 'zod'
import { randomBytes } from 'crypto'
import { requireRole } from '@/lib/auth/utils'
import { scopedDb } from '@/lib/db/scoped'
import { logAudit } from '@/lib/db/audit'
import { Prisma } from '@prisma/client'
import { sendEmail } from '@/lib/email'

const PAGE_SIZE = 25

const candidateListSchema = z.object({
  page: z.number().int().min(1).default(1),
  search: z.string().optional(),
  status: z.nativeEnum(CandidateStatus).optional(),
  sortBy: z.enum(['createdAt', 'lastName', 'roleTitle']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

const candidateSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email().max(255),
  phone: z.string().max(50).optional().or(z.literal('')),
  roleTitle: z.string().min(1).max(200),
  notes: z.string().max(2000).optional().or(z.literal('')),
  templateId: z.string().cuid(),
})

const candidateIdSchema = z.object({
  id: z.string().cuid(),
})

const refereeSchema = z.object({
  candidateId: z.string().cuid(),
  name: z.string().min(1).max(200),
  email: z.string().email().max(255),
  relationship: z.string().min(1).max(200),
})

const refereeIdSchema = z.object({
  id: z.string().cuid(),
})

export async function listCandidates(input: z.infer<typeof candidateListSchema>) {
  const { tenantId, trueActorId } = await requireRole([Role.ORG_ADMIN, Role.RECRUITER])
  const parsed = candidateListSchema.safeParse(input)
  if (!parsed.success) return { error: 'Invalid filter parameters' }

  const { page, search, status, sortBy, sortOrder } = parsed.data
  const skip = (page - 1) * PAGE_SIZE

  const where: Prisma.CandidateWhereInput = { tenantId }
  if (status) where.status = status
  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: 'insensitive' } },
      { lastName: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ]
  }

  const db = scopedDb(tenantId)
  const [candidates, total] = await Promise.all([
    db.candidate.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: PAGE_SIZE,
      include: { questionnaire: { select: { frozenAt: true } } },
    }),
    db.candidate.count({ where }),
  ])

  await logAudit({
    tenantId,
    actorUserId: trueActorId,
    action: 'CANDIDATE_LIST',
    targetType: 'tenant',
    targetId: tenantId,
  })

  return { candidates, total, pageCount: Math.ceil(total / PAGE_SIZE) }
}

export async function createCandidate(input: z.infer<typeof candidateSchema>) {
  const { tenantId, trueActorId } = await requireRole([Role.ORG_ADMIN, Role.RECRUITER])
  const parsed = candidateSchema.safeParse(input)
  if (!parsed.success) return { error: 'Invalid input' }

  const db = scopedDb(tenantId)
  const template = await db.questionnaireTemplate.findUnique({
    where: { id: parsed.data.templateId, tenantId },
    include: {
      items: {
        orderBy: { order: 'asc' },
        include: { template: true },
      },
    },
  })

  if (!template) return { error: 'Template not found' }
  if (template.isArchived) return { error: 'Cannot use an archived template' }

  const snapshot = {
    templateId: template.id,
    templateName: template.name,
    roleCategory: template.roleCategory,
    description: template.description,
    frozenAt: new Date().toISOString(),
    items: template.items.map((item: { template: { id: string; text: string; helpText: string | null; category: string }; order: number }) => ({
      questionId: item.template.id,
      text: item.template.text,
      helpText: item.template.helpText,
      category: item.template.category,
      order: item.order,
    })),
  }

  const candidate = await db.candidate.create({
    data: {
      tenantId,
      createdByUserId: trueActorId,
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      email: parsed.data.email,
      phone: parsed.data.phone || null,
      roleTitle: parsed.data.roleTitle,
      notes: parsed.data.notes || null,
      questionnaire: {
        create: {
          tenantId,
          templateSnapshot: snapshot as Prisma.InputJsonValue,
        },
      },
    },
    include: { questionnaire: true },
  })

  await logAudit({
    tenantId,
    actorUserId: trueActorId,
    action: 'CANDIDATE_CREATE',
    targetType: 'candidate',
    targetId: candidate.id,
    metadata: { templateId: template.id },
  })

  return { candidate }
}

export async function getCandidate(input: z.infer<typeof candidateIdSchema>) {
  const { tenantId, trueActorId } = await requireRole([Role.ORG_ADMIN, Role.RECRUITER])
  const parsed = candidateIdSchema.safeParse(input)
  if (!parsed.success) return { error: 'Invalid input' }

  const db = scopedDb(tenantId)
  const candidate = await db.candidate.findUnique({
    where: { id: parsed.data.id },
    include: {
      questionnaire: true,
      createdBy: { select: { name: true, email: true } },
      referees: {
        orderBy: { invitedAt: 'desc' },
      },
      _count: { select: { referees: true } },
    },
  })

  if (!candidate) return { error: 'Candidate not found' }

  return { candidate }
}

export async function updateCandidateStatus(
  input: { id: string; status: CandidateStatus }
) {
  const { tenantId, trueActorId } = await requireRole([Role.ORG_ADMIN, Role.RECRUITER])
  const parsed = z
    .object({ id: z.string().cuid(), status: z.nativeEnum(CandidateStatus) })
    .safeParse(input)
  if (!parsed.success) return { error: 'Invalid input' }

  const db = scopedDb(tenantId)
  const candidate = await db.candidate.update({
    where: { id: parsed.data.id },
    data: { status: parsed.data.status },
  })

  await logAudit({
    tenantId,
    actorUserId: trueActorId,
    action: 'CANDIDATE_STATUS_UPDATE',
    targetType: 'candidate',
    targetId: candidate.id,
    metadata: { status: parsed.data.status },
  })

  return { candidate }
}

export async function addReferee(input: z.infer<typeof refereeSchema>) {
  const { tenantId, trueActorId } = await requireRole([Role.ORG_ADMIN, Role.RECRUITER])
  const parsed = refereeSchema.safeParse(input)
  if (!parsed.success) return { error: 'Invalid input' }

  const db = scopedDb(tenantId)
  const candidate = await db.candidate.findUnique({
    where: { id: parsed.data.candidateId },
  })
  if (!candidate) return { error: 'Candidate not found' }
  if (candidate.status !== 'ACTIVE') return { error: 'Candidate is not active' }

  const inviteToken = randomBytes(32).toString('base64url')
  const referee = await db.referee.create({
    data: {
      tenantId,
      candidateId: parsed.data.candidateId,
      name: parsed.data.name,
      email: parsed.data.email,
      relationship: parsed.data.relationship,
      inviteToken,
    },
  })

  const formUrl = `${process.env.NEXTAUTH_URL}/r/${inviteToken}`
  await sendEmail({
    to: referee.email,
    subject: `Reference request for ${candidate.firstName} ${candidate.lastName}`,
    html: `<p>Hi ${referee.name},</p><p>You have been invited to provide a reference for ${candidate.firstName} ${candidate.lastName}.</p><p><a href="${formUrl}">Submit your reference</a></p>`,
    text: `Hi ${referee.name},\n\nYou have been invited to provide a reference for ${candidate.firstName} ${candidate.lastName}.\n\nSubmit here: ${formUrl}`,
    category: 'referee-invite',
    tenantId,
  })

  await logAudit({
    tenantId,
    actorUserId: trueActorId,
    action: 'REFEREE_INVITE',
    targetType: 'referee',
    targetId: referee.id,
  })

  return { referee }
}

export async function remindReferee(input: z.infer<typeof refereeIdSchema>) {
  const { tenantId, trueActorId } = await requireRole([Role.ORG_ADMIN, Role.RECRUITER])
  const parsed = refereeIdSchema.safeParse(input)
  if (!parsed.success) return { error: 'Invalid input' }

  const db = scopedDb(tenantId)
  const referee = await db.referee.findUnique({
    where: { id: parsed.data.id },
    include: { candidate: true },
  })
  if (!referee) return { error: 'Referee not found' }
  if (referee.status === RefereeStatus.REVOKED) return { error: 'Referee has been revoked' }
  if (referee.status === RefereeStatus.SUBMITTED) return { error: 'Referee already submitted' }

  const cooldownHours = 24
  const now = new Date()
  if (referee.lastReminderAt) {
    const hoursSince = (now.getTime() - referee.lastReminderAt.getTime()) / (1000 * 60 * 60)
    if (hoursSince < cooldownHours) {
      const remaining = Math.ceil(cooldownHours - hoursSince)
      return { error: `Reminder cooldown: ${remaining} hours remaining` }
    }
  }

  const updated = await db.referee.update({
    where: { id: parsed.data.id },
    data: {
      status: RefereeStatus.REMINDED,
      remindedAt: now,
      lastReminderAt: now,
    },
  })

  const formUrl = `${process.env.NEXTAUTH_URL}/r/${referee.inviteToken}`
  await sendEmail({
    to: referee.email,
    subject: `Reminder: Reference request for ${referee.candidate.firstName} ${referee.candidate.lastName}`,
    html: `<p>Hi ${referee.name},</p><p>This is a friendly reminder to submit your reference for ${referee.candidate.firstName} ${referee.candidate.lastName}.</p><p><a href="${formUrl}">Submit your reference</a></p>`,
    text: `Hi ${referee.name},\n\nThis is a friendly reminder to submit your reference for ${referee.candidate.firstName} ${referee.candidate.lastName}.\n\nSubmit here: ${formUrl}`,
    category: 'referee-reminder',
    tenantId,
  })

  await logAudit({
    tenantId,
    actorUserId: trueActorId,
    action: 'REFEREE_REMIND',
    targetType: 'referee',
    targetId: referee.id,
  })

  return { referee: updated }
}

export async function revokeReferee(input: z.infer<typeof refereeIdSchema>) {
  const { tenantId, trueActorId } = await requireRole([Role.ORG_ADMIN, Role.RECRUITER])
  const parsed = refereeIdSchema.safeParse(input)
  if (!parsed.success) return { error: 'Invalid input' }

  const db = scopedDb(tenantId)
  const referee = await db.referee.update({
    where: { id: parsed.data.id },
    data: { status: RefereeStatus.REVOKED },
  })

  await logAudit({
    tenantId,
    actorUserId: trueActorId,
    action: 'REFEREE_REVOKE',
    targetType: 'referee',
    targetId: referee.id,
  })

  return { referee }
}

const csvRowSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().max(50).optional(),
  roleTitle: z.string().min(1),
  templateName: z.string().min(1),
})

export async function bulkImportCandidates(
  input: { rows: z.infer<typeof csvRowSchema>[] }
) {
  const { tenantId, trueActorId } = await requireRole([Role.ORG_ADMIN, Role.RECRUITER])
  const parsed = z.object({ rows: z.array(csvRowSchema) }).safeParse(input)
  if (!parsed.success) return { error: 'Invalid CSV data' }

  const db = scopedDb(tenantId)

  const results: {
    success: number
    failed: number
    errors: { row: number; message: string }[]
  } = { success: 0, failed: 0, errors: [] }

  for (let i = 0; i < parsed.data.rows.length; i++) {
    const row = parsed.data.rows[i]
    try {
      const template = await db.questionnaireTemplate.findFirst({
        where: { tenantId, name: row.templateName, isArchived: false },
        include: {
          items: {
            orderBy: { order: 'asc' },
            include: { template: true },
          },
        },
      })

      if (!template) {
        results.failed++
        results.errors.push({ row: i + 1, message: `Template not found: ${row.templateName}` })
        continue
      }

      const snapshot = {
        templateId: template.id,
        templateName: template.name,
        roleCategory: template.roleCategory,
        description: template.description,
        frozenAt: new Date().toISOString(),
        items: template.items.map((item: { template: { id: string; text: string; helpText: string | null; category: string }; order: number }) => ({
          questionId: item.template.id,
          text: item.template.text,
          helpText: item.template.helpText,
          category: item.template.category,
          order: item.order,
        })),
      }

      await db.candidate.create({
        data: {
          tenantId,
          createdByUserId: trueActorId,
          firstName: row.firstName,
          lastName: row.lastName,
          email: row.email,
          phone: row.phone || null,
          roleTitle: row.roleTitle,
          questionnaire: {
            create: {
              tenantId,
              templateSnapshot: snapshot as Prisma.InputJsonValue,
            },
          },
        },
      })

      results.success++
    } catch (e) {
      results.failed++
      results.errors.push({ row: i + 1, message: e instanceof Error ? e.message : 'Unknown error' })
    }
  }

  await logAudit({
    tenantId,
    actorUserId: trueActorId,
    action: 'CANDIDATE_BULK_IMPORT',
    targetType: 'tenant',
    targetId: tenantId,
    metadata: { success: results.success, failed: results.failed },
  })

  return { results }
}
