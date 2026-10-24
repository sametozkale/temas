import { Caveat } from "next/font/google";

export const caveat = Caveat({
  variable: "--font-caveat",
  subsets: ["latin", "latin-ext"],
  weight: ["500"],
  display: "swap",
  // Handwriting is only used for polaroid captions, never for LCP text.
  preload: false,
});
