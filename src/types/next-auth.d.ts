import { Role } from '@prisma/client'
import { DefaultSession, DefaultUser } from 'next-auth'
import { JWT } from 'next-auth/jwt'

declare module 'next-auth' {
  interface User extends DefaultUser {
    tenantId?: string
    role?: Role
    tenantName?: string
    tenantSlug?: string
    requiresTenantSelection?: boolean
  }

  interface Session extends DefaultSession {
    user: {
      id: string
      tenantId?: string
      role?: Role
      tenantName?: string
      tenantSlug?: string
      requiresTenantSelection?: boolean
    } & DefaultSession['user']
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string
    tenantId?: string
    role?: Role
    tenantName?: string
    tenantSlug?: string
    requiresTenantSelection?: boolean
  }
}
