'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { signIn as nextAuthSignIn } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

const magicLinkSchema = z.object({
  email: z.string().email(),
})

export default function SignInPage() {
  const [error, setError] = useState<string | null>(null)
  const [magicLinkSent, setMagicLinkSent] = useState(false)

  const {
    register: registerCredentials,
    handleSubmit: handleCredentialsSubmit,
    formState: { errors: credentialsErrors, isSubmitting: isCredentialsSubmitting },
  } = useForm({
    resolver: zodResolver(credentialsSchema),
  })

  const {
    register: registerMagicLink,
    handleSubmit: handleMagicLinkSubmit,
    formState: { errors: magicLinkErrors, isSubmitting: isMagicLinkSubmitting },
  } = useForm({
    resolver: zodResolver(magicLinkSchema),
  })

  const onCredentialsSubmit = async (data: { email: string; password: string }) => {
    setError(null)
    const result = (await nextAuthSignIn('credentials', {
      email: data.email,
      password: data.password,
      redirectTo: '/select-tenant',
    })) as { error?: string; ok?: boolean } | undefined

    if (result?.error) {
      setError('Invalid email or password')
    }
  }

  const onMagicLinkSubmit = async (data: { email: string }) => {
    setError(null)
    setMagicLinkSent(false)

    const result = (await nextAuthSignIn('nodemailer', {
      email: data.email,
      redirect: false,
    })) as { error?: string; ok?: boolean } | undefined

    if (result?.error) {
      setError('Failed to send magic link')
      return
    }

    setMagicLinkSent(true)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-sm border border-zinc-200">
        <h1 className="text-2xl font-bold text-zinc-900 mb-2">Sign in to Reffed</h1>
        <p className="text-zinc-600 mb-6">Welcome back. Sign in with your password or a magic link.</p>

        {error && (
          <div className="mb-4 p-3 text-sm text-red-700 bg-red-50 rounded-md">
            {error}
          </div>
        )}

        {magicLinkSent && (
          <div className="mb-4 p-3 text-sm text-green-700 bg-green-50 rounded-md">
            Check your email for the magic link.
          </div>
        )}

        <Tabs defaultValue="password">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="password">Password</TabsTrigger>
            <TabsTrigger value="magic">Magic Link</TabsTrigger>
          </TabsList>

          <TabsContent value="password">
            <form onSubmit={handleCredentialsSubmit(onCredentialsSubmit)} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" {...registerCredentials('email')} />
                {credentialsErrors.email && (
                  <p className="text-sm text-red-600 mt-1">{credentialsErrors.email.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" {...registerCredentials('password')} />
                {credentialsErrors.password && (
                  <p className="text-sm text-red-600 mt-1">{credentialsErrors.password.message}</p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={isCredentialsSubmitting}>
                {isCredentialsSubmitting ? 'Signing in...' : 'Sign in'}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="magic">
            <form onSubmit={handleMagicLinkSubmit(onMagicLinkSubmit)} className="space-y-4">
              <div>
                <Label htmlFor="magic-email">Email</Label>
                <Input id="magic-email" type="email" {...registerMagicLink('email')} />
                {magicLinkErrors.email && (
                  <p className="text-sm text-red-600 mt-1">{magicLinkErrors.email.message}</p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={isMagicLinkSubmitting}>
                {isMagicLinkSubmitting ? 'Sending...' : 'Send magic link'}
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        <p className="mt-4 text-sm text-center text-zinc-600">
          Need an account? <a href="/sign-up" className="text-zinc-900 underline">Sign up</a>
        </p>
      </div>
    </div>
  )
}
