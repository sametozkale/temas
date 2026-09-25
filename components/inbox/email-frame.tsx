"use client";

import * as React from "react";

import { emailSrcDoc } from "@/lib/inbox/email-html";

export function EmailFrame({ html, title }: { html: string; title: string }) {
  const frameRef = React.useRef<HTMLIFrameElement>(null);
  const srcDoc = React.useMemo(() => emailSrcDoc(html), [html]);

  const fit = React.useCallback(() => {
    const frame = frameRef.current;
    const doc = frame?.contentDocument;
    const root = doc?.documentElement;
    const body = doc?.body;
    if (!frame || !root || !body) return;

    root.style.transform = "";
    root.style.width = "";
    body.style.overflow = "visible";
    const natural = Math.max(root.scrollWidth, body.scrollWidth);
    const view = frame.clientWidth;
    const scale = natural > view && view > 0 ? view / natural : 1;
    if (scale < 1) {
      root.style.transformOrigin = "top left";
      root.style.width = `${natural}px`;
      root.style.transform = `scale(${scale})`;
    }
    body.style.overflow = "hidden";
    const height = Math.max(root.scrollHeight, body.scrollHeight) * scale;
    frame.style.height = `${Math.ceil(height)}px`;
  }, []);

  function onLoad() {
    fit();
    const body = frameRef.current?.contentDocument?.body;
    if (!body) return;
    const images = body.querySelectorAll("img");
    for (const image of images) {
      if (!image.complete) image.addEventListener("load", fit, { once: true });
    }
    window.addEventListener("resize", fit);
  }

  React.useEffect(() => {
    let tries = 0;
    let frameId = 0;
    const run = () => {
      fit();
      const frame = frameRef.current;
      if (frame?.style.height) return;
      if (tries++ < 20) frameId = requestAnimationFrame(run);
    };
    frameId = requestAnimationFrame(run);
    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", fit);
    };
  }, [fit, srcDoc]);

  return (
    <iframe
      ref={frameRef}
      title={title}
      sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
      srcDoc={srcDoc}
      scrolling="no"
      onLoad={onLoad}
      className="block w-full border-0 bg-card"
    />
  );
}
