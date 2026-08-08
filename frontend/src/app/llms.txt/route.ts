import { SITE_URL, fetchGrammarArticles } from '@/lib/site';

export const dynamic = 'force-dynamic';

export async function GET() {
  const lines = [
    '# JapanEasy',
    '',
    '> Японский язык для начинающих: загружай тексты, смотри переводы, разбирай грамматику, пополняй словарь и учись по видео.',
    '',
    'Документация для LLM:',
    '',
    `- Справочник по японской грамматике (статьи): ${SITE_URL}/grammar`,
    `- Загрузка текста для разбора: ${SITE_URL}/texts`,
    `- Видео для изучения японского: ${SITE_URL}/video`,
    '',
    'Грамматические статьи:',
    '',
  ];

  try {
    const articles = await fetchGrammarArticles();
    for (const article of articles) {
      const info = article.info ? ` - ${article.info}` : '';
      lines.push(
        `- [${article.title}](${SITE_URL}/grammar/${article.code}): ${article.code}${info}`,
      );
    }
  } catch {
    lines.push('- Список статей временно недоступен.');
  }

  return new Response(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
