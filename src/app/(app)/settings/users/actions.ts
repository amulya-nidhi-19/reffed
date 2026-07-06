'use server'

import { randomBytes } from 'crypto'
import { Role } from '@prisma/client'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { requireRole } from '@/lib/auth/utils'
import { prisma } from '@/lib/db'
import { scopedDb } from '@/lib/db/scoped'
import { logAudit } from '@/lib/db/audit'
import { emailProvider } from '@/lib/email'

const inviteSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  role: z.nativeEnum(Role),
})

const roleSchema = z.object({
  membershipId: z.string().cuid(),
  role: z.nativeEnum(Role),
})

const membershipIdSchema = z.object({
  membershipId: z.string().cuid(),
})

function buildMagicLink(email: string, token: string) {
  const base = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'
  const callbackUrl = encodeURIComponent(`${base}/dashboard`)
  return `${base}/api/auth/callback/nodemailer?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}&callbackUrl=${callbackUrl}`
}

export async function listUsers() {
  const { tenantId, trueActorId } = await requireRole([Role.ORG_ADMIN])

  const db = scopedDb(tenantId)
  const memberships = await db.membership.findMany({
    include: { user: true },
    orderBy: { createdAt: 'asc' },
  })

  await logAudit({
    tenantId,
    actorUserId: trueActorId,
    action: 'USER_LIST',
    targetType: 'tenant',
    targetId: tenantId,
  })

  return memberships
}

export async function inviteUser(input: z.infer<typeof inviteSchema>) {
  const parsed = inviteSchema.safeParse(input)
  if (!parsed.success) return { error: 'Invalid input' }

  const { tenantId, trueActorId } = await requireRole([Role.ORG_ADMIN])
  const { email, name, role } = parsed.data

  const normalizedEmail = email.toLowerCase()

  try {
    const result = await prisma.$transaction(async (tx) => {
      let user = await tx.user.findUnique({ where: { email: normalizedEmail } })
      if (!user) {
        user = await tx.user.create({
          data: {
            email: normalizedEmail,
            name: name ?? null,
            emailVerified: new Date(),
          },
        })
      }

      const existingMembership = await tx.membership.findUnique({
        where: {
          userId_tenantId: {
            userId: user.id,
            tenantId,
          },
        },
      })
      if (existingMembership) {
        return { error: 'User is already a member of this tenant' }
      }

      const membership = await tx.membership.create({
        data: {
          userId: user.id,
          tenantId,
          role,
          isActive: true,
        },
      })

      return { user, membership }
    })

    if ('error' in result) return result

    const token = randomBytes(32).toString('hex')
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000)

    await prisma.verificationToken.create({
      data: {
        identifier: normalizedEmail,
        token,
        expires,
      },
    })

    const url = buildMagicLink(normalizedEmail, token)

    await emailProvider.send({
      to: normalizedEmail,
      subject: 'You have been invited to Reffed',
      html: `<p>You have been invited to join a Reffed organization. <a href="${url}">Click here</a> to sign in.</p>`,
      text: `You have been invited to join a Reffed organization. Sign in here: ${url}`,
      category: 'invite',
      tenantId,
    })

    await logAudit({
      tenantId,
      actorUserId: trueActorId,
      action: 'USER_INVITE',
      targetType: 'user',
      targetId: result.user.id,
      metadata: { role, email: normalizedEmail },
    })

    return { success: true }
  } catch (error) {
    return { error: 'Failed to invite user' }
  }
}

export async function updateRole(input: z.infer<typeof roleSchema>) {
  const parsed = roleSchema.safeParse(input)
  if (!parsed.success) return { error: 'Invalid input' }

  const { tenantId, trueActorId } = await requireRole([Role.ORG_ADMIN])
  const { membershipId, role } = parsed.data

  const db = scopedDb(tenantId)
  const membership = await db.membership.findUnique({
    where: { id: membershipId },
  })
  if (!membership) return { error: 'Membership not found' }

  await db.membership.update({
    where: { id: membershipId },
    data: { role },
  })

  await logAudit({
    tenantId,
    actorUserId: trueActorId,
    action: 'USER_ROLE_UPDATE',
    targetType: 'membership',
    targetId: membershipId,
    metadata: { role, previousRole: membership.role },
  })

  return { success: true }
}

export async function toggleStatus(input: z.infer<typeof membershipIdSchema>) {
  const parsed = membershipIdSchema.safeParse(input)
  if (!parsed.success) return { error: 'Invalid input' }

  const { tenantId, trueActorId } = await requireRole([Role.ORG_ADMIN])
  const { membershipId } = parsed.data

  const db = scopedDb(tenantId)
  const membership = await db.membership.findUnique({
    where: { id: membershipId },
  })
  if (!membership) return { error: 'Membership not found' }

  const newStatus = !membership.isActive

  if (!newStatus && membership.role === Role.ORG_ADMIN) {
    const activeAdmins = await db.membership.count({
      where: {
        role: Role.ORG_ADMIN,
        isActive: true,
      },
    })
    if (activeAdmins <= 1) {
      return { error: 'Cannot deactivate the last active organization admin' }
    }
  }

  await db.membership.update({
    where: { id: membershipId },
    data: { isActive: newStatus },
  })

  await logAudit({
    tenantId,
    actorUserId: trueActorId,
    action: newStatus ? 'USER_REACTIVATE' : 'USER_DEACTIVATE',
    targetType: 'membership',
    targetId: membershipId,
  })

  return { success: true }
}

export async function startImpersonation(input: z.infer<typeof membershipIdSchema>) {
  const parsed = membershipIdSchema.safeParse(input)
  if (!parsed.success) return { error: 'Invalid input' }

  const { tenantId, trueActorId } = await requireRole([Role.ORG_ADMIN])
  const { membershipId } = parsed.data

  const db = scopedDb(tenantId)
  const membership = await db.membership.findUnique({
    where: { id: membershipId },
    include: { user: true },
  })
  if (!membership) return { error: 'Membership not found' }
  if (!membership.isActive) return { error: 'Cannot impersonate an inactive user' }
  if (membership.userId === trueActorId) return { error: 'Cannot impersonate yourself' }

  await logAudit({
    tenantId,
    actorUserId: trueActorId,
    action: 'IMPERSONATION_START',
    targetType: 'membership',
    targetId: membershipId,
    metadata: { targetUserId: membership.userId, targetRole: membership.role },
  })

  return {
    success: true,
    impersonation: {
      impersonatedBy: trueActorId,
      trueActorId,
      targetUserId: membership.userId,
      targetName: membership.user.name ?? membership.user.email,
      targetRole: membership.role,
    },
  }
}

export async function stopImpersonation() {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Not authenticated' }

  const tenantId = session.user.tenantId
  const trueActorId = session.user.trueActorId
  if (!tenantId || !trueActorId) return { error: 'Not impersonating' }

  await logAudit({
    tenantId,
    actorUserId: trueActorId,
    action: 'IMPERSONATION_END',
    targetType: 'user',
    targetId: session.user.id,
  })

  return { success: true }
}
