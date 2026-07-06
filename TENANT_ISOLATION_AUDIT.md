# Tenant Isolation Audit

Every query against a tenant-scoped table MUST include a `tenantId` filter. The following queries are the first three tenant-scoped queries written in the codebase and their generated SQL.

## Query 1: `scopedDb(tenantId).membership.findMany()`

**Prisma call:**
```ts
const db = scopedDb(tenantId)
await db.membership.findMany()
```

**Generated SQL:**
```sql
SELECT "public"."Membership"."id", "public"."Membership"."userId", "public"."Membership"."tenantId", "public"."Membership"."role"::text, "public"."Membership"."isActive", "public"."Membership"."createdAt"
FROM "public"."Membership"
WHERE "public"."Membership"."tenantId" = $1
OFFSET $2
```

**Filter present:** `WHERE "public"."Membership"."tenantId" = $1` ✅

---

## Query 2: `scopedDb(tenantId).auditLog.findFirst({ where: { action: "USER_LOGIN" } })`

**Prisma call:**
```ts
const db = scopedDb(tenantId)
await db.auditLog.findFirst({ where: { action: 'USER_LOGIN' } })
```

**Generated SQL:**
```sql
SELECT "public"."AuditLog"."id", "public"."AuditLog"."tenantId", "public"."AuditLog"."actorUserId", "public"."AuditLog"."action", "public"."AuditLog"."targetType", "public"."AuditLog"."targetId", "public"."AuditLog"."metadata", "public"."AuditLog"."createdAt"
FROM "public"."AuditLog"
WHERE ("public"."AuditLog"."tenantId" = $1 AND "public"."AuditLog"."action" = $2)
LIMIT $3 OFFSET $4
```

**Filter present:** `WHERE ("public"."AuditLog"."tenantId" = $1 AND ...)` ✅

---

## Query 3: `scopedDb(tenantId).mockEmail.create({ data: { to: "a@b.com", subject: "Test", category: "test" } })`

**Prisma call:**
```ts
const db = scopedDb(tenantId)
await db.mockEmail.create({
  data: { to: 'a@b.com', subject: 'Test', category: 'test' },
})
```

**Generated SQL:**
```sql
INSERT INTO "public"."MockEmail" ("id","to","subject","category","tenantId","sentAt")
VALUES ($1,$2,$3,$4,$5,$6)
RETURNING "public"."MockEmail"."id", "public"."MockEmail"."to", "public"."MockEmail"."subject", "public"."MockEmail"."html", "public"."MockEmail"."text", "public"."MockEmail"."category", "public"."MockEmail"."tenantId", "public"."MockEmail"."sentAt"
```

**Filter present:** `tenantId` is injected into the INSERT values as `$5` ✅

---

## Conclusion

All three tenant-scoped queries enforce the `tenantId` boundary at the query layer. No raw `prisma.membership.*`, `prisma.auditLog.*`, or `prisma.mockEmail.*` calls are allowed outside `/src/lib/db/`. The `scopedDb(tenantId)` helper is the required entry point for tenant-scoped data access.
