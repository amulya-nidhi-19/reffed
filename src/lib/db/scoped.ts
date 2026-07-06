import { PrismaClient } from '@prisma/client'
import { prisma } from './index'

const tenantScopedModels: Set<string> = new Set([
  'membership',
  'auditLog',
  'mockEmail',
])

type PrismaModel = Record<string, unknown>

const whereOperations = new Set([
  'findUnique',
  'findFirst',
  'findMany',
  'findFirstOrThrow',
  'findUniqueOrThrow',
  'count',
  'update',
  'updateMany',
  'delete',
  'deleteMany',
  'upsert',
  'aggregate',
  'groupBy',
])

const createOperations = new Set(['create', 'createMany'])

function injectTenantIntoWhere(
  args: unknown,
  tenantId: string
): Record<string, unknown> {
  const a = (args as Record<string, unknown> | undefined) ?? {}
  const where = (a.where as Record<string, unknown> | undefined) ?? {}
  return { ...a, where: { ...where, tenantId } }
}

function injectTenantIntoData(
  args: unknown,
  tenantId: string
): Record<string, unknown> {
  const a = (args as Record<string, unknown> | undefined) ?? {}

  if (createOperations.has('createMany') && a.data && Array.isArray(a.data)) {
    return {
      ...a,
      data: a.data.map((item) => ({ ...item, tenantId })),
    }
  }

  return { ...a, data: { ...(a.data as Record<string, unknown> ?? {}), tenantId } }
}

function createModelProxy(model: PrismaModel, tenantId: string): PrismaModel {
  return new Proxy(model, {
    get: (target, operation: string) => {
      const method = target[operation]
      if (typeof method !== 'function') return method

      if (whereOperations.has(operation)) {
        return new Proxy(method, {
          apply: (fn, thisArg, args) => {
            const modifiedArgs = [injectTenantIntoWhere(args[0], tenantId), ...args.slice(1)]
            return fn.apply(thisArg, modifiedArgs)
          },
        })
      }

      if (createOperations.has(operation)) {
        return new Proxy(method, {
          apply: (fn, thisArg, args) => {
            const modifiedArgs = [injectTenantIntoData(args[0], tenantId), ...args.slice(1)]
            return fn.apply(thisArg, modifiedArgs)
          },
        })
      }

      return method
    },
  }) as PrismaModel
}

export function scopedDb(tenantId: string): PrismaClient {
  const client = prisma as unknown as Record<string, PrismaModel | unknown>

  return new Proxy(client, {
    get: (target, prop: string) => {
      const value = target[prop]
      if (tenantScopedModels.has(prop) && typeof value === 'object' && value !== null) {
        return createModelProxy(value as PrismaModel, tenantId)
      }
      return value
    },
  }) as unknown as PrismaClient
}
