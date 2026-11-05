// Security regression tests for extractDirectStream in src/lib/upstreamClient.ts
//
// Run from apps/api:  node --import tsx --test test/upstreamClient.security.test.ts
//
// The "stubbed" describes fully control fetch + DNS to exercise timing and
// redirect edge cases deterministically; the "live network" describe runs
// without any mocks so the suite does not rely exclusively on mocks to
// demonstrate behavior against real resolvers and providers.

import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import dns from "node:dns";

import {
  extractDirectStream,
  isNonPublicIPv6,
  embedConnectLookup,
  __setEmbedTransportForTests,
  __defaultEmbedTransportForTests,
} from "../src/lib/upstreamClient.js";

// ---------------------------------------------------------------------------
// stubbing helpers
// ---------------------------------------------------------------------------

type Route = {
  status: number;
  headers?: Record<string, string>;
  body?: string;
};

const realFetch = globalThis.fetch;
const realLookup = dns.promises.lookup;

let routes = new Map<string, Route>();
const fetchLog: string[] = [];

const PUBLIC_A = [{ address: "93.184.216.34", family: 4 }];

const applyFetchStub = () => {
  (globalThis as any).fetch = async (input: unknown) => {
    const href =
      typeof input === "string" ? input : String((input as URL).href);
    fetchLog.push(href);
    const route = routes.get(href);
    if (!route) return new Response("stub: not found", { status: 404 });
    return new Response(route.body ?? "", {
      status: route.status,
      headers: route.headers,
    });
  };

  // The production scrape path uses undici's fetch bound to a pinned Agent
  // (see upstreamClient.ts) — NOT globalThis.fetch — so stubbing
  // globalThis.fetch alone is silently bypassed. Route the test transport
  // through the stub via the documented test seam, reading globalThis.fetch
  // at call time so tests that swap it (slow-drip / oversized body) still
  // take effect.
  __setEmbedTransportForTests(async (url, remainingMs) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), remainingMs);
    try {
      return (await (globalThis as any).fetch(String(url), {
        signal: controller.signal,
        redirect: "manual",
      })) as Response;
    } finally {
      clearTimeout(timer);
    }
  });
};

const applyLookupStub = (resolve: Record<string, { address: string; family: number }[]>, hang: string[] = []) => {
  (dns.promises as any).lookup = (
    hostname: string,
    options?: { signal?: AbortSignal },
  ) => {
    if (hang.includes(hostname)) {
      // Mirrors the real dns.lookup contract: rejects when the signal fires,
      // never settles on its own (wedged-resolver simulation).
      return new Promise<never>((_resolve, reject) => {
        options?.signal?.addEventListener(
          "abort",
          () => reject(new Error("The operation was aborted")),
          { once: true },
        );
      });
    }
    const records = resolve[hostname];
    if (!records) {
      return Promise.reject(
        Object.assign(new Error(`getaddrinfo ENOTFOUND ${hostname}`), {
          code: "ENOTFOUND",
        }),
      );
    }
    return Promise.resolve(records.map((r) => ({ ...r })));
  };
};

const restoreStubs = () => {
  __setEmbedTransportForTests(null);
  globalThis.fetch = realFetch;
  (dns.promises as any).lookup = realLookup;
  routes = new Map();
  fetchLog.length = 0;
};

const pageWithVideoUrl = (value: string) =>
  `<!doctype html><html><body><script>var videoURL = "${value}";</script>` +
  `<video><source src=""></video></body></html>`;

const pageWithRaw = (body: string) =>
  `<!doctype html><html><body>${body}</body></html>`;

// A response whose body never finishes — slow-drip server simulation.
const hangingBodyResponse = () =>
  new Response(
    new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("<html>"));
      },
    }),
    { status: 200, headers: { "content-length": "5000" } },
  );

// 1.2 MB delivered in two chunks — exceeds the 1 MB cap mid-stream.
const oversizedBodyResponse = () => {
  const chunk = new Uint8Array(600_000).fill(120);
  let sent = 0;
  return new Response(
    new ReadableStream({
      pull(controller) {
        if (sent < 2) {
          controller.enqueue(chunk);
          sent += 1;
        } else {
          controller.close();
        }
      },
    }),
    { status: 200 },
  );
};

