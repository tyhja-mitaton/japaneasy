import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { I18nProvider } from "@/lib/i18n";
import { SITE_URL } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "JapanEasy — Изучай японский с удовольствием",
  description: "Загружай тексты, смотри переводы, разбирай грамматику и пополняй словарь",
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: "website",
    locale: "ru_RU",
    siteName: "JapanEasy",
    title: "JapanEasy — Изучай японский с удовольствием",
    description: "Загружай тексты, смотри переводы, разбирай грамматику и пополняй словарь",
    url: "/",
  },
  twitter: {
    card: "summary",
    title: "JapanEasy — Изучай японский с удовольствием",
    description: "Загружай тексты, смотри переводы, разбирай грамматику и пополняй словарь",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <head>
        <link
          rel="preconnect"
          href="https://fonts.googleapis.com"
        />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@300;400;500;700&family=Noto+Serif+JP:wght@400;700&family=Inter:wght@300;400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{
        fontFamily: "'Noto Sans JP', 'Inter', sans-serif",
        background: '#F7F3EE',
        color: '#1A1A1A',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        margin: 0,
        padding: 0,
      }}>
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
        `}</style>
        <I18nProvider>
          <Navbar />
          <main style={{ flex: 1 }}>{children}</main>
          <Footer />
        </I18nProvider>
      </body>
    </html>
  );
}
