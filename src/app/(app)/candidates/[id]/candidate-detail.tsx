'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Candidate, Referee, RefereeStatus } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { addReferee, remindReferee, revokeReferee } from '../actions'

const refereeSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().max(255),
  relationship: z.string().min(1).max(200),
})

const statusLabels: Record<RefereeStatus, string> = {
  INVITED: 'Invited',
  REMINDED: 'Reminded',
  SUBMITTED: 'Submitted',
  REVOKED: 'Revoked',
}

type CandidateWithRelations = Candidate & {
  questionnaire: { templateSnapshot: unknown; frozenAt: Date }[]
  createdBy: { name: string | null; email: string | null } | null
  referees: Referee[]
}

export function CandidateDetail({
  candidate,
  snapshot,
}: {
  candidate: CandidateWithRelations
  snapshot: Record<string, unknown> | undefined
}) {
  const [activeTab, setActiveTab] = useState('overview')
  const [referees, setReferees] = useState<Referee[]>(candidate.referees)
  const [error, setError] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [reminderError, setReminderError] = useState<Record<string, string>>({})

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(refereeSchema),
    defaultValues: { name: '', email: '', relationship: '' },
  })

  const onSubmit = async (data: z.infer<typeof refereeSchema>) => {
    setError('')
    const result = await addReferee({ candidateId: candidate.id, ...data })
    if (result.error || !result.referee) {
      setError(result.error || 'Failed to add referee')
      return
    }
    setReferees((prev) => [result.referee, ...prev])
    setDialogOpen(false)
    reset()
  }

  const handleRemind = async (referee: Referee) => {
    setReminderError((prev) => ({ ...prev, [referee.id]: '' }))
    const result = await remindReferee({ id: referee.id })
    if (result.error || !result.referee) {
      setReminderError((prev) => ({ ...prev, [referee.id]: result.error || 'Failed to send reminder' }))
      return
    }
    setReferees((prev) =>
      prev.map((r) => (r.id === result.referee.id ? result.referee : r))
    )
  }

  const handleRevoke = async (referee: Referee) => {
    const result = await revokeReferee({ id: referee.id })
    if (result.error || !result.referee) return
    setReferees((prev) =>
      prev.map((r) => (r.id === result.referee.id ? result.referee : r))
    )
  }

  const items = Array.isArray(snapshot?.items) ? snapshot.items : []

  return (
    <div className="space-y-6">
      {error && <div className="p-3 text-sm text-red-700 bg-red-50 rounded-md">{error}</div>}

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">
            {candidate.firstName} {candidate.lastName}
          </h1>
          <p className="text-zinc-500">{candidate.email}</p>
          <div className="flex gap-2 mt-2">
            <Badge>{candidate.roleTitle}</Badge>
            <Badge variant={candidate.status === 'ACTIVE' ? 'default' : 'secondary'}>
              {candidate.status}
            </Badge>
          </div>
          <p className="text-sm text-zinc-500 mt-2">
            Created by {candidate.createdBy?.name ?? candidate.createdBy?.email} on{' '}
            {new Date(candidate.createdAt).toLocaleString()}
          </p>
        </div>
      </div>

      <div className="border-b border-zinc-200">
        <nav className="flex gap-4">
          {['overview', 'referees', 'responses', 'report'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-2 px-1 text-sm font-medium capitalize ${
                activeTab === tab
                  ? 'border-b-2 border-zinc-900 text-zinc-900'
                  : 'text-zinc-500 hover:text-zinc-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-4">
          <div className="p-4 border border-zinc-200 rounded-lg bg-white">
            <h3 className="font-semibold mb-2">Questionnaire</h3>
            {candidate.questionnaire.length > 0 ? (
              <div className="text-sm text-zinc-600 space-y-2">
                <p>
                  <strong>Template:</strong> {String(snapshot?.templateName ?? 'Unknown')}
                </p>
                <p>
                  <strong>Frozen at:</strong> {new Date(candidate.questionnaire[0].frozenAt).toLocaleString()}
                </p>
                <p>
                  <strong>Questions:</strong> {items.length}
                </p>
              </div>
            ) : (
              <p className="text-sm text-zinc-500">No questionnaire frozen.</p>
            )}
          </div>
          <div className="p-4 border border-zinc-200 rounded-lg bg-white">
            <h3 className="font-semibold mb-2">Notes</h3>
            <p className="text-sm text-zinc-600">{candidate.notes || 'No notes'}</p>
          </div>
          {items.length > 0 && (
            <div className="p-4 border border-zinc-200 rounded-lg bg-white">
              <h3 className="font-semibold mb-2">Frozen questions</h3>
              <ol className="list-decimal list-inside space-y-2 text-sm text-zinc-700">
                {items.map((item: { text: string; helpText?: string | null }, index: number) => (
                  <li key={index}>
                    {item.text}
                    {item.helpText && (
                      <div className="text-zinc-500 ml-5">{item.helpText}</div>
                    )}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}

      {activeTab === 'referees' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold">Referees</h3>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger>
                <Button>Add referee</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add referee</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div>
                    <Label>Name</Label>
                    <Input {...register('name')} />
                    {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>}
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input type="email" {...register('email')} />
                    {errors.email && <p className="text-sm text-red-600 mt-1">{errors.email.message}</p>}
                  </div>
                  <div>
                    <Label>Relationship</Label>
                    <Input {...register('relationship')} placeholder="e.g. Manager at Acme" />
                    {errors.relationship && (
                      <p className="text-sm text-red-600 mt-1">{errors.relationship.message}</p>
                    )}
                  </div>
                  <Button type="submit" disabled={isSubmitting} className="w-full">
                    {isSubmitting ? 'Sending...' : 'Send invite'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="border border-zinc-200 rounded-lg bg-white overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Relationship</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Invited</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {referees.map((referee) => (
                  <TableRow key={referee.id}>
                    <TableCell>{referee.name}</TableCell>
                    <TableCell>{referee.email}</TableCell>
                    <TableCell>{referee.relationship}</TableCell>
                    <TableCell>
                      <Badge variant={referee.status === 'SUBMITTED' ? 'default' : 'secondary'}>
                        {statusLabels[referee.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(referee.invitedAt).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right space-x-2">
                      {referee.status !== RefereeStatus.REVOKED &&
                        referee.status !== RefereeStatus.SUBMITTED && (
                          <>
                            <Button size="sm" variant="outline" onClick={() => handleRemind(referee)}>
                              Remind
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleRevoke(referee)}>
                              Revoke
                            </Button>
                          </>
                        )}
                      {reminderError[referee.id] && (
                        <div className="text-xs text-red-600 mt-1">{reminderError[referee.id]}</div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {activeTab === 'responses' && (
        <div className="p-4 border border-zinc-200 rounded-lg bg-white">
          <p className="text-sm text-zinc-500">Responses will appear here once referees submit.</p>
        </div>
      )}

      {activeTab === 'report' && (
        <div className="p-4 border border-zinc-200 rounded-lg bg-white">
          <p className="text-sm text-zinc-500">Report generation is coming soon.</p>
        </div>
      )}
    </div>
  )
}
