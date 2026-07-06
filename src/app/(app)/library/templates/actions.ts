'use server'

import { Role } from '@prisma/client'
import { z } from 'zod'
import { requireRole } from '@/lib/auth/utils'
import { scopedDb } from '@/lib/db/scoped'
import { logAudit } from '@/lib/db/audit'
import { Prisma } from '@prisma/client'

const PAGE_SIZE = 25

const templateSchema = z.object({
  name: z.string().min(1).max(200),
  roleCategory: z.string().min(1).max(200),
  description: z.string().max(2000).optional().or(z.literal('')),
})

const questionIdsSchema = z.array(z.string().cuid()).min(1).max(50)

const listSchema = z.object({
  page: z.number().int().min(1).default(1),
  search: z.string().optional(),
  includeArchived: z.boolean().default(false),
  sortBy: z.enum(['createdAt', 'name', 'roleCategory']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

const idSchema = z.object({
  id: z.string().cuid(),
})

export async function listTemplates(input: z.infer<typeof listSchema>) {
  const { tenantId, trueActorId } = await requireRole([Role.ORG_ADMIN, Role.RECRUITER])
  const parsed = listSchema.safeParse(input)
  if (!parsed.success) return { error: 'Invalid filter parameters' }

  const { page, search, includeArchived, sortBy, sortOrder } = parsed.data
  const skip = (page - 1) * PAGE_SIZE

  const where: Prisma.QuestionnaireTemplateWhereInput = { tenantId }
  if (!includeArchived) where.isArchived = false
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { roleCategory: { contains: search, mode: 'insensitive' } },
    ]
  }

  const db = scopedDb(tenantId)
  const [templates, total] = await Promise.all([
    db.questionnaireTemplate.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: PAGE_SIZE,
      include: {
        _count: { select: { items: true } },
      },
    }),
    db.questionnaireTemplate.count({ where }),
  ])

  await logAudit({
    tenantId,
    actorUserId: trueActorId,
    action: 'TEMPLATE_LIST',
    targetType: 'tenant',
    targetId: tenantId,
  })

  return { templates, total, pageCount: Math.ceil(total / PAGE_SIZE) }
}

export async function createTemplate(
  input: z.infer<typeof templateSchema>,
  questionIds: string[]
) {
  const { tenantId, trueActorId } = await requireRole([Role.ORG_ADMIN, Role.RECRUITER])
  const parsedTemplate = templateSchema.safeParse(input)
  const parsedQuestions = questionIdsSchema.safeParse(questionIds)
  if (!parsedTemplate.success || !parsedQuestions.success) {
    return { error: 'Invalid input' }
  }

  const db = scopedDb(tenantId)
  const activeQuestions = await db.question.findMany({
    where: { tenantId, id: { in: parsedQuestions.data }, isArchived: false },
  })
  if (activeQuestions.length !== parsedQuestions.data.length) {
    return { error: 'One or more selected questions are invalid or archived' }
  }

  const template = await db.questionnaireTemplate.create({
    data: {
      tenantId,
      name: parsedTemplate.data.name,
      roleCategory: parsedTemplate.data.roleCategory,
      description: parsedTemplate.data.description || null,
      createdBy: trueActorId,
      items: {
        create: parsedQuestions.data.map((questionId, index) => ({
          questionId,
          order: index,
        })),
      },
    },
  })

  await logAudit({
    tenantId,
    actorUserId: trueActorId,
    action: 'TEMPLATE_CREATE',
    targetType: 'template',
    targetId: template.id,
  })

  return { template }
}

