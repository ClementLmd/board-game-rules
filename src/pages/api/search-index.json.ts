import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

export const prerender = true;

export const GET: APIRoute = async () => {
  const games = await getCollection('games');

  const searchIndex = games.map((game) => ({
    title: game.data.title,
    slug: game.data.slug,
    description: game.data.description,
    categories: game.data.categories,
    players: game.data.players,
    duration: game.data.duration,
    age: game.data.age,
    difficulty: game.data.difficulty,
  }));

  return new Response(JSON.stringify(searchIndex), {
    headers: { 'Content-Type': 'application/json' },
  });
};
