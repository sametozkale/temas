import Link from "next/link";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-svh bg-background">
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-xl items-center px-6">
          <Link
            href="/"
            className="font-serif text-lg tracking-tight text-foreground"
          >
            Havn
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-xl px-6 py-10">{children}</main>
    </div>
  );
}
