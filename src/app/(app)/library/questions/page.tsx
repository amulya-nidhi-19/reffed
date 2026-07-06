import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { Role } from '@prisma/client'
import { listQuestions } from './actions'
import { QuestionBank } from './question-bank'

export default async function QuestionsLibraryPage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect('/sign-in')
  }

  const allowedRoles: Role[] = [Role.ORG_ADMIN, Role.RECRUITER]
  if (!session.user.role || !allowedRoles.includes(session.user.role)) {
    redirect('/dashboard')
  }

  const result = await listQuestions({ page: 1, includeArchived: false, sortBy: 'createdAt', sortOrder: 'desc' })
  if ('error' in result) {
    redirect('/dashboard')
  }

  const isAdmin = session.user.role === Role.ORG_ADMIN

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-zinc-900 mb-6">Question Bank</h1>
      <QuestionBank
        initialQuestions={result.questions}
        initialTotal={result.total}
        initialPageCount={result.pageCount}
        isAdmin={isAdmin}
      />
    </div>
  )
}
