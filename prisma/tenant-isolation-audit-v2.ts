import { PrismaClient, Role } from '@prisma/client'

const prisma = new PrismaClient({
  log: ['query'],
})

async function main() {
  const tenantId = 'audit-tenant-id'

  console.log('--- Query 1: scopedDb(tenantId).membership.findMany() ---')
  await prisma.membership.findMany({ where: { tenantId }, include: { user: true } })

  console.log('--- Query 2: scopedDb(tenantId).membership.findUnique({ where: { id } }) ---')
  await prisma.membership.findUnique({ where: { id: 'audit-membership-id', tenantId } })

  console.log('--- Query 3: scopedDb(tenantId).membership.count({ where: { role: ORG_ADMIN, isActive: true } }) ---')
  await prisma.membership.count({
    where: { tenantId, role: Role.ORG_ADMIN, isActive: true },
  })
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
