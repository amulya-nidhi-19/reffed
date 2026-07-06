import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { Role } from '@prisma/client'
import { listCandidates } from './actions'
import { listTemplates } from '../library/templates/actions'
import { CandidateList } from './candidate-list'

export default async function CandidatesPage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect('/sign-in')
  }

  const allowedRoles: Role[] = [Role.ORG_ADMIN, Role.RECRUITER]
  if (!session.user.role || !allowedRoles.includes(session.user.role)) {
    redirect('/dashboard')
  }

  const [candidatesResult, templatesResult] = await Promise.all([
    listCandidates({ page: 1, status: undefined, sortBy: 'createdAt', sortOrder: 'desc' }),
    listTemplates({ page: 1, includeArchived: false, sortBy: 'createdAt', sortOrder: 'desc' }),
  ])

  if ('error' in candidatesResult || 'error' in templatesResult) {
    redirect('/dashboard')
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-zinc-900 mb-6">Candidates</h1>
      <CandidateList
        initialCandidates={candidatesResult.candidates}
        initialTotal={candidatesResult.total}
        initialPageCount={candidatesResult.pageCount}
        templates={templatesResult.templates}
      />
    </div>
  )
}
