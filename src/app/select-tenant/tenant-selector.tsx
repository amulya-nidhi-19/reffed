'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Role, Tenant } from '@prisma/client'

export type MembershipWithTenant = {
  id: string
  tenantId: string
  role: Role
  tenant: Tenant
}

export function TenantSelector({ memberships }: { memberships: MembershipWithTenant[] }) {
  const { update } = useSession()
  const router = useRouter()

  const selectTenant = async (tenantId: string) => {
    await update({ tenantId })
    router.push('/dashboard')
  }

  return (
    <div className="space-y-3">
      {memberships.map((membership) => (
        <Card key={membership.id} className="cursor-pointer hover:border-zinc-400 transition-colors">
          <CardContent className="p-4">
            <button
              onClick={() => selectTenant(membership.tenantId)}
              className="w-full text-left"
            >
              <div className="font-semibold text-zinc-900">{membership.tenant.name}</div>
              <div className="text-sm text-zinc-600">{membership.tenant.slug}</div>
              <div className="text-xs text-zinc-500 mt-1">Role: {membership.role}</div>
            </button>
          </CardContent>
        </Card>
      ))}

      <Button variant="outline" className="w-full" onClick={() => router.push('/sign-out')}>Sign out</Button>
    </div>
  )
}
