// Telegram Channel Intelligence API — public-channel data via Telegram's own
// t.me/s/ web preview. Logged-out, no Telegram account, no MTProto: only what
// Telegram itself serves to any anonymous browser. Stateless; nothing stored.
//
// Endpoints:
//   GET /            -> API info (open)
//   GET /health      -> health check (open)
//   GET /v1/channel/{username}                    -> channel info + counters
//   GET /v1/channel/{username}/posts?limit&before&q -> recent posts
//   GET /v1/channel/{username}/posts/{id}         -> single post
//
// Auth: X-API-Key header (or x-rapidapi-proxy-secret from the RapidAPI
// gateway). Keys read from env first, constants as fallback.

const VERSION = "1.0.1";
const FN_NAME = "telegram-intel";

// Env-first; the deployed copy carries real fallback values (not committed).
const MASTER_API_KEY = Deno.env.get("TCI_MASTER_API_KEY") ?? "CHANGE_ME_MASTER_KEY";
const RAPIDAPI_PROXY_SECRET = Deno.env.get("TCI_RAPIDAPI_PROXY_SECRET") ?? "";

const FETCH_TIMEOUT_MS = 12000;
const MAX_PAGES = 5; // max t.me pages per request (20 posts/page)
const CACHE_TTL_MS = 120_000;
const CACHE_MAX = 300;
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

const JSON_HEADERS: Record<string, string> = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-api-key, x-rapidapi-proxy-secret, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "X-Powered-By": "NexMath Telegram Channel Intelligence",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}
function err(status: number, code: string, message: string): Response {
  return json({ error: { code, message } }, status);
}

function authorized(req: Request): boolean {
  const key = req.headers.get("x-api-key") ??
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    new URL(req.url).searchParams.get("api_key") ?? "";
  if (MASTER_API_KEY && MASTER_API_KEY !== "CHANGE_ME_MASTER_KEY" && key === MASTER_API_KEY) {
    return true;
  }
  const proxySecret = req.headers.get("x-rapidapi-proxy-secret") ?? "";
  if (RAPIDAPI_PROXY_SECRET && proxySecret === RAPIDAPI_PROXY_SECRET) return true;
  return false; // fail closed
}

// --- tiny in-memory cache (per warm isolate) -------------------------------
const cache = new Map<string, { ts: number; body: string; status: number }>();
async function fetchTme(url: string): Promise<{ body: string; status: number }> {
  const hit = cache.get(url);
  if (hit && Date.now() - hit.ts < CACHE_TTL_MS) return hit;
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, "Accept-Language": "en" },
      signal: ctl.signal,
    });
    const body = await res.text();
    if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value!);
    const entry = { ts: Date.now(), body, status: res.status };
    cache.set(url, entry);
    return entry;
  } finally {
    clearTimeout(t);
  }
}

// --- HTML helpers -----------------------------------------------------------
function decodeEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ");
}
function stripTags(html: string): string {
  return decodeEntities(
    html.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, ""),
  ).trim();
}
// Parse "11.5M", "2.87K", "635" -> approximate number
function parseCount(s: string | null | undefined): number | null {
  if (!s) return null;
  const m = s.trim().replace(/[,\s]/g, "").match(/^([\d.]+)([KMB])?$/i);
  if (!m) return null;
  const mult = { K: 1e3, M: 1e6, B: 1e9 }[(m[2] ?? "").toUpperCase() as "K" | "M" | "B"] ?? 1;
  return Math.round(parseFloat(m[1]) * mult);
}
function first(re: RegExp, s: string): string | null {
  const m = s.match(re);
  return m ? m[1] : null;
}

