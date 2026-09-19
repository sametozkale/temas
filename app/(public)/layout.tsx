import Link from "next/link";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-svh bg-background">
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
      <main className="mx-auto w-full px-4 py-8 sm:px-6 sm:py-10">
        {children}
      </main>
    </div>
  );
}
