import type { APIRoute } from 'astro';
import { createSupabaseServerClientFromRequest } from '../../../lib/supabase';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  const { supabase } = createSupabaseServerClientFromRequest(request, cookies);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return new Response(JSON.stringify({ error: 'Connectez-vous pour rejoindre une compétition.' }), { status: 401 });
  }

  const body = await request.json();
  const code = (body.code ?? '').trim().toUpperCase();

  if (!code) {
    return new Response(JSON.stringify({ error: 'Code manquant.' }), { status: 400 });
  }

  // Find competition by code
  const { data: competition } = await supabase
    .from('competitions')
    .select('id, name, admin_id, status')
    .eq('invite_code', code)
    .maybeSingle();

  if (!competition) {
    return new Response(JSON.stringify({ error: 'Code invalide. Vérifiez le code et réessayez.' }), { status: 404 });
  }

  if (competition.status === 'finished') {
    return new Response(JSON.stringify({ error: 'Cette compétition est terminée.' }), { status: 400 });
  }

  const comp = competition as { id: string; name: string; admin_id: string; status: string };

  // Admin joining their own competition makes no sense
  if (comp.admin_id === user.id) {
    return new Response(
      JSON.stringify({ error: 'Vous êtes déjà l\'administrateur de cette compétition.' }),
      { status: 400 }
    );
  }

  // Check if already a member
  const { data: existing } = await supabase
    .from('competition_members')
    .select('id, status')
    .eq('competition_id', comp.id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (existing && 'status' in existing) {
    const s = (existing as { status: string }).status;
    if (s === 'accepted') {
      return new Response(
        JSON.stringify({ error: 'Vous êtes déjà membre de cette compétition.', competition_id: comp.id }),
        { status: 400 }
      );
    }
    if (s === 'pending') {
      return new Response(
        JSON.stringify({ error: 'Votre demande est déjà en attente.', competition_id: comp.id }),
        { status: 400 }
      );
    }
  }

  // Create membership request
  const { error } = await supabase.from('competition_members').insert({
    competition_id: comp.id,
    user_id: user.id,
    status: 'pending',
  });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400 });
  }

  return new Response(
    JSON.stringify({
      status: 'pending',
      competition_id: comp.id,
      competition_name: comp.name,
    }),
    { status: 201 }
  );
};
