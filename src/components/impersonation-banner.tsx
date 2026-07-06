'use client'

import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { stopImpersonation } from '@/app/(app)/settings/users/actions'

export function ImpersonationBanner() {
  const { data: session, update } = useSession()

  if (!session?.user?.impersonatedBy) return null

  const handleExit = async () => {
    await stopImpersonation()
    await update({ endImpersonation: true })
    window.location.href = '/dashboard'
  }

  return (
    <div className="bg-orange-500 text-white px-4 py-2 text-sm flex items-center justify-between">
      <span>
        You are impersonating {session.user.name ?? session.user.email} ({session.user.role}).
      </span>
      <Button
        size="sm"
        variant="secondary"
        className="bg-white text-orange-700 hover:bg-orange-50"
        onClick={handleExit}
      >
        Exit impersonation
      </Button>
    </div>
  )
}
