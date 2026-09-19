export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      <header className="absolute inset-x-0 top-0 flex h-14 items-center px-6">
        <span className="font-serif text-xl font-medium tracking-tight">
          Temas
        </span>
      </header>
      <main className="flex flex-1 items-center justify-center px-6 py-20">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
