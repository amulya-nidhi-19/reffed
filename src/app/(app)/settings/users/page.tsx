import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { listUsers } from './actions'
import { UserManagement } from './user-management'
import { Role } from '@prisma/client'

export default async function UsersSettingsPage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect('/sign-in')
  }

  if (session.user.role !== Role.ORG_ADMIN) {
    redirect('/dashboard')
  }

  const memberships = await listUsers()

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-zinc-900 mb-6">Users & Roles</h1>
      <UserManagement initialMemberships={memberships} />
    </div>
  )
}
