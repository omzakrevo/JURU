import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from '@/lib/env';

const PROTECTED = ['/app', '/admin'];

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isProtected = PROTECTED.some((p) => path === p || path.startsWith(p + '/'));
  if (!isSupabaseConfigured()) {
    // Instance non configurée : les pages publiques fonctionnent, les pages privées affichent le guide de configuration.
    return NextResponse.next();
  }
  let response = NextResponse.next({ request });
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list: { name: string; value: string; options: CookieOptions }[]) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  // getUser() valide le jeton auprès du serveur Auth (jamais se fier à getSession côté serveur)
  const { data: { user } } = await supabase.auth.getUser();
  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/connexion';
    url.searchParams.set('next', path);
    return NextResponse.redirect(url);
  }
  if (user && (path === '/connexion' || path === '/inscription')) {
    const url = request.nextUrl.clone();
    url.pathname = '/app';
    url.search = '';
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|ico)$).*)'] };
