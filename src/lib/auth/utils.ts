import { Role } from '@prisma/client'
import { Session } from 'next-auth'
import { auth } from '.'

export class AuthError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AuthError'
  }
}

export async function requireRole(allowedRoles: Role[]) {
  const session = await auth()

  if (!session?.user?.id) {
    throw new AuthError('Not authenticated')
  }

  if (!session.user.tenantId) {
    throw new AuthError('No tenant selected')
  }

  const currentRole = session.user.role
  if (!currentRole || !allowedRoles.includes(currentRole)) {
    throw new AuthError('Insufficient permissions')
  }

  return {
    session,
    userId: session.user.id,
    tenantId: session.user.tenantId,
    role: currentRole,
    trueActorId: session.user.trueActorId ?? session.user.id,
  }
}

export function isImpersonating(session: Session | null) {
  return !!session?.user?.impersonatedBy
}

export function getEffectiveRole(session: Session | null) {
  return session?.user?.role
}

export function getTrueActorId(session: Session | null) {
  return session?.user?.trueActorId ?? session?.user?.id
}
