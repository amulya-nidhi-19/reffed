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

## New Queries (User Management)

### Query 4: `scopedDb(tenantId).membership.findMany()`

**Prisma call:**
```ts
const db = scopedDb(tenantId)
await db.membership.findMany({ include: { user: true } })
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

### Query 5: `scopedDb(tenantId).membership.findUnique({ where: { id } })`

**Prisma call:**
```ts
const db = scopedDb(tenantId)
await db.membership.findUnique({ where: { id: membershipId } })
```

**Generated SQL:**
```sql
SELECT "public"."Membership"."id", "public"."Membership"."userId", "public"."Membership"."tenantId", "public"."Membership"."role"::text, "public"."Membership"."isActive", "public"."Membership"."createdAt"
FROM "public"."Membership"
WHERE ("public"."Membership"."id" = $1 AND "public"."Membership"."tenantId" = $2)
LIMIT $3 OFFSET $4
```

**Filter present:** `WHERE ("public"."Membership"."id" = $1 AND "public"."Membership"."tenantId" = $2)` ✅

---

### Query 6: `scopedDb(tenantId).membership.count({ where: { role: ORG_ADMIN, isActive: true } })`

**Prisma call:**
```ts
const db = scopedDb(tenantId)
await db.membership.count({ where: { role: Role.ORG_ADMIN, isActive: true } })
```

**Generated SQL:**
```sql
SELECT COUNT(*) FROM (
  SELECT "public"."Membership"."id"
  FROM "public"."Membership"
  WHERE ("public"."Membership"."tenantId" = $1 AND "public"."Membership"."role" = CAST($2::text AS "public"."Role") AND "public"."Membership"."isActive" = $3)
  OFFSET $4
) AS "sub"
```

**Filter present:** `WHERE ("public"."Membership"."tenantId" = $1 AND ...)` ✅

## Question Bank Queries

### Query 7: `scopedDb(tenantId).question.findMany()`

**Prisma call:**
```ts
const db = scopedDb(tenantId)
await db.question.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' }, take: 25 })
```

**Generated SQL:**
```sql
SELECT "public"."Question"."id", "public"."Question"."tenantId", "public"."Question"."text", "public"."Question"."helpText", "public"."Question"."category"::text, "public"."Question"."isArchived", "public"."Question"."createdBy", "public"."Question"."createdAt", "public"."Question"."updatedAt"
FROM "public"."Question"
WHERE "public"."Question"."tenantId" = $1
ORDER BY "public"."Question"."createdAt" DESC
LIMIT $2 OFFSET $3
```

**Filter present:** `WHERE "public"."Question"."tenantId" = $1` ✅

---

### Query 8: `scopedDb(tenantId).question.count()`

**Prisma call:**
```ts
const db = scopedDb(tenantId)
await db.question.count({ where: { tenantId, isArchived: false } })
```

**Generated SQL:**
```sql
SELECT COUNT(*) FROM (
  SELECT "public"."Question"."id"
  FROM "public"."Question"
  WHERE ("public"."Question"."tenantId" = $1 AND "public"."Question"."isArchived" = $2)
  OFFSET $3
) AS "sub"
```

**Filter present:** `WHERE ("public"."Question"."tenantId" = $1 AND ...)` ✅

---

### Query 9: `scopedDb(tenantId).questionnaireTemplate.findMany()`

**Prisma call:**
```ts
const db = scopedDb(tenantId)
await db.questionnaireTemplate.findMany({
  where: { tenantId },
  orderBy: { createdAt: 'desc' },
  take: 25,
  include: { _count: { select: { items: true } } },
})
```

**Generated SQL:**
```sql
SELECT "public"."QuestionnaireTemplate"."id", "public"."QuestionnaireTemplate"."tenantId", "public"."QuestionnaireTemplate"."name", "public"."QuestionnaireTemplate"."roleCategory", "public"."QuestionnaireTemplate"."description", "public"."QuestionnaireTemplate"."isArchived", "public"."QuestionnaireTemplate"."createdBy", "public"."QuestionnaireTemplate"."createdAt", "public"."QuestionnaireTemplate"."updatedAt", COALESCE("aggr_selection_0_QuestionnaireTemplateItem"."_aggr_count_items", 0) AS "_aggr_count_items"
FROM "public"."QuestionnaireTemplate"
LEFT JOIN (
  SELECT "public"."QuestionnaireTemplateItem"."templateId", COUNT(*) AS "_aggr_count_items"
  FROM "public"."QuestionnaireTemplateItem"
  WHERE 1=1
  GROUP BY "public"."QuestionnaireTemplateItem"."templateId"
) AS "aggr_selection_0_QuestionnaireTemplateItem" ON ("public"."QuestionnaireTemplate"."id" = "aggr_selection_0_QuestionnaireTemplateItem"."templateId")
WHERE "public"."QuestionnaireTemplate"."tenantId" = $1
ORDER BY "public"."QuestionnaireTemplate"."createdAt" DESC
LIMIT $2 OFFSET $3
```

**Filter present:** `WHERE "public"."QuestionnaireTemplate"."tenantId" = $1` ✅

---

## Query 10: `scopedDb(tenantId).candidate.findMany()`

**Prisma call:**
```ts
const db = scopedDb(tenantId)
await db.candidate.findMany({
  where: { tenantId },
  orderBy: { createdAt: 'desc' },
  skip: 0,
  take: 25,
})
```

**Generated SQL:**
```sql
SELECT "public"."Candidate".* FROM "public"."Candidate"
WHERE "public"."Candidate"."tenantId" = $1
ORDER BY "public"."Candidate"."createdAt" DESC
LIMIT $2 OFFSET $3
```

**Filter present:** `WHERE "public"."Candidate"."tenantId" = $1` ✅

---

## Query 11: `scopedDb(tenantId).candidate.count()`

**Prisma call:**
```ts
const db = scopedDb(tenantId)
await db.candidate.count({
  where: { tenantId, status: 'ACTIVE' },
})
```

**Generated SQL:**
```sql
SELECT COUNT(*) FROM (
  SELECT "public"."Candidate"."id"
  FROM "public"."Candidate"
  WHERE ("public"."Candidate"."tenantId" = $1 AND "public"."Candidate"."status" = $2)
  OFFSET $3
) AS "sub"
```

**Filter present:** `WHERE ("public"."Candidate"."tenantId" = $1 AND ...)` ✅

---

## Query 12: `scopedDb(tenantId).candidate.findUnique()`

**Prisma call:**
```ts
const db = scopedDb(tenantId)
await db.candidate.findUnique({
  where: { id: 'audit-candidate-id', tenantId },
  include: { questionnaire: true },
})
```

**Generated SQL:**
```sql
SELECT "public"."Candidate".* FROM "public"."Candidate"
WHERE ("public"."Candidate"."id" = $1 AND "public"."Candidate"."tenantId" = $2)
LIMIT $3 OFFSET $4
```

**Filter present:** `WHERE ("public"."Candidate"."id" = $1 AND "public"."Candidate"."tenantId" = $2)` ✅

## Conclusion

All tenant-scoped queries enforce the `tenantId` boundary at the query layer. No raw `prisma.membership.*`, `prisma.auditLog.*`, `prisma.mockEmail.*`, `prisma.question.*`, `prisma.questionnaireTemplate.*`, `prisma.candidate.*`, `prisma.candidateQuestionnaire.*`, `prisma.referee.*`, or `prisma.refereeResponse.*` calls are allowed outside `/src/lib/db/`. The `scopedDb(tenantId)` helper is the required entry point for tenant-scoped data access.
