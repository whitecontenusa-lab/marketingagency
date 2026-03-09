import { NextRequest, NextResponse } from 'next/server'

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (pathname.startsWith('/dashboard')) {
    const token = req.cookies.get('session-token')?.value
    if (!token) return NextResponse.redirect(new URL('/login', req.url))
  }

  if (pathname.startsWith('/cliente/portal')) {
    const token = req.cookies.get('client-session-token')?.value
    if (!token) return NextResponse.redirect(new URL('/cliente/login', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/cliente/portal/:path*'],
}
