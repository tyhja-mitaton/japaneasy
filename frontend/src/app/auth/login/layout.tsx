import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Вход в аккаунт — JapanEasy",
  description: "Войдите в аккаунт, чтобы продолжить изучение японского.",
  robots: {
    index: false,
    follow: true,
  },
  alternates: {
    canonical: "/auth/login",
  },
};

export default function LoginLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