const inRange = (elapsedMs: number, lo: number, hi: number) =>
  assert.ok(
    elapsedMs >= lo && elapsedMs <= hi,
    `elapsed ${Math.round(elapsedMs)}ms outside [${lo}, ${hi}]`,
  );

// ---------------------------------------------------------------------------
// IPv6 validation (finding 3)
// ---------------------------------------------------------------------------

describe("isNonPublicIPv6", () => {
  const nonPublic = [
    "::", // unspecified
    "::1", // loopback (compressed)
    "0:0:0:0:0:0:0:1", // loopback (full form)
    "::1.2.3.4", // IPv4-compatible (dotted tail)
    "::c000:201", // IPv4-compatible (::192.0.2.1)
    "::d8ef:2300", // IPv4-compatible with a public-looking v4 — padding regression
    "::ffff:127.0.0.1", // IPv4-mapped loopback (dotted)
    "::ffff:7f00:1", // IPv4-mapped loopback (hex, URL-serialized form)
    "::ffff:169.254.169.254", // IPv4-mapped cloud metadata
    "::ffff:0a00:0001", // IPv4-mapped 10.0.0.1
    "0:0:0:0:0:ffff:127.0.0.1", // IPv4-mapped without "::" compression
    "::ffff:0:0", // mapped 0.0.0.0
    "fe80::1", // link-local
    "fe80::", // link-local (compressed tail)
    "FE80::1", // case-insensitive
    "fc00::1", // unique local
    "fd12:3456:789a::1", // unique local
    "2001:db8::1", // documentation
    "2001::", // teredo 2001::/32
    "2002:7f00:1::", // 6to4 embedding loopback
    "64:ff9b::7f00:1", // NAT64
    "100::1", // discard-only
    "ff02::1", // multicast
    // malformed — fail closed
    "",
    "1::2::3",
    "1:2:3",
    "zz::1",
    "fe80::1%eth0",
    "12345::",
    "1:2:3:4:5:6:7:8::",
    "::ffff:1.2.3.4.5",
    "::ffff:256.0.0.1",
    "::0.0.0.0",
  ];

  const publik = [
    "2001:4860:4860::8888", // Google DNS
    "2606:4700:4700::1111", // Cloudflare
    "2620:fe::fe", // Quad9
    "::ffff:8.8.8.8", // mapped public v4 — judged by the embedded address
  ];

  for (const address of nonPublic) {
    it(`classifies ${JSON.stringify(address)} as non-public`, () => {
      assert.equal(isNonPublicIPv6(address), true);
    });
  }
  for (const address of publik) {
    it(`classifies ${JSON.stringify(address)} as public`, () => {
      assert.equal(isNonPublicIPv6(address), false);
    });
  }
});

// ---------------------------------------------------------------------------
// URL/extraction hardening (findings 3 and 4) — stubbed network
// ---------------------------------------------------------------------------

