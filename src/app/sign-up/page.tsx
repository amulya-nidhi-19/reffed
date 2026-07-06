'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { signUp } from './actions'

const signUpSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  tenantName: z.string().min(1),
  tenantSlug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  dpdpConsent: z.literal(true),
})

type SignUpForm = z.infer<typeof signUpSchema>

export default function SignUpPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpForm>({
    resolver: zodResolver(signUpSchema),
  })

  const onSubmit = async (data: SignUpForm) => {
    setIsPending(true)
    setError(null)

    const result = await signUp(data)

    if (result.error) {
      setError(result.error)
      setIsPending(false)
      return
    }

    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-sm border border-zinc-200">
        <h1 className="text-2xl font-bold text-zinc-900 mb-2">Create your Reffed account</h1>
        <p className="text-zinc-600 mb-6">Start verifying candidates before your first interview.</p>

        {error && (
          <div className="mb-4 p-3 text-sm text-red-700 bg-red-50 rounded-md">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="name">Full name</Label>
            <Input id="name" type="text" {...register('name')} />
            {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...register('email')} />
            {errors.email && <p className="text-sm text-red-600 mt-1">{errors.email.message}</p>}
          </div>

          <div>
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" {...register('password')} />
            {errors.password && <p className="text-sm text-red-600 mt-1">{errors.password.message}</p>}
          </div>

          <div>
            <Label htmlFor="tenantName">Organization name</Label>
            <Input id="tenantName" type="text" {...register('tenantName')} />
            {errors.tenantName && <p className="text-sm text-red-600 mt-1">{errors.tenantName.message}</p>}
          </div>

          <div>
            <Label htmlFor="tenantSlug">Organization slug</Label>
            <Input id="tenantSlug" type="text" placeholder="acme-talent" {...register('tenantSlug')} />
            {errors.tenantSlug && <p className="text-sm text-red-600 mt-1">{errors.tenantSlug.message}</p>}
          </div>

          <div className="flex items-start gap-3">
            <Checkbox id="dpdpConsent" {...register('dpdpConsent')} />
            <Label htmlFor="dpdpConsent" className="text-sm font-normal">
              I consent to the collection and processing of my personal data under India&apos;s DPDP Act.
            </Label>
          </div>
          {errors.dpdpConsent && <p className="text-sm text-red-600">{errors.dpdpConsent.message}</p>}

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? 'Creating account...' : 'Create account'}
          </Button>
        </form>

        <p className="mt-4 text-sm text-center text-zinc-600">
          Already have an account? <a href="/sign-in" className="text-zinc-900 underline">Sign in</a>
        </p>
      </div>
    </div>
  )
}
