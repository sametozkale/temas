export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-svh bg-background">
      <header className="absolute inset-x-0 top-0 flex h-14 items-center px-6">
        <span className="font-serif text-xl font-medium tracking-tight">
          Temas
        </span>
      </header>
      <main className="grid min-h-svh place-items-center px-6">
        <div className="w-full max-w-sm">{children}</div>
      </main>
    </div>
  );
}
