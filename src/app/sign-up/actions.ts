'use server'

import { hash } from 'bcrypt'
import { randomBytes } from 'crypto'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { signIn } from '@/lib/auth'
import { Role } from '@prisma/client'

const signUpSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  tenantName: z.string().min(1),
  tenantSlug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  dpdpConsent: z.literal(true),
})

export type SignUpInput = z.infer<typeof signUpSchema>

export async function signUp(formData: SignUpInput) {
  const parsed = signUpSchema.safeParse(formData)
  if (!parsed.success) {
    return { error: 'Invalid input' }
  }

  const { email, password, name, tenantName, tenantSlug, dpdpConsent } = parsed.data

  const existing = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  })
  if (existing) {
    return { error: 'Email already registered' }
  }

  const hashedPassword = await hash(password, 12)
  const webhookSecret = randomBytes(32).toString('hex')

  try {
    const result = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: tenantName,
          slug: tenantSlug,
          dpdpConsentAt: dpdpConsent ? new Date() : null,
          webhookSecret,
        },
      })

      const user = await tx.user.create({
        data: {
          email: email.toLowerCase(),
          name,
          hashedPassword,
          emailVerified: new Date(),
        },
      })

      await tx.membership.create({
        data: {
          userId: user.id,
          tenantId: tenant.id,
          role: Role.ORG_ADMIN,
          isActive: true,
        },
      })

      return { user, tenant }
    })

    await signIn('credentials', {
      email: result.user.email,
      password,
      redirectTo: '/dashboard',
    })

    return { success: true }
  } catch (error) {
    return { error: 'Failed to create account' }
  }
}
