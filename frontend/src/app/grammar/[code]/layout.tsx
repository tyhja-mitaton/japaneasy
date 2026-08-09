import type { Metadata } from "next";
import { cache } from "react";
import { SITE_URL, fetchGrammarArticle } from "@/lib/site";

const getArticle = cache(fetchGrammarArticle);

type Props = {
  params: Promise<{ code: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  const article = await getArticle(code);

  if (!article) {
    return {
      title: "Справочник по японской грамматике — JapanEasy",
    };
  }

  const url = `/grammar/${article.code}`;

  return {
    title: `${article.title} — JapanEasy`,
    description: article.info || undefined,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      title: `${article.title} — JapanEasy`,
      description: article.info || undefined,
      url,
    },
  };
}

export default async function GrammarArticleLayout({
  children,
  params,
}: Readonly<{ children: React.ReactNode; params: Props["params"] }>) {
  const { code } = await params;
  const article = await getArticle(code);

  const jsonLd = article
    ? {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: article.title,
        description: article.info ?? undefined,
        inLanguage: "ru",
        url: `${SITE_URL}/grammar/${article.code}`,
        mainEntityOfPage: `${SITE_URL}/grammar/${article.code}`,
        dateModified: article.updated_at ?? undefined,
        author: {
          "@type": "Organization",
          name: "JapanEasy",
        },
      }
    : null;

  return (
    <>
      {jsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
          }}
        />
      ) : null}
      {children}
    </>
  );
}
