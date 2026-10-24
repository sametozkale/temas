/**
 * Slow-network lab for the local production server.
 * Chrome DevTools network presets + CPU throttling via CDP.
 *
 * Slow 3G: 400 kbps down/up, 400ms RTT, 4x CPU
 * Fast 3G: 1.6 Mbps down, 750 kbps up, 150ms RTT, 4x CPU
 */
import { chromium } from "@playwright/test";
import { writeFileSync } from "node:fs";

const BASE = process.env.PERF_BASE ?? "http://127.0.0.1:3001";
const OUT = process.env.PERF_OUT ?? "/tmp/perf-before.json";

const PROFILES = {
  "slow-3g": {
    downloadThroughput: (400 * 1000) / 8,
    uploadThroughput: (400 * 1000) / 8,
    latency: 400,
    cpu: 4,
  },
  "fast-3g": {
    downloadThroughput: (1.6 * 1000 * 1000) / 8,
    uploadThroughput: (750 * 1000) / 8,
    latency: 150,
    cpu: 4,
  },
};

const PAGES = [
  { name: "home", path: "/" },
  { name: "pricing", path: "/pricing" },
  { name: "login", path: "/login" },
  { name: "product-viewings", path: "/product/viewings" },
];

function mobileContext(browser) {
  return browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    userAgent:
      "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
  });
}

