'use server'

import { QuestionCategory, Role } from '@prisma/client'
import { z } from 'zod'
import { requireRole } from '@/lib/auth/utils'
import { scopedDb } from '@/lib/db/scoped'
import { logAudit } from '@/lib/db/audit'
import { Prisma } from '@prisma/client'

const PAGE_SIZE = 25

const questionSchema = z.object({
  text: z.string().min(1).max(2000),
  helpText: z.string().max(2000).optional().or(z.literal('')),
  category: z.nativeEnum(QuestionCategory),
})

const listSchema = z.object({
  page: z.number().int().min(1).default(1),
  search: z.string().optional(),
  category: z.nativeEnum(QuestionCategory).optional(),
  includeArchived: z.boolean().default(false),
  sortBy: z.enum(['createdAt', 'category', 'text']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

const idSchema = z.object({
  id: z.string().cuid(),
})

export async function listQuestions(input: z.infer<typeof listSchema>) {
  const { tenantId, trueActorId } = await requireRole([Role.ORG_ADMIN, Role.RECRUITER])
  const parsed = listSchema.safeParse(input)
  if (!parsed.success) return { error: 'Invalid filter parameters' }

  const { page, search, category, includeArchived, sortBy, sortOrder } = parsed.data
  const skip = (page - 1) * PAGE_SIZE

  const where: Prisma.QuestionWhereInput = { tenantId }
  if (!includeArchived) where.isArchived = false
  if (category) where.category = category
  if (search) {
    where.text = { contains: search, mode: 'insensitive' }
  }

  const db = scopedDb(tenantId)
  const [questions, total] = await Promise.all([
    db.question.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: PAGE_SIZE,
    }),
    db.question.count({ where }),
  ])

  await logAudit({
    tenantId,
    actorUserId: trueActorId,
    action: 'QUESTION_LIST',
    targetType: 'tenant',
    targetId: tenantId,
  })

  return { questions, total, pageCount: Math.ceil(total / PAGE_SIZE) }
}

export async function createQuestion(input: z.infer<typeof questionSchema>) {
  const { tenantId, trueActorId } = await requireRole([Role.ORG_ADMIN])
  const parsed = questionSchema.safeParse(input)
  if (!parsed.success) return { error: 'Invalid input' }

  const db = scopedDb(tenantId)
  const question = await db.question.create({
    data: {
      tenantId,
      text: parsed.data.text,
      helpText: parsed.data.helpText || null,
      category: parsed.data.category,
      createdBy: trueActorId,
    },
  })

  await logAudit({
    tenantId,
    actorUserId: trueActorId,
    action: 'QUESTION_CREATE',
    targetType: 'question',
    targetId: question.id,
    metadata: { category: question.category },
  })

  return { question }
}

export async function updateQuestion(input: { id: string } & z.infer<typeof questionSchema>) {
  const { tenantId, trueActorId } = await requireRole([Role.ORG_ADMIN])
  const parsed = questionSchema.extend({ id: z.string().cuid() }).safeParse(input)
  if (!parsed.success) return { error: 'Invalid input' }

  const db = scopedDb(tenantId)
  const existing = await db.question.findUnique({ where: { id: parsed.data.id } })
  if (!existing) return { error: 'Question not found' }

  const question = await db.question.update({
    where: { id: parsed.data.id },
    data: {
      text: parsed.data.text,
      helpText: parsed.data.helpText || null,
      category: parsed.data.category,
    },
  })

  await logAudit({
    tenantId,
    actorUserId: trueActorId,
    action: 'QUESTION_UPDATE',
    targetType: 'question',
    targetId: question.id,
  })

  return { question }
}

export async function archiveQuestion(input: z.infer<typeof idSchema>) {
  const { tenantId, trueActorId } = await requireRole([Role.ORG_ADMIN])
  const parsed = idSchema.safeParse(input)
  if (!parsed.success) return { error: 'Invalid input' }

  const db = scopedDb(tenantId)
  const existing = await db.question.findUnique({ where: { id: parsed.data.id } })
  if (!existing) return { error: 'Question not found' }

  const question = await db.question.update({
    where: { id: parsed.data.id },
    data: { isArchived: true },
  })

  await logAudit({
    tenantId,
    actorUserId: trueActorId,
    action: 'QUESTION_ARCHIVE',
    targetType: 'question',
    targetId: question.id,
  })

  return { question }
}

export async function unarchiveQuestion(input: z.infer<typeof idSchema>) {
  const { tenantId, trueActorId } = await requireRole([Role.ORG_ADMIN])
  const parsed = idSchema.safeParse(input)
  if (!parsed.success) return { error: 'Invalid input' }

  const db = scopedDb(tenantId)
  const existing = await db.question.findUnique({ where: { id: parsed.data.id } })
  if (!existing) return { error: 'Question not found' }

  const question = await db.question.update({
    where: { id: parsed.data.id },
    data: { isArchived: false },
  })

  await logAudit({
    tenantId,
    actorUserId: trueActorId,
    action: 'QUESTION_UNARCHIVE',
    targetType: 'question',
    targetId: question.id,
  })

  return { question }
}

export async function getQuestion(input: z.infer<typeof idSchema>) {
  const { tenantId, trueActorId } = await requireRole([Role.ORG_ADMIN, Role.RECRUITER])
  const parsed = idSchema.safeParse(input)
  if (!parsed.success) return { error: 'Invalid input' }

  const db = scopedDb(tenantId)
  const question = await db.question.findUnique({ where: { id: parsed.data.id } })
  if (!question) return { error: 'Question not found' }

  return { question }
}