export async function updateTemplate(
  input: { id: string } & z.infer<typeof templateSchema>,
  questionIds: string[]
) {
  const { tenantId, trueActorId } = await requireRole([Role.ORG_ADMIN, Role.RECRUITER])
  const parsedTemplate = templateSchema.extend({ id: z.string().cuid() }).safeParse(input)
  const parsedQuestions = questionIdsSchema.safeParse(questionIds)
  if (!parsedTemplate.success || !parsedQuestions.success) {
    return { error: 'Invalid input' }
  }

  const db = scopedDb(tenantId)
  const existing = await db.questionnaireTemplate.findUnique({
    where: { id: parsedTemplate.data.id },
  })
  if (!existing) return { error: 'Template not found' }

  const activeQuestions = await db.question.findMany({
    where: { tenantId, id: { in: parsedQuestions.data }, isArchived: false },
  })
  if (activeQuestions.length !== parsedQuestions.data.length) {
    return { error: 'One or more selected questions are invalid or archived' }
  }

  await db.questionnaireTemplateItem.deleteMany({
    where: { templateId: parsedTemplate.data.id },
  })

  const template = await db.questionnaireTemplate.update({
    where: { id: parsedTemplate.data.id },
    data: {
      name: parsedTemplate.data.name,
      roleCategory: parsedTemplate.data.roleCategory,
      description: parsedTemplate.data.description || null,
      items: {
        create: parsedQuestions.data.map((questionId, index) => ({
          questionId,
          order: index,
        })),
      },
    },
  })

  await logAudit({
    tenantId,
    actorUserId: trueActorId,
    action: 'TEMPLATE_UPDATE',
    targetType: 'template',
    targetId: template.id,
  })

  return { template }
}

export async function archiveTemplate(input: z.infer<typeof idSchema>) {
  const { tenantId, trueActorId } = await requireRole([Role.ORG_ADMIN, Role.RECRUITER])
  const parsed = idSchema.safeParse(input)
  if (!parsed.success) return { error: 'Invalid input' }

  const db = scopedDb(tenantId)
  const existing = await db.questionnaireTemplate.findUnique({ where: { id: parsed.data.id } })
  if (!existing) return { error: 'Template not found' }

  const template = await db.questionnaireTemplate.update({
    where: { id: parsed.data.id },
    data: { isArchived: true },
  })

  await logAudit({
    tenantId,
    actorUserId: trueActorId,
    action: 'TEMPLATE_ARCHIVE',
    targetType: 'template',
    targetId: template.id,
  })

  return { template }
}

export async function unarchiveTemplate(input: z.infer<typeof idSchema>) {
  const { tenantId, trueActorId } = await requireRole([Role.ORG_ADMIN, Role.RECRUITER])
  const parsed = idSchema.safeParse(input)
  if (!parsed.success) return { error: 'Invalid input' }

  const db = scopedDb(tenantId)
  const existing = await db.questionnaireTemplate.findUnique({ where: { id: parsed.data.id } })
  if (!existing) return { error: 'Template not found' }

  const template = await db.questionnaireTemplate.update({
    where: { id: parsed.data.id },
    data: { isArchived: false },
  })

  await logAudit({
    tenantId,
    actorUserId: trueActorId,
    action: 'TEMPLATE_UNARCHIVE',
    targetType: 'template',
    targetId: template.id,
  })

  return { template }
}

export async function getTemplate(input: z.infer<typeof idSchema>) {
  const { tenantId, trueActorId } = await requireRole([Role.ORG_ADMIN, Role.RECRUITER])
  const parsed = idSchema.safeParse(input)
  if (!parsed.success) return { error: 'Invalid input' }

  const db = scopedDb(tenantId)
  const template = await db.questionnaireTemplate.findUnique({
    where: { id: parsed.data.id },
    include: {
      items: {
        orderBy: { order: 'asc' },
        include: { template: true },
      },
    },
  })
  if (!template) return { error: 'Template not found' }

  return { template }
}

export async function reorderItems(input: { templateId: string; itemIds: string[] }) {
  const { tenantId, trueActorId } = await requireRole([Role.ORG_ADMIN, Role.RECRUITER])
  const parsed = z
    .object({ templateId: z.string().cuid(), itemIds: z.array(z.string().cuid()) })
    .safeParse(input)
  if (!parsed.success) return { error: 'Invalid input' }

  const db = scopedDb(tenantId)
  const template = await db.questionnaireTemplate.findUnique({
    where: { id: parsed.data.templateId },
  })
  if (!template) return { error: 'Template not found' }

  await db.$transaction(
    parsed.data.itemIds.map((itemId, index) =>
      db.questionnaireTemplateItem.update({
        where: { id: itemId },
        data: { order: index },
      })
    )
  )

  await logAudit({
    tenantId,
    actorUserId: trueActorId,
    action: 'TEMPLATE_REORDER',
    targetType: 'template',
    targetId: parsed.data.templateId,
  })

  return { success: true }
}
