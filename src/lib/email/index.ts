import { scopedDb } from '@/lib/db/scoped'

export type EmailPayload = {
  to: string
  subject: string
  html?: string
  text?: string
  category: string
  tenantId: string
}

export interface EmailProvider {
  send(payload: EmailPayload): Promise<void>
}

export class MockEmailProvider implements EmailProvider {
  async send(payload: EmailPayload): Promise<void> {
    const db = scopedDb(payload.tenantId)
    await db.mockEmail.create({
      data: {
        to: payload.to,
        subject: payload.subject,
        html: payload.html ?? null,
        text: payload.text ?? null,
        category: payload.category,
      },
    })
  }
}

export const emailProvider: EmailProvider = new MockEmailProvider()

export async function sendEmail(payload: EmailPayload): Promise<void> {
  return emailProvider.send(payload)
}
