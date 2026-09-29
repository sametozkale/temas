import type { Metadata } from "next";

type ShareImage = { url: string; width: number; height: number };

const DEFAULT_IMAGE: ShareImage = { url: "/marketing/agent-keys.webp", width: 900, height: 900 };

/** Title, description, canonical URL and share cards for a public marketing page. */
export function marketingMetadata({
  title,
  description,
  path,
  image = DEFAULT_IMAGE,
  absoluteTitle = false,
}: {
  title: string;
  description: string;
  path: string;
  image?: ShareImage;
  absoluteTitle?: boolean;
}): Metadata {
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title,
      description,
      url: path,
      type: "website",
      siteName: "Temas",
      locale: "en",
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image.url],
    },
  };
}
