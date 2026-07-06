import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'

export default async function DashboardPage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect('/sign-in')
  }

  if (session.user.requiresTenantSelection) {
    redirect('/select-tenant')
  }

  return (
    <div className="min-h-screen p-8">
      <h1 className="text-2xl font-bold text-zinc-900 mb-4">
        Welcome, {session.user.name ?? session.user.email}
      </h1>
      <div className="space-y-2 text-zinc-700">
        <p>
          <span className="font-medium">Role:</span> {session.user.role}
        </p>
        <p>
          <span className="font-medium">Tenant:</span> {session.user.tenantName} ({session.user.tenantSlug})
        </p>
      </div>
    </div>
  )
}
