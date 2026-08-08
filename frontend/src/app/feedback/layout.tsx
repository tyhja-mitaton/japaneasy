import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Напишите нам — JapanEasy",
  description: "Обратная связь по сервису изучения японского языка.",
  alternates: {
    canonical: "/feedback",
  },
};

export default function FeedbackLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
