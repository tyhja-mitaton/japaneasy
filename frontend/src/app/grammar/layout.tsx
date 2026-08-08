import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Справочник по японской грамматике — JapanEasy",
  description: "Разборы конструкций и частиц. Выберите тему, чтобы прочитать статью.",
  alternates: {
    canonical: "/grammar",
  },
};

export default function GrammarLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
