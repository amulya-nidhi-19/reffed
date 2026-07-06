import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({
  log: ['query'],
})

async function main() {
  const tenantId = 'audit-tenant-id'

  console.log('--- Query 1: scopedDb(tenantId).candidate.findMany() ---')
  await prisma.candidate.findMany({
    where: { tenantId },
    orderBy: { createdAt: 'desc' },
    skip: 0,
    take: 25,
    include: { questionnaire: { select: { frozenAt: true } } },
  })

  console.log('--- Query 2: scopedDb(tenantId).candidate.count() ---')
  await prisma.candidate.count({
    where: { tenantId, status: 'ACTIVE' },
  })

  console.log('--- Query 3: scopedDb(tenantId).candidate.findUnique() ---')
  await prisma.candidate.findUnique({
    where: { id: 'audit-candidate-id', tenantId },
    include: { questionnaire: true },
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