async function measure(browser, profileName, pageDef) {
  const profile = PROFILES[profileName];
  const context = await mobileContext(browser);
  const page = await context.newPage();
  const client = await context.newCDPSession(page);
  await client.send("Network.enable");
  await client.send("Network.emulateNetworkConditions", {
    offline: false,
    downloadThroughput: profile.downloadThroughput,
    uploadThroughput: profile.uploadThroughput,
    latency: profile.latency,
  });
  await client.send("Emulation.setCPUThrottlingRate", { rate: profile.cpu });

  await page.addInitScript(() => {
    window.__perf = { lcp: 0, lcpSize: 0, lcpTag: "", cls: 0, tbt: 0, fcp: 0 };
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        window.__perf.lcp = entry.startTime;
        window.__perf.lcpSize = entry.size || 0;
        const el = entry.element;
        window.__perf.lcpTag = el
          ? `${el.tagName}.${(el.className || "").toString().slice(0, 80)}`
          : "";
      }
    }).observe({ type: "largest-contentful-paint", buffered: true });
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) window.__perf.cls += entry.value;
      }
    }).observe({ type: "layout-shift", buffered: true });
    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          window.__perf.tbt += Math.max(0, entry.duration - 50);
        }
      }).observe({ type: "longtask", buffered: true });
    } catch {
      // longtask may be unavailable
    }
  });

  const requests = [];
  page.on("response", async (response) => {
    try {
      const request = response.request();
      const headers = response.headers();
      const len = Number(headers["content-length"] || 0);
      let size = len;
      if (!size) {
        try {
          const body = await response.body();
          size = body.byteLength;
        } catch {
          size = 0;
        }
      }
      requests.push({
        url: response.url().replace(BASE, ""),
        status: response.status(),
        type: request.resourceType(),
        size,
        cache: headers["cache-control"] || "",
      });
    } catch {
      // ignore detached responses
    }
  });

  const started = Date.now();
  let failed = null;
  try {
    await page.goto(BASE + pageDef.path, {
      waitUntil: "commit",
      timeout: 60000,
    });
  } catch (error) {
    failed = String(error);
  }

  // Snapshots of whether the page looks blank while JS is still arriving.
  const snapshots = {};
  for (const at of [2000, 5000, 10000]) {
    const wait = Math.max(0, at - (Date.now() - started));
    if (wait) await page.waitForTimeout(wait);
    snapshots[`t${at}`] = await page.evaluate(() => {
      const main = document.querySelector("main") || document.body;
      const text = (main.innerText || "").replace(/\s+/g, " ").trim();
      const hidden = [...document.querySelectorAll(".opacity-0")].length;
      const h1 = document.querySelector("h1");
      const h1Opacity = h1 ? getComputedStyle(h1).opacity : null;
      const mock = document.querySelector("#mock-panel");
      const mockOpacity = mock
        ? getComputedStyle(mock.closest(".opacity-0") || mock).opacity
        : null;
      return {
        title: document.title,
        textLen: text.length,
        textSample: text.slice(0, 140),
        opacity0: hidden,
        h1: h1 ? h1.textContent?.slice(0, 80) : null,
        h1Opacity,
        mockOpacity,
        ready: document.readyState,
      };
    }).catch((error) => ({ error: String(error) }));
  }

  try {
    await page.waitForLoadState("load", { timeout: 45000 });
  } catch {
    // keep going; slow 3G may not finish every image
  }
  await page.waitForTimeout(1500);

  const perf = await page.evaluate(() => {
    const nav = performance.getEntriesByType("navigation")[0];
    const paints = performance.getEntriesByType("paint");
    const resources = performance.getEntriesByType("resource");
    const fcp = paints.find((p) => p.name === "first-contentful-paint");
    const transfer = resources.reduce(
      (sum, r) => sum + (r.transferSize || 0),
      0,
    );
    const encoded = resources.reduce(
      (sum, r) => sum + (r.encodedBodySize || 0),
      0,
    );
    const byType = {};
    for (const r of resources) {
      const type = r.initiatorType || "other";
      byType[type] = byType[type] || { count: 0, transfer: 0 };
      byType[type].count += 1;
      byType[type].transfer += r.transferSize || 0;
    }
    return {
      ttfb: nav ? nav.responseStart : null,
      dcl: nav ? nav.domContentLoadedEventEnd : null,
      load: nav ? nav.loadEventEnd : null,
      fcp: fcp ? fcp.startTime : window.__perf.fcp,
      lcp: window.__perf.lcp,
      lcpSize: window.__perf.lcpSize,
      lcpTag: window.__perf.lcpTag,
      cls: window.__perf.cls,
      tbt: window.__perf.tbt,
      transfer,
      encoded,
      resourceCount: resources.length,
      byType,
      docTransfer: nav ? nav.transferSize : 0,
      docEncoded: nav ? nav.encodedBodySize : 0,
    };
  });

  const finalState = await page.evaluate(() => {
    const mock = document.querySelector("#mock-panel");
    const opacity0 = document.querySelectorAll(".opacity-0").length;
    return {
      opacity0,
      mockVisible: mock ? getComputedStyle(mock).opacity : null,
      bodyText: (document.body.innerText || "").replace(/\s+/g, " ").trim().slice(0, 180),
    };
  });

  await context.close();
  return {
    profile: profileName,
    page: pageDef.name,
    path: pageDef.path,
    failed,
    elapsedMs: Date.now() - started,
    perf,
    snapshots,
    finalState,
    requests: {
      count: requests.length,
      bytes: requests.reduce((s, r) => s + r.size, 0),
      byType: requests.reduce((acc, r) => {
        acc[r.type] = acc[r.type] || { count: 0, bytes: 0 };
        acc[r.type].count += 1;
        acc[r.type].bytes += r.size;
        return acc;
      }, {}),
      largest: [...requests].sort((a, b) => b.size - a.size).slice(0, 12),
    },
  };
}

const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

const results = [];
for (const profileName of Object.keys(PROFILES)) {
  for (const pageDef of PAGES) {
    process.stdout.write(`${profileName} ${pageDef.path} … `);
    const row = await measure(browser, profileName, pageDef);
    results.push(row);
    const p = row.perf;
    console.log(
      `FCP ${Math.round(p.fcp)} LCP ${Math.round(p.lcp)} TBT ${Math.round(p.tbt)} TTFB ${Math.round(p.ttfb)} bytes ${p.transfer} req ${p.resourceCount} opacity0@5s ${row.snapshots.t5000?.opacity0}`,
    );
  }
}

await browser.close();
writeFileSync(OUT, JSON.stringify(results, null, 2));
console.log(`wrote ${OUT}`);
