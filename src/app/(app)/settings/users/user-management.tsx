'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useSession } from 'next-auth/react'
import { Membership, Role, User } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { inviteUser, updateRole, toggleStatus, startImpersonation } from './actions'

const inviteSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  role: z.nativeEnum(Role),
})

type MembershipWithUser = Membership & { user: User }

export function UserManagement({ initialMemberships }: { initialMemberships: MembershipWithUser[] }) {
  const { update } = useSession()
  const [memberships, setMemberships] = useState<MembershipWithUser[]>(initialMemberships)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [isInviting, setIsInviting] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(inviteSchema),
    defaultValues: { role: Role.RECRUITER },
  })

  const onInvite = async (data: z.infer<typeof inviteSchema>) => {
    setIsInviting(true)
    setError(null)
    setMessage(null)

    const result = await inviteUser(data)
    if (result.error) {
      setError(result.error)
    } else {
      setMessage('Invite sent')
      reset()
    }
    setIsInviting(false)
  }

  const handleRoleChange = async (membershipId: string, role: Role) => {
    setError(null)
    const result = await updateRole({ membershipId, role })
    if (result.error) {
      setError(result.error)
      return
    }
    setMemberships((prev) =>
      prev.map((m) => (m.id === membershipId ? { ...m, role } : m))
    )
  }

  const handleToggleStatus = async (membershipId: string) => {
    setError(null)
    const result = await toggleStatus({ membershipId })
    if (result.error) {
      setError(result.error)
      return
    }
    setMemberships((prev) =>
      prev.map((m) => (m.id === membershipId ? { ...m, isActive: !m.isActive } : m))
    )
  }

  const handleImpersonate = async (membershipId: string) => {
    setError(null)
    const result = await startImpersonation({ membershipId })
    if (result.error) {
      setError(result.error)
      return
    }
    if (result.impersonation) {
      await update({ impersonation: result.impersonation })
      window.location.href = '/dashboard'
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-3 text-sm text-red-700 bg-red-50 rounded-md">{error}</div>
      )}
      {message && (
        <div className="p-3 text-sm text-green-700 bg-green-50 rounded-md">{message}</div>
      )}

      <div className="p-6 border border-zinc-200 rounded-lg bg-white">
        <h2 className="text-lg font-semibold mb-4">Invite user</h2>
        <form onSubmit={handleSubmit(onInvite)} className="grid md:grid-cols-4 gap-4 items-end">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...register('email')} />
            {errors.email && <p className="text-sm text-red-600 mt-1">{errors.email.message}</p>}
          </div>
          <div>
            <Label htmlFor="name">Name (optional)</Label>
            <Input id="name" type="text" {...register('name')} />
          </div>
          <div>
            <Label htmlFor="role">Role</Label>
            <Select defaultValue={Role.RECRUITER} onValueChange={(v) => register('role').onChange({ target: { value: v } })}>
              <SelectTrigger id="role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.values(Role).map((role) => (
                  <SelectItem key={role} value={role}>
                    {role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" disabled={isInviting}>
            {isInviting ? 'Inviting...' : 'Invite'}
          </Button>
        </form>
      </div>

      <div className="border border-zinc-200 rounded-lg bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last login</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {memberships.map((membership) => (
              <TableRow key={membership.id}>
                <TableCell>{membership.user.email}</TableCell>
                <TableCell>{membership.user.name ?? '-'}</TableCell>
                <TableCell>
                  <Select
                    value={membership.role}
                    onValueChange={(value) => handleRoleChange(membership.id, value as Role)}
                  >
                    <SelectTrigger className="w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(Role).map((role) => (
                        <SelectItem key={role} value={role}>
                          {role}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Badge variant={membership.isActive ? 'default' : 'secondary'}>
                    {membership.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
                <TableCell>
                  {membership.user.lastLoginAt
                    ? new Date(membership.user.lastLoginAt).toLocaleString()
                    : 'Never'}
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleToggleStatus(membership.id)}
                    disabled={!membership.isActive && membership.role === Role.ORG_ADMIN}
                  >
                    {membership.isActive ? 'Deactivate' : 'Activate'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleImpersonate(membership.id)}
                    disabled={!membership.isActive}
                  >
                    Impersonate
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
