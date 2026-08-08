import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Регистрация — JapanEasy",
  description: "Создайте аккаунт и начните изучать японский язык.",
  robots: {
    index: false,
    follow: true,
  },
  alternates: {
    canonical: "/auth/register",
  },
};

export default function RegisterLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
