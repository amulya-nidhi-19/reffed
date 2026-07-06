import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const { nextUrl } = req
  const isAuthenticated = !!req.auth?.user?.id

  const isAppRoute = nextUrl.pathname.startsWith('/dashboard')

  if (!isAuthenticated && isAppRoute) {
    return NextResponse.redirect(new URL('/sign-in', nextUrl))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/dashboard/:path*', '/select-tenant'],
}