describe("extractDirectStream — destination validation (stubbed)", () => {
  beforeEach(() => {
    applyFetchStub();
    applyLookupStub({
      "desustream.net": PUBLIC_A,
      "cdn.odcloud.net": PUBLIC_A,
    });
  });
  afterEach(restoreStubs);

  it("rejects non-string/null input", async () => {
    assert.equal(await extractDirectStream(null), null);
    assert.equal(await extractDirectStream("not a url"), null);
  });

  it("rejects non-http(s) schemes", async () => {
    assert.equal(await extractDirectStream("javascript:alert(1)"), null);
    assert.equal(await extractDirectStream("data:video/mp4;base64,AAAA"), null);
    assert.equal(await extractDirectStream("ftp://cdn.odcloud.net/x.mp4"), null);
  });

  it("rejects substring tricks without touching the network", async () => {
    assert.equal(
      await extractDirectStream(
        "https://169.254.169.254/latest/meta-data?x=desustream.net",
      ),
      null,
    );
    assert.equal(
      await extractDirectStream("https://desustream.net.evil.test/v/a.html"),
      null,
    );
    assert.equal(
      await extractDirectStream("https://desustream.net@evil.test/x.html"),
      null,
    );
    assert.equal(fetchLog.length, 0);
  });

  it("rejects literal private/loopback/metadata destinations instantly (no DNS)", async () => {
    const cases = [
      "http://localhost:3001/video.mp4",
      "https://127.0.0.1/video.mp4",
      "https://2130706433/video.mp4",
      "http://0x7f.0.0.1/video.mp4",
      "http://192.168.1.50/video.mp4",
      "http://169.254.169.254/latest/meta-data.mp4",
      "http://100.100.1.1/video.mp4",
      "https://[::1]/video.m3u8",
      "https://[::ffff:127.0.0.1]/video.mp4",
      "https://[fe80::1]/video.mp4",
      "https://[fd00::1]/video.mp4",
    ];
    const start = performance.now();
    for (const url of cases) {
      assert.equal(await extractDirectStream(url), null, url);
    }
    assert.ok(performance.now() - start < 1500, "literal checks must short-circuit before DNS");
  });

  it("fails closed on unresolvable hosts (bounded)", async () => {
    const start = performance.now();
    assert.equal(
      await extractDirectStream("https://missing-host-xyz.test/video.mp4"),
      null,
    );
    inRange(performance.now() - start, 0, 8000);
  });

  it("classifies bracketed IPv6 literals via real IPv6 rules (WHATWG keeps brackets)", async () => {
    // IPv4-mapped loopback literal — must be rejected by address classification
    assert.equal(
      await extractDirectStream("https://[::ffff:127.0.0.1]/v.mp4"),
      null,
    );
    assert.equal(await extractDirectStream("https://[::1]/v.m3u8"), null);
    // public IPv6 literal (Cloudflare DNS) — legitimate direct destination.
    // getaddrinfo passes literals through unchanged, so the stub models that.
    applyLookupStub({
      "2606:4700:4700::1111": [
        { address: "2606:4700:4700::1111", family: 6 },
      ],
    });
    const publicLiteral = "https://[2606:4700:4700::1111]/v.mp4";
    assert.equal(await extractDirectStream(publicLiteral), publicLiteral);
  });

  it("passes through direct media links from public provider CDNs", async () => {
    assert.equal(
      await extractDirectStream("https://cdn.odcloud.net/anime/ep1.mp4"),
      "https://cdn.odcloud.net/anime/ep1.mp4",
    );
    assert.equal(
      await extractDirectStream("https://cdn.odcloud.net/anime/ep1.mp4?token=abc"),
      "https://cdn.odcloud.net/anime/ep1.mp4?token=abc",
    );
    assert.equal(
      await extractDirectStream("https://cdn.odcloud.net/anime/list.m3u8"),
      "https://cdn.odcloud.net/anime/list.m3u8",
    );
  });
});

// ---------------------------------------------------------------------------
// extraction regexes (finding 4) — stubbed network
// ---------------------------------------------------------------------------

