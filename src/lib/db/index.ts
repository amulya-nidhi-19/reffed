import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export async function getUserMemberships(userId: string) {
  return prisma.membership.findMany({
    where: { userId, isActive: true },
    include: { tenant: true },
    orderBy: { createdAt: 'asc' },
  })
}
