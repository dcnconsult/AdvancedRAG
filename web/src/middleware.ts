import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Protected routes that require authentication
const protectedRoutes = [
  '/query-builder',
  '/results', 
  '/sessions'
]

// Public routes that redirect authenticated users
const publicRoutes = [
  '/login',
  '/signup',
  '/auth'
]

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Check if the current route is protected
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))

  // For now, we'll handle authentication checks client-side
  // The AuthGuard component will handle redirects
  // This middleware can be enhanced later with server-side session validation

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
