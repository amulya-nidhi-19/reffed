import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { Role } from '@prisma/client'
import { listTemplates } from '../../library/templates/actions'
import { CandidateImport } from './candidate-import'

export default async function CandidatesImportPage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect('/sign-in')
  }

  const allowedRoles: Role[] = [Role.ORG_ADMIN, Role.RECRUITER]
  if (!session.user.role || !allowedRoles.includes(session.user.role)) {
    redirect('/dashboard')
  }

  const result = await listTemplates({ page: 1, includeArchived: false, sortBy: 'createdAt', sortOrder: 'desc' })
  if ('error' in result) {
    redirect('/candidates')
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-zinc-900 mb-6">Bulk import candidates</h1>
      <CandidateImport templates={result.templates} />
    </div>
  )
}
