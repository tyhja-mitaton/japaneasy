import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import "./globals.css";

export const metadata: Metadata = {
  title: "JapanEasy — Изучай японский с удовольствием",
  description: "Загружай тексты, смотри переводы, разбирай грамматику и пополняй словарь",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <head>
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
        <Navbar />
        <main style={{ flex: 1 }}>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
