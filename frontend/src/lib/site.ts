export const SITE_URL =
  process.env.SITE_URL || process.env.APP_URL || 'http://localhost:8080';

const API_INTERNAL =
  process.env.API_INTERNAL_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://laravel:8000';

export type GrammarArticleMeta = {
  code: string;
  title: string;
  info: string | null;
  updated_at: string | null;
};

type PaginatedResponse<T> = {
  data: T[];
  meta?: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
};

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`API request failed: ${res.status} ${url}`);
  return res.json() as Promise<T>;
}

export async function fetchGrammarArticles(): Promise<GrammarArticleMeta[]> {
  const first = await fetchJson<PaginatedResponse<GrammarArticleMeta>>(
    `${API_INTERNAL}/api/grammar-articles?page=1`,
  );
  const lastPage = first.meta?.last_page ?? 1;
  const articles = [...first.data];

  for (let page = 2; page <= lastPage; page++) {
    const next = await fetchJson<PaginatedResponse<GrammarArticleMeta>>(
      `${API_INTERNAL}/api/grammar-articles?page=${page}`,
    );
    articles.push(...next.data);
  }

  return articles;
}

export async function fetchGrammarArticle(
  code: string,
): Promise<GrammarArticleMeta | null> {
  try {
    return await fetchJson<GrammarArticleMeta>(
      `${API_INTERNAL}/api/grammar-articles/${encodeURIComponent(code)}`,
    );
  } catch {
    return null;
  }
}

export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}
