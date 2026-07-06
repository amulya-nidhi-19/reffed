# Database Access Layer

This directory contains the database client and tenant-scoped query helpers.

## Rule: every tenant-scoped query MUST filter by `tenantId`

The master spec requires that every database query for tenant-scoped resources filters by `tenantId` (or `orgId`). This rule is enforced at the query layer, not the route layer.

## How to access the database

### 1. Use `scopedDb(tenantId)` for tenant-scoped tables

For any query against a tenant-scoped table, use the wrapped client from `scopedDb`:

```ts
import { scopedDb } from '@/lib/db/scoped'

const db = scopedDb(tenantId)

const members = await db.membership.findMany()
const logs = await db.auditLog.findMany({ take: 10 })
const emails = await db.mockEmail.findMany()
```

The wrapper automatically injects `tenantId` into:

- `where` clauses for `findUnique`, `findFirst`, `findMany`, `count`, `update`, `updateMany`, `delete`, `deleteMany`, `upsert`, etc.
- `data` for `create` and `createMany`

### 2. Tenant-scoped tables

The following tables are tenant-scoped and must be accessed via `scopedDb`:

- `membership`
- `auditLog`
- `mockEmail`

### 3. Use `prisma` directly only for global tables

The raw `prisma` client is exported from `@/lib/db` for tables that are not tenant-scoped:

- `user`
- `account`
- `session`
- `verificationToken`
- `tenant`
- `healthCheck`

ESLint is configured to block `import { prisma } from '@/lib/db'` outside of this directory. If you need to use the raw client in a new file inside `/src/lib/db`, add that file to the ESLint override.

## Example

```ts
import { scopedDb } from '@/lib/db/scoped'
import { prisma } from '@/lib/db'

// Global user lookup (OK to use raw prisma)
const user = await prisma.user.findUnique({ where: { email } })

// Tenant-scoped membership query (MUST use scopedDb)
const db = scopedDb(user.memberships[0].tenantId)
const members = await db.membership.findMany()
```
