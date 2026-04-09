import type { APIRoute } from 'astro';
import { createSupabaseServerClientFromRequest } from '../../../../lib/supabase';
import type { Competition } from '../../../../lib/database.types';

export const prerender = false;

export const POST: APIRoute = async ({ params, request, cookies, redirect }) => {
  const { supabase } = createSupabaseServerClientFromRequest(request, cookies);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const competitionId = params.id!;
  const formData = await request.formData();
  const status = formData.get('status') as Competition['status'];

  // Verify admin
  const { data: competition } = await supabase
    .from('competitions')
    .select('admin_id')
    .eq('id', competitionId)
    .maybeSingle();

  const adminId = (competition as { admin_id: string } | null)?.admin_id;
  if (!adminId || adminId !== user.id) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
  }

  await supabase
    .from('competitions')
    .update({ status })
    .eq('id', competitionId);

  return redirect(`/competitions/${competitionId}/manage/`);
};
