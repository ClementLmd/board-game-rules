import type { APIRoute } from 'astro';
import { createSupabaseServerClientFromRequest } from '../../../lib/supabase';

export const prerender = false;

export const GET: APIRoute = async ({ request, cookies, redirect }) => {
  const { supabase } = createSupabaseServerClientFromRequest(request, cookies);
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') ?? '/competitions/';

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return redirect(next);
    }
  }

  return redirect('/auth/login?error=auth_callback_failed');
};
