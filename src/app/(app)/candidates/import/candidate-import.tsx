'use client'

import { useState } from 'react'
import { QuestionnaireTemplate } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { bulkImportCandidates } from '../actions'

type TemplateWithCount = QuestionnaireTemplate & { _count: { items: number } }

type CsvRow = {
  firstName: string
  lastName: string
  email: string
  phone?: string
  roleTitle: string
  templateName: string
  _valid?: boolean
  _error?: string
}

export function CandidateImport({ templates }: { templates: TemplateWithCount[] }) {
  const [rows, setRows] = useState<CsvRow[]>([])
  const [error, setError] = useState('')
  const [result, setResult] = useState<{
    success: number
    failed: number
    errors: { row: number; message: string }[]
  } | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const parseCsv = (text: string): CsvRow[] => {
    const lines = text.split(/\r?\n/).filter((line) => line.trim())
    if (lines.length < 2) return []
    const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''))
    const expected = ['firstName', 'lastName', 'email', 'phone', 'roleTitle', 'templateName']
    if (!expected.every((h) => headers.includes(h))) {
      setError(`CSV must include columns: ${expected.join(', ')}`)
      return []
    }

    return lines.slice(1).map((line) => {
      const values = line.split(',').map((v) => v.trim().replace(/^"|"$/g, ''))
      const row: Record<string, string> = {}
      headers.forEach((h, i) => {
        row[h] = values[i] || ''
      })
      return row as unknown as CsvRow
    })
  }

  const validateRows = (parsedRows: CsvRow[]): CsvRow[] => {
    const templateNames = new Set(templates.map((t) => t.name))
    return parsedRows.map((row) => {
      const errors: string[] = []
      if (!row.firstName) errors.push('firstName is required')
      if (!row.lastName) errors.push('lastName is required')
      if (!row.email || !row.email.includes('@')) errors.push('email is invalid')
      if (!row.roleTitle) errors.push('roleTitle is required')
      if (!row.templateName) errors.push('templateName is required')
      if (row.templateName && !templateNames.has(row.templateName)) {
        errors.push(`template "${row.templateName}" not found`)
      }
      return {
        ...row,
        _valid: errors.length === 0,
        _error: errors.join(', '),
      }
    })
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')
    setResult(null)
    const reader = new FileReader()
    reader.onload = (event) => {
      const text = String(event.target?.result || '')
      const parsed = parseCsv(text)
      if (parsed.length > 0) {
        setRows(validateRows(parsed))
      }
    }
    reader.readAsText(file)
  }

  const handleImport = async () => {
    const validRows = rows.filter((r) => r._valid)
    if (validRows.length === 0) {
      setError('No valid rows to import')
      return
    }
    setIsSubmitting(true)
    setError('')
    const result = await bulkImportCandidates({
      rows: validRows.map((r) => ({
        firstName: r.firstName,
        lastName: r.lastName,
        email: r.email,
        phone: r.phone,
        roleTitle: r.roleTitle,
        templateName: r.templateName,
      })),
    })
    setIsSubmitting(false)
    if ('error' in result) {
      setError(result.error || 'Import failed')
      return
    }
    setResult(result.results)
  }

  return (
    <div className="space-y-6">
      {error && <div className="p-3 text-sm text-red-700 bg-red-50 rounded-md">{error}</div>}

      <div className="p-4 border border-zinc-200 rounded-lg bg-white space-y-4">
        <div>
          <Label>CSV file</Label>
          <p className="text-sm text-zinc-500 mb-2">
            Required columns: firstName, lastName, email, phone, roleTitle, templateName
          </p>
          <Input type="file" accept=".csv" onChange={handleFileChange} />
        </div>

        {rows.length > 0 && (
          <>
            <div className="border border-zinc-200 rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Row</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Template</TableHead>
                    <TableHead>Valid</TableHead>
                    <TableHead>Error</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row, index) => (
                    <TableRow key={index}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>
                        {row.firstName} {row.lastName}
                      </TableCell>
                      <TableCell>{row.email}</TableCell>
                      <TableCell>{row.roleTitle}</TableCell>
                      <TableCell>{row.templateName}</TableCell>
                      <TableCell>{row._valid ? 'Yes' : 'No'}</TableCell>
                      <TableCell className="text-red-600 text-sm">{row._error}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex justify-between items-center">
              <div className="text-sm">
                {rows.filter((r) => r._valid).length} valid / {rows.length} total
              </div>
              <Button onClick={handleImport} disabled={isSubmitting}>
                {isSubmitting ? 'Importing...' : 'Import valid rows'}
              </Button>
            </div>
          </>
        )}

        {result && (
          <div className="p-4 bg-zinc-50 rounded-lg text-sm space-y-2">
            <p>
              <strong>Import complete:</strong> {result.success} succeeded, {result.failed} failed
            </p>
            {result.errors.length > 0 && (
              <ul className="list-disc list-inside text-red-600">
                {result.errors.map((err, i) => (
                  <li key={i}>
                    Row {err.row}: {err.message}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