describe("extractDirectStream — scrape extraction (stubbed)", () => {
  beforeEach(() => {
    applyFetchStub();
    applyLookupStub({
      "desustream.net": PUBLIC_A,
      "cdn.odcloud.net": PUBLIC_A,
    });
  });
  afterEach(restoreStubs);

  it("extracts an absolute double-quoted videoURL", async () => {
    routes.set("https://desustream.net/v/a.html", {
      status: 200,
      body: pageWithVideoUrl("https://cdn.odcloud.net/anime/x.mp4"),
    });
    assert.equal(
      await extractDirectStream("https://desustream.net/v/a.html"),
      "https://cdn.odcloud.net/anime/x.mp4",
    );
  });

  it("extracts a single-quoted videoURL", async () => {
    routes.set("https://desustream.net/v/b.html", {
      status: 200,
      body: pageWithRaw("<script>var videoURL = 'https://cdn.odcloud.net/a.mp4';</script>"),
    });
    assert.equal(
      await extractDirectStream("https://desustream.net/v/b.html"),
      "https://cdn.odcloud.net/a.mp4",
    );
  });

  it("extracts videoURL written without spaces", async () => {
    routes.set("https://desustream.net/v/c.html", {
      status: 200,
      body: pageWithRaw("<script>var videoURL='https://cdn.odcloud.net/c.mp4';</script>"),
    });
    assert.equal(
      await extractDirectStream("https://desustream.net/v/c.html"),
      "https://cdn.odcloud.net/c.mp4",
    );
  });

  it("resolves a relative videoURL against the embed base", async () => {
    routes.set("https://desustream.net/v/d.html", {
      status: 200,
      body: pageWithVideoUrl("/stream/rel.mp4"),
    });
    assert.equal(
      await extractDirectStream("https://desustream.net/v/d.html"),
      "https://desustream.net/stream/rel.mp4",
    );
  });

  it("trims whitespace-padded videoURL values", async () => {
    routes.set("https://desustream.net/v/e.html", {
      status: 200,
      body: pageWithVideoUrl("  https://cdn.odcloud.net/anime/w.mp4  "),
    });
    assert.equal(
      await extractDirectStream("https://desustream.net/v/e.html"),
      "https://cdn.odcloud.net/anime/w.mp4",
    );
  });

  it("ignores embedVideoURL/dataVideoURL lookalikes", async () => {
    routes.set("https://desustream.net/v/f.html", {
      status: 200,
      body: pageWithRaw(
        "<script>embedVideoURL = 'https://cdn.odcloud.net/evil.mp4'; dataVideoURL = 'https://cdn.odcloud.net/evil2.mp4';</script>",
      ),
    });
    assert.equal(await extractDirectStream("https://desustream.net/v/f.html"), null);
  });

  it("falls back to <source src> when videoURL is empty", async () => {
    routes.set("https://desustream.net/v/g.html", {
      status: 200,
      body: pageWithRaw('<video><source src="https://cdn.odcloud.net/anime/s.mp4"></video>'),
    });
    assert.equal(
      await extractDirectStream("https://desustream.net/v/g.html"),
      "https://cdn.odcloud.net/anime/s.mp4",
    );
  });

  it("extracts <source> src when other attributes precede it", async () => {
    routes.set("https://desustream.net/v/h.html", {
      status: 200,
      body: pageWithRaw(
        '<video><source type="video/mp4" src="https://cdn.odcloud.net/anime/t.mp4"></video>',
      ),
    });
    assert.equal(
      await extractDirectStream("https://desustream.net/v/h.html"),
      "https://cdn.odcloud.net/anime/t.mp4",
    );
  });

  it("extracts the real src even when data-src appears first, and ignores data-src alone", async () => {
    routes.set("https://desustream.net/v/i.html", {
      status: 200,
      body: pageWithRaw(
        '<video><source data-src="https://cdn.odcloud.net/lazy.mp4" src="https://cdn.odcloud.net/anime/real.mp4"></video>',
      ),
    });
    assert.equal(
      await extractDirectStream("https://desustream.net/v/i.html"),
      "https://cdn.odcloud.net/anime/real.mp4",
    );
    routes.set("https://desustream.net/v/j.html", {
      status: 200,
      body: pageWithRaw('<video><source data-src="https://cdn.odcloud.net/lazy.mp4"></video>'),
    });
    assert.equal(await extractDirectStream("https://desustream.net/v/j.html"), null);
  });

  it("rejects malformed scrape values", async () => {
    routes.set("https://desustream.net/v/k.html", {
      status: 200,
      body: pageWithVideoUrl("javascript:alert(1)"),
    });
    assert.equal(await extractDirectStream("https://desustream.net/v/k.html"), null);

    routes.set("https://desustream.net/v/l.html", {
      status: 200,
      body: pageWithVideoUrl("not a url at all"),
    });
    assert.equal(await extractDirectStream("https://desustream.net/v/l.html"), null);

    routes.set("https://desustream.net/v/m.html", {
      status: 200,
      body: pageWithVideoUrl("https://cdn.odcloud.net/page.html"),
    });
    // non-media path — falls back to the embed player
    assert.equal(await extractDirectStream("https://desustream.net/v/m.html"), null);
  });

  it("rejects scrape values pointing at private destinations", async () => {
    routes.set("https://desustream.net/v/n.html", {
      status: 200,
      body: pageWithVideoUrl("http://10.0.0.5/x.mp4"),
    });
    assert.equal(await extractDirectStream("https://desustream.net/v/n.html"), null);
  });

  it("rejects non-ok responses and oversized bodies", async () => {
    routes.set("https://desustream.net/v/404.html", { status: 404, body: "no" });
    assert.equal(await extractDirectStream("https://desustream.net/v/404.html"), null);

    routes.set("https://desustream.net/v/big-clen.html", {
      status: 200,
      headers: { "content-length": String(2_000_000) },
      body: "x",
    });
    assert.equal(await extractDirectStream("https://desustream.net/v/big-clen.html"), null);

    routes.set("https://desustream.net/v/big-chunks.html", {
      status: 200,
      body: "",
    });
    (globalThis as any).fetch = async () => oversizedBodyResponse();
    assert.equal(await extractDirectStream("https://desustream.net/v/big-chunks.html"), null);
  });
});

