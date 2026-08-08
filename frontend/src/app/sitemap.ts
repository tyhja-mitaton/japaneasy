import type { MetadataRoute } from 'next';
import { SITE_URL, fetchGrammarArticles } from '@/lib/site';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${SITE_URL}/grammar`,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
  ];

  let articles: Awaited<ReturnType<typeof fetchGrammarArticles>> = [];
  try {
    articles = await fetchGrammarArticles();
  } catch {
    // sitemap не должен падать целиком, если API недоступен
  }

  for (const article of articles) {
    entries.push({
      url: `${SITE_URL}/grammar/${article.code}`,
      lastModified: article.updated_at ? new Date(article.updated_at) : undefined,
      changeFrequency: 'monthly',
      priority: 0.6,
    });
  }

  return entries;
}
