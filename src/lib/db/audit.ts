import { Prisma } from '@prisma/client'
import { scopedDb } from './scoped'

export type AuditLogInput = {
  tenantId: string
  actorUserId: string | null
  action: string
  targetType: string
  targetId?: string
  metadata?: Prisma.InputJsonValue
}

export async function logAudit(input: AuditLogInput) {
  const db = scopedDb(input.tenantId)
  await db.auditLog.create({
    data: {
      tenantId: input.tenantId,
      actorUserId: input.actorUserId,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId ?? null,
      metadata: input.metadata ?? {},
    },
  })
}
