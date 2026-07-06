import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { Role } from '@prisma/client'
import { getCandidate } from '../actions'
import { CandidateDetail } from './candidate-detail'

export default async function CandidateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()

  if (!session?.user?.id) {
    redirect('/sign-in')
  }

  const allowedRoles: Role[] = [Role.ORG_ADMIN, Role.RECRUITER]
  if (!session.user.role || !allowedRoles.includes(session.user.role)) {
    redirect('/dashboard')
  }

  const { id } = await params
  const result = await getCandidate({ id })
  if ('error' in result) {
    redirect('/candidates')
  }

  const questionnaire = result.candidate.questionnaire?.[0]
  const snapshot = questionnaire?.templateSnapshot as Record<string, unknown> | undefined

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <CandidateDetail
        candidate={result.candidate}
        snapshot={snapshot}
      />
    </div>
  )
}
