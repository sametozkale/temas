import Image from "next/image";
import { getTranslations } from "next-intl/server";

import { Polaroid } from "./primitives";

/** Brand collage beside the sign-in / sign-up form, lg and up. */
export async function AuthPanel() {
  const t = await getTranslations("marketing");

  return (
    <aside
      aria-hidden
      className="relative m-3 hidden overflow-hidden rounded-[28px] bg-brand lg:flex lg:flex-col lg:items-center lg:justify-center lg:px-14 lg:py-16"
    >
      <Image
        src="/marketing/scrap-to-let.webp"
        alt=""
        width={586}
        height={850}
        sizes="140px"
        className="absolute -top-6 right-14 w-28 rotate-[8deg] xl:w-32"
      />

      <div className="relative w-full max-w-md">
        <div className="relative bg-background p-3">
          <span className="absolute -top-4 -left-4 size-4 border-t border-l border-background/70" />
          <span className="absolute -right-4 -bottom-4 size-4 border-r border-b border-background/70" />
          <Image
            src="/marketing/agent-viewing.webp"
            alt=""
            width={900}
            height={900}
            sizes="(min-width: 1280px) 440px, 360px"
            priority
            className="aspect-[4/3] w-full object-cover"
          />
        </div>
        <Polaroid
          photo="keys"
          caption={t("polaroid.keys")}
          className="absolute -bottom-14 -left-10 w-36 -rotate-6 xl:w-40"
        />
      </div>

      <div className="mt-24 w-full max-w-md text-background">
        <p className="font-serif text-4xl leading-[1.05] font-normal tracking-tight text-balance xl:text-5xl">
          {t("hero.title")}
        </p>
        <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-background/75">
          {t("footer.tagline")}
        </p>
      </div>
    </aside>
  );
}
