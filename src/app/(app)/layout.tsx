import React from 'react'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/lib/auth'
import { Role } from '@prisma/client'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session?.user?.id) {
    redirect('/sign-in')
  }

  if (session.user.requiresTenantSelection) {
    redirect('/select-tenant')
  }

  const role = session.user.role
  const canAccessRecruiter = role === Role.ORG_ADMIN || role === Role.RECRUITER

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-zinc-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="font-bold text-zinc-900">
              Reffed
            </Link>
            <nav className="flex items-center gap-4 text-sm">
              <Link href="/dashboard" className="text-zinc-600 hover:text-zinc-900">
                Dashboard
              </Link>
              {canAccessRecruiter && (
                <Link href="/candidates" className="text-zinc-600 hover:text-zinc-900">
                  Candidates
                </Link>
              )}
              {canAccessRecruiter && (
                <Link href="/library/templates" className="text-zinc-600 hover:text-zinc-900">
                  Library
                </Link>
              )}
              {role === Role.ORG_ADMIN && (
                <Link href="/settings/users" className="text-zinc-600 hover:text-zinc-900">
                  Settings
                </Link>
              )}
            </nav>
          </div>
          <div className="text-sm text-zinc-500">
            {session.user.name ?? session.user.email} · {session.user.tenantName}
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  )
}
