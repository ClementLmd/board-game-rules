import { defineMiddleware } from 'astro:middleware';
import { createSupabaseServerClientFromRequest } from './lib/supabase';

export const onRequest = defineMiddleware(async (context, next) => {
  // Skip middleware when Supabase is not configured (build time, static pages)
  const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    context.locals.user = null;
    // @ts-expect-error supabase not available without credentials
    context.locals.supabase = null;
    return next();
  }

  const { supabase, responseHeaders } = createSupabaseServerClientFromRequest(
    context.request,
    context.cookies
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  context.locals.user = user ?? null;
  context.locals.supabase = supabase;

  const response = await next();

  responseHeaders.forEach((value, key) => {
    if (key.toLowerCase() === 'set-cookie') {
      response.headers.append(key, value);
    }
  });

  return response;
});