// --- channel info -----------------------------------------------------------
function parseChannelInfo(html: string, username: string) {
  const title = first(
    /tgme_channel_info_header_title[^>]*>\s*<span[^>]*>([\s\S]*?)<\/span>/,
    html,
  );
  if (!title) return null;
  const description = first(
    /tgme_channel_info_description[^>]*>([\s\S]*?)<\/div>/,
    html,
  );
  const photo = first(/<meta property="og:image" content="([^"]+)"/, html);
  const verified = /verified-icon|tgme_verified/.test(html);

  const counters: Record<string, { text: string; value: number | null }> = {};
  const counterRe =
    /<span class="counter_value">([^<]+)<\/span>\s*<span class="counter_type">([^<]+)<\/span>/g;
  let cm: RegExpExecArray | null;
  while ((cm = counterRe.exec(html)) !== null) {
    const text = decodeEntities(cm[1]).trim();
    counters[cm[2].trim()] = { text, value: parseCount(text) };
  }
  return {
    username,
    url: `https://t.me/${username}`,
    title: stripTags(title),
    description: description ? stripTags(description) : null,
    verified,
    photo_url: photo ?? null,
    subscribers: counters["subscribers"]?.value ?? counters["subscriber"]?.value ?? null,
    subscribers_text: counters["subscribers"]?.text ?? counters["subscriber"]?.text ?? null,
    counters,
  };
}

// --- posts ------------------------------------------------------------------
interface Post {
  id: number | null;
  url: string | null;
  date: string | null;
  edited: boolean;
  text: string | null;
  views: number | null;
  views_text: string | null;
  photos: string[];
  videos: { url: string | null; duration: string | null }[];
  links: string[];
  forwarded_from: string | null;
  reply_to: string | null;
  link_preview: { url: string | null; title: string | null; description: string | null } | null;
  reactions: { emoji: string; count: number | null; count_text: string }[];
  reactions_total: number | null;
}

// Decode Telegram emoji sprite filenames (UTF-8 bytes as hex, e.g. F09F918D.png -> 👍)
function hexToEmoji(hex: string): string {
  const bytes = new Uint8Array(hex.match(/../g)!.map((h) => parseInt(h, 16)));
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return "";
  }
}

