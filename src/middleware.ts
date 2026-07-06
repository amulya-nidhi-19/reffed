import { getToken } from 'next-auth/jwt'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const { nextUrl } = req
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })

  const isAppRoute = nextUrl.pathname.startsWith('/dashboard')
  const isAuthenticated = !!token?.id

  if (isAppRoute && !isAuthenticated) {
    return NextResponse.redirect(new URL('/sign-in', nextUrl))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/settings/:path*', '/select-tenant'],
}
