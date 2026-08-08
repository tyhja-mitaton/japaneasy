import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Мои тексты — JapanEasy",
  description: "Загружай тексты на японском и разбирай их по словам и грамматике.",
  alternates: {
    canonical: "/texts",
  },
};

export default function TextsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
