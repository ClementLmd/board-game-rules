import type { APIRoute } from 'astro';
import { createSupabaseServerClientFromRequest } from '../../../../lib/supabase';

export const prerender = false;

export const POST: APIRoute = async ({ params, request, cookies }) => {
  const { supabase } = createSupabaseServerClientFromRequest(request, cookies);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const competitionId = params.id!;

  // Check if already a member
  const { data: existing } = await supabase
    .from('competition_members')
    .select('id, status')
    .eq('competition_id', competitionId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (existing && 'status' in existing) {
    const s = (existing as { status: string }).status;
    // Already accepted or awaiting review: nothing to do.
    if (s === 'accepted' || s === 'pending') {
      return new Response(JSON.stringify({ status: s }), { status: 200 });
    }
    // Previously rejected: re-request by re-using the existing row (the unique
    // (competition_id, user_id) constraint forbids a second insert).
    const { error } = await supabase
      .from('competition_members')
      .update({ status: 'pending' })
      .eq('competition_id', competitionId)
      .eq('user_id', user.id);

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 400 });
    }
    return new Response(JSON.stringify({ status: 'pending' }), { status: 200 });
  }

  const { error } = await supabase.from('competition_members').insert({
    competition_id: competitionId,
    user_id: user.id,
    status: 'pending',
  });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400 });
  }

  return new Response(JSON.stringify({ status: 'pending' }), { status: 201 });
};
