import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({
  log: ['query'],
})

async function main() {
  const tenantId = 'audit-tenant-id'

  console.log('--- Query 1: scopedDb(tenantId).question.findMany() ---')
  await prisma.question.findMany({
    where: { tenantId },
    orderBy: { createdAt: 'desc' },
    skip: 0,
    take: 25,
  })

  console.log('--- Query 2: scopedDb(tenantId).question.count() ---')
  await prisma.question.count({
    where: { tenantId, isArchived: false },
  })

  console.log('--- Query 3: scopedDb(tenantId).questionnaireTemplate.findMany() ---')
  await prisma.questionnaireTemplate.findMany({
    where: { tenantId },
    orderBy: { createdAt: 'desc' },
    skip: 0,
    take: 25,
    include: { _count: { select: { items: true } } },
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
