'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Question, QuestionnaireTemplate, QuestionCategory } from '@prisma/client'
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
import {
  listTemplates,
  createTemplate,
  updateTemplate,
  archiveTemplate,
  unarchiveTemplate,
  reorderItems,
  getTemplate,
} from './actions'
import { listQuestions } from '../questions/actions'

const templateSchema = z.object({
  name: z.string().min(1).max(200),
  roleCategory: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
})

type TemplateWithCount = QuestionnaireTemplate & { _count: { items: number } }

const categoryLabels: Record<QuestionCategory, string> = {
  WORK_STYLE: 'Work Style',
  COLLABORATION: 'Collaboration',
  IMPACT: 'Impact',
  LEADERSHIP: 'Leadership',
  INTEGRITY: 'Integrity',
  OTHER: 'Other',
}

export function TemplateLibrary({
  initialTemplates,
  initialTemplateTotal,
  initialTemplatePageCount,
  initialQuestions,
  initialQuestionTotal,
  initialQuestionPageCount,
  isAdmin,
}: {
  initialTemplates: TemplateWithCount[]
  initialTemplateTotal: number
  initialTemplatePageCount: number
  initialQuestions: Question[]
  initialQuestionTotal: number
  initialQuestionPageCount: number
  isAdmin: boolean
}) {
  const [templates, setTemplates] = useState<TemplateWithCount[]>(initialTemplates)
  const [templateTotal, setTemplateTotal] = useState(initialTemplateTotal)
  const [templatePageCount, setTemplatePageCount] = useState(initialTemplatePageCount)
  const [templatePage, setTemplatePage] = useState(1)
  const [templateSearch, setTemplateSearch] = useState('')
  const [includeArchivedTemplates, setIncludeArchivedTemplates] = useState(false)

  const [availableQuestions, setAvailableQuestions] = useState<Question[]>(initialQuestions)
  const [questionPage, setQuestionPage] = useState(1)
  const [questionSearch, setQuestionSearch] = useState('')
  const [questionTotal, setQuestionTotal] = useState(initialQuestionTotal)
  const [questionPageCount, setQuestionPageCount] = useState(initialQuestionPageCount)

  const [error, setError] = useState('')
  const [editingTemplate, setEditingTemplate] = useState<TemplateWithCount | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [previewMode, setPreviewMode] = useState(false)
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([])
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(templateSchema),
    defaultValues: { name: '', roleCategory: '', description: '' },
  })

  const fetchTemplates = async (page: number) => {
    const result = await listTemplates({
      page,
      search: templateSearch,
      includeArchived: includeArchivedTemplates,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    })
    if ('error' in result) {
      setError(result.error || 'Failed to load templates')
      return
    }
    setTemplates(result.templates)
    setTemplateTotal(result.total)
    setTemplatePageCount(result.pageCount)
    setTemplatePage(page)
  }

  const fetchQuestions = async (page: number) => {
    const result = await listQuestions({
      page,
      search: questionSearch,
      includeArchived: false,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    })
    if ('error' in result) {
      setError(result.error || 'Failed to load questions')
      return
    }
    setAvailableQuestions(result.questions)
    setQuestionTotal(result.total)
    setQuestionPageCount(result.pageCount)
    setQuestionPage(page)
  }

  const openCreate = () => {
    setEditingTemplate(null)
    setSelectedQuestionIds([])
    setPreviewMode(false)
    reset({ name: '', roleCategory: '', description: '' })
    setEditorOpen(true)
  }

  const openEdit = async (template: TemplateWithCount) => {
    if (!isAdmin) {
      setPreviewMode(true)
      setEditingTemplate(template)
      setEditorOpen(true)
      return
    }
    setEditingTemplate(template)
    setPreviewMode(false)
    setValue('name', template.name)
    setValue('roleCategory', template.roleCategory)
    setValue('description', template.description || '')
    // Load selected questions from server
    const result = await getTemplate({ id: template.id })
    if ('error' in result) {
      setError(result.error || 'Failed to load template')
      return
    }
    setSelectedQuestionIds(
      result.template.items.map((item: { template: Question }) => item.template.id)
    )
    setEditorOpen(true)
  }

  const onSubmit = async (data: z.infer<typeof templateSchema>) => {
    setError('')
    if (selectedQuestionIds.length === 0) {
      setError('Select at least one question')
      return
    }

    const result = editingTemplate
      ? await updateTemplate({ id: editingTemplate.id, ...data }, selectedQuestionIds)
      : await createTemplate(data, selectedQuestionIds)

    if (result.error) {
      setError(result.error)
      return
    }

    setEditorOpen(false)
    setEditingTemplate(null)
    setSelectedQuestionIds([])
    reset()
    await fetchTemplates(1)
  }

  const toggleQuestion = (questionId: string) => {
    setSelectedQuestionIds((prev) =>
      prev.includes(questionId) ? prev.filter((id) => id !== questionId) : [...prev, questionId]
    )
  }

  const moveQuestion = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= selectedQuestionIds.length) return
    const next = [...selectedQuestionIds]
    const [moved] = next.splice(fromIndex, 1)
    next.splice(toIndex, 0, moved)
    setSelectedQuestionIds(next)
  }

  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleDrop = (index: number) => {
    if (draggedIndex === null) return
    moveQuestion(draggedIndex, index)
    setDraggedIndex(null)
  }

  const handleArchive = async (template: TemplateWithCount) => {
    setError('')
    const result = template.isArchived
      ? await unarchiveTemplate({ id: template.id })
      : await archiveTemplate({ id: template.id })
    if (result.error) {
      setError(result.error)
      return
    }
    await fetchTemplates(templatePage)
  }

  const selectedQuestions = selectedQuestionIds
    .map((id) => availableQuestions.find((q) => q.id === id))
    .filter(Boolean) as Question[]

  return (
    <div className="space-y-6">
      {error && <div className="p-3 text-sm text-red-700 bg-red-50 rounded-md">{error}</div>}

      <div className="flex flex-col md:flex-row gap-4 items-end">
        <div className="flex-1 w-full">
          <Label>Search templates</Label>
          <Input
            value={templateSearch}
            onChange={(e) => setTemplateSearch(e.target.value)}
            placeholder="Search by name or role category"
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={includeArchivedTemplates}
            onChange={(e) => setIncludeArchivedTemplates(e.target.checked)}
          />
          Show archived
        </label>
        <Button onClick={() => fetchTemplates(1)}>Filter</Button>
        {isAdmin && (
          <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
            <DialogTrigger>
              <Button onClick={openCreate}>Create template</Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingTemplate ? (previewMode ? 'Preview template' : 'Edit template') : 'Create template'}
                </DialogTitle>
              </DialogHeader>

              {previewMode ? (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold">{editingTemplate?.name}</h3>
                    <p className="text-sm text-zinc-500">{editingTemplate?.roleCategory}</p>
                  </div>
                  <div className="space-y-4">
                    {selectedQuestions.map((q, index) => (
                      <div key={q.id} className="p-4 border border-zinc-200 rounded-lg">
                        <div className="text-sm text-zinc-500 mb-1">Question {index + 1}</div>
                        <div className="font-medium">{q.text}</div>
                        {q.helpText && <div className="text-sm text-zinc-500 mt-1">{q.helpText}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label>Name</Label>
                      <Input {...register('name')} />
                      {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>}
                    </div>
                    <div>
                      <Label>Role category</Label>
                      <Input {...register('roleCategory')} />
                      {errors.roleCategory && (
                        <p className="text-sm text-red-600 mt-1">{errors.roleCategory.message}</p>
                      )}
                    </div>
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Input {...register('description')} />
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="font-semibold mb-2">Available questions</h3>
                      <Input
                        placeholder="Search questions..."
                        value={questionSearch}
                        onChange={(e) => setQuestionSearch(e.target.value)}
                        className="mb-2"
                      />
                      <div className="border border-zinc-200 rounded-lg max-h-[400px] overflow-y-auto">
                        {availableQuestions.map((q) => (
                          <label
                            key={q.id}
                            className="flex items-start gap-2 p-3 border-b border-zinc-100 cursor-pointer hover:bg-zinc-50"
                          >
                            <input
                              type="checkbox"
                              checked={selectedQuestionIds.includes(q.id)}
                              onChange={() => toggleQuestion(q.id)}
                            />
                            <div>
                              <div className="text-sm font-medium">{q.text}</div>
                              <div className="text-xs text-zinc-500">{categoryLabels[q.category]}</div>
                            </div>
                          </label>
                        ))}
                      </div>
                      <div className="flex justify-between items-center mt-2 text-sm">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={questionPage <= 1}
                          onClick={() => fetchQuestions(questionPage - 1)}
                          type="button"
                        >
                          Prev
                        </Button>
                        <span>
                          Page {questionPage} of {questionPageCount}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={questionPage >= questionPageCount}
                          onClick={() => fetchQuestions(questionPage + 1)}
                          type="button"
                        >
                          Next
                        </Button>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-semibold mb-2">Selected questions</h3>
                      <div className="border border-zinc-200 rounded-lg max-h-[400px] overflow-y-auto">
                        {selectedQuestions.length === 0 && (
                          <div className="p-4 text-sm text-zinc-500">No questions selected</div>
                        )}
                        {selectedQuestions.map((q, index) => (
                          <div
                            key={q.id}
                            draggable
                            onDragStart={() => handleDragStart(index)}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={() => handleDrop(index)}
                            className="p-3 border-b border-zinc-100 cursor-move hover:bg-zinc-50"
                          >
                            <div className="flex items-center justify-between">
                              <div className="text-sm font-medium">{index + 1}. {q.text}</div>
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => moveQuestion(index, index - 1)}
                                  type="button"
                                  disabled={index === 0}
                                >
                                  ↑
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => moveQuestion(index, index + 1)}
                                  type="button"
                                  disabled={index === selectedQuestions.length - 1}
                                >
                                  ↓
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => toggleQuestion(q.id)}
                                  type="button"
                                >
                                  ✕
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? 'Saving...' : editingTemplate ? 'Save changes' : 'Create'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setPreviewMode(true)}
                    >
                      Preview
                    </Button>
                  </div>
                </form>
              )}
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="border border-zinc-200 rounded-lg bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Role category</TableHead>
              <TableHead>Questions</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {templates.map((template) => (
              <TableRow key={template.id}>
                <TableCell>{template.name}</TableCell>
                <TableCell>{template.roleCategory}</TableCell>
                <TableCell>{template._count.items}</TableCell>
                <TableCell>
                  <Badge variant={template.isArchived ? 'secondary' : 'default'}>
                    {template.isArchived ? 'Archived' : 'Active'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <Button size="sm" variant="outline" onClick={() => openEdit(template)}>
                    {isAdmin ? 'Edit' : 'Preview'}
                  </Button>
                  {isAdmin && (
                    <Button size="sm" variant="outline" onClick={() => handleArchive(template)}>
                      {template.isArchived ? 'Unarchive' : 'Archive'}
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-sm">
        <div>{templateTotal} templates</div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={templatePage <= 1}
            onClick={() => fetchTemplates(templatePage - 1)}
          >
            Previous
          </Button>
          <span className="py-2">
            Page {templatePage} of {templatePageCount}
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={templatePage >= templatePageCount}
            onClick={() => fetchTemplates(templatePage + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}
