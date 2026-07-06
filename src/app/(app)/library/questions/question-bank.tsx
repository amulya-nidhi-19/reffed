'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Question, QuestionCategory, Role } from '@prisma/client'
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
import { listQuestions, createQuestion, updateQuestion, archiveQuestion, unarchiveQuestion } from './actions'

const questionSchema = z.object({
  text: z.string().min(1).max(2000),
  helpText: z.string().max(2000).optional(),
  category: z.nativeEnum(QuestionCategory),
})

const categoryLabels: Record<QuestionCategory, string> = {
  WORK_STYLE: 'Work Style',
  COLLABORATION: 'Collaboration',
  IMPACT: 'Impact',
  LEADERSHIP: 'Leadership',
  INTEGRITY: 'Integrity',
  OTHER: 'Other',
}

export function QuestionBank({
  initialQuestions,
  initialTotal,
  initialPageCount,
  isAdmin,
}: {
  initialQuestions: Question[]
  initialTotal: number
  initialPageCount: number
  isAdmin: boolean
}) {
  const [questions, setQuestions] = useState<Question[]>(initialQuestions)
  const [total, setTotal] = useState(initialTotal)
  const [pageCount, setPageCount] = useState(initialPageCount)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<QuestionCategory | ''>('')
  const [includeArchived, setIncludeArchived] = useState(false)
  const [error, setError] = useState<string>('')
  const [editing, setEditing] = useState<Question | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(questionSchema),
    defaultValues: { text: '', helpText: '', category: QuestionCategory.WORK_STYLE },
  })

  const fetchQuestions = async (newPage: number) => {
    const result = await listQuestions({
      page: newPage,
      search,
      category: category || undefined,
      includeArchived,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    })
    if ('error' in result) {
      setError(result.error || 'Something went wrong')
      return
    }
    setQuestions(result.questions)
    setTotal(result.total)
    setPageCount(result.pageCount)
    setPage(newPage)
  }

  const onSubmit = async (data: z.infer<typeof questionSchema>) => {
    setError('')
    if (editing) {
      const result = await updateQuestion({ id: editing.id, ...data })
      if (result.error) {
        setError(result.error)
        return
      }
    } else {
      const result = await createQuestion(data)
      if (result.error) {
        setError(result.error)
        return
      }
    }
    setDialogOpen(false)
    setEditing(null)
    reset()
    await fetchQuestions(1)
  }

  const openEdit = (question: Question) => {
    if (!isAdmin) return
    setEditing(question)
    setValue('text', question.text)
    setValue('helpText', question.helpText ?? '')
    setValue('category', question.category)
    setDialogOpen(true)
  }

  const openCreate = () => {
    setEditing(null)
    reset({ text: '', helpText: '', category: QuestionCategory.WORK_STYLE })
    setDialogOpen(true)
  }

  const handleArchive = async (question: Question) => {
    setError('')
    const result = question.isArchived
      ? await unarchiveQuestion({ id: question.id })
      : await archiveQuestion({ id: question.id })
    if (result.error) {
      setError(result.error)
      return
    }
    await fetchQuestions(page)
  }

  return (
    <div className="space-y-6">
      {error && <div className="p-3 text-sm text-red-700 bg-red-50 rounded-md">{error}</div>}

      <div className="flex flex-col md:flex-row gap-4 items-end">
        <div className="flex-1 w-full">
          <Label>Search</Label>
          <Input
            placeholder="Search questions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="w-full md:w-48">
          <Label>Category</Label>
          <Select value={category} onValueChange={(v) => setCategory(v as QuestionCategory | '')}>
            <SelectTrigger>
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All</SelectItem>
              {Object.values(QuestionCategory).map((c) => (
                <SelectItem key={c} value={c}>
                  {categoryLabels[c]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={includeArchived}
            onChange={(e) => setIncludeArchived(e.target.checked)}
          />
          Show archived
        </label>
        <Button onClick={() => fetchQuestions(1)}>Filter</Button>
        {isAdmin && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger>
              <Button onClick={openCreate}>Create question</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editing ? 'Edit question' : 'Create question'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <Label>Question text</Label>
                  <textarea
                    className="w-full min-h-[100px] rounded-md border border-zinc-200 p-2"
                    {...register('text')}
                  />
                  {errors.text && <p className="text-sm text-red-600 mt-1">{errors.text.message}</p>}
                </div>
                <div>
                  <Label>Help text</Label>
                  <Input {...register('helpText')} />
                </div>
                <div>
                  <Label>Category</Label>
                  <Select
                    defaultValue={QuestionCategory.WORK_STYLE}
                    onValueChange={(v) => setValue('category', v as QuestionCategory)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(QuestionCategory).map((c) => (
                        <SelectItem key={c} value={c}>
                          {categoryLabels[c]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" disabled={isSubmitting} className="w-full">
                  {isSubmitting ? 'Saving...' : editing ? 'Save changes' : 'Create'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="border border-zinc-200 rounded-lg bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Text</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {questions.map((question) => (
              <TableRow key={question.id}>
                <TableCell>
                  <div className="max-w-md">
                    <div className="font-medium">{question.text}</div>
                    {question.helpText && (
                      <div className="text-sm text-zinc-500 mt-1">{question.helpText}</div>
                    )}
                  </div>
                </TableCell>
                <TableCell>{categoryLabels[question.category]}</TableCell>
                <TableCell>
                  <Badge variant={question.isArchived ? 'secondary' : 'default'}>
                    {question.isArchived ? 'Archived' : 'Active'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right space-x-2">
                  {isAdmin ? (
                    <>
                      <Button size="sm" variant="outline" onClick={() => openEdit(question)}>
                        Edit
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleArchive(question)}>
                        {question.isArchived ? 'Unarchive' : 'Archive'}
                      </Button>
                    </>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => openEdit(question)}>
                      Preview
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-sm">
        <div>{total} questions</div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={page <= 1}
            onClick={() => fetchQuestions(page - 1)}
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
            onClick={() => fetchQuestions(page + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}