function parsePosts(html: string): Post[] {
  // Split the page into message blocks on the wrapper div. Embed pages
  // (single-post view) have no wrapper — treat the whole page as one block.
  let blocks = html.split(/class="tgme_widget_message_wrap/).slice(1);
  if (!blocks.length && /data-post="/.test(html)) blocks = [html];
  const posts: Post[] = [];
  for (const b of blocks) {
    const dataPost = first(/data-post="([^"]+)"/, b);
    const id = dataPost ? Number(dataPost.split("/").pop()) : null;

    const textHtml = first(
      /tgme_widget_message_text[^>]*>([\s\S]*?)<\/div>/,
      b,
    );
    const links: string[] = [];
    if (textHtml) {
      const linkRe = /<a[^>]+href="([^"]+)"/g;
      let lm: RegExpExecArray | null;
      while ((lm = linkRe.exec(textHtml)) !== null) {
        if (!lm[1].startsWith("https://t.me/") || /t\.me\/[^/]+\/\d+/.test(lm[1])) links.push(decodeEntities(lm[1]));
        else links.push(decodeEntities(lm[1]));
      }
    }

    const photos: string[] = [];
    const photoRe =
      /tgme_widget_message_photo_wrap[^"]*"[^>]*background-image:url\('([^']+)'\)/g;
    let pm: RegExpExecArray | null;
    while ((pm = photoRe.exec(b)) !== null) photos.push(decodeEntities(pm[1]));

    const videos: Post["videos"] = [];
    const videoRe = /<video[^>]*src="([^"]+)"[^>]*>/g;
    let vm: RegExpExecArray | null;
    while ((vm = videoRe.exec(b)) !== null) {
      videos.push({
        url: decodeEntities(vm[1]),
        duration: first(/tgme_widget_message_video_duration[^>]*>([^<]+)</, b),
      });
    }

    // Reactions: emoji + count pairs (best-effort across t.me markup variants).
    const reactions: Post["reactions"] = [];
    const reactionBlockRe =
      /class="[^"]*tgme_(?:widget_message_)?reaction[^"]*"[^>]*>([\s\S]*?)<\/span>\s*<\/span>|<span class="tgme_reaction[^"]*">([\s\S]*?)<\/span>/g;
    let rb: RegExpExecArray | null;
    while ((rb = reactionBlockRe.exec(b)) !== null) {
      const chunk = rb[1] ?? rb[2] ?? "";
      const spriteHex = first(/emoji\/\d+\/([0-9A-Fa-f]+)\.png/, chunk);
      const emoji = first(/<i class="emoji"[^>]*><b>([^<]+)<\/b>/, chunk) ??
        (spriteHex ? hexToEmoji(spriteHex) : null) ??
        (stripTags(chunk).match(/^(\p{Extended_Pictographic}+)/u)?.[1] ?? "");
      const countText = stripTags(chunk).replace(/^\p{Extended_Pictographic}+/u, "").trim();
      if (countText) {
        reactions.push({ emoji, count: parseCount(countText), count_text: countText });
      }
    }
    const reactionsTotal = reactions.length
      ? reactions.reduce((a, r) => a + (r.count ?? 0), 0)
      : null;

    const viewsText = first(/tgme_widget_message_views">([^<]+)</, b);
    const lp = b.includes("tgme_widget_message_link_preview")
      ? {
        url: first(/class="tgme_widget_message_link_preview"[^>]*href="([^"]+)"/, b),
        title: (() => {
          const t = first(/link_preview_title[^>]*>([\s\S]*?)<\/div>/, b);
          return t ? stripTags(t) : null;
        })(),
        description: (() => {
          const d = first(/link_preview_description[^>]*>([\s\S]*?)<\/div>/, b);
          return d ? stripTags(d) : null;
        })(),
      }
      : null;

    posts.push({
      id,
      url: dataPost ? `https://t.me/${dataPost}` : null,
      date: first(/<time datetime="([^"]+)"/, b),
      edited: /tgme_widget_message_meta[\s\S]{0,200}?edited/.test(b),
      text: textHtml ? stripTags(textHtml) : null,
      views: parseCount(viewsText),
      views_text: viewsText,
      photos,
      videos,
      links: [...new Set(links)],
      forwarded_from: (() => {
        const f = first(/tgme_widget_message_forwarded_from_name[^>]*>([\s\S]*?)<\/(?:a|span)>/, b);
        return f ? stripTags(f) : null;
      })(),
      reply_to: first(/class="tgme_widget_message_reply"[^>]*href="([^"]+)"/, b),
      link_preview: lp,
      reactions,
      reactions_total: reactionsTotal,
    });
  }
  return posts;
}

const USERNAME_RE = /^[a-zA-Z][a-zA-Z0-9_]{2,31}$/;

async function loadChannelPage(username: string, before?: string) {
  const url = `https://t.me/s/${encodeURIComponent(username)}` +
    (before ? `?before=${encodeURIComponent(before)}` : "");
  return await fetchTme(url);
}

function notPublicChannel(html: string): boolean {
  // Public channels always render tgme_channel_info on /s/ pages. Users, bots,
  // private channels and groups fall back to a generic join page.
  return !/tgme_channel_info/.test(html);
}

// --- routing ----------------------------------------------------------------
function subPath(req: Request): string {
  const segments = new URL(req.url).pathname.split("/").filter(Boolean);
  const idx = segments.lastIndexOf(FN_NAME);
  const rest = idx >= 0 ? segments.slice(idx + 1) : segments;
  return "/" + rest.join("/");
}

