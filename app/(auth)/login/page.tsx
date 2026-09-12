import { safeNextPath } from "@/lib/action-result";
import { isProduction } from "@/lib/env";

import { LoginForm } from "./login-form";

type Props = {
  searchParams: Promise<{ next?: string; email?: string; error?: string }>;
};

export default async function LoginPage({ searchParams }: Props) {
  const params = await searchParams;
  const next = safeNextPath(params.next);

  return (
    <LoginForm
      next={next}
      defaultEmail={params.email}
      initialError={
        params.error === "link_invalid" ? "link_invalid" : undefined
      }
      mailpitUrl={isProduction() ? undefined : "http://127.0.0.1:54324"}
    />
  );
}
