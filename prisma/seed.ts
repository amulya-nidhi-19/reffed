import { PrismaClient, Role } from '@prisma/client'
import { hash } from 'bcrypt'
import { randomBytes } from 'crypto'

const prisma = new PrismaClient()

async function main() {
  const password = await hash('reffed123', 12)

  const acme = await prisma.tenant.upsert({
    where: { slug: 'acme-talent' },
    update: {},
    create: {
      name: 'Acme Talent Agency',
      slug: 'acme-talent',
      dpdpConsentAt: new Date(),
      webhookSecret: randomBytes(32).toString('hex'),
      creditsBalance: 100,
    },
  })

  const testCo = await prisma.tenant.upsert({
    where: { slug: 'testco' },
    update: {},
    create: {
      name: 'TestCo',
      slug: 'testco',
      dpdpConsentAt: new Date(),
      webhookSecret: randomBytes(32).toString('hex'),
      creditsBalance: 50,
    },
  })

  const users = [
    { email: 'admin@acme.test', name: 'Acme Admin', role: Role.ORG_ADMIN, tenantId: acme.id },
    { email: 'recruiter@acme.test', name: 'Acme Recruiter', role: Role.RECRUITER, tenantId: acme.id },
    { email: 'viewer@acme.test', name: 'Acme Viewer', role: Role.VIEWER, tenantId: acme.id },
    { email: 'admin@testco.test', name: 'TestCo Admin', role: Role.ORG_ADMIN, tenantId: testCo.id },
  ]

  for (const userData of users) {
    const { role, tenantId, ...rest } = userData
    const user = await prisma.user.upsert({
      where: { email: rest.email },
      update: {},
      create: {
        ...rest,
        hashedPassword: password,
        emailVerified: new Date(),
      },
    })

    await prisma.membership.upsert({
      where: {
        userId_tenantId: {
          userId: user.id,
          tenantId,
        },
      },
      update: {},
      create: {
        userId: user.id,
        tenantId,
        role,
        isActive: true,
      },
    })
  }

  console.log('Seeded tenants and users')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
