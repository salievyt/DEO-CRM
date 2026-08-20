import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();

  // Удаляем старые групповые маршруты если кто-то попал на них
  if (url.pathname.startsWith('/(studio)') || url.pathname.startsWith('/(public)')) {
    url.pathname = url.pathname.replace('/(studio)', '/studio').replace('/(public)', '/crm');
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

// Настройка матчинга маршрутов
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
};