// ---------------------------------------------------------------------------
// deadline bounding (findings 1 and 2) — stubbed network
// ---------------------------------------------------------------------------

describe("extractDirectStream — deadline bounding (stubbed)", () => {
  beforeEach(() => {
    applyFetchStub();
  });
  afterEach(restoreStubs);

  it("bounds a wedged DNS resolver on the passthrough path", async () => {
    applyLookupStub({}, ["cdn.odcloud.net"]);
    const start = performance.now();
    assert.equal(
      await extractDirectStream("https://cdn.odcloud.net/anime/a.mp4"),
      null,
    );
    inRange(performance.now() - start, 2500, 8000);
  });

  it("bounds a wedged DNS resolver on the scrape path", async () => {
    applyLookupStub({}, ["desustream.net"]);
    const start = performance.now();
    assert.equal(await extractDirectStream("https://desustream.net/v/a.html"), null);
    inRange(performance.now() - start, 2500, 8000);
    assert.equal(fetchLog.length, 0, "no fetch may precede DNS validation");
  });

  it("bounds a slow-drip response body", async () => {
    applyLookupStub({ "desustream.net": PUBLIC_A });
    routes.set("https://desustream.net/v/slow.html", { status: 200, body: "" });
    (globalThis as any).fetch = async () => hangingBodyResponse();
    const start = performance.now();
    assert.equal(await extractDirectStream("https://desustream.net/v/slow.html"), null);
    inRange(performance.now() - start, 2500, 8000);
  });
});

// ---------------------------------------------------------------------------
// redirect validation (finding 5) — stubbed network
// ---------------------------------------------------------------------------

