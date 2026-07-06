import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { Role } from '@prisma/client'
import { listTemplates } from './actions'
import { listQuestions } from '../questions/actions'
import { TemplateLibrary } from './template-library'

export default async function TemplatesLibraryPage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect('/sign-in')
  }

  const allowedRoles: Role[] = [Role.ORG_ADMIN, Role.RECRUITER]
  if (!session.user.role || !allowedRoles.includes(session.user.role)) {
    redirect('/dashboard')
  }

  const [templatesResult, questionsResult] = await Promise.all([
    listTemplates({ page: 1, includeArchived: false, sortBy: 'createdAt', sortOrder: 'desc' }),
    listQuestions({ page: 1, includeArchived: false, sortBy: 'createdAt', sortOrder: 'desc' }),
  ])

  if ('error' in templatesResult || 'error' in questionsResult) {
    redirect('/dashboard')
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-zinc-900 mb-6">Questionnaire Templates</h1>
      <TemplateLibrary
        initialTemplates={templatesResult.templates}
        initialTemplateTotal={templatesResult.total}
        initialTemplatePageCount={templatesResult.pageCount}
        initialQuestions={questionsResult.questions}
        initialQuestionTotal={questionsResult.total}
        initialQuestionPageCount={questionsResult.pageCount}
        isAdmin={session.user.role === Role.ORG_ADMIN}
      />
    </div>
  )
}
