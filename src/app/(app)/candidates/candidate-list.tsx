'use client'

import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { Candidate, CandidateStatus, QuestionnaireTemplate } from '@prisma/client'
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
import { listCandidates, createCandidate } from './actions'

type TemplateWithCount = QuestionnaireTemplate & { _count: { items: number } }

type CandidateRow = Candidate & { questionnaire: { frozenAt: Date }[] }

const candidateSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email().max(255),
  phone: z.string().max(50).optional(),
  roleTitle: z.string().min(1).max(200),
  notes: z.string().max(2000).optional(),
  templateId: z.string().cuid(),
})

const statusLabels: Record<CandidateStatus, string> = {
  ACTIVE: 'Active',
  ARCHIVED: 'Archived',
  DELETED_DPDP: 'Deleted (DPDP)',
}

export function CandidateList({
  initialCandidates,
  initialTotal,
  initialPageCount,
  templates,
}: {
  initialCandidates: CandidateRow[]
  initialTotal: number
  initialPageCount: number
  templates: TemplateWithCount[]
}) {
  const [candidates, setCandidates] = useState<CandidateRow[]>(initialCandidates)
  const [total, setTotal] = useState(initialTotal)
  const [pageCount, setPageCount] = useState(initialPageCount)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<CandidateStatus | ''>('')
  const [error, setError] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [step, setStep] = useState(1)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(candidateSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      roleTitle: '',
      notes: '',
      templateId: '',
    },
  })

  const values = useWatch({ control })
  const selectedTemplate = templates.find((t) => t.id === values.templateId)

  const fetchCandidates = async (newPage: number) => {
    const result = await listCandidates({
      page: newPage,
      search,
      status: status || undefined,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    })
    if ('error' in result) {
      setError(result.error || 'Failed to load candidates')
      return
    }
    setCandidates(result.candidates)
    setTotal(result.total)
    setPageCount(result.pageCount)
    setPage(newPage)
  }

  const openCreate = () => {
    reset()
    setStep(1)
    setError('')
    setDialogOpen(true)
  }

  const onSubmit = async (data: z.infer<typeof candidateSchema>) => {
    setError('')
    const result = await createCandidate(data)
    if (result.error) {
      setError(result.error)
      return
    }
    setDialogOpen(false)
    reset()
    setStep(1)
    await fetchCandidates(1)
  }

  return (
    <div className="space-y-6">
      {error && <div className="p-3 text-sm text-red-700 bg-red-50 rounded-md">{error}</div>}

      <div className="flex flex-col md:flex-row gap-4 items-end">
        <div className="flex-1 w-full">
          <Label>Search</Label>
          <Input
            placeholder="Search by name or email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="w-full md:w-48">
          <Label>Status</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as CandidateStatus | '')}>
            <SelectTrigger>
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All</SelectItem>
              {Object.values(CandidateStatus).map((s: CandidateStatus) => (
                <SelectItem key={s} value={s}>
                  {statusLabels[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => fetchCandidates(1)}>Filter</Button>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger>
            <Button onClick={openCreate}>Add candidate</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add candidate</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {step === 1 && (
                <div className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label>First name</Label>
                      <Input {...register('firstName')} />
                      {errors.firstName && <p className="text-sm text-red-600 mt-1">{errors.firstName.message}</p>}
                    </div>
                    <div>
                      <Label>Last name</Label>
                      <Input {...register('lastName')} />
                      {errors.lastName && <p className="text-sm text-red-600 mt-1">{errors.lastName.message}</p>}
                    </div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label>Email</Label>
                      <Input type="email" {...register('email')} />
                      {errors.email && <p className="text-sm text-red-600 mt-1">{errors.email.message}</p>}
                    </div>
                    <div>
                      <Label>Phone</Label>
                      <Input {...register('phone')} />
                    </div>
                  </div>
                  <div>
                    <Label>Role title</Label>
                    <Input {...register('roleTitle')} />
                    {errors.roleTitle && <p className="text-sm text-red-600 mt-1">{errors.roleTitle.message}</p>}
                  </div>
                  <div>
                    <Label>Notes</Label>
                    <Input {...register('notes')} />
                  </div>
                  <div>
                    <Label>Questionnaire template</Label>
                    <Select onValueChange={(v: string | null) => { if (v) setValue('templateId', v) }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a template" />
                      </SelectTrigger>
                      <SelectContent>
                        {templates.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.name} ({t._count.items} questions)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.templateId && <p className="text-sm text-red-600 mt-1">{errors.templateId.message}</p>}
                  </div>
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      onClick={() => setStep(2)}
                      disabled={!selectedTemplate}
                    >
                      Continue
                    </Button>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-md text-sm text-amber-800">
                    <strong>Warning:</strong> Once created, the questionnaire for this candidate is{' '}
                    <strong>FROZEN</strong>. You cannot change questions later.
                  </div>
                  <div className="space-y-2 text-sm">
                    <p>
                      <strong>Name:</strong> {values.firstName} {values.lastName}
                    </p>
                    <p>
                      <strong>Email:</strong> {values.email}
                    </p>
                    <p>
                      <strong>Role:</strong> {values.roleTitle}
                    </p>
                    <p>
                      <strong>Template:</strong> {selectedTemplate?.name} ({selectedTemplate?._count.items} questions)
                    </p>
                  </div>
                  <div className="flex justify-between">
                    <Button type="button" variant="outline" onClick={() => setStep(1)}>
                      Back
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? 'Creating...' : 'Confirm and freeze'}
                    </Button>
                  </div>
                </div>
              )}
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
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Questionnaire</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {candidates.map((candidate) => (
              <TableRow key={candidate.id}>
                <TableCell>
                  {candidate.firstName} {candidate.lastName}
                </TableCell>
                <TableCell>{candidate.email}</TableCell>
                <TableCell>{candidate.roleTitle}</TableCell>
                <TableCell>
                  <Badge variant={candidate.status === 'ACTIVE' ? 'default' : 'secondary'}>
                    {statusLabels[candidate.status]}
                  </Badge>
                </TableCell>
                <TableCell>
                  {candidate.questionnaire.length > 0 ? (
                    <span className="text-sm text-zinc-500">
                      Frozen at {new Date(candidate.questionnaire[0].frozenAt).toLocaleString()}
                    </span>
                  ) : (
                    <span className="text-sm text-zinc-400">No questionnaire</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <Link href={`/candidates/${candidate.id}`}>
                    <Button size="sm" variant="outline">
                      View
                    </Button>
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-sm">
        <div>{total} candidates</div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={page <= 1}
            onClick={() => fetchCandidates(page - 1)}
          >
            Previous
          </Button>
          <span className="py-2">
            Page {page} of {pageCount}
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={page >= pageCount}
            onClick={() => fetchCandidates(page + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}
