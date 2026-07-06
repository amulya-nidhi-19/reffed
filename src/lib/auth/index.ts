import NextAuth from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'
import Credentials from 'next-auth/providers/credentials'
import Nodemailer from 'next-auth/providers/nodemailer'
import { compare } from 'bcrypt'
import { Role } from '@prisma/client'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { emailProvider } from '@/lib/email'

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string(),
  tenantId: z.string().optional(),
})

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'jwt' },
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        tenantId: { label: 'Tenant', type: 'text' },
      },
      authorize: async (credentials) => {
        const parsed = credentialsSchema.safeParse(credentials)
        if (!parsed.success) return null

        const { email, password, tenantId } = parsed.data

        const user = await prisma.user.findUnique({
          where: { email: email.toLowerCase() },
          include: {
            memberships: {
              where: { isActive: true },
              include: { tenant: true },
            },
          },
        })

        if (!user || !user.hashedPassword) return null

        const valid = await compare(password, user.hashedPassword)
        if (!valid) return null

        if (user.memberships.length === 0) return null

        let selectedMembership = user.memberships[0]
        if (tenantId) {
          const found = user.memberships.find((m) => m.tenantId === tenantId)
          if (found) selectedMembership = found
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          tenantId: selectedMembership.tenantId,
          role: selectedMembership.role,
          tenantName: selectedMembership.tenant.name,
          tenantSlug: selectedMembership.tenant.slug,
          requiresTenantSelection: user.memberships.length > 1 && !tenantId,
        }
      },
    }),
    Nodemailer({
      server: {},
      from: process.env.EMAIL_FROM ?? 'noreply@reffed.app',
      sendVerificationRequest: async ({ identifier, url }) => {
        await emailProvider.send({
          to: identifier,
          subject: 'Sign in to Reffed',
          html: `<p>Click <a href="${url}">here</a> to sign in to Reffed.</p>`,
          text: `Sign in to Reffed: ${url}`,
          category: 'magic-link',
        })
      },
    }),
  ],
  callbacks: {
    jwt: async ({ token, user, trigger, session }) => {
      if (user) {
        token.id = user.id
        token.tenantId = user.tenantId
        token.role = user.role
        token.tenantName = user.tenantName
        token.tenantSlug = user.tenantSlug
        token.requiresTenantSelection = user.requiresTenantSelection
      }

      if (trigger === 'update' && session && (session as { tenantId?: string }).tenantId) {
        const selectedTenantId = (session as { tenantId: string }).tenantId
        const membership = await prisma.membership.findFirst({
          where: {
            userId: token.id as string,
            tenantId: selectedTenantId,
            isActive: true,
          },
          include: { tenant: true },
        })

        if (membership) {
          token.tenantId = membership.tenantId
          token.role = membership.role
          token.tenantName = membership.tenant.name
          token.tenantSlug = membership.tenant.slug
          token.requiresTenantSelection = false
        }
      }

      return token
    },
    session: async ({ session, token }) => {
      session.user.id = token.id as string
      session.user.tenantId = token.tenantId as string | undefined
      session.user.role = token.role as Role | undefined
      session.user.tenantName = token.tenantName as string | undefined
      session.user.tenantSlug = token.tenantSlug as string | undefined
      session.user.requiresTenantSelection = token.requiresTenantSelection as boolean | undefined
      return session
    },
  },
  pages: {
    signIn: '/sign-in',
    error: '/sign-in',
    verifyRequest: '/sign-in',
  },
})
