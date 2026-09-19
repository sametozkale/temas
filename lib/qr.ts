import { renderSVG } from "uqr";

export function qrSvg(value: string) {
  return renderSVG(value, {
    border: 2,
    ecc: "M",
    pixelSize: 8,
    blackColor: "currentColor",
    whiteColor: "transparent",
  });
}
