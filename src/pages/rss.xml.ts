import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getCollection } from 'astro:content';

export async function GET(context: APIContext) {
  const games = await getCollection('games');

  return rss({
    title: 'Règles du Jeu — Nouvelles règles de jeux de société',
    description:
      'Retrouvez les dernières règles de jeux de société ajoutées, expliquées simplement en français.',
    site: context.site!,
    items: games.map((game) => ({
      title: `Règles de ${game.data.title}`,
      description: game.data.description,
      link: `/jeux/${game.data.slug}/`,
    })),
    customData: '<language>fr</language>',
  });
}
