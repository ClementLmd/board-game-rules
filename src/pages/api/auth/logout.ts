import type { APIRoute } from 'astro';
import { createSupabaseServerClientFromRequest } from '../../../lib/supabase';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const { supabase } = createSupabaseServerClientFromRequest(request, cookies);
  await supabase.auth.signOut();
  return redirect('/');
};