describe("extractDirectStream — redirects (stubbed)", () => {
  beforeEach(() => {
    applyFetchStub();
    applyLookupStub({
      "desustream.net": PUBLIC_A,
      "cdn.odcloud.net": PUBLIC_A,
      "pivot.private.test": [{ address: "10.0.0.5", family: 4 }],
      "public.example.test": PUBLIC_A,
    });
  });
  afterEach(restoreStubs);

  it("follows validated redirects to allowlisted hosts and extracts the result", async () => {
    routes.set("https://desustream.net/r1", {
      status: 302,
      headers: { location: "https://desustream.net/r2" },
    });
    routes.set("https://desustream.net/r2", {
      status: 302,
      headers: { location: "https://cdn.odcloud.net/r3" },
    });
    routes.set("https://cdn.odcloud.net/r3", {
      status: 200,
      body: pageWithVideoUrl("https://cdn.odcloud.net/anime/final.mp4"),
    });
    assert.equal(
      await extractDirectStream("https://desustream.net/r1"),
      "https://cdn.odcloud.net/anime/final.mp4",
    );
    assert.equal(fetchLog.length, 3);
  });

  it("resolves relative redirect locations", async () => {
    routes.set("https://desustream.net/rel1", {
      status: 302,
      headers: { location: "/e/final.html" },
    });
    routes.set("https://desustream.net/e/final.html", {
      status: 200,
      body: pageWithVideoUrl("https://cdn.odcloud.net/anime/rel.mp4"),
    });
    assert.equal(
      await extractDirectStream("https://desustream.net/rel1"),
      "https://cdn.odcloud.net/anime/rel.mp4",
    );
  });

  it("stops after EMBED_MAX_REDIRECTS (3) redirects", async () => {
    for (const [from, to] of [
      ["r1", "r2"],
      ["r2", "r3"],
      ["r3", "r4"],
      ["r4", "r5"],
    ] as const) {
      routes.set(`https://desustream.net/${from}`, {
        status: 302,
        headers: { location: `https://desustream.net/${to}` },
      });
    }
    const start = performance.now();
    assert.equal(await extractDirectStream("https://desustream.net/r1"), null);
    assert.deepEqual(fetchLog, [
      "https://desustream.net/r1",
      "https://desustream.net/r2",
      "https://desustream.net/r3",
      "https://desustream.net/r4",
    ]);
    assert.ok(!fetchLog.some((h) => h.endsWith("r5")));
    inRange(performance.now() - start, 0, 4000);
  });

  it("blocks redirects to private hosts before any request is issued", async () => {
    routes.set("https://desustream.net/priv", {
      status: 302,
      headers: { location: "https://pivot.private.test/x.html" },
    });
    routes.set("https://pivot.private.test/x.html", {
      status: 200,
      body: pageWithVideoUrl("https://cdn.odcloud.net/anime/stolen.mp4"),
    });
    assert.equal(await extractDirectStream("https://desustream.net/priv"), null);
    assert.ok(
      !fetchLog.some((h) => h.startsWith("https://pivot.private.test")),
      "blocked redirect target must never be fetched",
    );
  });

  it("blocks redirects to non-allowlisted (even public) hosts", async () => {
    routes.set("https://desustream.net/off", {
      status: 302,
      headers: { location: "https://public.example.test/x.html" },
    });
    assert.equal(await extractDirectStream("https://desustream.net/off"), null);
    assert.ok(!fetchLog.some((h) => h.startsWith("https://public.example.test")));
  });

  it("bounds DNS validation of redirect targets and never requests them first", async () => {
    // hang.desustream.net passes the hostname allowlist (subdomain), so
    // validation proceeds to its DNS lookup, which wedges.
    routes.set("https://desustream.net/hang", {
      status: 302,
      headers: { location: "https://hang.desustream.net/x.html" },
    });
    applyLookupStub({ "desustream.net": PUBLIC_A }, ["hang.desustream.net"]);
    const start = performance.now();
    assert.equal(await extractDirectStream("https://desustream.net/hang"), null);
    inRange(performance.now() - start, 2500, 8000);
    assert.equal(fetchLog.length, 1, "only the initial request may be issued");
  });

  it("rejects a redirect without a Location header", async () => {
    routes.set("https://desustream.net/noloc", { status: 302, body: "" });
    assert.equal(await extractDirectStream("https://desustream.net/noloc"), null);
    assert.equal(fetchLog.length, 1);
  });
});

// ---------------------------------------------------------------------------
// live network (no mocks) — real resolvers and providers
// ---------------------------------------------------------------------------

describe("extractDirectStream — live network", () => {
  it("rejects garbage and non-public literals without mocks", async () => {
    assert.equal(await extractDirectStream(null), null);
    assert.equal(await extractDirectStream("garbage"), null);
    assert.equal(await extractDirectStream("http://localhost/x.mp4"), null);
    assert.equal(await extractDirectStream("https://169.254.169.254/latest/meta-data"), null);
    assert.equal(await extractDirectStream("https://[::1]/x.mp4"), null);
  });

  it("returns real public direct media URLs (real DNS)", async () => {
    assert.equal(
      await extractDirectStream("https://vjs.zencdn.net/v/oceans.mp4"),
      "https://vjs.zencdn.net/v/oceans.mp4",
    );
    assert.equal(
      await extractDirectStream("https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8"),
      "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
    );
  });

  it("fails closed on a real unresolvable host within the deadline", async () => {
    const start = performance.now();
    assert.equal(
      await extractDirectStream("https://no-such-host-9x7q.test/x.mp4"),
      null,
    );
    inRange(performance.now() - start, 0, 8000);
  });

  it("blocks the live desustream.net redirect off the allowlist", async () => {
    const start = performance.now();
    // desustream.net root 302s to drive.google.com (not allowlisted)
    assert.equal(await extractDirectStream("https://desustream.net/"), null);
    inRange(performance.now() - start, 0, 9000);
  });

  it("handles a live allowlisted embed URL that does not exist (404)", async () => {
    assert.equal(
      await extractDirectStream("https://cdn.odcloud.net/definitely-missing-xyz.html"),
      null,
    );
  });
});
