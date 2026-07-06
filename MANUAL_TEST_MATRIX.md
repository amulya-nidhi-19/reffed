# Manual Test Matrix — Org Admin Surface

Run these tests against a seeded database (`pnpm db:seed`).

## Test 1: Cannot deactivate last active ORG_ADMIN

**Steps:**
1. Sign in as `admin@acme.test` / `reffed123`.
2. Go to `/settings/users`.
3. Try to deactivate the only active ORG_ADMIN row (the current user).

**Expected:** Server action returns error: "Cannot deactivate the last active organization admin". The UI shows the error and the row remains active.

**Verdict:** ✅ / ❌

---

## Test 2: Cannot impersonate cross-tenant

**Steps:**
1. Sign in as `admin@acme.test` / `reffed123`.
2. Go to `/settings/users`.
3. Verify the table only shows Acme Talent Agency memberships (admin, recruiter, viewer).
4. Confirm no TestCo users are visible.

**Expected:** Only users from the current tenant are listed. The impersonation action only targets visible rows, so cross-tenant impersonation is impossible through the UI.

**Verdict:** ✅ / ❌

---

## Test 3: Banner appears and persists across navigation

**Steps:**
1. Sign in as `admin@acme.test` / `reffed123`.
2. Go to `/settings/users`.
3. Click "Impersonate" on the recruiter row.
4. You are redirected to `/dashboard`.
5. Navigate to `/settings/users` and any other app route.

**Expected:** An orange banner at the top reads "You are impersonating {name} ({role})." with an "Exit impersonation" button. The banner is visible on every page until impersonation ends.

**Verdict:** ✅ / ❌

---

## Test 4: Audit log entries are created

**Steps:**
1. Sign in as `admin@acme.test` / `reffed123`.
2. Perform actions: invite a user, change a role, deactivate/reactivate a user, start and stop impersonation.
3. Query the `AuditLog` table for the Acme tenant.

**Expected:** Each action creates an `AuditLog` row with the true actor's user ID in `actorUserId`, even while impersonating. The action names are: `USER_LIST`, `USER_INVITE`, `USER_ROLE_UPDATE`, `USER_DEACTIVATE`, `USER_REACTIVATE`, `IMPERSONATION_START`, `IMPERSONATION_END`.

**Verdict:** ✅ / ❌

---

## Test 5: Role-based route protection

**Steps:**
1. Sign in as `recruiter@acme.test` / `reffed123`.
2. Try to access `/settings/users` directly.

**Expected:** Redirect to `/dashboard` because the route requires `ORG_ADMIN`.

**Verdict:** ✅ / ❌

---

## Test 6: Invite user creates membership and sends mock email

**Steps:**
1. Sign in as `admin@acme.test` / `reffed123`.
2. Go to `/settings/users`.
3. Invite `newuser@example.com` with role `VIEWER`.
4. Check the `MockEmail` table for the Acme tenant.

**Expected:** A new `User` and `Membership` are created. A `MockEmail` row with category `invite` exists containing a magic link URL.

**Verdict:** ✅ / ❌
