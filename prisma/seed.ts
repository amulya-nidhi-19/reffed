import { PrismaClient, QuestionCategory, Role } from '@prisma/client'
import { hash } from 'bcrypt'
import { randomBytes } from 'crypto'

const prisma = new PrismaClient()

async function main() {
  const password = await hash('reffed123', 12)

  const acme = await prisma.tenant.upsert({
    where: { slug: 'acme-talent' },
    update: {},
    create: {
      name: 'Acme Talent Agency',
      slug: 'acme-talent',
      dpdpConsentAt: new Date(),
      webhookSecret: randomBytes(32).toString('hex'),
      creditsBalance: 100,
    },
  })

  const testCo = await prisma.tenant.upsert({
    where: { slug: 'testco' },
    update: {},
    create: {
      name: 'TestCo',
      slug: 'testco',
      dpdpConsentAt: new Date(),
      webhookSecret: randomBytes(32).toString('hex'),
      creditsBalance: 50,
    },
  })

  const users = [
    { email: 'admin@acme.test', name: 'Acme Admin', role: Role.ORG_ADMIN, tenantId: acme.id },
    { email: 'recruiter@acme.test', name: 'Acme Recruiter', role: Role.RECRUITER, tenantId: acme.id },
    { email: 'viewer@acme.test', name: 'Acme Viewer', role: Role.VIEWER, tenantId: acme.id },
    { email: 'admin@testco.test', name: 'TestCo Admin', role: Role.ORG_ADMIN, tenantId: testCo.id },
  ]

  let acmeAdminId = ''

  for (const userData of users) {
    const { role, tenantId, ...rest } = userData
    const user = await prisma.user.upsert({
      where: { email: rest.email },
      update: {},
      create: {
        ...rest,
        hashedPassword: password,
        emailVerified: new Date(),
      },
    })

    if (rest.email === 'admin@acme.test') {
      acmeAdminId = user.id
    }

    await prisma.membership.upsert({
      where: {
        userId_tenantId: {
          userId: user.id,
          tenantId,
        },
      },
      update: {},
      create: {
        userId: user.id,
        tenantId,
        role,
        isActive: true,
      },
    })
  }

  const questions = [
    { text: 'How would you describe this person’s overall work style?', category: QuestionCategory.WORK_STYLE },
    { text: 'What environment helps them do their best work?', category: QuestionCategory.WORK_STYLE },
    { text: 'How do they handle ambiguity or unclear requirements?', category: QuestionCategory.WORK_STYLE },
    { text: 'Tell us about a time they went above and beyond for the team.', category: QuestionCategory.IMPACT },
    { text: 'What measurable impact did they have in their role?', category: QuestionCategory.IMPACT },
    { text: 'How did they improve processes or outcomes?', category: QuestionCategory.IMPACT },
    { text: 'How do they collaborate with peers across functions?', category: QuestionCategory.COLLABORATION },
    { text: 'How do they receive feedback from others?', category: QuestionCategory.COLLABORATION },
    { text: 'Describe their communication style in team settings.', category: QuestionCategory.COLLABORATION },
    { text: 'Have you seen them mentor or support junior colleagues?', category: QuestionCategory.LEADERSHIP },
    { text: 'How do they handle conflict or disagreement?', category: QuestionCategory.LEADERSHIP },
    { text: 'What kind of leadership role do you see them in next?', category: QuestionCategory.LEADERSHIP },
    { text: 'How do they act under pressure or tight deadlines?', category: QuestionCategory.INTEGRITY },
    { text: 'Can you share an example of them taking ownership of a mistake?', category: QuestionCategory.INTEGRITY },
    { text: 'How do they uphold quality and ethical standards?', category: QuestionCategory.INTEGRITY },
    { text: 'What is their biggest strength?', category: QuestionCategory.OTHER },
    { text: 'What is one area where they could grow?', category: QuestionCategory.OTHER },
    { text: 'Would you hire them again? Why or why not?', category: QuestionCategory.OTHER },
    { text: 'How do they handle repetitive or routine tasks?', category: QuestionCategory.WORK_STYLE },
    { text: 'What motivates them to do great work?', category: QuestionCategory.OTHER },
  ]

  for (const question of questions) {
    const existing = await prisma.question.findFirst({
      where: { tenantId: acme.id, text: question.text },
    })
    if (!existing) {
      await prisma.question.create({
        data: {
          tenantId: acme.id,
          text: question.text,
          category: question.category,
          createdBy: acmeAdminId,
        },
      })
    }
  }

  const templates = [
    { name: 'Software Engineer — IC', roleCategory: 'Software Engineer', description: 'For individual-contributor engineering references.' },
    { name: 'Sales — AE', roleCategory: 'Account Executive', description: 'For sales account-executive references.' },
    { name: 'Ops Manager', roleCategory: 'Operations Manager', description: 'For operations-manager references.' },
  ]

  for (const template of templates) {
    const existing = await prisma.questionnaireTemplate.findFirst({
      where: { tenantId: acme.id, name: template.name },
    })
    if (!existing) {
      await prisma.questionnaireTemplate.create({
        data: {
          tenantId: acme.id,
          name: template.name,
          roleCategory: template.roleCategory,
          description: template.description,
          createdBy: acmeAdminId,
        },
      })
    }
  }

  console.log('Seeded tenants, users, questions, and templates')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
