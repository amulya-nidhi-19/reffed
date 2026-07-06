import { prisma } from '@/lib/db'

export type EmailPayload = {
  to: string
  subject: string
  html?: string
  text?: string
  category: string
  tenantId?: string
}

export interface EmailProvider {
  send(payload: EmailPayload): Promise<void>
}

export class MockEmailProvider implements EmailProvider {
  async send(payload: EmailPayload): Promise<void> {
    await prisma.mockEmail.create({
      data: {
        to: payload.to,
        subject: payload.subject,
        html: payload.html ?? null,
        text: payload.text ?? null,
        category: payload.category,
        tenantId: payload.tenantId ?? null,
      },
    })
  }
}

export const emailProvider: EmailProvider = new MockEmailProvider()
