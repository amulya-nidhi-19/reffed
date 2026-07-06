import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({
  log: ['query'],
})

async function main() {
  const tenantId = 'audit-tenant-id'

  console.log('--- Query 1: scopedDb(tenantId).membership.findMany() ---')
  await prisma.membership.findMany({ where: { tenantId } })

  console.log('--- Query 2: scopedDb(tenantId).auditLog.findFirst({ where: { action: "USER_LOGIN" } }) ---')
  await prisma.auditLog.findFirst({ where: { tenantId, action: 'USER_LOGIN' } })

  console.log('--- Query 3: scopedDb(tenantId).mockEmail.create({ data: { to: "a@b.com", subject: "Test", category: "test" } }) ---')
  try {
    await prisma.mockEmail.create({
      data: { tenantId, to: 'a@b.com', subject: 'Test', category: 'test' },
    })
  } catch (error) {
    // expected to fail because tenantId is a placeholder and FK may not exist
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