const INFO = {
  name: "Telegram Channel Intelligence API",
  by: "NexMath",
  version: VERSION,
  description:
    "Structured JSON for any PUBLIC Telegram channel — no Telegram account, no API keys, no MTProto. Channel profile with subscriber counts, recent posts with views, reactions, media and link previews, pagination, and keyword filtering. Sourced exclusively from Telegram's own public t.me web preview (logged-out data only).",
  endpoints: {
    "GET /v1/channel/{username}": "channel title, description, verified flag, photo, subscribers + media counters",
    "GET /v1/channel/{username}/posts": "recent posts; ?limit= (1-100, default 20), ?before={post_id} for pagination, ?q= keyword filter",
    "GET /v1/channel/{username}/posts/{id}": "a single post by id",
    "GET /health": "health check (no auth)",
  },
  data_policy:
    "Public, logged-out data only, as served by t.me to any anonymous visitor. No private channels, groups or user profiles. Respect applicable privacy laws when storing results.",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: JSON_HEADERS });
  if (req.method !== "GET") return err(405, "method_not_allowed", "GET only");

  const path = subPath(req);
  if (path === "/" || path === "") return json(INFO);
  if (path === "/health") return json({ status: "ok", version: VERSION });

  if (!authorized(req)) {
    return err(401, "unauthorized", "Provide X-API-Key header (or subscribe via RapidAPI).");
  }

  const m = path.match(/^\/v1\/channel\/([^/]+)(?:\/posts(?:\/(\d+))?)?$/);
  if (!m) return err(404, "not_found", "Unknown route. GET / for endpoint list.");
  const username = m[1].replace(/^@/, "");
  if (!USERNAME_RE.test(username)) {
    return err(400, "bad_username", "Usernames are 3-32 chars: letters, digits, underscore.");
  }
  const wantsPosts = path.includes("/posts");
  const singleId = m[2];

  try {
    // Single post
    if (singleId) {
      const { body } = await fetchTme(
        `https://t.me/${username}/${singleId}?embed=1&mode=tme`,
      );
      const posts = parsePosts(body);
      const post = posts.find((p) => p.id === Number(singleId)) ?? posts[0] ?? null;
      if (!post || (!post.text && !post.photos.length && !post.videos.length && !post.date)) {
        return err(404, "post_not_found", `Post ${singleId} not found in @${username}.`);
      }
      return json({ channel: username, post });
    }

    const url = new URL(req.url);
    const page = await loadChannelPage(username, url.searchParams.get("before") ?? undefined);
    if (page.status === 404 || notPublicChannel(page.body)) {
      return err(404, "channel_not_found", `@${username} is not a public channel (or does not exist).`);
    }

    // Channel info
    if (!wantsPosts) {
      const info = parseChannelInfo(page.body, username);
      if (!info) return err(404, "channel_not_found", `@${username} is not a public channel.`);
      return json({ channel: info });
    }

    // Posts (with optional multi-page walk for limit/q)
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") ?? "20") || 20));
    const q = url.searchParams.get("q")?.toLowerCase() ?? null;
    let posts = parsePosts(page.body);
    let pages = 1;
    // t.me serves newest-last; normalize newest-first.
    posts.reverse();
    while (
      pages < MAX_PAGES &&
      (q ? posts.filter((p) => p.text?.toLowerCase().includes(q)).length : posts.length) < limit
    ) {
      const oldest = posts[posts.length - 1]?.id;
      if (!oldest || oldest <= 1) break;
      const next = await loadChannelPage(username, String(oldest));
      const older = parsePosts(next.body).reverse()
        .filter((p) => p.id !== null && p.id < oldest);
      if (!older.length) break;
      posts = posts.concat(older);
      pages++;
    }
    const filtered = q ? posts.filter((p) => p.text?.toLowerCase().includes(q)) : posts;
    const out = filtered.slice(0, limit);
    const oldestScanned = posts[posts.length - 1]?.id ?? null;
    return json({
      channel: username,
      query: q,
      count: out.length,
      pages_scanned: pages,
      next_before: oldestScanned && oldestScanned > 1 ? oldestScanned : null,
      posts: out,
    });
  } catch (e) {
    if ((e as Error).name === "AbortError") {
      return err(504, "upstream_timeout", "t.me did not respond in time. Try again.");
    }
    return err(502, "upstream_error", `Failed to fetch from t.me: ${(e as Error).message}`);
  }
});
