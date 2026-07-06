import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getUserMemberships } from '@/lib/db'
import { TenantSelector } from './tenant-selector'

export default async function SelectTenantPage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect('/sign-in')
  }

  const memberships = await getUserMemberships(session.user.id)

  if (memberships.length === 0) {
    redirect('/sign-up')
  }

  if (memberships.length === 1) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-sm border border-zinc-200">
        <h1 className="text-2xl font-bold text-zinc-900 mb-2">Select your workspace</h1>
        <p className="text-zinc-600 mb-6">Choose which organization you want to work with.</p>
        <TenantSelector memberships={memberships} />
      </div>
    </div>
  )
}
