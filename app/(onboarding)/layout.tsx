export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex h-14 items-center px-6">
        <span className="font-serif text-xl font-medium tracking-tight">
          Havn
        </span>
      </header>
      <main className="flex flex-1 items-start justify-center px-6 pt-12 pb-24">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
