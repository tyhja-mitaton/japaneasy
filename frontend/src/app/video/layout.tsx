import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Видео для изучения японского — JapanEasy",
  description: "Видеоуроки по японскому языку. Доступны по подписке.",
  alternates: {
    canonical: "/video",
  },
};

export default function VideoLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
