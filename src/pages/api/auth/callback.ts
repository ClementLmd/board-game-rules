import type { APIRoute } from 'astro';
import { createSupabaseServerClientFromRequest } from '../../../lib/supabase';

export const prerender = false;

/**
 * Only accept same-origin relative paths as a post-login destination, to avoid
 * an open redirect (e.g. ?next=https://evil.com or ?next=//evil.com).
 */
function safeNext(raw: string | null): string {
  const fallback = '/competitions/';
  if (!raw) return fallback;
  if (!raw.startsWith('/') || raw.startsWith('//')) return fallback;
  return raw;
}

export const GET: APIRoute = async ({ request, cookies, redirect }) => {
  const { supabase } = createSupabaseServerClientFromRequest(request, cookies);
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const next = safeNext(url.searchParams.get('next'));

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return redirect(next);
    }
  }

  return redirect('/auth/login?error=auth_callback_failed');
};
