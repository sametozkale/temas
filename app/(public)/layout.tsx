"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ownerReview = usePathname().startsWith("/o/");

  return (
    <div className="min-h-svh bg-background">
      {ownerReview ? null : (
        <header className="border-b">
          <div className="mx-auto flex h-14 max-w-5xl items-center px-4 sm:px-6">
            <Link
              href="/"
              className="font-serif text-lg tracking-tight text-foreground"
            >
              Temas
            </Link>
          </div>
        </header>
      )}
      <main
        className={
          ownerReview
            ? "mx-auto w-full px-4 pt-8 pb-10 sm:px-6"
            : "mx-auto w-full px-4 py-8 sm:px-6 sm:py-10"
        }
      >
        {children}
      </main>
    </div>
  );
}
