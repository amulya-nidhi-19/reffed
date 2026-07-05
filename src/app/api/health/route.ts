import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`
    return NextResponse.json({ ok: true, db: 'up' })
  } catch (error) {
    return NextResponse.json({ ok: false, db: 'down' }, { status: 500 })
  }
}
