import { AuthLinkEmail } from "./auth-link";

export function MagicLinkEmail({
  signInUrl,
  email,
}: {
  signInUrl: string;
  email?: string;
}) {
  return AuthLinkEmail({
    preview: "Your one-time Temas sign-in link. It expires in 1 hour.",
    heading: "Sign in to Temas",
    lede: email
      ? `We sent this one-time link to ${email}. It is valid for 1 hour.`
      : "This one-time sign-in link is valid for 1 hour.",
    href: signInUrl,
    cta: "Sign in",
  });
}

export default MagicLinkEmail;
