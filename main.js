var __getOwnPropNames = Object.getOwnPropertyNames;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};

// core/model.js
var require_model = __commonJS({
  "core/model.js"(exports2, module2) {
    var PLATFORMS = {
      bilibili: { id: "bilibili", name: "\u54D4\u54E9\u54D4\u54E9", emoji: "\u{1F4FA}", kind: "video" },
      xiaohongshu: { id: "xiaohongshu", name: "\u5C0F\u7EA2\u4E66", emoji: "\u{1F4D5}", kind: "note" },
      xiaoyuzhou: { id: "xiaoyuzhou", name: "\u5C0F\u5B87\u5B99", emoji: "\u{1F3A7}", kind: "audio" },
      twitter: { id: "twitter", name: "X / Twitter", emoji: "\u{1F426}", kind: "post" }
    };
    var TARGETS = {
      obsidian: { id: "obsidian", name: "Obsidian", emoji: "\u{1F48E}" },
      notion: { id: "notion", name: "Notion", emoji: "\u{1F4C4}" }
    };
    function makeItem(partial) {
      const p = partial || {};
      const platform = p.platform || "";
      const id = String(p.id || "").trim();
      return {
        id,
        sourceId: p.sourceId || (platform && id ? `${platform}:${id}` : ""),
        platform,
        title: cleanText(p.title) || "\u672A\u547D\u540D",
        url: String(p.url || "").trim(),
        author: {
          name: cleanText(p.author && (p.author.name || p.author)) || "",
          url: String(p.author && p.author.url || "").trim()
        },
        summary: cleanText(p.summary),
        cover: String(p.cover || "").trim(),
        publishedAt: toISO(p.publishedAt),
        collectedAt: toISO(p.collectedAt),
        duration: Number(p.duration) || 0,
        tags: Array.isArray(p.tags) ? p.tags.filter(Boolean).map((t) => String(t).trim()) : [],
        collection: cleanText(p.collection) || "\u672A\u5206\u7C7B",
        content: String(p.content || "").trim(),
        transcript: String(p.transcript || "").trim(),
        media: Array.isArray(p.media) ? p.media.filter(Boolean) : [],
        videoUrl: String(p.videoUrl || "").trim(),
        raw: p.raw || {}
      };
    }
    function cleanText(s) {
      if (s == null) return "";
      return String(s).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u200b-\u200f\u2028\u2029]/g, "").trim();
    }
    function toISO(v) {
      if (v == null || v === "") return "";
      try {
        if (v instanceof Date) return isNaN(v.getTime()) ? "" : v.toISOString();
        if (typeof v === "number" && Number.isFinite(v)) {
          return new Date(v < 1e11 ? v * 1e3 : v).toISOString();
        }
        if (typeof v === "string") {
          const t = v.trim();
          if (/^\d+$/.test(t)) return toISO(Number(t));
          const d = new Date(t);
          return isNaN(d.getTime()) ? "" : d.toISOString();
        }
      } catch (_) {
      }
      return "";
    }
    function isoDate(iso) {
      return iso ? String(iso).slice(0, 10) : "";
    }
    function fmtDuration(sec) {
      const s = Math.max(0, Math.floor(Number(sec) || 0));
      const h = Math.floor(s / 3600);
      const m = Math.floor(s % 3600 / 60);
      const ss = s % 60;
      const pad = (n) => String(n).padStart(2, "0");
      return h > 0 ? `${h}:${pad(m)}:${pad(ss)}` : `${pad(m)}:${pad(ss)}`;
    }
    function sanitizeFileName(name, maxLen) {
      const cleaned = cleanText(name).replace(/[\\/:*?"<>|#^[\]]/g, "_").replace(/\s+/g, " ").replace(/^\.+/, "").trim();
      return (cleaned || "\u672A\u547D\u540D").slice(0, maxLen || 80);
    }
    function yamlScalar(v) {
      const s = v == null ? "" : String(v);
      const needsQuote = s === "" || /[:#\-{}[\],&*?|>=!%@`"'\\\n\r\t]/.test(s) || /^[\s]/.test(s) || /^(true|false|null|yes|no|on|off|~)$/i.test(s) || /^[-+]?[0-9.]+([eE][-+]?[0-9]+)?$/.test(s);
      if (!needsQuote) return s;
      return '"' + s.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n").replace(/\r/g, "") + '"';
    }
    function normalizePath(p) {
      let s = String(p == null ? "" : p);
      s = s.replace(/\\/g, "/");
      s = s.replace(/\u00a0/g, " ");
      s = s.replace(/\/{2,}/g, "/");
      s = s.replace(/^\/+/, "").replace(/\/+$/, "");
      if (typeof s.normalize === "function") s = s.normalize("NFC");
      return s;
    }
    function yamlList(arr) {
      if (!Array.isArray(arr) || !arr.length) return "[]";
      return "[" + arr.map(yamlScalar).join(", ") + "]";
    }
    module2.exports = {
      PLATFORMS,
      TARGETS,
      makeItem,
      cleanText,
      toISO,
      isoDate,
      fmtDuration,
      sanitizeFileName,
      normalizePath,
      yamlScalar,
      yamlList
    };
  }
});

// core/http.js
var require_http = __commonJS({
  "core/http.js"(exports2, module2) {
    var sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    async function normalizeResponse(res, raw) {
      const out = {
        status: res.status,
        headers: res.headers || {},
        json: null,
        text: "",
        arrayBuffer: null,
        raw
      };
      if (typeof res.text === "function") {
        try {
          out.text = await res.text();
        } catch (_) {
          out.text = "";
        }
      } else if (typeof res.data === "string") {
        out.text = res.data;
      }
      if (res.json && typeof res.json === "object" && !(res.json instanceof ArrayBuffer)) {
        out.json = res.json;
      } else if (out.text) {
        try {
          const parsed = JSON.parse(out.text);
          if (parsed && typeof parsed === "object") out.json = parsed;
        } catch (_) {
        }
      }
      return out;
    }
    async function nodeFetch(url, opts) {
      const res = await fetch(url, {
        ...opts,
        // Node fetch 默认不带 UA，部分 CDN 会拒绝
        headers: { "User-Agent": opts.headers && opts.headers["User-Agent"] || "Clipin/1.0", ...opts.headers || {} }
      });
      const ab = opts && opts.binary ? await res.arrayBuffer() : null;
      const r = await normalizeResponse(res, res);
      if (ab) r.arrayBuffer = ab;
      return r;
    }
    function createHttp(cfg) {
      const conf = cfg || {};
      const request = conf.request || nodeFetch;
      const intervalMs = conf.intervalMs == null ? 300 : conf.intervalMs;
      const jitterMax = conf.jitterMax == null ? 0 : conf.jitterMax;
      const fastHosts = Array.isArray(conf.fastHosts) ? conf.fastHosts.filter(Boolean) : [];
      const maxRetries = conf.maxRetries == null ? 3 : conf.maxRetries;
      const onThrottle = conf.onThrottle || (() => {
      });
      const log = conf.logger || (() => {
      });
      let lastRequestAt = 0;
      function isFast(url) {
        if (!fastHosts.length || !url) return false;
        const u = String(url);
        return fastHosts.some((h) => u.includes(h));
      }
      async function throttle() {
        if (intervalMs <= 0) return;
        const extra = jitterMax > 0 ? Math.floor(Math.random() * (jitterMax + 1)) : 0;
        const wait = lastRequestAt + intervalMs + extra - Date.now();
        if (wait > 0) {
          onThrottle(wait);
          await sleep(wait);
        }
        lastRequestAt = Date.now();
      }
      async function fetchOnce(url, opts) {
        if (!(opts && opts.noThrottle) && !isFast(url)) await throttle();
        const o = opts || {};
        const res = await request(url, {
          method: o.method || "GET",
          headers: o.headers || {},
          body: o.body,
          binary: o.binary,
          throw: false
          // 让 4xx/5xx 走返回值而不是抛异常，重试逻辑在下面统一处理
        });
        return normalizeResponse(res, res);
      }
      async function request_with_retry(url, opts) {
        const o = opts || {};
        let lastErr = null;
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
          try {
            const res = await fetchOnce(url, o);
            const retryable = res.status === 429 || res.status === 529 || res.status >= 500;
            if (retryable && attempt < maxRetries) {
              const retryAfter = Number(res.headers && (res.headers["retry-after"] || res.headers["Retry-After"]));
              const backoff = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1e3 : Math.min(3e4, 800 * Math.pow(2, attempt)) + Math.floor(Math.random() * 200);
              log(`[http] ${res.status}\uFF0C${backoff}ms \u540E\u91CD\u8BD5 (${attempt + 1}/${maxRetries}) ${url}`);
              await sleep(backoff);
              continue;
            }
            return res;
          } catch (e) {
            lastErr = e;
            if (attempt < maxRetries) {
              const backoff = Math.min(3e4, 800 * Math.pow(2, attempt));
              log(`[http] \u8BF7\u6C42\u5F02\u5E38 ${e.message}\uFF0C${backoff}ms \u540E\u91CD\u8BD5 (${attempt + 1}/${maxRetries})`);
              await sleep(backoff);
              continue;
            }
          }
        }
        throw lastErr || new Error("\u8BF7\u6C42\u5931\u8D25\uFF1A" + url);
      }
      async function json(url, opts) {
        const o = opts || {};
        const headers = Object.assign({ Accept: "application/json" }, o.headers || {});
        let body = o.body;
        if (body && typeof body === "object" && !(typeof body === "string")) {
          body = JSON.stringify(body);
          headers["Content-Type"] = "application/json";
        }
        const res = await request_with_retry(url, Object.assign({}, o, { headers, body }));
        if (res.json) return res.json;
        throw new Error("\u54CD\u5E94\u4E0D\u662F JSON\uFF08status " + res.status + "\uFF09\uFF1A" + String(res.text || "").slice(0, 120));
      }
      async function binary(url, opts) {
        const res = await request_with_retry(url, Object.assign({}, opts || {}, { binary: true }));
        if (res.arrayBuffer && res.arrayBuffer.byteLength) return res.arrayBuffer;
        throw new Error("\u4E0B\u8F7D\u5931\u8D25\u6216\u5185\u5BB9\u4E3A\u7A7A\uFF08status " + res.status + "\uFF09");
      }
      return {
        fetch: request_with_retry,
        json,
        binary,
        sleep,
        /** 手工节流（provider 里连续多次调用之间用） */
        tick: throttle,
        /** 重置节流计时（切换平台时调用，避免无谓等待） */
        resetThrottle: () => {
          lastRequestAt = 0;
        },
        _config: { intervalMs, jitterMax, fastHosts: fastHosts.length, maxRetries }
      };
    }
    module2.exports = { createHttp, normalizeResponse, nodeFetch, sleep };
  }
});

// core/license.js
var require_license = __commonJS({
  "core/license.js"(exports2, module2) {
    var crypto = require("crypto");
    var LICENSE_SECRET = process.env.CLIPIN_LICENSE_SECRET || "bili2obsidian::v1::aiprice";
    var ACCEPT_PREFIXES = ["CLP", "B2O"];
    var DEFAULT_PREFIX = "CLP";
    var BASE62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
    function deriveNonce(orderId) {
      const h = crypto.createHash("sha256").update("nonce:" + orderId + "|" + LICENSE_SECRET).digest("hex");
      let n = BigInt("0x" + h) % BigInt(62) ** BigInt(8);
      let s = "";
      for (let i = 0; i < 8; i++) {
        s = BASE62[Number(n % BigInt(62))] + s;
        n /= BigInt(62);
      }
      return s;
    }
    function signLicense(orderId, prefix) {
      const nonce = deriveNonce(orderId);
      const sig = crypto.createHmac("sha256", LICENSE_SECRET).update("lic:" + nonce).digest("hex").slice(0, 16);
      return `${prefix || DEFAULT_PREFIX}-${nonce}-${sig}`;
    }
    function isWellFormed(code) {
      const prefixes = ACCEPT_PREFIXES.join("|");
      return new RegExp(`^(?:${prefixes})-([A-Za-z0-9]{8})-([a-f0-9]{16})$`, "i").test(String(code || "").trim());
    }
    function getPrefix(code) {
      const m = /^([A-Za-z0-9]{2,4})-[A-Za-z0-9]{8}-[a-f0-9]{16}$/i.exec(String(code || "").trim());
      return m ? m[1].toUpperCase() : "";
    }
    function hmacHex(msg) {
      return crypto.createHmac("sha256", LICENSE_SECRET).update(msg).digest("hex");
    }
    function verifyLicenseCode(code) {
      const prefixes = ACCEPT_PREFIXES.join("|");
      const m = new RegExp(`^(?:${prefixes})-([A-Za-z0-9]{8})-([a-f0-9]{16})$`, "i").exec(String(code || "").trim());
      if (!m) return false;
      const expect = hmacHex("lic:" + m[1]).slice(0, 16);
      return expect === m[2].toLowerCase();
    }
    async function verifyLicenseCodeAsync(code) {
      const enc = new TextEncoder();
      const prefixes = ACCEPT_PREFIXES.join("|");
      const m = new RegExp(`^(?:${prefixes})-([A-Za-z0-9]{8})-([a-f0-9]{16})$`, "i").exec(String(code || "").trim());
      if (!m) return false;
      const key = await crypto.subtle.importKey(
        "raw",
        enc.encode(LICENSE_SECRET),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
      );
      const sig = await crypto.subtle.sign("HMAC", key, enc.encode("lic:" + m[1]));
      const expect = [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 16);
      return expect === m[2].toLowerCase();
    }
    module2.exports = {
      LICENSE_SECRET,
      ACCEPT_PREFIXES,
      DEFAULT_PREFIX,
      deriveNonce,
      signLicense,
      verifyLicenseCode,
      verifyLicenseCodeAsync,
      isWellFormed,
      getPrefix,
      hmacHex
    };
  }
});

// core/ai.js
var require_ai = __commonJS({
  "core/ai.js"(exports2, module2) {
    function stripThink(text) {
      if (!text) return "";
      let s = String(text);
      s = s.replace(/<\s*(think|thinking|reasoning|reflection)\b[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, "");
      s = s.replace(/<\s*(think|thinking|reasoning|reflection)\b[^>]*>[\s\S]*$/gi, "");
      s = s.replace(/<\s*\/\s*(think|thinking|reasoning|reflection)\s*>/gi, "");
      return s.trim();
    }
    function extractMessage(body) {
      const b = body || {};
      const choice = b.choices && b.choices[0] || {};
      const msg = choice.message || {};
      const finishReason = String(choice.finish_reason || "");
      const hadReasoning = !!(msg.reasoning_content && String(msg.reasoning_content).trim());
      let raw = msg.content;
      if (Array.isArray(raw)) {
        raw = raw.map((p) => p && typeof p === "object" ? p.text || "" : String(p || "")).join("");
      }
      return {
        text: stripThink(raw || ""),
        hadReasoning,
        finishReason
      };
    }
    function buildPrompt(item, content) {
      const platformName = {
        bilibili: "\u89C6\u9891",
        xiaohongshu: "\u5C0F\u7EA2\u4E66\u7B14\u8BB0",
        xiaoyuzhou: "\u64AD\u5BA2\u5355\u96C6",
        twitter: "\u63A8\u6587"
      }[item && item.platform] || "\u5185\u5BB9";
      const meta = [
        item && item.title ? `\u6807\u9898\uFF1A${item.title}` : "",
        item && item.author && item.author.name ? `\u4F5C\u8005\uFF1A${item.author.name}` : "",
        item && item.duration ? `\u65F6\u957F\uFF1A${Math.round(item.duration / 60)} \u5206\u949F` : ""
      ].filter(Boolean).join("\n");
      return [
        `\u8BF7\u603B\u7ED3\u4E0B\u9762\u8FD9\u7BC7${platformName}\u3002`,
        meta ? `
${meta}
` : "",
        "\n\u6309\u4EE5\u4E0B\u7ED3\u6784\u8F93\u51FA\uFF0C\u4E0D\u8981\u52A0\u4EFB\u4F55\u989D\u5916\u5F00\u573A\u767D\uFF1A",
        "## \u6838\u5FC3\u89C2\u70B9",
        "\uFF082-3 \u53E5\u8BDD\u8BF4\u6E05\u4E3B\u65E8\uFF09",
        "## \u8981\u70B9",
        "- \uFF083-6 \u6761\u5177\u4F53\u8981\u70B9\uFF0C\u6BCF\u6761\u4E00\u53E5\u8BDD\uFF09",
        "## \u91D1\u53E5",
        '- \uFF08\u6458\u5F55 1-3 \u53E5\u539F\u6587\uFF0C\u6CA1\u6709\u5C31\u5199"\u65E0"\uFF09',
        "\n\u539F\u6587\u5185\u5BB9\uFF1A\n" + String(content || "").slice(0, 12e3)
      ].join("\n");
    }
    async function summarize(cfg) {
      const c = cfg || {};
      const log = c.logger || (() => {
      });
      const base = String(c.baseUrl || "").replace(/\/+$/, "");
      if (!base || !c.apiKey) return null;
      if (!c.content || !String(c.content).trim()) return null;
      try {
        const body = await c.http.json(base + "/chat/completions", {
          method: "POST",
          headers: { Authorization: "Bearer " + c.apiKey },
          body: {
            model: c.model || "deepseek-chat",
            messages: [{ role: "user", content: buildPrompt(c.item, c.content) }],
            max_tokens: c.maxTokens || 1200,
            // 明确关掉思考：支持的网关会省一半 token，不支持的忽略该字段
            ...c.disableThinking ? { thinking: { type: "disabled" } } : {}
          }
        });
        const r = extractMessage(body);
        if (r.hadReasoning && !r.text) {
          log("[ai] \u6A21\u578B\u53EA\u8FD4\u56DE\u4E86\u601D\u8003\u8FC7\u7A0B\uFF08reasoning_content\uFF09\uFF0C\u6CA1\u6709\u6B63\u5F0F\u56DE\u7B54");
          return null;
        }
        if (r.finishReason === "length") {
          log("[ai] \u8F93\u51FA\u88AB max_tokens \u622A\u65AD");
        }
        return r.text || null;
      } catch (e) {
        log("[ai] \u603B\u7ED3\u5931\u8D25\uFF1A" + (e.message || e));
        return null;
      }
    }
    async function testConnection(cfg) {
      const c = cfg || {};
      const base = String(c.baseUrl || "").replace(/\/+$/, "");
      if (!base) return { ok: false, msg: "\u8BF7\u5148\u586B\u63A5\u53E3\u5730\u5740" };
      if (!c.apiKey) return { ok: false, msg: "\u8BF7\u5148\u586B API Key" };
      try {
        const body = await c.http.json(base + "/models", {
          headers: { Authorization: "Bearer " + c.apiKey }
        });
        const list = body && body.data;
        if (Array.isArray(list)) {
          return { ok: true, msg: `\u8FDE\u63A5\u6210\u529F\uFF0C\u53EF\u7528\u6A21\u578B ${list.length} \u4E2A`, models: list.map((m) => m.id).slice(0, 50) };
        }
        return { ok: true, msg: "\u8FDE\u63A5\u6210\u529F\uFF08\u63A5\u53E3\u672A\u8FD4\u56DE\u6A21\u578B\u5217\u8868\uFF0C\u4F46\u9274\u6743\u901A\u8FC7\uFF09" };
      } catch (e) {
        const s = String(e.message || e);
        if (/401|Unauthorized/i.test(s)) return { ok: false, msg: "API Key \u65E0\u6548\u6216\u5DF2\u8FC7\u671F" };
        if (/404|Not Found/i.test(s)) return { ok: false, msg: "\u63A5\u53E3\u5730\u5740\u4E0D\u5BF9\uFF08\u672A\u627E\u5230 /models\uFF09" };
        return { ok: false, msg: "\u8FDE\u63A5\u5931\u8D25\uFF1A" + s.slice(0, 100) };
      }
    }
    module2.exports = { stripThink, extractMessage, buildPrompt, summarize, testConnection };
  }
});

// core/html2md.js
var require_html2md = __commonJS({
  "core/html2md.js"(exports2, module2) {
    var ENTITIES = {
      amp: "&",
      lt: "<",
      gt: ">",
      quot: '"',
      apos: "'",
      nbsp: " ",
      mdash: "\u2014",
      ndash: "\u2013",
      hellip: "\u2026",
      lsquo: "\u2018",
      rsquo: "\u2019",
      ldquo: "\u201C",
      rdquo: "\u201D",
      middot: "\xB7",
      bull: "\u2022"
    };
    function decodeEntities(s) {
      return String(s).replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d))).replace(/&([a-z]+);/gi, (m, n) => n.toLowerCase() in ENTITIES ? ENTITIES[n.toLowerCase()] : m);
    }
    function stripNoise(html) {
      return String(html).replace(/<\s*(script|style|noscript|svg|iframe)\b[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, "").replace(/<!--[\s\S]*?-->/g, "");
    }
    function inline(html) {
      let s = String(html);
      s = s.replace(/<a\b[^>]*href\s*=\s*(['"])(.*?)\1[^>]*>([\s\S]*?)<\/a>/gi, (_, __, href, text) => {
        const t = text.replace(/<[^>]+>/g, "").trim();
        return t ? `[${t}](${href.trim()})` : href.trim();
      });
      s = s.replace(/<a\b[^>]*href\s*=\s*([^'"\s>]+)[^>]*>([\s\S]*?)<\/a>/gi, (_, href, text) => {
        const t = text.replace(/<[^>]+>/g, "").trim();
        return t ? `[${t}](${href})` : href;
      });
      s = s.replace(/<img\b[^>]*>/gi, (tag) => {
        const src = /(?:src\s*=\s*(['"])(.*?)\1)|(?:src\s*=\s*([^'"\s>]+))/i.exec(tag);
        const alt = /(?:alt\s*=\s*(['"])(.*?)\1)|(?:alt\s*=\s*([^'"\s>]+))/i.exec(tag);
        const url = src && (src[2] || src[3]) || "";
        if (!url) return "";
        return `![${alt && (alt[2] || alt[3]) || ""}](${url})`;
      });
      s = s.replace(/<\s*(strong|b)\b[^>]*>([\s\S]*?)<\s*\/\s*\1\s*>/gi, "**$2**");
      s = s.replace(/<\s*(em|i)\b[^>]*>([\s\S]*?)<\s*\/\s*\1\s*>/gi, "*$2*");
      s = s.replace(/<\s*code\b[^>]*>([\s\S]*?)<\s*\/\s*code\s*>/gi, "`$1`");
      s = s.replace(/<\s*br\s*\/?\s*>/gi, "\n");
      s = s.replace(/<[^>]+>/g, "");
      return decodeEntities(s);
    }
    function htmlToMarkdown(html) {
      if (!html) return "";
      let s = stripNoise(html);
      s = s.replace(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi, (_, lvl, t) => {
        const n = Math.min(6, Math.max(1, Number(lvl)));
        return "\n\n" + "#".repeat(n) + " " + inline(t).trim() + "\n\n";
      });
      const codeBlocks = [];
      s = s.replace(/<pre\b[^>]*>([\s\S]*?)<\/pre>/gi, (_, t) => {
        const lang = /class\s*=\s*['"][^'"]*language-([\w+-]+)/i.exec(t);
        const inner = decodeEntities(t.replace(/<[^>]+>/g, "")).replace(/\n+$/, "");
        codeBlocks.push("```" + (lang ? lang[1] : "") + "\n" + inner + "\n```");
        return `\0CODE${codeBlocks.length - 1}\0`;
      });
      s = s.replace(/<li\b[^>]*>([\s\S]*?)<\/li>/gi, (_, t) => "\n- " + inline(t).trim());
      s = s.replace(/<\s*(ul|ol)\b[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, (block) => {
        const body = block.replace(/<\s*\/?\s*(ul|ol)\b[^>]*>/gi, "");
        return "\n\n" + body.replace(/\n{2,}/g, "\n").trim() + "\n\n";
      });
      s = s.replace(/<blockquote\b[^>]*>([\s\S]*?)<\/blockquote>/gi, (_, t) => {
        const body = inline(t).trim().split("\n").map((l) => "> " + l).join("\n");
        return "\n\n" + body + "\n\n";
      });
      s = s.replace(/<hr\s*\/?\s*>/gi, "\n\n---\n\n");
      s = s.replace(/<\s*(p|div|figure|figcaption|section)\b[^>]*>([\s\S]*?)<\s*\/\s*\1\s*>/gi, (_, __, t) => "\n\n" + inline(t).trim() + "\n\n");
      s = s.replace(/<[^>]+>/g, "");
      s = decodeEntities(s);
      s = s.replace(/\u0000CODE(\d+)\u0000/g, (_, i) => codeBlocks[Number(i)]);
      return s.replace(/\n{3,}/g, "\n\n").replace(/[ \t]+\n/g, "\n").trim();
    }
    module2.exports = { htmlToMarkdown, decodeEntities, stripNoise };
  }
});

// core/render.js
var require_render = __commonJS({
  "core/render.js"(exports2, module2) {
    var {
      yamlScalar,
      yamlList,
      isoDate,
      fmtDuration,
      sanitizeFileName
    } = require_model();
    var PLATFORM_META = {
      bilibili: { name: "\u54D4\u54E9\u54D4\u54E9", emoji: "\u{1F4FA}", label: "\u89C6\u9891" },
      xiaohongshu: { name: "\u5C0F\u7EA2\u4E66", emoji: "\u{1F4D5}", label: "\u7B14\u8BB0" },
      xiaoyuzhou: { name: "\u5C0F\u5B87\u5B99", emoji: "\u{1F3A7}", label: "\u64AD\u5BA2" },
      twitter: { name: "X", emoji: "\u{1F426}", label: "\u63A8\u6587" }
    };
    function buildFrontmatter(item, opts) {
      const o = opts || {};
      const meta = PLATFORM_META[item.platform] || { name: item.platform, emoji: "\u{1F517}", label: "\u5185\u5BB9" };
      const lines = [
        `source_id: ${yamlScalar(item.sourceId)}`,
        `platform: ${yamlScalar(item.platform)}`,
        `title: ${yamlScalar(item.title)}`
      ];
      if (item.author.name) lines.push(`author: ${yamlScalar(item.author.name)}`);
      if (item.url) lines.push(`url: ${yamlScalar(item.url)}`);
      if (item.collection) lines.push(`collection: ${yamlScalar(item.collection)}`);
      if (item.publishedAt) lines.push(`published: ${yamlScalar(isoDate(item.publishedAt))}`);
      if (item.collectedAt) lines.push(`saved: ${yamlScalar(isoDate(item.collectedAt))}`);
      if (item.duration > 0) lines.push(`duration: ${item.duration}`);
      if (o.cover) lines.push(`cover: ${yamlScalar(o.cover)}`);
      const tags = [];
      tags.push(`${item.platform}`);
      if (item.collection && item.collection !== "\u672A\u5206\u7C7B") tags.push(sanitizeTag(item.collection));
      (item.tags || []).forEach((t) => tags.push(sanitizeTag(t)));
      (o.extraTags || []).forEach((t) => tags.push(sanitizeTag(t)));
      const uniq = [...new Set(tags.filter(Boolean))];
      if (uniq.length) lines.push(`tags: ${yamlList(uniq)}`);
      if (o.aiSummary) lines.push(`ai_summary: true`);
      if (item.transcript || o.transcript) lines.push(`transcript: true`);
      lines.push(`synced_at: ${yamlScalar(o.syncedAt || (/* @__PURE__ */ new Date()).toISOString())}`);
      return lines;
    }
    function sanitizeTag(t) {
      return String(t || "").trim().replace(/^#/, "").replace(/[\s#[\]|"'\\]/g, "-").slice(0, 40);
    }
    function renderNote(item, opts) {
      const o = opts || {};
      const meta = PLATFORM_META[item.platform] || { name: item.platform, emoji: "\u{1F517}", label: "\u5185\u5BB9" };
      const fm = buildFrontmatter(item, o);
      const parts = [];
      parts.push("---");
      parts.push(fm.join("\n"));
      parts.push("---");
      parts.push("");
      parts.push(`# ${item.title}`);
      parts.push("");
      const infoBits = [`${meta.emoji} ${meta.name}`];
      if (item.author.name) {
        infoBits.push(o.linkAuthor === false ? `\u4F5C\u8005\uFF1A${item.author.name}` : `\u4F5C\u8005\uFF1A[[${item.author.name}]]`);
      }
      if (item.publishedAt) infoBits.push(`\u53D1\u5E03\uFF1A${isoDate(item.publishedAt)}`);
      if (item.duration > 0) infoBits.push(`\u65F6\u957F\uFF1A${fmtDuration(item.duration)}`);
      parts.push(infoBits.join(" \uFF5C "));
      parts.push("");
      if (o.cover) {
        parts.push(`![cover](${o.cover})`);
        parts.push("");
      }
      if (item.url) {
        parts.push(`> \u539F\u6587\uFF1A[${item.title}](${item.url})`);
        parts.push("");
      }
      if (o.aiSummary) {
        parts.push("## AI \u603B\u7ED3");
        parts.push("");
        parts.push(o.aiSummary);
        parts.push("");
      }
      const body = item.content || item.summary;
      if (body) {
        parts.push("## \u6B63\u6587");
        parts.push("");
        parts.push(body);
        parts.push("");
      } else if (item.summary) {
        parts.push(item.summary);
        parts.push("");
      }
      if (item.media && item.media.length > 1) {
        parts.push("## \u56FE\u7247");
        parts.push("");
        item.media.forEach((u, i) => parts.push(`![img${i + 1}](${u})`));
        parts.push("");
      }
      const transcript = o.transcript || item.transcript;
      if (transcript) {
        parts.push("## \u9010\u5B57\u7A3F");
        parts.push("");
        parts.push(transcript);
        parts.push("");
      }
      const footer = [];
      if (item.url) footer.push(`[\u5728 ${meta.name} \u6253\u5F00](${item.url})`);
      parts.push("---");
      parts.push("");
      parts.push(footer.join(" \uFF5C "));
      if (o.linkAuthor !== false && item.author.name) {
        parts.push("");
        parts.push(`#${item.platform} [[${item.author.name}]]`);
      }
      parts.push("");
      return parts.join("\n");
    }
    function buildFileName(item) {
      const title = sanitizeFileName(item.title, 60);
      const id = sanitizeFileName(item.id, 24);
      return `${title}(${id}).md`;
    }
    function buildDirPath(item, rootPath, template) {
      const tpl = template || "{root}/{platform}/{collection}";
      const map = {
        root: sanitizeFileName(String(rootPath || "savault").replace(/\/$/, ""), 60),
        platform: item.platform || "unknown",
        collection: sanitizeFileName(item.collection || "\u672A\u5206\u7C7B", 40)
      };
      return tpl.replace(/\{(\w+)\}/g, (m, k) => k in map ? map[k] : m);
    }
    module2.exports = {
      PLATFORM_META,
      renderNote,
      buildFrontmatter,
      buildFileName,
      buildDirPath,
      sanitizeTag
    };
  }
});

// core/transcript.js
var require_transcript = __commonJS({
  "core/transcript.js"(exports2, module2) {
    var SUBMIT_URL = "https://dashscope.aliyuncs.com/api/v1/services/audio/asr/transcription";
    var TASK_URL = "https://dashscope.aliyuncs.com/api/v1/tasks/";
    var DEFAULT_MODEL = "paraformer-v2";
    async function transcribeViaDashscope(o) {
      const { http, apiKey, videoUrl } = o;
      const log = o.logger || (() => {
      });
      const sleep = o.sleep || ((ms) => new Promise((r) => setTimeout(r, ms)));
      if (!apiKey) throw new Error("\u672A\u914D\u7F6E dashscope API key\uFF08\u8BBE\u7F6E\u9875 \u2192 \u8F6C\u5199\uFF09");
      if (!videoUrl) throw new Error("\u6CA1\u6709\u53EF\u8F6C\u5199\u7684\u89C6\u9891\u5730\u5740");
      const model = o.model || DEFAULT_MODEL;
      const pollMs = o.pollMs || 3e3;
      const maxWaitMs = o.maxWaitMs || 3e5;
      const authHeaders = { "Authorization": "Bearer " + apiKey };
      const sub = await http.json(SUBMIT_URL, {
        method: "POST",
        headers: { ...authHeaders, "X-DashScope-Async": "enable" },
        body: {
          model,
          input: { file_urls: [videoUrl] },
          parameters: { language_hints: ["zh", "en"] }
        }
      });
      const taskId = sub && sub.output && sub.output.task_id;
      if (!taskId) throw new Error("dashscope \u672A\u8FD4\u56DE task_id\uFF1A" + JSON.stringify(sub).slice(0, 200));
      log("[asr] \u4EFB\u52A1\u5DF2\u63D0\u4EA4 " + taskId);
      const deadline = Date.now() + maxWaitMs;
      let lastSt = "";
      for (; ; ) {
        if (Date.now() > deadline) throw new Error("\u8F6C\u5199\u8D85\u65F6\uFF08" + Math.round(maxWaitMs / 1e3) + "s\uFF09");
        await sleep(pollMs);
        const t = await http.json(TASK_URL + taskId, { headers: authHeaders });
        const st = t && t.output && t.output.task_status;
        if (st !== lastSt) {
          log("[asr] \u4EFB\u52A1\u72B6\u6001\uFF1A" + st);
          lastSt = st;
        }
        if (st === "SUCCEEDED") {
          const results = t.output && t.output.results || [];
          const tu = results[0] && results[0].transcription_url;
          if (!tu) throw new Error("\u4EFB\u52A1\u6210\u529F\u4F46\u65E0 transcription_url");
          const tr = await http.json(tu, {});
          return extractText(tr);
        }
        if (st === "FAILED" || st === "CANCELED") {
          throw new Error("\u8F6C\u5199\u5931\u8D25\uFF1A" + (t.output && (t.output.message || t.output.code) || st));
        }
      }
    }
    function extractText(tr) {
      const list = tr && tr.transcripts || [];
      const parts = [];
      for (const t of list) {
        if (t.text && String(t.text).trim()) {
          parts.push(String(t.text).trim());
          continue;
        }
        const sens = Array.isArray(t.sentences) ? t.sentences : [];
        const joined = sens.map((s) => s && s.text || "").filter(Boolean).join("\u3002");
        if (joined) parts.push(joined);
      }
      const text = parts.join("\n\n").trim();
      if (!text) throw new Error("\u8F6C\u5199\u7ED3\u679C\u4E3A\u7A7A");
      return text;
    }
    module2.exports = { transcribeViaDashscope, extractText, DEFAULT_MODEL };
  }
});

// core/engine.js
var require_engine = __commonJS({
  "core/engine.js"(exports2, module2) {
    var { renderNote, buildFileName, buildDirPath } = require_render();
    var { summarize } = require_ai();
    var { transcribeViaDashscope } = require_transcript();
    async function sync(opts) {
      const o = opts || {};
      const provider = o.provider;
      const target = o.target;
      const http = o.http;
      const log = o.logger || (() => {
      });
      const progress = o.onProgress || (() => {
      });
      const quota = o.quota || { max: 0, used: 0, isPro: false };
      const enrich = o.enrich || {};
      const limit = Number(o.limit) || 0;
      const result = { created: 0, skipped: 0, failed: 0, quotaHit: false, errors: [], aborted: false };
      if (!provider) throw new Error("\u7F3A\u5C11 provider");
      if (!target) throw new Error("\u7F3A\u5C11 target");
      let remaining = Infinity;
      if (!quota.isPro && Number(quota.max) > 0) {
        remaining = Math.max(0, Number(quota.max) - Number(quota.used));
        if (remaining <= 0) {
          result.quotaHit = true;
          return result;
        }
      }
      progress({ phase: "auth", message: "\u6B63\u5728\u6821\u9A8C\u767B\u5F55\u6001\u2026" });
      const authResult = await provider.validate({ auth: o.auth, http, onTokenRefresh: o.onTokenRefresh });
      if (!authResult.ok) {
        result.errors.push(`\u767B\u5F55\u6821\u9A8C\u5931\u8D25\uFF1A${authResult.message}`);
        result.failed = -1;
        return result;
      }
      log(`[engine] \u5DF2\u767B\u5F55\uFF1A${authResult.user || "(\u672A\u77E5\u7528\u6237)"}`);
      const whitelist = Array.isArray(o.collections) ? o.collections.filter(Boolean) : [];
      let collections = [];
      const supportsCollections = !!(provider.capabilities && provider.capabilities.collections);
      const needCollectionList = supportsCollections && (whitelist.length > 0 || provider.mode !== "webview");
      if (needCollectionList) {
        progress({ phase: "collections", message: "\u6B63\u5728\u83B7\u53D6\u6536\u85CF\u5939\u5217\u8868\u2026" });
        try {
          collections = await provider.listCollections({ auth: o.auth, http, webviewHost: o.webviewHost });
        } catch (e) {
          const why = e && e.message ? e.message : String(e);
          log("[engine] \u83B7\u53D6\u6536\u85CF\u5939\u5217\u8868\u5931\u8D25\uFF1A" + why);
          if (whitelist.length) {
            result.errors.push(`\u83B7\u53D6\u6536\u85CF\u5939\u5217\u8868\u5931\u8D25\uFF1A${why}`);
            result.failed = -1;
            return result;
          }
          collections = [];
        }
      }
      if (whitelist.length) {
        const before = collections.length;
        collections = collections.filter((c) => whitelist.includes(String(c.id)) || whitelist.includes(String(c.title)));
        log(`[engine] \u6536\u85CF\u5939\u767D\u540D\u5355\uFF1A${before} \u2192 ${collections.length}`);
        if (!collections.length) {
          result.errors.push(`\u6307\u5B9A\u7684\u4E13\u8F91/\u6536\u85CF\u5939\uFF08${whitelist.join("\u3001")}\uFF09\u90FD\u6CA1\u6709\u5339\u914D\u5230\uFF0C\u672C\u6B21\u5DF2\u4E2D\u6B62\uFF0C\u672A\u5199\u5165\u4EFB\u4F55\u5185\u5BB9\u3002\u8BF7\u5728\u8BBE\u7F6E\u9875\u91CD\u65B0\u70B9\u300C\u9009\u62E9\u4E13\u8F91\u300D\u6838\u5BF9\u5217\u8868\uFF0C\u6216\u6E05\u7A7A\u8303\u56F4\u6539\u540C\u6B65\u5168\u90E8\u3002`);
          result.failed = -1;
          return result;
        }
      }
      if (!collections.length) collections = [{ id: "", title: "\u5168\u90E8" }];
      for (let ci = 0; ci < collections.length; ci++) {
        const col = collections[ci];
        progress({
          phase: "fetch",
          current: ci + 1,
          total: collections.length,
          message: `\u6B63\u5728\u62C9\u53D6\u300C${col.title}\u300D\u2026`
        });
        let items;
        try {
          items = await collectItems(provider, {
            auth: o.auth,
            http,
            webviewHost: o.webviewHost,
            collectionId: col.id,
            collectionTitle: col.title,
            logger: log,
            onTokenRefresh: o.onTokenRefresh
          });
        } catch (e) {
          result.errors.push(`\u300C${col.title}\u300D\u62C9\u53D6\u5931\u8D25\uFF1A${e.message}`);
          continue;
        }
        for (const item of items) {
          if (o.shouldAbort && o.shouldAbort()) {
            result.aborted = true;
            progress({ phase: "aborted", message: "\u5DF2\u53D6\u6D88" });
            return result;
          }
          if (remaining !== Infinity && remaining <= 0) {
            result.quotaHit = true;
            progress({ phase: "quota", message: "\u5DF2\u8FBE\u514D\u8D39\u989D\u5EA6\u4E0A\u9650" });
            return result;
          }
          if (limit > 0 && result.created >= limit) {
            progress({ phase: "limit", message: `\u5DF2\u8FBE\u672C\u6B21\u4E0A\u9650 ${limit} \u6761` });
            return result;
          }
          try {
            if (target.exists && await target.exists(item)) {
              result.skipped++;
              continue;
            }
            let detail = { content: item.content, transcript: item.transcript, media: item.media };
            if (provider.fetchDetail && (enrich.transcript || enrich.detail)) {
              const d = await provider.fetchDetail({ auth: o.auth, http, item, webviewHost: o.webviewHost, onTokenRefresh: o.onTokenRefresh });
              detail = Object.assign(detail, d || {});
              if (d && d.error) log(`[engine] \u8BE6\u60C5\u83B7\u53D6\u4E0D\u5B8C\u6574 ${item.sourceId}\uFF1A${d.error}`);
            }
            if (enrich.transcript && detail.transcript) item.transcript = detail.transcript;
            if (detail.content) item.content = detail.content;
            if (!item.transcript && enrich.transcript && enrich.asr && enrich.asr.apiKey && item.videoUrl) {
              try {
                item.transcript = await transcribeViaDashscope({
                  http,
                  apiKey: enrich.asr.apiKey,
                  videoUrl: item.videoUrl,
                  model: enrich.asr.model,
                  logger: log
                });
              } catch (e) {
                log(`[engine] ASR \u8F6C\u5199\u5931\u8D25 ${item.sourceId}\uFF1A${e.message}\uFF08\u7B14\u8BB0\u7167\u5199\uFF0C\u65E0\u8F6C\u5199\uFF09`);
              }
            }
            let aiText = "";
            if (enrich.ai && enrich.ai.enabled && enrich.ai.apiKey) {
              const src = item.transcript || item.content || item.summary;
              if (src) {
                aiText = await summarize({
                  http,
                  baseUrl: enrich.ai.baseUrl,
                  apiKey: enrich.ai.apiKey,
                  model: enrich.ai.model,
                  item,
                  content: src,
                  logger: log
                }) || "";
              }
            }
            let cover = item.cover;
            if (target.localizeAsset && cover) {
              try {
                cover = await target.localizeAsset(item, cover) || item.cover;
              } catch (e) {
                log(`[engine] \u5C01\u9762\u672C\u5730\u5316\u5931\u8D25\uFF0C\u56DE\u9000\u5916\u94FE\uFF1A${e.message}`);
                cover = item.cover;
              }
            }
            const md = renderNote(item, {
              cover,
              aiSummary: aiText,
              transcript: item.transcript,
              linkAuthor: o.renderOpts && o.renderOpts.linkAuthor,
              extraTags: o.renderOpts && o.renderOpts.extraTags
            });
            await target.write(item, md, {
              fileName: buildFileName(item),
              dirPath: buildDirPath(item, o.renderOpts && o.renderOpts.rootPath || "savault", o.renderOpts && o.renderOpts.dirTemplate)
            });
            result.created++;
            if (remaining !== Infinity) remaining--;
            progress({
              phase: "write",
              message: `\u5DF2\u540C\u6B65 ${result.created} \u6761\uFF1A${item.title.slice(0, 28)}`,
              current: result.created
            });
          } catch (e) {
            result.failed++;
            result.errors.push(`${item.sourceId}\uFF1A${e.message}`);
            log(`[engine] \u6761\u76EE\u5931\u8D25 ${item.sourceId}: ${e.message}`);
          }
        }
      }
      progress({ phase: "done", message: `\u5B8C\u6210\uFF1A\u65B0\u589E ${result.created}\uFF0C\u8DF3\u8FC7 ${result.skipped}` });
      return result;
    }
    async function collectItems(provider, ctx) {
      const useWebview = provider.mode === "webview";
      if (useWebview) {
        if (!provider.collectViaWebview) throw new Error("provider \u58F0\u660E\u4E86 webview \u6A21\u5F0F\u4F46\u6CA1\u6709 collectViaWebview");
        if (!ctx.webviewHost) throw new Error("\u5C0F\u7EA2\u4E66/X \u9700\u8981\u5185\u5D4C\u6D4F\u89C8\u5668\u53D6\u6570\uFF0C\u5F53\u524D\u73AF\u5883\u4E0D\u652F\u6301\uFF08\u8BF7\u4F7F\u7528 Obsidian \u684C\u9762\u7AEF\uFF09");
        return await provider.collectViaWebview(ctx);
      }
      if (!provider.listItems) throw new Error("provider \u7F3A\u5C11 listItems");
      const out = [];
      for await (const it of provider.listItems(ctx)) out.push(it);
      return out;
    }
    var PROVIDER_CONTRACT = {
      id: "string      \u5E73\u53F0\u6807\u8BC6\uFF0C\u4E5F\u662F sourceId \u524D\u7F00",
      mode: "'api' | 'webview'   \u53D6\u6570\u65B9\u5F0F",
      authType: "'cookie' | 'token'   \u51ED\u8BC1\u7C7B\u578B\uFF0C\u51B3\u5B9A\u8BBE\u7F6E\u9875\u600E\u4E48\u6E32\u67D3",
      validate: "async ({auth, http}) => {ok, user, message}",
      listCollections: "async ({auth, http}) => [{id, title, count}]   \uFF08\u53EF\u9009\uFF09",
      listItems: "async* ({auth, http, collectionId}) => yields NormalizedItem   \uFF08mode='api' \u5FC5\u9700\uFF09",
      collectViaWebview: "async ({webviewHost, ...}) => NormalizedItem[]   \uFF08mode='webview' \u5FC5\u9700\uFF09",
      fetchDetail: "async ({auth, http, item}) => {content, transcript, media}   \uFF08\u53EF\u9009\uFF0Cpro \u529F\u80FD\uFF09"
    };
    var TARGET_CONTRACT = {
      id: "string",
      exists: "async (item) => boolean   \u53BB\u91CD",
      write: "async (item, markdown, meta) => void",
      localizeAsset: "async (item, url) => string   \uFF08\u53EF\u9009\uFF09"
    };
    module2.exports = { sync, collectItems, PROVIDER_CONTRACT, TARGET_CONTRACT };
  }
});

// core/providers/bilibili.js
var require_bilibili = __commonJS({
  "core/providers/bilibili.js"(exports2, module2) {
    var { makeItem, toISO } = require_model();
    var UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36";
    var API = "https://api.bilibili.com";
    var CODE_NOT_LOGGED_IN = -101;
    var PASSPORT = "https://passport.bilibili.com";
    var PASSPORT_REFERER = "https://passport.bilibili.com/login";
    function parseSetCookies(headers) {
      const h = headers || {};
      let raw = h["set-cookie"] || h["Set-Cookie"] || "";
      if (Array.isArray(raw)) raw = raw.join(", ");
      if (!raw) return {};
      const out = {};
      for (const part of String(raw).split(/,(?=\s*[A-Za-z0-9_\-]+\s*=)/)) {
        const seg = part.split(";")[0].trim();
        const i = seg.indexOf("=");
        if (i <= 0) continue;
        const name = seg.slice(0, i).trim();
        const value = seg.slice(i + 1).trim();
        if (name) out[name] = value;
      }
      return out;
    }
    function serializeJar(jar) {
      return Object.keys(jar || {}).map((k) => `${k}=${jar[k]}`).join("; ");
    }
    function authHeaders(auth) {
      return {
        "User-Agent": UA,
        Referer: "https://www.bilibili.com",
        Cookie: auth && auth.sessdata ? `SESSDATA=${auth.sessdata}` : ""
      };
    }
    function unwrap(body, what) {
      if (!body) throw new Error(`${what}\uFF1A\u65E0\u54CD\u5E94`);
      if (body.code === CODE_NOT_LOGGED_IN) {
        const err = new Error("B \u7AD9\u767B\u5F55\u5DF2\u5931\u6548\uFF08code -101\uFF09\uFF0C\u8BF7\u91CD\u65B0\u767B\u5F55");
        err.code = "AUTH_EXPIRED";
        throw err;
      }
      if (body.code !== 0) {
        throw new Error(`${what}\uFF1A${body.message || body.code}`);
      }
      return body.data;
    }
    var bilibili = {
      id: "bilibili",
      name: "\u54D4\u54E9\u54D4\u54E9",
      emoji: "\u{1F4FA}",
      status: "stable",
      /** 取数方式：直连接口（B 站无签名要求，带 Cookie 即可） */
      mode: "api",
      /** 登录方式：cookie（webview 可自动提取） */
      authType: "cookie",
      authFields: [
        {
          key: "sessdata",
          label: "SESSDATA",
          placeholder: "\u70B9\u300C\u767B\u5F55 B \u7AD9\u300D\u81EA\u52A8\u63D0\u53D6\uFF0C\u6216\u624B\u52A8\u7C98\u8D34",
          secret: true,
          help: "\u53EA\u5728\u4F60\u7684\u7535\u8111\u672C\u5730\u4FDD\u5B58\uFF0C\u4E0D\u4F1A\u4E0A\u4F20"
        }
      ],
      capabilities: {
        collections: true,
        // 支持按收藏夹选择
        transcript: true,
        // 支持逐字稿
        media: false,
        // B 站只有单封面
        loginUrl: "https://www.bilibili.com"
      },
      /**
       * 扫码登录（v0.5.16）——彻底绕开内嵌浏览器。
       *
       * 为什么需要它：Electron 的 <webview> 在部分 Windows 环境会带崩整个 Obsidian，
       * 排查了几版都没能稳定解决。而 B 站的二维码登录接口是公开的、不需要 x-s 之类的
       * 签名，所以登录完全可以不用内嵌浏览器：这里直接返回二维码内容，
       * 由插件渲染成图片，用户拿手机 App 扫码即可。
       *
       * 接口流程（B 站官方 web 登录同款）：
       *   1. GET passport.bilibili.com/login        → 拿到 buvid3/buvid4（后续请求要带上）
       *   2. GET /x/passport-login/web/qrcode/generate → { qrcode_key, url }
       *   3. 渲染 url 成二维码
       *   4. 轮询 /x/passport-login/web/qrcode/poll?qrcode_key=…
       *      code: 0 成功 / 86101 未扫 / 86090 已扫待确认 / 86038 已失效
       *   5. code=0 时响应头带 Set-Cookie：DedeUserID、SESSDATA、bili_jct
       *
       * 全程无状态：jar 由调用方在两次调用间传递，便于测试与并发。
       */
      qrLogin: {
        /** @returns {Promise<{key:string, url:string, jar:Object}>} */
        async createKey(request) {
          const boot = await request(PASSPORT_REFERER, {
            method: "GET",
            headers: { "User-Agent": UA, Referer: PASSPORT_REFERER }
          });
          const jar = parseSetCookies(boot && boot.headers);
          const res = await request(`${PASSPORT}/x/passport-login/web/qrcode/generate`, {
            method: "GET",
            headers: { "User-Agent": UA, Referer: PASSPORT_REFERER, Cookie: serializeJar(jar) }
          });
          const d = res && res.json && res.json.data || {};
          if (!d.qrcode_key || !d.url) {
            throw new Error(res && res.json && res.json.message || "\u751F\u6210\u4E8C\u7EF4\u7801\u5931\u8D25");
          }
          return { key: d.qrcode_key, url: d.url, jar };
        },
        /**
         * @returns {Promise<{state:'pending'|'waiting'|'success'|'expired', auth?:Object, jar:Object}>}
         */
        async poll(request, key, jar) {
          const res = await request(
            `${PASSPORT}/x/passport-login/web/qrcode/poll?qrcode_key=${encodeURIComponent(key)}`,
            {
              method: "GET",
              headers: { "User-Agent": UA, Referer: PASSPORT_REFERER, Cookie: serializeJar(jar) }
            }
          );
          const body = res && res.json || {};
          const d = body.data || {};
          if (d.code === 0) {
            const merged = Object.assign({}, jar, parseSetCookies(res.headers));
            if (!merged.SESSDATA) {
              return { state: "pending", jar: merged };
            }
            return {
              state: "success",
              jar: merged,
              auth: {
                sessdata: merged.SESSDATA,
                dedeuserid: merged.DedeUserID || "",
                bili_jct: merged.bili_jct || ""
              }
            };
          }
          if (d.code === 86038) return { state: "expired", jar };
          if (d.code === 86090) return { state: "waiting", jar };
          return { state: "pending", jar };
        }
      },
      /** 校验登录态 */
      async validate({ auth, http }) {
        if (!auth || !auth.sessdata) return { ok: false, message: "\u672A\u8BBE\u7F6E SESSDATA" };
        try {
          const body = await http.json(`${API}/x/web-interface/nav`, { headers: authHeaders(auth) });
          if (body.code === CODE_NOT_LOGGED_IN || !body.data || !body.data.isLogin) {
            return { ok: false, message: "\u767B\u5F55\u6001\u65E0\u6548\uFF0C\u8BF7\u91CD\u65B0\u767B\u5F55", code: "AUTH_EXPIRED" };
          }
          return { ok: true, user: body.data.uname || "", userId: String(body.data.mid || "") };
        } catch (e) {
          return { ok: false, message: e.message };
        }
      },
      /** 收藏夹列表 */
      async listCollections({ auth, http }) {
        const nav = unwrap(await http.json(`${API}/x/web-interface/nav`, { headers: authHeaders(auth) }), "\u767B\u5F55\u6821\u9A8C");
        const mid = nav.mid;
        const data = unwrap(
          await http.json(`${API}/x/v3/fav/folder/created/list-all?up_mid=${mid}`, { headers: authHeaders(auth) }),
          "\u83B7\u53D6\u6536\u85CF\u5939\u5217\u8868"
        );
        const list = data && data.list || [];
        return list.map((f) => ({
          id: String(f.id),
          title: f.title || "\u672A\u547D\u540D\u6536\u85CF\u5939",
          count: Number(f.media_count) || 0
        }));
      },
      /**
       * 分页拉取条目。async generator，引擎边拉边处理，不用等全部拉完。
       * @param {Object} p {auth, http, collectionId, maxPages}
       * @yields {NormalizedItem}
       */
      async *listItems(p) {
        const { auth, http, collectionId } = p;
        const maxPages = p.maxPages || 200;
        const pageSize = 40;
        let pn = 1;
        while (pn <= maxPages) {
          const data = unwrap(
            await http.json(
              `${API}/x/v3/fav/resource/list?media_id=${encodeURIComponent(collectionId)}&ps=${pageSize}&pn=${pn}`,
              { headers: authHeaders(auth) }
            ),
            "\u83B7\u53D6\u6536\u85CF\u5939\u5185\u5BB9"
          );
          const medias = data && data.medias || [];
          for (const m of medias) {
            if (!m.bvid || m.attr === 9 || m.title === "\u5DF2\u5931\u6548\u89C6\u9891") continue;
            yield normalizeMedia(m, p.collectionTitle);
          }
          if (!data.has_more || medias.length === 0) return;
          pn++;
        }
      },
      /**
       * 详情：拿逐字稿（pro 功能）。
       * B 站逐字稿需要两次请求：view 拿 cid → player/v2 拿字幕地址 → 再下字幕 JSON。
       */
      async fetchDetail({ auth, http, item }) {
        const out = { content: "", transcript: "", media: [] };
        try {
          const view = unwrap(
            await http.json(`${API}/x/web-interface/view?bvid=${encodeURIComponent(item.id)}`, {
              headers: authHeaders(auth)
            }),
            "\u83B7\u53D6\u89C6\u9891\u4FE1\u606F"
          );
          const cid = view && view.cid;
          if (view && view.desc) out.content = String(view.desc);
          if (!cid) return out;
          const player = unwrap(
            await http.json(`${API}/x/player/v2?bvid=${encodeURIComponent(item.id)}&cid=${cid}`, {
              headers: { ...authHeaders(auth), Referer: `https://www.bilibili.com/video/${item.id}` }
            }),
            "\u83B7\u53D6\u5B57\u5E55\u5217\u8868"
          );
          const subs = player && player.subtitle && player.subtitle.subtitles || [];
          if (!subs.length) return out;
          const url = String(subs[0].subtitle_url || "").replace(/^\/\//, "https://");
          if (!url) return out;
          const body = await http.json(url, { headers: { "User-Agent": UA } });
          if (body && Array.isArray(body.body) && body.body.length) {
            out.transcript = body.body.map((l) => `[${fmtTime(l.from)}] ${l.content}`).join("\n");
          }
        } catch (e) {
          out.error = e.message;
        }
        return out;
      },
      /** 原始 media 对象 → NormalizedItem */
      normalize: (m, collectionTitle) => normalizeMedia(m, collectionTitle)
    };
    function normalizeMedia(m, collectionTitle) {
      return makeItem({
        id: m.bvid,
        platform: "bilibili",
        title: m.title,
        url: `https://www.bilibili.com/video/${m.bvid}`,
        author: { name: m.upper && m.upper.name || "", url: m.upper && m.upper.mid ? `https://space.bilibili.com/${m.upper.mid}` : "" },
        summary: m.intro || "",
        cover: m.cover || "",
        publishedAt: m.pubtime ? toISO(m.pubtime) : "",
        collectedAt: m.fav_time ? toISO(m.fav_time) : "",
        duration: Number(m.duration) || 0,
        tags: ["\u89C6\u9891"],
        collection: collectionTitle || "\u9ED8\u8BA4\u6536\u85CF\u5939",
        media: m.cover ? [m.cover] : [],
        raw: m
      });
    }
    function fmtTime(sec) {
      const s = Math.max(0, Math.floor(Number(sec) || 0));
      return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
    }
    module2.exports = bilibili;
    module2.exports.fmtTime = fmtTime;
    module2.exports.CODE_NOT_LOGGED_IN = CODE_NOT_LOGGED_IN;
  }
});

// core/providers/xiaohongshu.js
var require_xiaohongshu = __commonJS({
  "core/providers/xiaohongshu.js"(exports2, module2) {
    var { makeItem, toISO } = require_model();
    function jitter(base, spread) {
      return base + Math.floor(Math.random() * (spread + 1));
    }
    var WEB = "https://www.xiaohongshu.com";
    var COLLECT_API_PATTERN = "/api/sns/web/v2/note/collect/page";
    function parseCount(v) {
      if (v == null || v === "") return 0;
      if (typeof v === "number") return Math.max(0, Math.floor(v));
      const s = String(v).trim();
      const m = /^([\d.]+)\s*([万wW千kK]?)/.exec(s);
      if (!m) return 0;
      const n = parseFloat(m[1]);
      if (!Number.isFinite(n)) return 0;
      const unit = m[2];
      if (/[万wW]/.test(unit)) return Math.round(n * 1e4);
      if (/[千kK]/.test(unit)) return Math.round(n * 1e3);
      return Math.round(n);
    }
    function pickCover(note) {
      const c = note.cover || note.image_list && note.image_list[0] || note.images_list && note.images_list[0];
      if (!c) return "";
      if (typeof c === "string") return c;
      const u = c.url_default || c.url || c.url_pre || c.fileId || "";
      return typeof u === "string" ? u : "";
    }
    function pickImages(note) {
      const list = note.image_list || note.images_list || [];
      if (!Array.isArray(list)) return [];
      return list.map((img) => typeof img === "string" ? img : img && (img.url_default || img.url || img.trace || "") || "").filter(Boolean);
    }
    function pickVideoUrl(note) {
      const v = note.video;
      if (!v) return "";
      const stream = v.media && v.media.stream || v.stream || {};
      for (const q of ["h264", "h265", "av1"]) {
        const arr = stream[q];
        if (!Array.isArray(arr)) continue;
        for (const s of arr) {
          const u = s && (s.master_url || s.masterUrl || Array.isArray(s.backup_urls) && s.backup_urls[0] || s.url);
          if (u) return u;
        }
      }
      return v.play_url || v.url || "";
    }
    var xiaohongshu = {
      id: "xiaohongshu",
      name: "\u5C0F\u7EA2\u4E66",
      emoji: "\u{1F4D5}",
      status: "beta",
      mode: "webview",
      authType: "cookie",
      authFields: [
        {
          key: "cookie",
          label: "Cookie",
          placeholder: "\u70B9\u300C\u767B\u5F55\u5C0F\u7EA2\u4E66\u300D\u81EA\u52A8\u63D0\u53D6\uFF0C\u6216\u624B\u52A8\u7C98\u8D34\u5B8C\u6574 Cookie",
          secret: true,
          help: "\u542B web_session / a1 \u7B49\u5B57\u6BB5\uFF0C\u53EA\u5728\u672C\u5730\u4FDD\u5B58"
        },
        {
          key: "userId",
          label: "\u7528\u6237 ID",
          placeholder: "\u767B\u5F55\u540E\u81EA\u52A8\u83B7\u53D6\uFF08\u5C0F\u7EA2\u4E66\u4E3B\u9875 URL \u91CC\u90A3\u4E32\uFF09",
          secret: false,
          help: "\u7528\u4E8E\u62FC\u63A5\u6536\u85CF\u9875\u5730\u5740"
        }
      ],
      capabilities: {
        collections: true,
        // 收藏专辑：webview 按标题点进专辑页取数（id 即标题，见 listCollections）
        transcript: true,
        // 视频笔记口播走 dashscope ASR（engine 富化阶段，见 core/transcript.js）
        media: true,
        loginUrl: WEB + "/explore",
        // v0.5.20：与竞品 xhs2obsidian 完全一致（login-modal.ts:8）
        // 轻量登录页：只作为 L4/L5 崩溃降级档的退路保留。
        // ⚠️ v0.5.15 时我们以为「explore 满屏视频是崩溃元凶」才加的它——该假设已被证伪
        // （真凶是 webview 上的 border-radius；竞品加载 /explore 从不崩），默认档不再使用。
        liteLoginUrl: WEB + "/login"
      },
      /**
       * 列收藏专辑（webview 模式）。
       * 小红书专辑列表接口带签名，我们不调接口——打开主页「收藏」标签，
       * 宽拦截 /api/sns/web/ 的响应，按结构嗅探出专辑列表。
       * 返回的 id 就是标题：取数时靠标题点击专辑卡片导航，不需要知道接口长什么样。
       */
      async listCollections({ auth, webviewHost, logger }) {
        const log = logger || (() => {
        });
        if (!webviewHost) throw new Error("\u5217\u4E13\u8F91\u9700\u8981\u5185\u5D4C\u6D4F\u89C8\u5668\uFF08Obsidian \u684C\u9762\u7AEF\uFF09");
        if (!auth || !auth.userId) throw new Error("\u8BF7\u5148\u767B\u5F55\u5C0F\u7EA2\u4E66\uFF08\u8BBE\u7F6E\u9875 \u2192 \u767B\u5F55\u5C0F\u7EA2\u4E66\uFF09");
        const profileUrl = `${WEB}/user/profile/${auth.userId}`;
        await webviewHost.goto(profileUrl, { waitUntil: "dom-ready", timeoutMs: 3e4 });
        await webviewHost.clearCaptured();
        await webviewHost.reinject("/api/sns/web/");
        await webviewHost.clickByText({ selector: '.reds-tab, .feeds-tab, [class*="tab-item"]', text: "\u6536\u85CF" });
        await webviewHost.sleep(jitter(2300, 1200));
        await webviewHost.clickByText({ selector: "*", text: "\u4E13\u8F91" });
        await webviewHost.sleep(jitter(1600, 800));
        await webviewHost.scrollToBottom();
        await webviewHost.sleep(jitter(1200, 900));
        const captured = await webviewHost.getCaptured();
        const urls = (captured || []).map((c) => c && c.url || "(\u65E0url)");
        log(`[xhs] \u6355\u83B7 ${captured.length} \u4E2A\u54CD\u5E94\uFF1A${urls.join(" | ") || "(\u65E0)"}`);
        const boardResp = (captured || []).filter((c) => c && typeof c.url === "string" && c.url.includes("/board"));
        const albums = extractAlbums(boardResp.length ? boardResp : captured);
        log(`[xhs] \u55C5\u63A2\u5230 ${albums.length} \u4E2A\u4E13\u8F91\uFF08\u6765\u81EA ${captured.length} \u4E2A\u54CD\u5E94\uFF09`);
        if (!albums.length) {
          throw new Error("\u6CA1\u6709\u8BFB\u5230\u4E13\u8F91\u5217\u8868\uFF08\u9875\u9762\u6CA1\u8FD4\u56DE\u4E13\u8F91\u63A5\u53E3\uFF0C\u53EF\u80FD\u6539\u7248\u6216\u672A\u52A0\u8F7D\u5B8C\uFF09\u3002\u53EF\u91CD\u8BD5\u4E00\u6B21\uFF1B\u6216\u5728\u63A5\u4E0B\u6765\u7684\u9009\u62E9\u6846\u91CC\u624B\u52A8\u586B\u4E13\u8F91\u540D");
        }
        return albums.map((a) => ({ id: a.title, title: a.title, count: a.count || 0 }));
      },
      /** 校验登录：webview 模式下以页面能否拿到用户信息为准 */
      async validate({ auth, http, webviewHost }) {
        if (!auth || !auth.cookie) return { ok: false, message: "\u672A\u8BBE\u7F6E Cookie" };
        if (!auth.userId) {
          return { ok: false, message: "\u7F3A\u5C11\u7528\u6237 ID\uFF0C\u8BF7\u91CD\u65B0\u767B\u5F55\u5C0F\u7EA2\u4E66" };
        }
        return { ok: true, user: auth.nickname || "", userId: auth.userId };
      },
      /**
       * 登录态验证 + 取用户信息。
       *
       * v0.5.25 更新：**edith /v2/user/me 已收紧，现在需要 x-s 签名**（2026-09-04 用
       * 有效登录 cookie 实测：v1/v2 全部返回 {"code":-1,"success":false}，竞品同款请求
       * 头也一样被拒）。改为从 /explore 的 HTML 里解析 `__INITIAL_STATE__` 的
       * `"user":{"loggedIn":true,...,"userInfo":{"user_id":...,"nickname":...}}` 块：
       *   - HTML 页面不走 API 签名校验，带 cookie 就能拿到；
       *   - 整个页面 `user_id` 只出现这一次（feed 里其他作者的卡片不带这个字段），
       *     所以锚定 `"user":{"loggedIn":true` 后在片段里抓，不会误抓别人；
       *   - 实测样例：user_id=617feda60000000021028da6, nickname="Jakelin"。
       * edith 接口保留为退路（万一官方放宽，还能用）。
       *
       * @param {Function} request core/http 适配后的请求函数（url, opts）=> {status, headers, json, text}
       * @param {string} cookie 完整 Cookie 字符串（含 a1、web_session）
       * @returns {Promise<{userId:string, nickname:string}|null>} 未登录/验证失败返回 null
       */
      async fetchMe(request, cookie) {
        try {
          const res = await request(WEB + "/explore", {
            method: "GET",
            headers: {
              "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
              // 与内嵌浏览器的 UA 保持一致（Mac + 钉死 Chrome 120），避免设备指纹漂移
              "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
              "Cookie": cookie
            }
          });
          const html = res && res.text || "";
          const anchor = html.indexOf('"user":{"loggedIn":true');
          if (anchor >= 0) {
            const seg = html.slice(anchor, anchor + 3e3);
            const id = (seg.match(/"user_id":"([0-9a-fA-F]+)"/) || [])[1];
            const nick = (seg.match(/"nickname":"((?:[^"\\]|\\.)*)"/) || [])[1] || "";
            if (id) {
              let nickname = nick;
              try {
                nickname = JSON.parse('"' + nick + '"');
              } catch (_) {
              }
              return { userId: id, nickname };
            }
          }
        } catch (_) {
        }
        try {
          const res2 = await request("https://edith.xiaohongshu.com/api/sns/web/v2/user/me", {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              "Origin": WEB,
              "Referer": WEB + "/",
              "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
              "Cookie": cookie
            }
          });
          const d = res2 && res2.json && res2.json.data;
          if (d && d.user_id) return { userId: d.user_id, nickname: d.nickname || "" };
        } catch (_) {
        }
        return null;
      },
      /**
       * webview 拦截取数。
       * 宿主（Obsidian 插件）负责具体的 webview 操作，provider 只描述"要什么"。
       * 传了 collectionTitle 就只取那个专辑：点进专辑卡片再滚动拦截。
       */
      async collectViaWebview({ webviewHost, auth, logger, maxScrolls, collectionTitle }) {
        const log = logger || (() => {
        });
        if (!auth || !auth.userId) throw new Error("\u8BF7\u5148\u767B\u5F55\u5C0F\u7EA2\u4E66\uFF08\u8BBE\u7F6E\u9875 \u2192 \u767B\u5F55\u5C0F\u7EA2\u4E66\uFF09");
        const albumTitle = collectionTitle && collectionTitle !== "\u5168\u90E8" ? collectionTitle : "";
        const profileUrl = `${WEB}/user/profile/${auth.userId}`;
        const pattern = albumTitle ? "/api/sns/web/" : COLLECT_API_PATTERN;
        log("[xhs] \u6253\u5F00\u6536\u85CF\u9875\uFF1A" + profileUrl + (albumTitle ? `\uFF08\u4E13\u8F91\uFF1A${albumTitle}\uFF09` : ""));
        const capturedBodies = await webviewHost.captureResponses({
          urlPattern: pattern,
          // 2) 打开个人主页
          async navigate() {
            await webviewHost.goto(profileUrl, { waitUntil: "dom-ready", timeoutMs: 3e4 });
            const favClicked = await webviewHost.clickByText({ selector: '.reds-tab, .feeds-tab, [class*="tab-item"]', text: "\u6536\u85CF" });
            if (!favClicked) {
              throw new Error("\u6CA1\u627E\u5230\u300C\u6536\u85CF\u300D\u6807\u7B7E\u2014\u2014\u53EF\u80FD\u767B\u5F55\u6001\u5DF2\u5931\u6548\u6216\u9875\u9762\u6539\u7248\u3002\u8BF7\u91CD\u65B0\u767B\u5F55\u540E\u91CD\u8BD5");
            }
            if (albumTitle) {
              await webviewHost.sleep(jitter(2e3, 1e3));
              await webviewHost.clickByText({ selector: "*", text: "\u4E13\u8F91" });
              await webviewHost.sleep(jitter(1800, 900));
              await webviewHost.clearCaptured();
              await webviewHost.sleep(300);
              const CARD_SEL = '[class*="board"], [class*="album"], [class*="collect"] a, a, div';
              let clicked = await webviewHost.clickByText({ selector: CARD_SEL, text: albumTitle });
              if (!clicked) {
                await webviewHost.scrollToBottom();
                await webviewHost.sleep(jitter(1200, 600));
                clicked = await webviewHost.clickByText({ selector: CARD_SEL, text: albumTitle });
              }
              if (!clicked) {
                const urls = (await webviewHost.getCaptured()).map((c) => c && c.url || "(\u65E0url)");
                log(`[xhs] \u70B9\u4E0D\u5230\u4E13\u8F91\u5361\u7247\u65F6\u7684\u9875\u9762\u8BF7\u6C42\uFF1A${urls.join(" | ") || "(\u65E0)"}`);
                throw new Error(`\u6CA1\u627E\u5230\u4E13\u8F91\u300C${albumTitle}\u300D\u2014\u2014\u5DF2\u628A\u9875\u9762\u8BF7\u6C42\u8BB0\u8FDB sync.log\uFF0C\u8BF7\u628A\u300C\u70B9\u4E0D\u5230\u4E13\u8F91\u5361\u7247\u65F6\u7684\u9875\u9762\u8BF7\u6C42\u300D\u4E00\u884C\u53D1\u7ED9\u5F00\u53D1\u8005`);
              }
              await webviewHost.sleep(jitter(2300, 1200));
            }
          },
          // 4) 滚动加载，直到没有新数据或到达上限。
          //    滚动节奏 1.1~2.2s 随机：小红书对「固定节奏高频滚动」敏感（实测 5s 内 7 连发
          //    即触发 461 限流），快慢不一更像真人浏览，风控判定窗口更稳。
          async drive() {
            const scrolls = maxScrolls || 60;
            for (let i = 0; i < scrolls; i++) {
              await webviewHost.scrollToBottom();
              await webviewHost.sleep(jitter(1100, 1100));
              const idle = await webviewHost.isIdleSince(8e3);
              if (idle) break;
            }
          }
        });
        const items = [];
        const seen = /* @__PURE__ */ new Set();
        for (const body of capturedBodies) {
          for (const n of extractNotes(body)) {
            const nid = n.note_id || n.id || "";
            if (!nid || seen.has(nid)) continue;
            seen.add(nid);
            const it = normalizeNote(n);
            if (albumTitle) it.collection = albumTitle;
            items.push(it);
          }
        }
        if (!capturedBodies || capturedBodies.length === 0) {
          throw new Error("\u6CA1\u6709\u62E6\u622A\u5230\u4EFB\u4F55\u6536\u85CF\u6570\u636E\u2014\u2014\u767B\u5F55\u6001\u53EF\u80FD\u5DF2\u5931\u6548\u3002\u8BF7\u91CD\u65B0\u767B\u5F55\u540E\u91CD\u8BD5");
        }
        log(`[xhs] \u62E6\u622A\u5230 ${capturedBodies.length} \u4E2A\u54CD\u5E94\uFF0C\u53BB\u91CD\u540E ${items.length} \u6761`);
        return items;
      },
      /** 解析单元（供测试与未来 direct 模式复用） */
      normalize: (n) => normalizeNote(n),
      parseCount,
      pickCover,
      pickImages
    };
    function extractAlbums(captured) {
      const out = [];
      const seen = /* @__PURE__ */ new Set();
      for (const c of captured || []) {
        const body = c && c.body !== void 0 ? c.body : c;
        walkJson(body, (node) => {
          if (!Array.isArray(node) || !node.length) return;
          for (const it of node) {
            if (!it || typeof it !== "object" || Array.isArray(it)) continue;
            const title = it.name || it.title || it.board_name || "";
            const id = it.id || it.board_id || it.boardId || "";
            const count = Number(it.notes_count ?? it.note_count ?? it.count ?? it.total) || 0;
            if (title && (id || count) && !it.note_card && !it.note_id && it.display_title === void 0) {
              const key = String(id || title);
              if (!seen.has(key)) {
                seen.add(key);
                out.push({ id: key, title: String(title), count });
              }
            }
          }
        });
      }
      return out;
    }
    function extractNotes(body) {
      const out = [];
      walkJson(body, (node) => {
        if (!node || typeof node !== "object" || Array.isArray(node)) return;
        if (node.note_card && typeof node.note_card === "object") {
          const nc = node.note_card;
          out.push({
            ...nc,
            note_id: nc.note_id || nc.id || node.id || "",
            xsec_token: node.xsec_token || nc.xsec_token || ""
          });
          return;
        }
        if (node.note_id && (node.display_title !== void 0 || node.title !== void 0 || node.desc !== void 0 || node.user)) {
          out.push(node);
        }
      });
      return out;
    }
    function walkJson(node, visit, depth) {
      if (depth === void 0) depth = 0;
      if (depth > 8 || node === null || typeof node !== "object") return;
      visit(node);
      if (Array.isArray(node)) {
        for (const it of node) walkJson(it, visit, depth + 1);
        return;
      }
      for (const k of Object.keys(node)) walkJson(node[k], visit, depth + 1);
    }
    function normalizeNote(n) {
      const nid = n.note_id || n.id || "";
      const title = n.display_title || n.title || n.desc || "";
      const user = n.user || {};
      const images = pickImages(n);
      return makeItem({
        id: nid,
        platform: "xiaohongshu",
        title: title || "\uFF08\u65E0\u6807\u9898\u7B14\u8BB0\uFF09",
        url: `https://www.xiaohongshu.com/explore/${nid}${n.xsec_token ? "?xsec_token=" + n.xsec_token : ""}`,
        author: {
          name: user.nickname || "",
          url: user.user_id ? `https://www.xiaohongshu.com/user/profile/${user.user_id}` : ""
        },
        summary: n.desc || "",
        cover: pickCover(n),
        publishedAt: n.time ? toISO(n.time) : n.last_update_time ? toISO(n.last_update_time) : "",
        collectedAt: "",
        // 收藏接口不返回收藏时间
        duration: 0,
        tags: Array.isArray(n.tag_list) ? n.tag_list.map((t) => t && t.name || t).filter(Boolean) : [],
        collection: "\u6536\u85CF",
        content: n.desc || "",
        media: images,
        videoUrl: pickVideoUrl(n),
        raw: n
      });
    }
    module2.exports = xiaohongshu;
    module2.exports.COLLECT_API_PATTERN = COLLECT_API_PATTERN;
    module2.exports.parseCount = parseCount;
    module2.exports.pickVideoUrl = pickVideoUrl;
    module2.exports.extractAlbums = extractAlbums;
    module2.exports.extractNotes = extractNotes;
  }
});

// core/providers/xiaoyuzhou.js
var require_xiaoyuzhou = __commonJS({
  "core/providers/xiaoyuzhou.js"(exports2, module2) {
    var { makeItem, toISO } = require_model();
    var { htmlToMarkdown } = require_html2md();
    var API = "https://api.xiaoyuzhoufm.com";
    var APP_HEADERS = {
      "App-Version": "2.57.1",
      "App-BuildNo": "1576",
      OS: "iOS",
      Model: "iPhone15,3",
      BundleID: "app.podcast.cosmos",
      "User-Agent": "Xiaoyuzhou/2.57.1 (iPhone; iOS 17.0; Scale/3.00)",
      "Content-Type": "application/json"
    };
    function authHeaders(auth, accessToken) {
      return Object.assign({}, APP_HEADERS, {
        "x-jike-access-token": accessToken || "",
        "x-jike-device-id": auth && auth.deviceId || ""
      });
    }
    async function refreshAccessToken({ auth, http, onTokenRefresh, logger }) {
      if (!auth || !auth.refreshToken) throw new Error("\u672A\u8BBE\u7F6E\u5C0F\u5B87\u5B99 refresh_token");
      if (!auth.deviceId) throw new Error("\u672A\u8BBE\u7F6E\u5C0F\u5B87\u5B99 device_id");
      const body = await http.json(API + "/app_auth_tokens.refresh", {
        method: "POST",
        headers: Object.assign({}, APP_HEADERS, {
          "x-jike-refresh-token": auth.refreshToken,
          "x-jike-device-id": auth.deviceId
        }),
        body: {}
      });
      const at = body && (body["x-jike-access-token"] || body.access_token);
      const rt = body && (body["x-jike-refresh-token"] || body.refresh_token);
      if (!at) {
        const err = new Error("\u6362\u53D6 access_token \u5931\u8D25\uFF0C\u8BF7\u68C0\u67E5 refresh_token \u662F\u5426\u6709\u6548");
        err.code = "AUTH_EXPIRED";
        throw err;
      }
      if (rt && rt !== auth.refreshToken && onTokenRefresh) {
        (logger || (() => {
        }))("[xyz] refresh_token \u5DF2\u8F6E\u6362\uFF0C\u56DE\u5199\u4FDD\u5B58");
        await onTokenRefresh({ refreshToken: rt });
      }
      return at;
    }
    var xiaoyuzhou = {
      id: "xiaoyuzhou",
      name: "\u5C0F\u5B87\u5B99",
      emoji: "\u{1F3A7}",
      status: "beta",
      mode: "api",
      authType: "token",
      authFields: [
        {
          key: "refreshToken",
          label: "Refresh Token",
          placeholder: "\u4ECE App \u6293\u5305\u83B7\u53D6\u7684 x-jike-refresh-token",
          secret: true,
          help: "\u5C0F\u5B87\u5B99\u7F51\u9875\u7248\u65E0\u6CD5\u767B\u5F55\uFF0C\u9700\u4ECE App \u6293\u5305\uFF1B\u89C1\u843D\u5730\u9875\u56FE\u6587\u6559\u7A0B"
        },
        {
          key: "deviceId",
          label: "Device ID",
          placeholder: "x-jike-device-id\uFF0C\u5F62\u5982 81ADBFD6-6921-482B-9AB9-A29E7CC7BB55",
          secret: false,
          help: "\u7559\u7A7A\u5219\u81EA\u52A8\u751F\u6210\u4E00\u4E2A\u65B0\u7684 UUID"
        }
      ],
      capabilities: {
        collections: false,
        // 小宇宙收藏没有分文件夹
        transcript: false,
        // 没有官方字幕接口，暂不做语音转写
        media: true,
        loginUrl: null
        // 无网页登录入口
      },
      async validate({ auth, http, onTokenRefresh, logger }) {
        if (!auth || !auth.refreshToken) return { ok: false, message: "\u672A\u8BBE\u7F6E refresh_token" };
        try {
          const at = await refreshAccessToken({ auth, http, onTokenRefresh, logger });
          await http.json(API + "/v1/favorite/list", {
            method: "POST",
            headers: authHeaders(auth, at),
            body: { limit: 1 }
          });
          return { ok: true, user: "", userId: "" };
        } catch (e) {
          return { ok: false, message: e.message, code: e.code };
        }
      },
      /**
       * 分页拉收藏。
       * loadMoreKey 是上一页返回的对象，原样回传即可；为 null 表示结束。
       */
      async *listItems({ auth, http, onTokenRefresh, logger }) {
        const at = await refreshAccessToken({ auth, http, onTokenRefresh, logger });
        let loadMoreKey = null;
        const maxPages = 100;
        for (let page = 0; page < maxPages; page++) {
          const body = await http.json(API + "/v1/favorite/list", {
            method: "POST",
            headers: authHeaders(auth, at),
            body: loadMoreKey ? { limit: 25, loadMoreKey } : { limit: 25 }
          });
          const list = body && body.data || [];
          for (const ep of list) yield normalizeEpisode(ep);
          loadMoreKey = body && body.loadMoreKey;
          if (!loadMoreKey || !list.length) return;
        }
      },
      /** 详情：单集的 shownotes（HTML）转成 Markdown */
      async fetchDetail({ auth, http, item, onTokenRefresh, logger }) {
        const out = { content: "", transcript: "", media: [] };
        try {
          const at = await refreshAccessToken({ auth, http, onTokenRefresh, logger });
          const body = await http.json(API + "/v1/episode/get", {
            method: "POST",
            headers: authHeaders(auth, at),
            body: { eid: item.id }
          });
          const ep = body && body.data || {};
          if (ep.shownotes) out.content = htmlToMarkdown(ep.shownotes);
          else if (ep.description) out.content = String(ep.description);
        } catch (e) {
          out.error = e.message;
        }
        return out;
      },
      normalize: (ep) => normalizeEpisode(ep),
      refreshAccessToken,
      /** 生成一个新的 device_id（用户没填时用） */
      newDeviceId() {
        const hex = (n) => Array.from({ length: n }, () => "0123456789ABCDEF"[Math.floor(Math.random() * 16)]).join("");
        return `${hex(8)}-${hex(4)}-${hex(4)}-${hex(4)}-${hex(12)}`;
      }
    };
    function normalizeEpisode(ep) {
      const eid = ep.eid || ep.id || "";
      const podcast = ep.podcast || {};
      return makeItem({
        id: eid,
        platform: "xiaoyuzhou",
        title: ep.title || "\uFF08\u65E0\u6807\u9898\u5355\u96C6\uFF09",
        url: `https://www.xiaoyuzhoufm.com/episode/${eid}`,
        author: { name: podcast.author || podcast.title || "", url: "" },
        summary: ep.description || "",
        cover: ep.image && (ep.image.picUrl || ep.image.thumbnailUrl) || "",
        publishedAt: toISO(ep.pubDate),
        collectedAt: "",
        // 收藏接口不返回收藏时间
        duration: Number(ep.duration) || 0,
        tags: ["\u64AD\u5BA2", podcast.title].filter(Boolean),
        collection: podcast.title || "\u5C0F\u5B87\u5B99\u6536\u85CF",
        content: ep.shownotes ? htmlToMarkdown(ep.shownotes) : ep.description || "",
        media: [],
        raw: ep
      });
    }
    module2.exports = xiaoyuzhou;
    module2.exports.API = API;
  }
});

// core/providers/twitter.js
var require_twitter = __commonJS({
  "core/providers/twitter.js"(exports2, module2) {
    var { makeItem, toISO } = require_model();
    var BOOKMARK_PATTERN = "/i/api/graphql/";
    var BOOKMARK_OP = "Bookmarks";
    var SKIP_ENTRY_PREFIXES = ["cursor-", "messageprompt-", "module-", "who-to-follow-", "tweetdetailrelated"];
    function extractTweets(body) {
      const tl = body && body.data && body.data.bookmark_timeline && body.data.bookmark_timeline.timeline;
      if (!tl || !Array.isArray(tl.instructions)) return [];
      const out = [];
      for (const ins of tl.instructions) {
        const entries = ins.entries || ins.module && ins.module.items;
        if (!Array.isArray(entries)) continue;
        for (const entry of entries) {
          const entryId = String(entry && entry.entryId || entry && entry.item && entry.item.itemId || "");
          if (!entryId || SKIP_ENTRY_PREFIXES.some((p) => entryId.toLowerCase().startsWith(p))) continue;
          const itemContent = entry.content && entry.content.itemContent || entry.item;
          let result = itemContent && itemContent.tweet_results && itemContent.tweet_results.result;
          if (result && result.tweet && result.__typename === "TweetWithVisibilityResults") result = result.tweet;
          if (!result || !result.legacy) continue;
          out.push(result);
        }
      }
      return out;
    }
    function pickText(tweet) {
      const nt = tweet.note_tweet && tweet.note_tweet.note_tweet_results && tweet.note_tweet.note_tweet_results.result;
      if (nt && nt.text && String(nt.text).length > 0) return String(nt.text);
      return String(tweet.legacy && tweet.legacy.full_text || "");
    }
    function pickMedia(tweet) {
      const legacy = tweet.legacy || {};
      const ents = legacy.extended_entities || legacy.entities;
      const media = ents && ents.media || [];
      if (!Array.isArray(media)) return [];
      return media.map((m) => {
        if (!m) return "";
        if (m.video_info && Array.isArray(m.video_info.variants)) {
          const mp4 = m.video_info.variants.filter((v) => v && /mp4/.test(v.content_type || "") && v.bitrate);
          if (mp4.length) return mp4.sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0].url;
        }
        return m.media_url_https || m.media_url || "";
      }).filter(Boolean);
    }
    function normalizeTweet(tweet) {
      const legacy = tweet.legacy || {};
      const core2 = tweet.core || {};
      const userLegacy = core2.user_results && core2.user_results.result && core2.user_results.result.legacy || {};
      const id = String(tweet.rest_id || legacy.id_str || "");
      const screenName = userLegacy.screen_name || "";
      return makeItem({
        id,
        platform: "twitter",
        title: (pickText(tweet) || "").split("\n")[0].slice(0, 60) || "\uFF08\u65E0\u6587\u672C\u63A8\u6587\uFF09",
        url: screenName && id ? `https://x.com/${screenName}/status/${id}` : "",
        author: {
          name: userLegacy.name || screenName || "",
          url: screenName ? `https://x.com/${screenName}` : ""
        },
        summary: "",
        cover: "",
        publishedAt: toISO(legacy.created_at),
        collectedAt: "",
        duration: 0,
        tags: [],
        collection: "\u4E66\u7B7E",
        content: pickText(tweet),
        media: pickMedia(tweet),
        raw: tweet
      });
    }
    var twitter = {
      id: "twitter",
      name: "X / Twitter",
      emoji: "\u{1F426}",
      status: "experimental",
      mode: "webview",
      authType: "cookie",
      authFields: [
        {
          key: "cookie",
          label: "Cookie",
          placeholder: "\u70B9\u300C\u767B\u5F55 X\u300D\u81EA\u52A8\u63D0\u53D6\uFF0C\u6216\u624B\u52A8\u7C98\u8D34\uFF08\u9700\u542B auth_token \u4E0E ct0\uFF09",
          secret: true,
          help: "\u81F3\u5C11\u9700\u8981 auth_token \u548C ct0 \u4E24\u4E2A\u5B57\u6BB5"
        }
      ],
      capabilities: {
        collections: false,
        transcript: false,
        media: true,
        loginUrl: "https://x.com/i/bookmarks"
      },
      /** 实验性平台的风险提示，设置页会原样展示 */
      warning: "X \u7684\u63A5\u53E3\u4E0D\u7A33\u5B9A\uFF08\u5185\u90E8 GraphQL \u7684 queryId \u4F1A\u968F\u524D\u7AEF\u53D1\u7248\u53D8\u5316\uFF09\uFF0C\u53EF\u80FD\u51FA\u73B0\u67D0\u5929\u7A81\u7136\u540C\u6B65\u4E0D\u4E86\u3002\u6211\u4EEC\u5DF2\u7528\u5185\u5D4C\u6D4F\u89C8\u5668\u65B9\u5F0F\u89C4\u907F\u4E86\u5927\u90E8\u5206\u98CE\u9669\uFF0C\u4F46\u4ECD\u65E0\u6CD5\u4FDD\u8BC1\u957F\u671F\u53EF\u7528\u3002",
      async validate({ auth }) {
        if (!auth || !auth.cookie) return { ok: false, message: "\u672A\u8BBE\u7F6E Cookie" };
        if (!/auth_token/.test(auth.cookie)) return { ok: false, message: "Cookie \u91CC\u7F3A\u5C11 auth_token" };
        if (!/\bct0\b/.test(auth.cookie)) return { ok: false, message: "Cookie \u91CC\u7F3A\u5C11 ct0" };
        return { ok: true, user: auth.screenName || "", userId: "" };
      },
      async collectViaWebview({ webviewHost, logger, maxScrolls }) {
        const log = logger || (() => {
        });
        log("[x] \u6253\u5F00\u4E66\u7B7E\u9875");
        const captured = await webviewHost.captureResponses({
          // 只匹配路径片段，不依赖会变的 queryId
          urlPattern: BOOKMARK_PATTERN,
          // 响应体里筛选：只收 Bookmarks 操作的响应
          matchBody: (b) => !!(b && b.data && b.data.bookmark_timeline),
          async navigate() {
            await webviewHost.goto("https://x.com/i/bookmarks", { waitUntil: "dom-ready", timeoutMs: 45e3 });
          },
          async drive() {
            const scrolls = maxScrolls || 80;
            for (let i = 0; i < scrolls; i++) {
              await webviewHost.scrollToBottom();
              await webviewHost.sleep(1500);
              if (await webviewHost.isIdleSince(1e4)) break;
            }
          }
        });
        const items = [];
        const seen = /* @__PURE__ */ new Set();
        for (const body of captured) {
          for (const tw of extractTweets(body)) {
            const id = String(tw.rest_id || tw.legacy && tw.legacy.id_str || "");
            if (!id || seen.has(id)) continue;
            seen.add(id);
            items.push(normalizeTweet(tw));
          }
        }
        log(`[x] \u62E6\u622A\u5230 ${captured.length} \u4E2A\u54CD\u5E94\uFF0C\u53BB\u91CD\u540E ${items.length} \u6761`);
        return items;
      },
      normalize: (tweet) => normalizeTweet(tweet),
      extractTweets,
      pickText,
      pickMedia,
      BOOKMARK_OP
    };
    module2.exports = twitter;
    module2.exports.SKIP_ENTRY_PREFIXES = SKIP_ENTRY_PREFIXES;
  }
});

// core/targets/obsidian.js
var require_obsidian = __commonJS({
  "core/targets/obsidian.js"(exports2, module2) {
    var { normalizePath } = require_model();
    function createObsidianTarget(deps) {
      const d = deps || {};
      const vault = d.vault;
      const http = d.http;
      const opts = d.opts || {};
      if (!vault) throw new Error("obsidian target \u9700\u8981 vault");
      const toPath = (p) => normalizePath(p);
      async function ensureFolder(path) {
        const parts = toPath(path).split("/").filter(Boolean);
        let cur = "";
        for (const part of parts) {
          cur = cur ? cur + "/" + part : part;
          if (!vault.getAbstractFileByPath(cur)) {
            try {
              await vault.createFolder(cur);
            } catch (e) {
              if (!/already exists|Folder already/i.test(String(e.message))) throw e;
            }
          }
        }
      }
      return {
        id: "obsidian",
        name: "Obsidian",
        /**
         * 去重：扫保存根目录下的 md，比对 frontmatter 的 source_id。
         * 用 metadataCache 读 frontmatter（Obsidian 已解析好，比正则快且准）。
         */
        async exists(item) {
          if (!item || !item.sourceId) return false;
          const files = vault.getMarkdownFiles ? vault.getMarkdownFiles() : [];
          for (const f of files) {
            const cache = vault.metadataCache && vault.metadataCache.getFileCache(f);
            const fm = cache && cache.frontmatter;
            if (fm && (fm.source_id === item.sourceId || fm.sourceId === item.sourceId)) return true;
          }
          return false;
        },
        async write(item, markdown, meta) {
          const m = meta || {};
          const dirPath = m.dirPath || "Clipin";
          await ensureFolder(dirPath);
          const filePath = toPath(`${dirPath}/${m.fileName || item.id + ".md"}`);
          const existing = vault.getAbstractFileByPath(filePath);
          if (existing) {
            if (vault.modify) await vault.modify(existing, markdown);
            return filePath;
          }
          await vault.create(filePath, markdown);
          return filePath;
        },
        /** 封面本地化：下载到 {root}/Media/，失败回退外链 */
        async localizeAsset(item, url) {
          if (!opts.localizeCover || !url || !http) return url;
          try {
            const mediaDir = toPath(`${(opts.rootPath || "Clipin").replace(/\/$/, "")}/Media`);
            await ensureFolder(mediaDir);
            const ext = (/\.(png|jpe?g|gif|webp|avif)(\?|$)/i.exec(url) || [, "jpg"])[1];
            const imgPath = toPath(`${mediaDir}/${item.id}.${ext}`);
            if (vault.getAbstractFileByPath(imgPath)) return imgPath;
            const buf = await http.binary(url, { headers: { "User-Agent": "Clipin/1.0" } });
            if (vault.createBinary) await vault.createBinary(imgPath, buf);
            return imgPath;
          } catch (e) {
            return url;
          }
        }
      };
    }
    module2.exports = { createObsidianTarget };
  }
});

// core/targets/notion.js
var require_notion = __commonJS({
  "core/targets/notion.js"(exports2, module2) {
    var API = "https://api.notion.com/v1";
    var NOTION_VERSION = "2026-03-11";
    var SCHEMA = {
      Name: { title: {} },
      SourceID: { rich_text: {} },
      Platform: { select: { options: [] } },
      Author: { rich_text: {} },
      URL: { url: {} },
      Collection: { rich_text: {} },
      SavedAt: { date: {} },
      Duration: { number: {} }
    };
    function headers(token) {
      return {
        Authorization: "Bearer " + token,
        "Notion-Version": NOTION_VERSION,
        "Content-Type": "application/json"
      };
    }
    function clip(s, max) {
      const str = String(s == null ? "" : s);
      return str.length > (max || 2e3) ? str.slice(0, (max || 2e3) - 1) + "\u2026" : str;
    }
    function createNotionTarget(deps) {
      const d = deps || {};
      const http = d.http;
      const token = d.token;
      const parentType = d.parentType || "data_source_id";
      const parentId = d.parentId;
      const opts = d.opts || {};
      if (!http) throw new Error("notion target \u9700\u8981 http");
      if (!token) throw new Error("notion target \u9700\u8981 token");
      if (!parentId) throw new Error("notion target \u9700\u8981 parentId\uFF08database \u6216 page \u7684 ID\uFF09");
      async function api(path, options) {
        const o = options || {};
        let body;
        try {
          body = await http.json(API + path, {
            method: o.method || (o.body ? "POST" : "GET"),
            headers: headers(token),
            body: o.body
          });
        } catch (e) {
          const msg = String(e.message || e);
          if (/401|unauthorized/i.test(msg)) throw new Error("Notion token \u65E0\u6548\u6216\u5DF2\u5931\u6548\uFF0C\u8BF7\u5728\u8BBE\u7F6E\u91CC\u91CD\u65B0\u586B\u5199");
          if (/403|restricted/i.test(msg)) throw new Error("\u6CA1\u6709\u6743\u9650\uFF1A\u8BF7\u786E\u8BA4\u5DF2\u5728\u76EE\u6807\u9875\u9762/\u6570\u636E\u5E93\u4E0A\u300CAdd connections\u300D\u6DFB\u52A0\u4F60\u7684 integration");
          if (/404|not_found/i.test(msg)) throw new Error("\u627E\u4E0D\u5230\u76EE\u6807\uFF1A\u8BF7\u786E\u8BA4\u9875\u9762\u5DF2\u5206\u4EAB\u7ED9 integration\uFF08\u7236\u9875\u9762\u4E5F\u8981\u5206\u4EAB\uFF09");
          if (/429|rate_limited/i.test(msg)) throw new Error("Notion \u9650\u901F\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5");
          throw e;
        }
        if (body && body.object === "error") {
          throw new Error(`Notion ${body.status}: ${body.message}`);
        }
        return body;
      }
      async function resolveDataSourceId() {
        if (parentType !== "data_source_id") return null;
        try {
          const db = await api("/databases/" + parentId, {});
          const ds = db && db.data_sources;
          if (Array.isArray(ds) && ds.length && ds[0].id) return ds[0].id;
        } catch (_) {
        }
        return parentId;
      }
      let _dsId = null;
      async function dsId() {
        if (_dsId == null) _dsId = await resolveDataSourceId();
        return _dsId;
      }
      return {
        id: "notion",
        name: "Notion",
        /** 去重：按 SourceID 精确查询（一定带 filter，不拉全量） */
        async exists(item) {
          if (!item || !item.sourceId) return false;
          const ds = await dsId();
          if (!ds) return false;
          const body = await api("/data_sources/" + ds + "/query", {
            method: "POST",
            body: {
              page_size: 1,
              filter: { property: "SourceID", rich_text: { equals: item.sourceId } }
            }
          });
          return !!(body && Array.isArray(body.results) && body.results.length);
        },
        async write(item, markdown, meta) {
          const platformName = {
            bilibili: "B\u7AD9",
            xiaohongshu: "\u5C0F\u7EA2\u4E66",
            xiaoyuzhou: "\u5C0F\u5B87\u5B99",
            twitter: "X"
          }[item.platform] || item.platform;
          const title = `[${platformName}] ${item.title}`;
          const properties = {
            Name: { title: [{ type: "text", text: { content: clip(title, 200) } }] },
            SourceID: { rich_text: [{ type: "text", text: { content: clip(item.sourceId, 200) } }] }
          };
          if (item.platform) properties.Platform = { select: { name: item.platform } };
          if (item.author && item.author.name) {
            properties.Author = { rich_text: [{ type: "text", text: { content: clip(item.author.name, 200) } }] };
          }
          if (item.url) properties.URL = { url: item.url };
          if (item.collection) {
            properties.Collection = { rich_text: [{ type: "text", text: { content: clip(item.collection, 200) } }] };
          }
          const savedAt = item.collectedAt || item.publishedAt;
          if (savedAt) properties.SavedAt = { date: { start: savedAt } };
          if (item.duration > 0) properties.Duration = { number: Math.round(item.duration) };
          const payload = {
            parent: parentType === "page_id" ? { type: "page_id", page_id: parentId } : { type: "data_source_id", data_source_id: await dsId() },
            properties,
            // 原生 markdown 字段：服务端负责转 block，绕开 2000 字符/100 block 的手工切分
            markdown: String(markdown || "").replace(/^---\n[\s\S]*?\n---\n/, "")
            // 去掉 frontmatter，Notion 不需要
          };
          if (item.cover) {
            let coverUrl = item.cover;
            if (opts.uploadImages && item.cover.startsWith("http")) {
              try {
                const up = await api("/file_uploads", {
                  method: "POST",
                  body: { mode: "external_url", external_url: item.cover, filename: item.id + ".jpg" }
                });
                if (up && up.id) {
                  payload.cover = { type: "file_upload", file_upload: { id: up.id } };
                  coverUrl = null;
                }
              } catch (_) {
              }
            }
            if (coverUrl) payload.cover = { type: "external", external: { url: coverUrl } };
          }
          if (item.platform) {
            payload.icon = { type: "emoji", emoji: { bilibili: "\u{1F4FA}", xiaohongshu: "\u{1F4D5}", xiaoyuzhou: "\u{1F3A7}", twitter: "\u{1F426}" }[item.platform] || "\u{1F517}" };
          }
          const page = await api("/pages", { method: "POST", body: payload });
          return page && page.url || page && page.id || "";
        },
        /** Notion 端不本地化资产——封面由 write 里的 file_upload 处理 */
        async localizeAsset(item, url) {
          return url;
        },
        /** 供设置页"测试连接"用 */
        async ping() {
          const me = await api("/users/me", {});
          return { ok: true, user: me && me.name || me && me.bot && me.bot.workspace_name || "" };
        },
        /** 供设置页展示/建库引导 */
        SCHEMA
      };
    }
    module2.exports = { createNotionTarget, NOTION_VERSION, SCHEMA };
  }
});

// core/vault-index.js
var require_vault_index = __commonJS({
  "core/vault-index.js"(exports2, module2) {
    var { normalizePath, cleanText } = require_model();
    function parseFrontmatter(md) {
      const raw = String(md == null ? "" : md).replace(/^\uFEFF/, "");
      const m = /^\s*---[ \t]*\r?\n([\s\S]*?)\r?\n[ \t]*---[ \t]*(?:\r?\n|$)/.exec(raw);
      if (!m) return { data: {}, body: raw, hasFrontmatter: false };
      const data = {};
      const lines = m[1].split(/\r?\n/);
      let pendingKey = null;
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim() || /^\s*#/.test(line)) continue;
        const itemM = /^\s*-\s+(.*)$/.exec(line);
        if (itemM && pendingKey) {
          if (!Array.isArray(data[pendingKey])) data[pendingKey] = [];
          data[pendingKey].push(parseScalar(itemM[1]));
          continue;
        }
        const kv = /^([A-Za-z0-9_.\-]+)\s*:\s*(.*)$/.exec(line);
        if (!kv) continue;
        const key = kv[1];
        let val = kv[2].trim();
        if (val === "") {
          pendingKey = key;
          data[key] = [];
          continue;
        }
        pendingKey = null;
        if (val.startsWith("[")) {
          data[key] = parseInlineList(m[1], i, val);
          continue;
        }
        data[key] = parseScalar(val);
      }
      return { data, body: raw.slice(m[0].length), hasFrontmatter: true };
    }
    function parseInlineList(block, startIdx, firstVal) {
      let buf = firstVal;
      const lines = block.split(/\r?\n/);
      for (let i = startIdx + 1; i < lines.length && !isBalanced(buf); i++) {
        buf += " " + lines[i];
      }
      const inner = buf.replace(/^\[/, "").replace(/\][\s\S]*$/, "");
      if (!inner.trim()) return [];
      const out = [];
      let cur = "";
      let quote = "";
      for (let i = 0; i < inner.length; i++) {
        const ch = inner[i];
        if (quote) {
          if (ch === "\\" && i + 1 < inner.length) {
            cur += inner[++i];
            continue;
          }
          if (ch === quote) {
            quote = "";
            continue;
          }
          cur += ch;
          continue;
        }
        if (ch === '"' || ch === "'") {
          quote = ch;
          continue;
        }
        if (ch === ",") {
          out.push(cleanText(cur));
          cur = "";
          continue;
        }
        cur += ch;
      }
      out.push(cleanText(cur));
      return out.filter((s) => s !== "");
    }
    function isBalanced(s) {
      let quote = "";
      for (let i = 0; i < s.length; i++) {
        const ch = s[i];
        if (quote) {
          if (ch === quote) quote = "";
          continue;
        }
        if (ch === '"' || ch === "'") {
          quote = ch;
          continue;
        }
      }
      return /\]/.test(s) && quote === "";
    }
    function parseScalar(v) {
      let s = String(v == null ? "" : v).trim();
      s = s.replace(/\s+#.*$/, "");
      if (s.startsWith('"') && s.endsWith('"') && s.length >= 2 || s.startsWith("'") && s.endsWith("'") && s.length >= 2) {
        return s.slice(1, -1).replace(/\\(["\\])/g, "$1").replace(/\\n/g, "\n");
      }
      if (/^true$/i.test(s)) return true;
      if (/^false$/i.test(s)) return false;
      if (/^null$|^~$/i.test(s)) return null;
      if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s);
      return s;
    }
    function buildEntry(file, fm, body) {
      const f = fm || {};
      const num = (v) => {
        const n = Number(v);
        return Number.isFinite(n) ? n : 0;
      };
      const bool = (v) => v === true || v === "true" || v === "yes";
      const str = (v) => v == null ? "" : String(v);
      const tags = Array.isArray(f.tags) ? f.tags.map((t) => str(t)).filter(Boolean) : [];
      const platform = str(f.platform);
      return {
        path: str(file && file.path),
        name: str(file && file.name),
        mtime: num(file && (file.mtime || file.stat && file.stat.mtime)),
        sourceId: str(f.source_id || f.sourceId),
        platform,
        title: cleanText(f.title) || (file && file.name ? String(file.name).replace(/\.md$/i, "") : "\u672A\u547D\u540D"),
        author: cleanText(f.author),
        url: str(f.url),
        collection: str(f.collection),
        // 注意 key 不对齐：render.js 写的是 published / saved，NormalizedItem 里是 publishedAt / collectedAt
        publishedAt: str(f.published || f.publishedAt),
        collectedAt: str(f.saved || f.collectedAt),
        syncedAt: str(f.synced_at),
        duration: num(f.duration),
        tags,
        hasTranscript: bool(f.transcript),
        hasAiSummary: bool(f.ai_summary),
        body: String(body || "")
      };
    }
    function createVaultIndex(deps) {
      const d = deps || {};
      const vault = d.vault;
      const log = d.logger || (() => {
      });
      if (!vault || typeof vault.getMarkdownFiles !== "function") {
        throw new Error("vault-index \u9700\u8981 vault.getMarkdownFiles()");
      }
      const root = normalizePath(String(d.rootPath || "")).toLowerCase();
      const cache = /* @__PURE__ */ new Map();
      function inScope(path) {
        if (!root) return true;
        const p = normalizePath(String(path || "")).toLowerCase();
        return p === root || p.startsWith(root + "/");
      }
      async function scan(opts) {
        const o = opts || {};
        const files = vault.getMarkdownFiles() || [];
        const targets = files.filter((f) => f && inScope(f.path));
        const out = [];
        for (const f of targets) {
          const mtime = Number(f.mtime || f.stat && f.stat.mtime || 0);
          const hit = cache.get(f.path);
          if (!o.force && hit && hit.mtime === mtime) {
            out.push(hit.entry);
            continue;
          }
          try {
            const entry = await readOne(f, mtime);
            cache.set(f.path, { mtime, entry });
            out.push(entry);
          } catch (e) {
            log("[vault-index] \u8DF3\u8FC7 " + (f.path || "?") + "\uFF1A" + (e.message || e));
          }
        }
        const alive = new Set(targets.map((f) => f.path));
        for (const k of [...cache.keys()]) if (!alive.has(k)) cache.delete(k);
        return out;
      }
      async function readOne(f, mtime) {
        const cacheObj = vault.metadataCache && vault.metadataCache.getFileCache ? vault.metadataCache.getFileCache(f) : null;
        let fm = cacheObj && cacheObj.frontmatter;
        const reader = vault.cachedRead || vault.read;
        const md = typeof reader === "function" ? await reader.call(vault, f) : "";
        let body = String(md || "");
        if (!fm) {
          const parsed = parseFrontmatter(body);
          fm = parsed.data;
          body = parsed.body;
        } else {
          body = String(md || "").replace(/^\uFEFF?\s*---[ \t]*\r?\n[\s\S]*?\r?\n[ \t]*---[ \t]*(?:\r?\n|$)/, "");
        }
        return buildEntry({ path: f.path, name: f.name, mtime }, stripObsidianFmKeys(fm), body);
      }
      return {
        scan,
        /** 丢弃缓存（换库 / 改了同步根目录时调用） */
        invalidate() {
          cache.clear();
        },
        /** 当前缓存条目数（测试与调试用） */
        get size() {
          return cache.size;
        }
      };
    }
    function stripObsidianFmKeys(fm) {
      const src = fm || {};
      const out = {};
      Object.keys(src).forEach((k) => {
        const v = src[k];
        out[k] = v && typeof v === "object" && !Array.isArray(v) && "position" in v && "value" in v ? v.value : v;
      });
      return out;
    }
    module2.exports = { createVaultIndex, parseFrontmatter, buildEntry, parseScalar };
  }
});

// core/search.js
var require_search = __commonJS({
  "core/search.js"(exports2, module2) {
    var CJK = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\u3040-\u30ff]/;
    var K1 = 1.2;
    var B = 0.75;
    function tokenize(text) {
      const s = String(text == null ? "" : text);
      if (!s) return [];
      const out = [];
      const segs = s.match(/[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\u3040-\u30ff]+|[A-Za-z0-9_]+/g) || [];
      for (const seg of segs) {
        if (CJK.test(seg)) {
          if (seg.length === 1) {
            out.push(seg);
            continue;
          }
          for (let i = 0; i < seg.length - 1; i++) out.push(seg.slice(i, i + 2));
        } else {
          const w = seg.toLowerCase();
          if (w.length >= 2 || /^\d+$/.test(w)) out.push(w);
        }
      }
      return out;
    }
    function matchFilter(e, f) {
      if (!f) return true;
      if (f.platform != null) {
        const want = Array.isArray(f.platform) ? f.platform : [f.platform];
        if (want.length && !want.map(String).includes(String(e.platform))) return false;
      }
      if (f.author != null) {
        const want = Array.isArray(f.author) ? f.author : [f.author];
        if (want.length && !want.some((w) => String(e.author).includes(String(w)))) return false;
      }
      if (f.collection != null) {
        const want = Array.isArray(f.collection) ? f.collection : [f.collection];
        if (want.length && !want.map(String).includes(String(e.collection))) return false;
      }
      if (f.tags && f.tags.length) {
        const has = (e.tags || []).map(String);
        if (!f.tags.some((t) => has.includes(String(t)))) return false;
      }
      if (f.hasTranscript === true && !e.hasTranscript) return false;
      const day = (v) => String(v || "").slice(0, 10);
      const saved = day(e.collectedAt);
      const pub = day(e.publishedAt);
      if (f.savedAfter && saved && day(saved) < day(f.savedAfter)) return false;
      if (f.savedBefore && saved && day(saved) > day(f.savedBefore)) return false;
      if (f.publishedAfter && pub && day(pub) < day(f.publishedAfter)) return false;
      if (f.publishedBefore && pub && day(pub) > day(f.publishedBefore)) return false;
      return true;
    }
    function buildIndex(entries, opts) {
      const o = opts || {};
      const maxBody = Number(o.maxBodyChars) || 6e3;
      const docs = Array.isArray(entries) ? entries : [];
      const postings = /* @__PURE__ */ new Map();
      const docLen = [];
      let totalLen = 0;
      docs.forEach((e, idx) => {
        const title = String(e.title || "").repeat(3);
        const meta = [e.author, e.collection, (e.tags || []).join(" ")].filter(Boolean).join(" ");
        const body = String(e.body || "").slice(0, maxBody);
        const toks = tokenize(title + " " + meta + " " + body);
        docLen.push(toks.length);
        totalLen += toks.length;
        const tf = /* @__PURE__ */ new Map();
        for (const t of toks) tf.set(t, (tf.get(t) || 0) + 1);
        for (const [t, n] of tf) {
          let arr = postings.get(t);
          if (!arr) {
            arr = /* @__PURE__ */ new Map();
            postings.set(t, arr);
          }
          arr.set(idx, n);
        }
      });
      return {
        entries: docs,
        postings,
        docLen,
        avgdl: docs.length ? totalLen / docs.length : 0,
        N: docs.length
      };
    }
    function search(index, query, opts) {
      const o = opts || {};
      const idx = index || {};
      if (!idx.N) return [];
      const qTerms = [...new Set(tokenize(query))];
      if (!qTerms.length) return [];
      const filter = o.filter || null;
      const cand = [];
      for (let i = 0; i < idx.N; i++) {
        if (matchFilter(idx.entries[i], filter)) cand.push(i);
      }
      if (!cand.length) return [];
      const inCand = new Set(cand);
      const df = /* @__PURE__ */ new Map();
      for (const t of qTerms) {
        const arr = idx.postings.get(t);
        if (!arr) continue;
        let n = 0;
        for (const d of arr.keys()) if (inCand.has(d)) n++;
        if (n) df.set(t, n);
      }
      if (!df.size) return [];
      const scores = /* @__PURE__ */ new Map();
      const matchedMap = /* @__PURE__ */ new Map();
      for (const t of df.keys()) {
        const arr = idx.postings.get(t);
        const n = df.get(t);
        const idf = Math.log(1 + (cand.length - n + 0.5) / (n + 0.5));
        for (const [d, tfRaw] of arr) {
          if (!inCand.has(d)) continue;
          const dl = idx.docLen[d] || 0;
          const norm = tfRaw * (K1 + 1) / (tfRaw + K1 * (1 - B + B * (dl / (idx.avgdl || 1))));
          const add = idf * norm;
          scores.set(d, (scores.get(d) || 0) + add);
          if (!matchedMap.has(d)) matchedMap.set(d, []);
          matchedMap.get(d).push(t);
        }
      }
      const minScore = Number(o.minScore) || 0;
      const out = [];
      for (const [d, score] of scores) {
        if (score <= minScore) continue;
        out.push({
          idx: d,
          entry: idx.entries[d],
          score,
          matched: [...new Set(matchedMap.get(d) || [])]
        });
      }
      out.sort((a, b) => b.score - a.score || a.idx - b.idx);
      const topK = Number(o.topK) > 0 ? Number(o.topK) : 8;
      return out.slice(0, topK);
    }
    function extractFilter(question, now) {
      const q = String(question == null ? "" : question);
      const f = {};
      if (/b\s*站|哔哩哔哩|bilibili/i.test(q)) f.platform = "bilibili";
      else if (/小红书|红书|xiaohongshu|xhs/i.test(q)) f.platform = "xiaohongshu";
      else if (/小宇宙|播客|xiaoyuzhou/i.test(q)) f.platform = "xiaoyuzhou";
      const base = now instanceof Date && !isNaN(now.getTime()) ? now : /* @__PURE__ */ new Date();
      const y = base.getFullYear();
      const m = base.getMonth();
      if (/上个月|上月/.test(q)) {
        f.savedAfter = dayStr(new Date(y, m - 1, 1));
        f.savedBefore = dayStr(new Date(y, m, 0));
      } else if (/这个月|本月/.test(q)) {
        f.savedAfter = dayStr(new Date(y, m, 1));
      } else if (/上周|上个星期/.test(q)) {
        const dow = (base.getDay() + 6) % 7;
        const thisMonday = new Date(y, m, base.getDate() - dow);
        f.savedAfter = dayStr(new Date(thisMonday.getTime() - 7 * 864e5));
        f.savedBefore = dayStr(new Date(thisMonday.getTime() - 1 * 864e5));
      } else if (/这周|这个星期/.test(q)) {
        const dow = (base.getDay() + 6) % 7;
        f.savedAfter = dayStr(new Date(y, m, base.getDate() - dow));
      } else {
        const recent = /最近\s*(\d+)\s*(天|周|个?月)/.exec(q);
        if (recent) {
          const n = Math.max(1, Math.min(3650, parseInt(recent[1], 10)));
          const unit = recent[2];
          const days = /周/.test(unit) ? n * 7 : /月/.test(unit) ? n * 30 : n;
          f.savedAfter = dayStr(new Date(base.getTime() - days * 864e5));
        } else if (/今天/.test(q)) {
          f.savedAfter = dayStr(base);
        } else if (/今年|这一年/.test(q)) {
          f.savedAfter = dayStr(new Date(y, 0, 1));
        }
      }
      return f;
    }
    function retrieve(index, question, opts) {
      const o = opts || {};
      const filter = o.filter != null ? o.filter : extractFilter(question, o.now);
      const hits = search(index, question, {
        filter,
        topK: o.topK,
        minScore: o.minScore
      });
      return { hits, filter };
    }
    function dayStr(d) {
      const p = (n) => String(n).padStart(2, "0");
      return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
    }
    module2.exports = { tokenize, buildIndex, search, retrieve, matchFilter, extractFilter, dayStr, K1, B };
  }
});

// core/chat.js
var require_chat = __commonJS({
  "core/chat.js"(exports2, module2) {
    var { stripThink } = require_ai();
    function estTokens(text) {
      const s = String(text == null ? "" : text);
      if (!s) return 0;
      const cjk = (s.match(/[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/g) || []).length;
      return Math.ceil(cjk + (s.length - cjk) / 4);
    }
    function buildContext(hits, opts) {
      const o = opts || {};
      const budget = Number(o.maxChars) || 12e3;
      const perDoc = Number(o.perDoc) || 1500;
      const list = Array.isArray(hits) ? hits : [];
      const chunks = [];
      const sources = [];
      let used = 0;
      let dropped = 0;
      list.forEach((h, i) => {
        const e = h.entry || h;
        const head = [
          `[${i + 1}] ${e.title || "\u672A\u547D\u540D"}`,
          [
            e.platform ? `\u5E73\u53F0\uFF1A${e.platform}` : "",
            e.author ? `\u4F5C\u8005\uFF1A${e.author}` : "",
            e.collectedAt ? `\u6536\u85CF\uFF1A${String(e.collectedAt).slice(0, 10)}` : "",
            e.duration ? `\u65F6\u957F\uFF1A${Math.round(e.duration / 60)} \u5206\u949F` : ""
          ].filter(Boolean).join(" \uFF5C ")
        ].filter(Boolean).join("\n");
        const body = String(e.body || "").replace(/^#{1,6}\s.*$/gm, "").trim().slice(0, perDoc);
        const block = head + (body ? "\n" + body : "");
        if (used + block.length > budget) {
          dropped++;
          return;
        }
        used += block.length;
        chunks.push(block);
        sources.push({
          n: i + 1,
          title: e.title || "\u672A\u547D\u540D",
          platform: e.platform || "",
          author: e.author || "",
          url: e.url || "",
          path: e.path || "",
          score: h.score || 0
        });
      });
      return { text: chunks.join("\n\n"), sources, dropped };
    }
    function trimHistory(history, opts) {
      const o = opts || {};
      const maxTurns = Number(o.maxTurns) || 6;
      const maxChars = Number(o.maxChars) || 4e3;
      const h = Array.isArray(history) ? history.filter((m) => m && m.content) : [];
      if (!h.length) return [];
      const keep = [];
      let turns = 0;
      let i = h.length - 1;
      while (i >= 0 && turns < maxTurns) {
        if (h[i].role === "assistant") {
          keep.unshift(h[i]);
        } else if (h[i].role === "user") {
          keep.unshift(h[i]);
          turns++;
        } else {
          keep.unshift(h[i]);
        }
        i--;
      }
      const out = keep.slice();
      if (i >= 0) {
        const earlier = h.slice(0, i + 1).filter((m) => m.role === "user").map((m) => String(m.content));
        if (earlier.length) {
          out.unshift({
            role: "user",
            content: "\uFF08\u4EE5\u4E0B\u662F\u66F4\u65E9\u7684\u5BF9\u8BDD\u8981\u70B9\uFF0C\u4F9B\u53C2\u8003\uFF09\n" + earlier.map((q) => "- " + q.slice(0, 80)).join("\n")
          });
        }
      }
      let total = out.reduce((s, m) => s + String(m.content || "").length, 0);
      while (out.length > 1 && total > maxChars) {
        total -= String(out.shift().content || "").length;
      }
      return out;
    }
    function buildMessages(question, contextText, history, opts) {
      const o = opts || {};
      const sys = [
        "\u4F60\u662F\u7528\u6237\u4E2A\u4EBA\u77E5\u8BC6\u5E93\u7684\u52A9\u624B\u3002",
        "\u53EA\u80FD\u4F9D\u636E\u4E0B\u9762\u300C\u53C2\u8003\u8D44\u6599\u300D\u91CC\u7684\u5185\u5BB9\u56DE\u7B54\uFF1B\u8D44\u6599\u91CC\u6CA1\u6709\u7684\uFF0C\u76F4\u63A5\u8BF4\u300C\u6536\u85CF\u91CC\u6CA1\u627E\u5230\u76F8\u5173\u5185\u5BB9\u300D\uFF0C\u4E0D\u8981\u7F16\u3002",
        "\u5F15\u7528\u65F6\u7528 [1] [2] \u8FD9\u6837\u7684\u7F16\u53F7\uFF0C\u7F16\u53F7\u5BF9\u5E94\u53C2\u8003\u8D44\u6599\u6761\u76EE\u7684\u5E8F\u53F7\u3002",
        o.lang === "en" ? "Reply in English." : "\u7528\u4E2D\u6587\u56DE\u7B54\uFF0C\u7B80\u6D01\uFF0C\u4E0D\u8981\u590D\u8FF0\u95EE\u9898\u3002"
      ].join(" ");
      const msgs = [{ role: "system", content: sys }];
      trimHistory(history, o).forEach((m) => msgs.push(m));
      const userContent = contextText ? `\u53C2\u8003\u8D44\u6599\uFF1A

${contextText}

---
\u95EE\u9898\uFF1A${question}` : `\uFF08\u6CA1\u6709\u68C0\u7D22\u5230\u76F8\u5173\u6536\u85CF\uFF09
\u95EE\u9898\uFF1A${question}`;
      msgs.push({ role: "user", content: userContent });
      return msgs;
    }
    function createChat(deps) {
      const d = deps || {};
      const http = d.http;
      const base = String(d.baseUrl || "").replace(/\/+$/, "");
      async function ask(question, opts) {
        const o = opts || {};
        if (!http) throw new Error("chat \u9700\u8981 http \u5B9E\u4F8B");
        if (!base) throw new Error("\u8BF7\u5148\u586B AI \u63A5\u53E3\u5730\u5740");
        if (!d.apiKey) throw new Error("\u8BF7\u5148\u586B API Key");
        if (!question || !String(question).trim()) throw new Error("\u95EE\u9898\u662F\u7A7A\u7684");
        const ctx = buildContext(o.hits, o);
        const messages = buildMessages(question, ctx.text, o.history, o);
        let body;
        try {
          body = await http.json(base + "/chat/completions", {
            method: "POST",
            headers: { Authorization: "Bearer " + d.apiKey },
            body: {
              model: d.model || "deepseek-chat",
              messages,
              max_tokens: Number(o.maxTokens) || 1500,
              temperature: o.temperature == null ? 0.3 : Number(o.temperature),
              stream: false,
              ...o.disableThinking ? { thinking: { type: "disabled" } } : {}
            }
          });
        } catch (e) {
          const s = String(e.message || e);
          if (/401|Unauthorized/i.test(s)) throw new Error("API Key \u65E0\u6548\u6216\u5DF2\u8FC7\u671F");
          if (/404|Not Found/i.test(s)) throw new Error("\u63A5\u53E3\u5730\u5740\u4E0D\u5BF9\uFF08\u672A\u627E\u5230 /chat/completions\uFF09");
          if (/timeout|ETIMEDOUT/i.test(s)) throw new Error("\u8BF7\u6C42\u8D85\u65F6\uFF0C\u6362\u4E2A\u6A21\u578B\u6216\u7A0D\u540E\u518D\u8BD5");
          throw new Error("\u8C03\u7528\u5931\u8D25\uFF1A" + s.slice(0, 120));
        }
        const choice = body && body.choices && body.choices[0] || {};
        const msg = choice.message || {};
        const answer = stripThink(msg.content || "");
        if (!answer && msg.reasoning_content) {
          throw new Error("\u6A21\u578B\u53EA\u8FD4\u56DE\u4E86\u601D\u8003\u8FC7\u7A0B\uFF0C\u6CA1\u7ED9\u51FA\u6B63\u5F0F\u56DE\u7B54\u3002\u6362\u4E2A\u6A21\u578B\uFF0C\u6216\u5728\u8BBE\u7F6E\u91CC\u5173\u6389\u6DF1\u5EA6\u601D\u8003");
        }
        return {
          answer: answer || "\uFF08\u6A21\u578B\u6CA1\u6709\u8FD4\u56DE\u5185\u5BB9\uFF09",
          sources: ctx.sources,
          dropped: ctx.dropped,
          usage: body && body.usage || {},
          messages
        };
      }
      return { ask };
    }
    module2.exports = { createChat, buildContext, trimHistory, buildMessages, estTokens };
  }
});

// core/index.js
var require_core = __commonJS({
  "core/index.js"(exports2, module2) {
    var model = require_model();
    var { createHttp } = require_http();
    var license = require_license();
    var ai = require_ai();
    var html2md = require_html2md();
    var render = require_render();
    var engine = require_engine();
    var transcript = require_transcript();
    var bilibili = require_bilibili();
    var xiaohongshu = require_xiaohongshu();
    var xiaoyuzhou = require_xiaoyuzhou();
    var twitter = require_twitter();
    var { createObsidianTarget } = require_obsidian();
    var { createNotionTarget } = require_notion();
    var vaultIndex = require_vault_index();
    var searchMod = require_search();
    var chatMod = require_chat();
    var providers = { bilibili, xiaohongshu, xiaoyuzhou, twitter };
    var providerList = [bilibili, xiaohongshu, xiaoyuzhou, twitter];
    function getProvider(id) {
      return providers[id] || null;
    }
    module2.exports = {
      // 子系统
      ...model,
      ...license,
      ...ai,
      ...html2md,
      ...render,
      ...engine,
      ...transcript,
      createHttp,
      // 检索与对话（search / chat 为函数，命名空间用 searchMod / chatMod 防重名）
      ...vaultIndex,
      ...searchMod,
      ...chatMod,
      // 平台
      providers,
      providerList,
      getProvider,
      // 目标端
      createObsidianTarget,
      createNotionTarget,
      // 原始命名空间（避免重名时用）
      model,
      license,
      ai,
      html2md,
      render,
      engine,
      vaultIndex,
      searchMod,
      chatMod
    };
  }
});

// plugin/webview-host.js
var require_webview_host = __commonJS({
  "plugin/webview-host.js"(exports2, module2) {
    var INJECT_SCRIPT = `(function(){
  var PAT = %PATTERN%;
  // \u5DF2\u88C5\u8FC7\u4E14 pattern \u6CA1\u53D8\u624D\u8DF3\u8FC7\uFF1Bpattern \u53D8\u4E86\uFF08\u6BD4\u5982\u4ECE\u6536\u85CF\u5217\u8868\u5207\u5230\u5BBD\u5339\u914D\u55C5\u63A2\uFF09\u8981\u6362\u88C5
  if (window.__clipin_installed && window.__clipin_pat === PAT) return 'already';
  window.__clipin_installed = true;
  window.__clipin_pat = PAT;
  window.__clipin_captured = [];
  function push(url, text){
    try{
      if (!text) return;
      if (url && url.indexOf(PAT) === -1) return;
      var j = JSON.parse(text);
      if (j) window.__clipin_captured.push({ url: url || '', body: j, at: Date.now() });
    }catch(e){}
  }
  // \u62E6 XHR
  var _open = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(m, u){ try{ this.__clipin_url = u; }catch(e){} return _open.apply(this, arguments); };
  var _send = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.send = function(){
    var self = this;
    this.addEventListener('load', function(){
      try{ push(self.__clipin_url || self.responseURL || '', self.responseText || ''); }catch(e){}
    });
    return _send.apply(this, arguments);
  };
  // \u62E6 fetch
  var _fetch = window.fetch;
  window.fetch = function(){
    var arg = arguments[0];
    var url = (arg && typeof arg === 'object' && arg.url) ? arg.url : String(arg || '');
    var p = _fetch.apply(this, arguments);
    try{
      p.then(function(r){
        try { r.clone().text().then(function(t){ push(url, t); }); } catch(e){}
        return r;
      }).catch(function(){});
    }catch(e){}
    return p;
  };
  return 'ok';
})();`;
    var sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    function createWebviewHost2(cfg) {
      const c = cfg || {};
      const webview = c.webview;
      const onStatus = c.onStatus || (() => {
      });
      const log = c.logger || (() => {
      });
      if (!webview) throw new Error("webview \u5BBF\u4E3B\u9700\u8981\u4E00\u4E2A webview \u5143\u7D20");
      let lastCaptureAt = Date.now();
      let lastCount = 0;
      function waitDomReady(timeoutMs) {
        return new Promise((resolve, reject) => {
          let settled = false;
          const done = () => {
            if (!settled) {
              settled = true;
              cleanup();
              resolve();
            }
          };
          const fail = () => {
            if (!settled) {
              settled = true;
              cleanup();
              reject(new Error("\u9875\u9762\u52A0\u8F7D\u8D85\u65F6"));
            }
          };
          const cleanup = () => {
            clearTimeout(t);
            webview.removeEventListener("did-finish-load", done);
            webview.removeEventListener("dom-ready", done);
          };
          const t = setTimeout(fail, (timeoutMs || 45e3) + 5e3);
          webview.addEventListener("did-finish-load", done);
          webview.addEventListener("dom-ready", done);
        });
      }
      async function inject(pattern) {
        const code = INJECT_SCRIPT.replace("%PATTERN%", JSON.stringify(pattern || ""));
        try {
          return await webview.executeJavaScript(code);
        } catch (e) {
          log("[webview] \u6CE8\u5165\u5931\u8D25\uFF1A" + e.message);
          return null;
        }
      }
      async function pull() {
        try {
          const arr = await webview.executeJavaScript("window.__clipin_captured || []");
          if (Array.isArray(arr)) {
            if (arr.length !== lastCount) {
              lastCount = arr.length;
              lastCaptureAt = Date.now();
            }
            return arr;
          }
        } catch (e) {
          log("[webview] \u53D6\u56DE\u54CD\u5E94\u5931\u8D25\uFF1A" + e.message);
        }
        return [];
      }
      return {
        /** 导航到指定地址 */
        async goto(url, opts) {
          const o = opts || {};
          onStatus("\u6B63\u5728\u6253\u5F00\u9875\u9762\u2026");
          webview.src = url;
          if (webview.loadURL) webview.loadURL(url).catch(() => {
          });
          await waitDomReady(o.timeoutMs || 45e3);
        },
        /** 重新注入拦截器（页面跳转后调用） */
        reinject: inject,
        /** 滚动到底部，触发懒加载 */
        async scrollToBottom() {
          try {
            await webview.executeJavaScript(
              'window.scrollTo(0, document.body.scrollHeight); window.dispatchEvent(new Event("scroll")); "ok"'
            );
          } catch (e) {
            log("[webview] \u6EDA\u52A8\u5931\u8D25\uFF1A" + e.message);
          }
        },
        sleep,
        /** 按文字点击元素（小红书的"收藏"标签没有稳定的 class） */
        async clickByText(opts) {
          const o = opts || {};
          if (!o.text) return false;
          const code = `(function(){
        var TXT = ${JSON.stringify(o.text)};
        var els = document.querySelectorAll(${JSON.stringify(o.selector || "*")});
        var best = null, bestLen = -1;
        for (var i = 0; i < els.length; i++){
          var t = (els[i].innerText || els[i].textContent || '').trim();
          if (t !== TXT && t.indexOf(TXT) !== 0) continue;
          if (best === null || t.length < bestLen) { best = els[i]; bestLen = t.length; }
        }
        if (best) { best.click(); return true; }
        return false;
      })();`;
          try {
            const r = await webview.executeJavaScript(code);
            if (r) await sleep(1500);
            return !!r;
          } catch (e) {
            return false;
          }
        },
        /** 距上次捕获到新数据是否已超过 ms（用来判断"滚到底了"） */
        async isIdleSince(ms) {
          await pull();
          return Date.now() - lastCaptureAt > (ms || 8e3);
        },
        /** 取回完整捕获（含 URL——专辑发现要靠 URL 辨认接口） */
        async getCaptured() {
          return await pull();
        },
        /** 清空捕获（切专辑/切页面时调用，防止上一个页面的数据混进来） */
        async clearCaptured() {
          try {
            await webview.executeJavaScript('window.__clipin_captured = []; "ok"');
          } catch (e) {
          }
          lastCount = 0;
          lastCaptureAt = Date.now();
        },
        /** 当前页面 URL */
        async url() {
          try {
            return await webview.executeJavaScript("location.href");
          } catch (e) {
            return "";
          }
        },
        /**
         * 执行一次"打开→操作→拦截"的完整流程
         * @param {Object} p
         * @param {string} p.urlPattern 要拦截的 URL 片段
         * @param {Function} p.navigate 导航与初始交互
         * @param {Function} p.drive 滚动驱动
         * @param {Function} [p.matchBody] 额外筛选：返回 true 才收
         * @returns {Promise<Object[]>} 捕获到的响应体数组
         */
        async captureResponses(p) {
          const pattern = p.urlPattern || "";
          if (!pattern) throw new Error("captureResponses \u9700\u8981 urlPattern");
          const onDomReady = async () => {
            await sleep(300);
            await inject(pattern);
          };
          webview.addEventListener("dom-ready", onDomReady);
          try {
            if (p.navigate) await p.navigate();
            await sleep(500);
            await inject(pattern);
            if (p.drive) await p.drive();
            const all = await pull();
            const bodies = all.map((x) => x.body).filter(Boolean);
            return p.matchBody ? bodies.filter(p.matchBody) : bodies;
          } finally {
            webview.removeEventListener("dom-ready", onDomReady);
          }
        }
      };
    }
    module2.exports = { createWebviewHost: createWebviewHost2, INJECT_SCRIPT, sleep };
  }
});

// node_modules/qrcode/lib/can-promise.js
var require_can_promise = __commonJS({
  "node_modules/qrcode/lib/can-promise.js"(exports2, module2) {
    module2.exports = function() {
      return typeof Promise === "function" && Promise.prototype && Promise.prototype.then;
    };
  }
});

// node_modules/qrcode/lib/core/utils.js
var require_utils = __commonJS({
  "node_modules/qrcode/lib/core/utils.js"(exports2) {
    var toSJISFunction;
    var CODEWORDS_COUNT = [
      0,
      // Not used
      26,
      44,
      70,
      100,
      134,
      172,
      196,
      242,
      292,
      346,
      404,
      466,
      532,
      581,
      655,
      733,
      815,
      901,
      991,
      1085,
      1156,
      1258,
      1364,
      1474,
      1588,
      1706,
      1828,
      1921,
      2051,
      2185,
      2323,
      2465,
      2611,
      2761,
      2876,
      3034,
      3196,
      3362,
      3532,
      3706
    ];
    exports2.getSymbolSize = function getSymbolSize(version) {
      if (!version) throw new Error('"version" cannot be null or undefined');
      if (version < 1 || version > 40) throw new Error('"version" should be in range from 1 to 40');
      return version * 4 + 17;
    };
    exports2.getSymbolTotalCodewords = function getSymbolTotalCodewords(version) {
      return CODEWORDS_COUNT[version];
    };
    exports2.getBCHDigit = function(data) {
      let digit = 0;
      while (data !== 0) {
        digit++;
        data >>>= 1;
      }
      return digit;
    };
    exports2.setToSJISFunction = function setToSJISFunction(f) {
      if (typeof f !== "function") {
        throw new Error('"toSJISFunc" is not a valid function.');
      }
      toSJISFunction = f;
    };
    exports2.isKanjiModeEnabled = function() {
      return typeof toSJISFunction !== "undefined";
    };
    exports2.toSJIS = function toSJIS(kanji) {
      return toSJISFunction(kanji);
    };
  }
});

// node_modules/qrcode/lib/core/error-correction-level.js
var require_error_correction_level = __commonJS({
  "node_modules/qrcode/lib/core/error-correction-level.js"(exports2) {
    exports2.L = { bit: 1 };
    exports2.M = { bit: 0 };
    exports2.Q = { bit: 3 };
    exports2.H = { bit: 2 };
    function fromString(string) {
      if (typeof string !== "string") {
        throw new Error("Param is not a string");
      }
      const lcStr = string.toLowerCase();
      switch (lcStr) {
        case "l":
        case "low":
          return exports2.L;
        case "m":
        case "medium":
          return exports2.M;
        case "q":
        case "quartile":
          return exports2.Q;
        case "h":
        case "high":
          return exports2.H;
        default:
          throw new Error("Unknown EC Level: " + string);
      }
    }
    exports2.isValid = function isValid(level) {
      return level && typeof level.bit !== "undefined" && level.bit >= 0 && level.bit < 4;
    };
    exports2.from = function from(value, defaultValue) {
      if (exports2.isValid(value)) {
        return value;
      }
      try {
        return fromString(value);
      } catch (e) {
        return defaultValue;
      }
    };
  }
});

// node_modules/qrcode/lib/core/bit-buffer.js
var require_bit_buffer = __commonJS({
  "node_modules/qrcode/lib/core/bit-buffer.js"(exports2, module2) {
    function BitBuffer() {
      this.buffer = [];
      this.length = 0;
    }
    BitBuffer.prototype = {
      get: function(index) {
        const bufIndex = Math.floor(index / 8);
        return (this.buffer[bufIndex] >>> 7 - index % 8 & 1) === 1;
      },
      put: function(num, length) {
        for (let i = 0; i < length; i++) {
          this.putBit((num >>> length - i - 1 & 1) === 1);
        }
      },
      getLengthInBits: function() {
        return this.length;
      },
      putBit: function(bit) {
        const bufIndex = Math.floor(this.length / 8);
        if (this.buffer.length <= bufIndex) {
          this.buffer.push(0);
        }
        if (bit) {
          this.buffer[bufIndex] |= 128 >>> this.length % 8;
        }
        this.length++;
      }
    };
    module2.exports = BitBuffer;
  }
});

// node_modules/qrcode/lib/core/bit-matrix.js
var require_bit_matrix = __commonJS({
  "node_modules/qrcode/lib/core/bit-matrix.js"(exports2, module2) {
    function BitMatrix(size) {
      if (!size || size < 1) {
        throw new Error("BitMatrix size must be defined and greater than 0");
      }
      this.size = size;
      this.data = new Uint8Array(size * size);
      this.reservedBit = new Uint8Array(size * size);
    }
    BitMatrix.prototype.set = function(row, col, value, reserved) {
      const index = row * this.size + col;
      this.data[index] = value;
      if (reserved) this.reservedBit[index] = true;
    };
    BitMatrix.prototype.get = function(row, col) {
      return this.data[row * this.size + col];
    };
    BitMatrix.prototype.xor = function(row, col, value) {
      this.data[row * this.size + col] ^= value;
    };
    BitMatrix.prototype.isReserved = function(row, col) {
      return this.reservedBit[row * this.size + col];
    };
    module2.exports = BitMatrix;
  }
});

// node_modules/qrcode/lib/core/alignment-pattern.js
var require_alignment_pattern = __commonJS({
  "node_modules/qrcode/lib/core/alignment-pattern.js"(exports2) {
    var getSymbolSize = require_utils().getSymbolSize;
    exports2.getRowColCoords = function getRowColCoords(version) {
      if (version === 1) return [];
      const posCount = Math.floor(version / 7) + 2;
      const size = getSymbolSize(version);
      const intervals = size === 145 ? 26 : Math.ceil((size - 13) / (2 * posCount - 2)) * 2;
      const positions = [size - 7];
      for (let i = 1; i < posCount - 1; i++) {
        positions[i] = positions[i - 1] - intervals;
      }
      positions.push(6);
      return positions.reverse();
    };
    exports2.getPositions = function getPositions(version) {
      const coords = [];
      const pos = exports2.getRowColCoords(version);
      const posLength = pos.length;
      for (let i = 0; i < posLength; i++) {
        for (let j = 0; j < posLength; j++) {
          if (i === 0 && j === 0 || // top-left
          i === 0 && j === posLength - 1 || // bottom-left
          i === posLength - 1 && j === 0) {
            continue;
          }
          coords.push([pos[i], pos[j]]);
        }
      }
      return coords;
    };
  }
});

// node_modules/qrcode/lib/core/finder-pattern.js
var require_finder_pattern = __commonJS({
  "node_modules/qrcode/lib/core/finder-pattern.js"(exports2) {
    var getSymbolSize = require_utils().getSymbolSize;
    var FINDER_PATTERN_SIZE = 7;
    exports2.getPositions = function getPositions(version) {
      const size = getSymbolSize(version);
      return [
        // top-left
        [0, 0],
        // top-right
        [size - FINDER_PATTERN_SIZE, 0],
        // bottom-left
        [0, size - FINDER_PATTERN_SIZE]
      ];
    };
  }
});

// node_modules/qrcode/lib/core/mask-pattern.js
var require_mask_pattern = __commonJS({
  "node_modules/qrcode/lib/core/mask-pattern.js"(exports2) {
    exports2.Patterns = {
      PATTERN000: 0,
      PATTERN001: 1,
      PATTERN010: 2,
      PATTERN011: 3,
      PATTERN100: 4,
      PATTERN101: 5,
      PATTERN110: 6,
      PATTERN111: 7
    };
    var PenaltyScores = {
      N1: 3,
      N2: 3,
      N3: 40,
      N4: 10
    };
    exports2.isValid = function isValid(mask) {
      return mask != null && mask !== "" && !isNaN(mask) && mask >= 0 && mask <= 7;
    };
    exports2.from = function from(value) {
      return exports2.isValid(value) ? parseInt(value, 10) : void 0;
    };
    exports2.getPenaltyN1 = function getPenaltyN1(data) {
      const size = data.size;
      let points = 0;
      let sameCountCol = 0;
      let sameCountRow = 0;
      let lastCol = null;
      let lastRow = null;
      for (let row = 0; row < size; row++) {
        sameCountCol = sameCountRow = 0;
        lastCol = lastRow = null;
        for (let col = 0; col < size; col++) {
          let module3 = data.get(row, col);
          if (module3 === lastCol) {
            sameCountCol++;
          } else {
            if (sameCountCol >= 5) points += PenaltyScores.N1 + (sameCountCol - 5);
            lastCol = module3;
            sameCountCol = 1;
          }
          module3 = data.get(col, row);
          if (module3 === lastRow) {
            sameCountRow++;
          } else {
            if (sameCountRow >= 5) points += PenaltyScores.N1 + (sameCountRow - 5);
            lastRow = module3;
            sameCountRow = 1;
          }
        }
        if (sameCountCol >= 5) points += PenaltyScores.N1 + (sameCountCol - 5);
        if (sameCountRow >= 5) points += PenaltyScores.N1 + (sameCountRow - 5);
      }
      return points;
    };
    exports2.getPenaltyN2 = function getPenaltyN2(data) {
      const size = data.size;
      let points = 0;
      for (let row = 0; row < size - 1; row++) {
        for (let col = 0; col < size - 1; col++) {
          const last = data.get(row, col) + data.get(row, col + 1) + data.get(row + 1, col) + data.get(row + 1, col + 1);
          if (last === 4 || last === 0) points++;
        }
      }
      return points * PenaltyScores.N2;
    };
    exports2.getPenaltyN3 = function getPenaltyN3(data) {
      const size = data.size;
      let points = 0;
      let bitsCol = 0;
      let bitsRow = 0;
      for (let row = 0; row < size; row++) {
        bitsCol = bitsRow = 0;
        for (let col = 0; col < size; col++) {
          bitsCol = bitsCol << 1 & 2047 | data.get(row, col);
          if (col >= 10 && (bitsCol === 1488 || bitsCol === 93)) points++;
          bitsRow = bitsRow << 1 & 2047 | data.get(col, row);
          if (col >= 10 && (bitsRow === 1488 || bitsRow === 93)) points++;
        }
      }
      return points * PenaltyScores.N3;
    };
    exports2.getPenaltyN4 = function getPenaltyN4(data) {
      let darkCount = 0;
      const modulesCount = data.data.length;
      for (let i = 0; i < modulesCount; i++) darkCount += data.data[i];
      const k = Math.abs(Math.ceil(darkCount * 100 / modulesCount / 5) - 10);
      return k * PenaltyScores.N4;
    };
    function getMaskAt(maskPattern, i, j) {
      switch (maskPattern) {
        case exports2.Patterns.PATTERN000:
          return (i + j) % 2 === 0;
        case exports2.Patterns.PATTERN001:
          return i % 2 === 0;
        case exports2.Patterns.PATTERN010:
          return j % 3 === 0;
        case exports2.Patterns.PATTERN011:
          return (i + j) % 3 === 0;
        case exports2.Patterns.PATTERN100:
          return (Math.floor(i / 2) + Math.floor(j / 3)) % 2 === 0;
        case exports2.Patterns.PATTERN101:
          return i * j % 2 + i * j % 3 === 0;
        case exports2.Patterns.PATTERN110:
          return (i * j % 2 + i * j % 3) % 2 === 0;
        case exports2.Patterns.PATTERN111:
          return (i * j % 3 + (i + j) % 2) % 2 === 0;
        default:
          throw new Error("bad maskPattern:" + maskPattern);
      }
    }
    exports2.applyMask = function applyMask(pattern, data) {
      const size = data.size;
      for (let col = 0; col < size; col++) {
        for (let row = 0; row < size; row++) {
          if (data.isReserved(row, col)) continue;
          data.xor(row, col, getMaskAt(pattern, row, col));
        }
      }
    };
    exports2.getBestMask = function getBestMask(data, setupFormatFunc) {
      const numPatterns = Object.keys(exports2.Patterns).length;
      let bestPattern = 0;
      let lowerPenalty = Infinity;
      for (let p = 0; p < numPatterns; p++) {
        setupFormatFunc(p);
        exports2.applyMask(p, data);
        const penalty = exports2.getPenaltyN1(data) + exports2.getPenaltyN2(data) + exports2.getPenaltyN3(data) + exports2.getPenaltyN4(data);
        exports2.applyMask(p, data);
        if (penalty < lowerPenalty) {
          lowerPenalty = penalty;
          bestPattern = p;
        }
      }
      return bestPattern;
    };
  }
});

// node_modules/qrcode/lib/core/error-correction-code.js
var require_error_correction_code = __commonJS({
  "node_modules/qrcode/lib/core/error-correction-code.js"(exports2) {
    var ECLevel = require_error_correction_level();
    var EC_BLOCKS_TABLE = [
      // L  M  Q  H
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      2,
      2,
      1,
      2,
      2,
      4,
      1,
      2,
      4,
      4,
      2,
      4,
      4,
      4,
      2,
      4,
      6,
      5,
      2,
      4,
      6,
      6,
      2,
      5,
      8,
      8,
      4,
      5,
      8,
      8,
      4,
      5,
      8,
      11,
      4,
      8,
      10,
      11,
      4,
      9,
      12,
      16,
      4,
      9,
      16,
      16,
      6,
      10,
      12,
      18,
      6,
      10,
      17,
      16,
      6,
      11,
      16,
      19,
      6,
      13,
      18,
      21,
      7,
      14,
      21,
      25,
      8,
      16,
      20,
      25,
      8,
      17,
      23,
      25,
      9,
      17,
      23,
      34,
      9,
      18,
      25,
      30,
      10,
      20,
      27,
      32,
      12,
      21,
      29,
      35,
      12,
      23,
      34,
      37,
      12,
      25,
      34,
      40,
      13,
      26,
      35,
      42,
      14,
      28,
      38,
      45,
      15,
      29,
      40,
      48,
      16,
      31,
      43,
      51,
      17,
      33,
      45,
      54,
      18,
      35,
      48,
      57,
      19,
      37,
      51,
      60,
      19,
      38,
      53,
      63,
      20,
      40,
      56,
      66,
      21,
      43,
      59,
      70,
      22,
      45,
      62,
      74,
      24,
      47,
      65,
      77,
      25,
      49,
      68,
      81
    ];
    var EC_CODEWORDS_TABLE = [
      // L  M  Q  H
      7,
      10,
      13,
      17,
      10,
      16,
      22,
      28,
      15,
      26,
      36,
      44,
      20,
      36,
      52,
      64,
      26,
      48,
      72,
      88,
      36,
      64,
      96,
      112,
      40,
      72,
      108,
      130,
      48,
      88,
      132,
      156,
      60,
      110,
      160,
      192,
      72,
      130,
      192,
      224,
      80,
      150,
      224,
      264,
      96,
      176,
      260,
      308,
      104,
      198,
      288,
      352,
      120,
      216,
      320,
      384,
      132,
      240,
      360,
      432,
      144,
      280,
      408,
      480,
      168,
      308,
      448,
      532,
      180,
      338,
      504,
      588,
      196,
      364,
      546,
      650,
      224,
      416,
      600,
      700,
      224,
      442,
      644,
      750,
      252,
      476,
      690,
      816,
      270,
      504,
      750,
      900,
      300,
      560,
      810,
      960,
      312,
      588,
      870,
      1050,
      336,
      644,
      952,
      1110,
      360,
      700,
      1020,
      1200,
      390,
      728,
      1050,
      1260,
      420,
      784,
      1140,
      1350,
      450,
      812,
      1200,
      1440,
      480,
      868,
      1290,
      1530,
      510,
      924,
      1350,
      1620,
      540,
      980,
      1440,
      1710,
      570,
      1036,
      1530,
      1800,
      570,
      1064,
      1590,
      1890,
      600,
      1120,
      1680,
      1980,
      630,
      1204,
      1770,
      2100,
      660,
      1260,
      1860,
      2220,
      720,
      1316,
      1950,
      2310,
      750,
      1372,
      2040,
      2430
    ];
    exports2.getBlocksCount = function getBlocksCount(version, errorCorrectionLevel) {
      switch (errorCorrectionLevel) {
        case ECLevel.L:
          return EC_BLOCKS_TABLE[(version - 1) * 4 + 0];
        case ECLevel.M:
          return EC_BLOCKS_TABLE[(version - 1) * 4 + 1];
        case ECLevel.Q:
          return EC_BLOCKS_TABLE[(version - 1) * 4 + 2];
        case ECLevel.H:
          return EC_BLOCKS_TABLE[(version - 1) * 4 + 3];
        default:
          return void 0;
      }
    };
    exports2.getTotalCodewordsCount = function getTotalCodewordsCount(version, errorCorrectionLevel) {
      switch (errorCorrectionLevel) {
        case ECLevel.L:
          return EC_CODEWORDS_TABLE[(version - 1) * 4 + 0];
        case ECLevel.M:
          return EC_CODEWORDS_TABLE[(version - 1) * 4 + 1];
        case ECLevel.Q:
          return EC_CODEWORDS_TABLE[(version - 1) * 4 + 2];
        case ECLevel.H:
          return EC_CODEWORDS_TABLE[(version - 1) * 4 + 3];
        default:
          return void 0;
      }
    };
  }
});

// node_modules/qrcode/lib/core/galois-field.js
var require_galois_field = __commonJS({
  "node_modules/qrcode/lib/core/galois-field.js"(exports2) {
    var EXP_TABLE = new Uint8Array(512);
    var LOG_TABLE = new Uint8Array(256);
    (function initTables() {
      let x = 1;
      for (let i = 0; i < 255; i++) {
        EXP_TABLE[i] = x;
        LOG_TABLE[x] = i;
        x <<= 1;
        if (x & 256) {
          x ^= 285;
        }
      }
      for (let i = 255; i < 512; i++) {
        EXP_TABLE[i] = EXP_TABLE[i - 255];
      }
    })();
    exports2.log = function log(n) {
      if (n < 1) throw new Error("log(" + n + ")");
      return LOG_TABLE[n];
    };
    exports2.exp = function exp(n) {
      return EXP_TABLE[n];
    };
    exports2.mul = function mul(x, y) {
      if (x === 0 || y === 0) return 0;
      return EXP_TABLE[LOG_TABLE[x] + LOG_TABLE[y]];
    };
  }
});

// node_modules/qrcode/lib/core/polynomial.js
var require_polynomial = __commonJS({
  "node_modules/qrcode/lib/core/polynomial.js"(exports2) {
    var GF = require_galois_field();
    exports2.mul = function mul(p1, p2) {
      const coeff = new Uint8Array(p1.length + p2.length - 1);
      for (let i = 0; i < p1.length; i++) {
        for (let j = 0; j < p2.length; j++) {
          coeff[i + j] ^= GF.mul(p1[i], p2[j]);
        }
      }
      return coeff;
    };
    exports2.mod = function mod(divident, divisor) {
      let result = new Uint8Array(divident);
      while (result.length - divisor.length >= 0) {
        const coeff = result[0];
        for (let i = 0; i < divisor.length; i++) {
          result[i] ^= GF.mul(divisor[i], coeff);
        }
        let offset = 0;
        while (offset < result.length && result[offset] === 0) offset++;
        result = result.slice(offset);
      }
      return result;
    };
    exports2.generateECPolynomial = function generateECPolynomial(degree) {
      let poly = new Uint8Array([1]);
      for (let i = 0; i < degree; i++) {
        poly = exports2.mul(poly, new Uint8Array([1, GF.exp(i)]));
      }
      return poly;
    };
  }
});

// node_modules/qrcode/lib/core/reed-solomon-encoder.js
var require_reed_solomon_encoder = __commonJS({
  "node_modules/qrcode/lib/core/reed-solomon-encoder.js"(exports2, module2) {
    var Polynomial = require_polynomial();
    function ReedSolomonEncoder(degree) {
      this.genPoly = void 0;
      this.degree = degree;
      if (this.degree) this.initialize(this.degree);
    }
    ReedSolomonEncoder.prototype.initialize = function initialize(degree) {
      this.degree = degree;
      this.genPoly = Polynomial.generateECPolynomial(this.degree);
    };
    ReedSolomonEncoder.prototype.encode = function encode(data) {
      if (!this.genPoly) {
        throw new Error("Encoder not initialized");
      }
      const paddedData = new Uint8Array(data.length + this.degree);
      paddedData.set(data);
      const remainder = Polynomial.mod(paddedData, this.genPoly);
      const start = this.degree - remainder.length;
      if (start > 0) {
        const buff = new Uint8Array(this.degree);
        buff.set(remainder, start);
        return buff;
      }
      return remainder;
    };
    module2.exports = ReedSolomonEncoder;
  }
});

// node_modules/qrcode/lib/core/version-check.js
var require_version_check = __commonJS({
  "node_modules/qrcode/lib/core/version-check.js"(exports2) {
    exports2.isValid = function isValid(version) {
      return !isNaN(version) && version >= 1 && version <= 40;
    };
  }
});

// node_modules/qrcode/lib/core/regex.js
var require_regex = __commonJS({
  "node_modules/qrcode/lib/core/regex.js"(exports2) {
    var numeric = "[0-9]+";
    var alphanumeric = "[A-Z $%*+\\-./:]+";
    var kanji = "(?:[u3000-u303F]|[u3040-u309F]|[u30A0-u30FF]|[uFF00-uFFEF]|[u4E00-u9FAF]|[u2605-u2606]|[u2190-u2195]|u203B|[u2010u2015u2018u2019u2025u2026u201Cu201Du2225u2260]|[u0391-u0451]|[u00A7u00A8u00B1u00B4u00D7u00F7])+";
    kanji = kanji.replace(/u/g, "\\u");
    var byte = "(?:(?![A-Z0-9 $%*+\\-./:]|" + kanji + ")(?:.|[\r\n]))+";
    exports2.KANJI = new RegExp(kanji, "g");
    exports2.BYTE_KANJI = new RegExp("[^A-Z0-9 $%*+\\-./:]+", "g");
    exports2.BYTE = new RegExp(byte, "g");
    exports2.NUMERIC = new RegExp(numeric, "g");
    exports2.ALPHANUMERIC = new RegExp(alphanumeric, "g");
    var TEST_KANJI = new RegExp("^" + kanji + "$");
    var TEST_NUMERIC = new RegExp("^" + numeric + "$");
    var TEST_ALPHANUMERIC = new RegExp("^[A-Z0-9 $%*+\\-./:]+$");
    exports2.testKanji = function testKanji(str) {
      return TEST_KANJI.test(str);
    };
    exports2.testNumeric = function testNumeric(str) {
      return TEST_NUMERIC.test(str);
    };
    exports2.testAlphanumeric = function testAlphanumeric(str) {
      return TEST_ALPHANUMERIC.test(str);
    };
  }
});

// node_modules/qrcode/lib/core/mode.js
var require_mode = __commonJS({
  "node_modules/qrcode/lib/core/mode.js"(exports2) {
    var VersionCheck = require_version_check();
    var Regex = require_regex();
    exports2.NUMERIC = {
      id: "Numeric",
      bit: 1 << 0,
      ccBits: [10, 12, 14]
    };
    exports2.ALPHANUMERIC = {
      id: "Alphanumeric",
      bit: 1 << 1,
      ccBits: [9, 11, 13]
    };
    exports2.BYTE = {
      id: "Byte",
      bit: 1 << 2,
      ccBits: [8, 16, 16]
    };
    exports2.KANJI = {
      id: "Kanji",
      bit: 1 << 3,
      ccBits: [8, 10, 12]
    };
    exports2.MIXED = {
      bit: -1
    };
    exports2.getCharCountIndicator = function getCharCountIndicator(mode, version) {
      if (!mode.ccBits) throw new Error("Invalid mode: " + mode);
      if (!VersionCheck.isValid(version)) {
        throw new Error("Invalid version: " + version);
      }
      if (version >= 1 && version < 10) return mode.ccBits[0];
      else if (version < 27) return mode.ccBits[1];
      return mode.ccBits[2];
    };
    exports2.getBestModeForData = function getBestModeForData(dataStr) {
      if (Regex.testNumeric(dataStr)) return exports2.NUMERIC;
      else if (Regex.testAlphanumeric(dataStr)) return exports2.ALPHANUMERIC;
      else if (Regex.testKanji(dataStr)) return exports2.KANJI;
      else return exports2.BYTE;
    };
    exports2.toString = function toString(mode) {
      if (mode && mode.id) return mode.id;
      throw new Error("Invalid mode");
    };
    exports2.isValid = function isValid(mode) {
      return mode && mode.bit && mode.ccBits;
    };
    function fromString(string) {
      if (typeof string !== "string") {
        throw new Error("Param is not a string");
      }
      const lcStr = string.toLowerCase();
      switch (lcStr) {
        case "numeric":
          return exports2.NUMERIC;
        case "alphanumeric":
          return exports2.ALPHANUMERIC;
        case "kanji":
          return exports2.KANJI;
        case "byte":
          return exports2.BYTE;
        default:
          throw new Error("Unknown mode: " + string);
      }
    }
    exports2.from = function from(value, defaultValue) {
      if (exports2.isValid(value)) {
        return value;
      }
      try {
        return fromString(value);
      } catch (e) {
        return defaultValue;
      }
    };
  }
});

// node_modules/qrcode/lib/core/version.js
var require_version = __commonJS({
  "node_modules/qrcode/lib/core/version.js"(exports2) {
    var Utils = require_utils();
    var ECCode = require_error_correction_code();
    var ECLevel = require_error_correction_level();
    var Mode = require_mode();
    var VersionCheck = require_version_check();
    var G18 = 1 << 12 | 1 << 11 | 1 << 10 | 1 << 9 | 1 << 8 | 1 << 5 | 1 << 2 | 1 << 0;
    var G18_BCH = Utils.getBCHDigit(G18);
    function getBestVersionForDataLength(mode, length, errorCorrectionLevel) {
      for (let currentVersion = 1; currentVersion <= 40; currentVersion++) {
        if (length <= exports2.getCapacity(currentVersion, errorCorrectionLevel, mode)) {
          return currentVersion;
        }
      }
      return void 0;
    }
    function getReservedBitsCount(mode, version) {
      return Mode.getCharCountIndicator(mode, version) + 4;
    }
    function getTotalBitsFromDataArray(segments, version) {
      let totalBits = 0;
      segments.forEach(function(data) {
        const reservedBits = getReservedBitsCount(data.mode, version);
        totalBits += reservedBits + data.getBitsLength();
      });
      return totalBits;
    }
    function getBestVersionForMixedData(segments, errorCorrectionLevel) {
      for (let currentVersion = 1; currentVersion <= 40; currentVersion++) {
        const length = getTotalBitsFromDataArray(segments, currentVersion);
        if (length <= exports2.getCapacity(currentVersion, errorCorrectionLevel, Mode.MIXED)) {
          return currentVersion;
        }
      }
      return void 0;
    }
    exports2.from = function from(value, defaultValue) {
      if (VersionCheck.isValid(value)) {
        return parseInt(value, 10);
      }
      return defaultValue;
    };
    exports2.getCapacity = function getCapacity(version, errorCorrectionLevel, mode) {
      if (!VersionCheck.isValid(version)) {
        throw new Error("Invalid QR Code version");
      }
      if (typeof mode === "undefined") mode = Mode.BYTE;
      const totalCodewords = Utils.getSymbolTotalCodewords(version);
      const ecTotalCodewords = ECCode.getTotalCodewordsCount(version, errorCorrectionLevel);
      const dataTotalCodewordsBits = (totalCodewords - ecTotalCodewords) * 8;
      if (mode === Mode.MIXED) return dataTotalCodewordsBits;
      const usableBits = dataTotalCodewordsBits - getReservedBitsCount(mode, version);
      switch (mode) {
        case Mode.NUMERIC:
          return Math.floor(usableBits / 10 * 3);
        case Mode.ALPHANUMERIC:
          return Math.floor(usableBits / 11 * 2);
        case Mode.KANJI:
          return Math.floor(usableBits / 13);
        case Mode.BYTE:
        default:
          return Math.floor(usableBits / 8);
      }
    };
    exports2.getBestVersionForData = function getBestVersionForData(data, errorCorrectionLevel) {
      let seg;
      const ecl = ECLevel.from(errorCorrectionLevel, ECLevel.M);
      if (Array.isArray(data)) {
        if (data.length > 1) {
          return getBestVersionForMixedData(data, ecl);
        }
        if (data.length === 0) {
          return 1;
        }
        seg = data[0];
      } else {
        seg = data;
      }
      return getBestVersionForDataLength(seg.mode, seg.getLength(), ecl);
    };
    exports2.getEncodedBits = function getEncodedBits(version) {
      if (!VersionCheck.isValid(version) || version < 7) {
        throw new Error("Invalid QR Code version");
      }
      let d = version << 12;
      while (Utils.getBCHDigit(d) - G18_BCH >= 0) {
        d ^= G18 << Utils.getBCHDigit(d) - G18_BCH;
      }
      return version << 12 | d;
    };
  }
});

// node_modules/qrcode/lib/core/format-info.js
var require_format_info = __commonJS({
  "node_modules/qrcode/lib/core/format-info.js"(exports2) {
    var Utils = require_utils();
    var G15 = 1 << 10 | 1 << 8 | 1 << 5 | 1 << 4 | 1 << 2 | 1 << 1 | 1 << 0;
    var G15_MASK = 1 << 14 | 1 << 12 | 1 << 10 | 1 << 4 | 1 << 1;
    var G15_BCH = Utils.getBCHDigit(G15);
    exports2.getEncodedBits = function getEncodedBits(errorCorrectionLevel, mask) {
      const data = errorCorrectionLevel.bit << 3 | mask;
      let d = data << 10;
      while (Utils.getBCHDigit(d) - G15_BCH >= 0) {
        d ^= G15 << Utils.getBCHDigit(d) - G15_BCH;
      }
      return (data << 10 | d) ^ G15_MASK;
    };
  }
});

// node_modules/qrcode/lib/core/numeric-data.js
var require_numeric_data = __commonJS({
  "node_modules/qrcode/lib/core/numeric-data.js"(exports2, module2) {
    var Mode = require_mode();
    function NumericData(data) {
      this.mode = Mode.NUMERIC;
      this.data = data.toString();
    }
    NumericData.getBitsLength = function getBitsLength(length) {
      return 10 * Math.floor(length / 3) + (length % 3 ? length % 3 * 3 + 1 : 0);
    };
    NumericData.prototype.getLength = function getLength() {
      return this.data.length;
    };
    NumericData.prototype.getBitsLength = function getBitsLength() {
      return NumericData.getBitsLength(this.data.length);
    };
    NumericData.prototype.write = function write(bitBuffer) {
      let i, group, value;
      for (i = 0; i + 3 <= this.data.length; i += 3) {
        group = this.data.substr(i, 3);
        value = parseInt(group, 10);
        bitBuffer.put(value, 10);
      }
      const remainingNum = this.data.length - i;
      if (remainingNum > 0) {
        group = this.data.substr(i);
        value = parseInt(group, 10);
        bitBuffer.put(value, remainingNum * 3 + 1);
      }
    };
    module2.exports = NumericData;
  }
});

// node_modules/qrcode/lib/core/alphanumeric-data.js
var require_alphanumeric_data = __commonJS({
  "node_modules/qrcode/lib/core/alphanumeric-data.js"(exports2, module2) {
    var Mode = require_mode();
    var ALPHA_NUM_CHARS = [
      "0",
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
      "9",
      "A",
      "B",
      "C",
      "D",
      "E",
      "F",
      "G",
      "H",
      "I",
      "J",
      "K",
      "L",
      "M",
      "N",
      "O",
      "P",
      "Q",
      "R",
      "S",
      "T",
      "U",
      "V",
      "W",
      "X",
      "Y",
      "Z",
      " ",
      "$",
      "%",
      "*",
      "+",
      "-",
      ".",
      "/",
      ":"
    ];
    function AlphanumericData(data) {
      this.mode = Mode.ALPHANUMERIC;
      this.data = data;
    }
    AlphanumericData.getBitsLength = function getBitsLength(length) {
      return 11 * Math.floor(length / 2) + 6 * (length % 2);
    };
    AlphanumericData.prototype.getLength = function getLength() {
      return this.data.length;
    };
    AlphanumericData.prototype.getBitsLength = function getBitsLength() {
      return AlphanumericData.getBitsLength(this.data.length);
    };
    AlphanumericData.prototype.write = function write(bitBuffer) {
      let i;
      for (i = 0; i + 2 <= this.data.length; i += 2) {
        let value = ALPHA_NUM_CHARS.indexOf(this.data[i]) * 45;
        value += ALPHA_NUM_CHARS.indexOf(this.data[i + 1]);
        bitBuffer.put(value, 11);
      }
      if (this.data.length % 2) {
        bitBuffer.put(ALPHA_NUM_CHARS.indexOf(this.data[i]), 6);
      }
    };
    module2.exports = AlphanumericData;
  }
});

// node_modules/qrcode/lib/core/byte-data.js
var require_byte_data = __commonJS({
  "node_modules/qrcode/lib/core/byte-data.js"(exports2, module2) {
    var Mode = require_mode();
    function ByteData(data) {
      this.mode = Mode.BYTE;
      if (typeof data === "string") {
        this.data = new TextEncoder().encode(data);
      } else {
        this.data = new Uint8Array(data);
      }
    }
    ByteData.getBitsLength = function getBitsLength(length) {
      return length * 8;
    };
    ByteData.prototype.getLength = function getLength() {
      return this.data.length;
    };
    ByteData.prototype.getBitsLength = function getBitsLength() {
      return ByteData.getBitsLength(this.data.length);
    };
    ByteData.prototype.write = function(bitBuffer) {
      for (let i = 0, l = this.data.length; i < l; i++) {
        bitBuffer.put(this.data[i], 8);
      }
    };
    module2.exports = ByteData;
  }
});

// node_modules/qrcode/lib/core/kanji-data.js
var require_kanji_data = __commonJS({
  "node_modules/qrcode/lib/core/kanji-data.js"(exports2, module2) {
    var Mode = require_mode();
    var Utils = require_utils();
    function KanjiData(data) {
      this.mode = Mode.KANJI;
      this.data = data;
    }
    KanjiData.getBitsLength = function getBitsLength(length) {
      return length * 13;
    };
    KanjiData.prototype.getLength = function getLength() {
      return this.data.length;
    };
    KanjiData.prototype.getBitsLength = function getBitsLength() {
      return KanjiData.getBitsLength(this.data.length);
    };
    KanjiData.prototype.write = function(bitBuffer) {
      let i;
      for (i = 0; i < this.data.length; i++) {
        let value = Utils.toSJIS(this.data[i]);
        if (value >= 33088 && value <= 40956) {
          value -= 33088;
        } else if (value >= 57408 && value <= 60351) {
          value -= 49472;
        } else {
          throw new Error(
            "Invalid SJIS character: " + this.data[i] + "\nMake sure your charset is UTF-8"
          );
        }
        value = (value >>> 8 & 255) * 192 + (value & 255);
        bitBuffer.put(value, 13);
      }
    };
    module2.exports = KanjiData;
  }
});

// node_modules/dijkstrajs/dijkstra.js
var require_dijkstra = __commonJS({
  "node_modules/dijkstrajs/dijkstra.js"(exports2, module2) {
    "use strict";
    var dijkstra = {
      single_source_shortest_paths: function(graph, s, d) {
        var predecessors = {};
        var costs = {};
        costs[s] = 0;
        var open = dijkstra.PriorityQueue.make();
        open.push(s, 0);
        var closest, u, v, cost_of_s_to_u, adjacent_nodes, cost_of_e, cost_of_s_to_u_plus_cost_of_e, cost_of_s_to_v, first_visit;
        while (!open.empty()) {
          closest = open.pop();
          u = closest.value;
          cost_of_s_to_u = closest.cost;
          adjacent_nodes = graph[u] || {};
          for (v in adjacent_nodes) {
            if (adjacent_nodes.hasOwnProperty(v)) {
              cost_of_e = adjacent_nodes[v];
              cost_of_s_to_u_plus_cost_of_e = cost_of_s_to_u + cost_of_e;
              cost_of_s_to_v = costs[v];
              first_visit = typeof costs[v] === "undefined";
              if (first_visit || cost_of_s_to_v > cost_of_s_to_u_plus_cost_of_e) {
                costs[v] = cost_of_s_to_u_plus_cost_of_e;
                open.push(v, cost_of_s_to_u_plus_cost_of_e);
                predecessors[v] = u;
              }
            }
          }
        }
        if (typeof d !== "undefined" && typeof costs[d] === "undefined") {
          var msg = ["Could not find a path from ", s, " to ", d, "."].join("");
          throw new Error(msg);
        }
        return predecessors;
      },
      extract_shortest_path_from_predecessor_list: function(predecessors, d) {
        var nodes = [];
        var u = d;
        var predecessor;
        while (u) {
          nodes.push(u);
          predecessor = predecessors[u];
          u = predecessors[u];
        }
        nodes.reverse();
        return nodes;
      },
      find_path: function(graph, s, d) {
        var predecessors = dijkstra.single_source_shortest_paths(graph, s, d);
        return dijkstra.extract_shortest_path_from_predecessor_list(
          predecessors,
          d
        );
      },
      /**
       * A very naive priority queue implementation.
       */
      PriorityQueue: {
        make: function(opts) {
          var T = dijkstra.PriorityQueue, t = {}, key;
          opts = opts || {};
          for (key in T) {
            if (T.hasOwnProperty(key)) {
              t[key] = T[key];
            }
          }
          t.queue = [];
          t.sorter = opts.sorter || T.default_sorter;
          return t;
        },
        default_sorter: function(a, b) {
          return a.cost - b.cost;
        },
        /**
         * Add a new item to the queue and ensure the highest priority element
         * is at the front of the queue.
         */
        push: function(value, cost) {
          var item = { value, cost };
          this.queue.push(item);
          this.queue.sort(this.sorter);
        },
        /**
         * Return the highest priority element in the queue.
         */
        pop: function() {
          return this.queue.shift();
        },
        empty: function() {
          return this.queue.length === 0;
        }
      }
    };
    if (typeof module2 !== "undefined") {
      module2.exports = dijkstra;
    }
  }
});

// node_modules/qrcode/lib/core/segments.js
var require_segments = __commonJS({
  "node_modules/qrcode/lib/core/segments.js"(exports2) {
    var Mode = require_mode();
    var NumericData = require_numeric_data();
    var AlphanumericData = require_alphanumeric_data();
    var ByteData = require_byte_data();
    var KanjiData = require_kanji_data();
    var Regex = require_regex();
    var Utils = require_utils();
    var dijkstra = require_dijkstra();
    function getStringByteLength(str) {
      return unescape(encodeURIComponent(str)).length;
    }
    function getSegments(regex, mode, str) {
      const segments = [];
      let result;
      while ((result = regex.exec(str)) !== null) {
        segments.push({
          data: result[0],
          index: result.index,
          mode,
          length: result[0].length
        });
      }
      return segments;
    }
    function getSegmentsFromString(dataStr) {
      const numSegs = getSegments(Regex.NUMERIC, Mode.NUMERIC, dataStr);
      const alphaNumSegs = getSegments(Regex.ALPHANUMERIC, Mode.ALPHANUMERIC, dataStr);
      let byteSegs;
      let kanjiSegs;
      if (Utils.isKanjiModeEnabled()) {
        byteSegs = getSegments(Regex.BYTE, Mode.BYTE, dataStr);
        kanjiSegs = getSegments(Regex.KANJI, Mode.KANJI, dataStr);
      } else {
        byteSegs = getSegments(Regex.BYTE_KANJI, Mode.BYTE, dataStr);
        kanjiSegs = [];
      }
      const segs = numSegs.concat(alphaNumSegs, byteSegs, kanjiSegs);
      return segs.sort(function(s1, s2) {
        return s1.index - s2.index;
      }).map(function(obj) {
        return {
          data: obj.data,
          mode: obj.mode,
          length: obj.length
        };
      });
    }
    function getSegmentBitsLength(length, mode) {
      switch (mode) {
        case Mode.NUMERIC:
          return NumericData.getBitsLength(length);
        case Mode.ALPHANUMERIC:
          return AlphanumericData.getBitsLength(length);
        case Mode.KANJI:
          return KanjiData.getBitsLength(length);
        case Mode.BYTE:
          return ByteData.getBitsLength(length);
      }
    }
    function mergeSegments(segs) {
      return segs.reduce(function(acc, curr) {
        const prevSeg = acc.length - 1 >= 0 ? acc[acc.length - 1] : null;
        if (prevSeg && prevSeg.mode === curr.mode) {
          acc[acc.length - 1].data += curr.data;
          return acc;
        }
        acc.push(curr);
        return acc;
      }, []);
    }
    function buildNodes(segs) {
      const nodes = [];
      for (let i = 0; i < segs.length; i++) {
        const seg = segs[i];
        switch (seg.mode) {
          case Mode.NUMERIC:
            nodes.push([
              seg,
              { data: seg.data, mode: Mode.ALPHANUMERIC, length: seg.length },
              { data: seg.data, mode: Mode.BYTE, length: seg.length }
            ]);
            break;
          case Mode.ALPHANUMERIC:
            nodes.push([
              seg,
              { data: seg.data, mode: Mode.BYTE, length: seg.length }
            ]);
            break;
          case Mode.KANJI:
            nodes.push([
              seg,
              { data: seg.data, mode: Mode.BYTE, length: getStringByteLength(seg.data) }
            ]);
            break;
          case Mode.BYTE:
            nodes.push([
              { data: seg.data, mode: Mode.BYTE, length: getStringByteLength(seg.data) }
            ]);
        }
      }
      return nodes;
    }
    function buildGraph(nodes, version) {
      const table = {};
      const graph = { start: {} };
      let prevNodeIds = ["start"];
      for (let i = 0; i < nodes.length; i++) {
        const nodeGroup = nodes[i];
        const currentNodeIds = [];
        for (let j = 0; j < nodeGroup.length; j++) {
          const node = nodeGroup[j];
          const key = "" + i + j;
          currentNodeIds.push(key);
          table[key] = { node, lastCount: 0 };
          graph[key] = {};
          for (let n = 0; n < prevNodeIds.length; n++) {
            const prevNodeId = prevNodeIds[n];
            if (table[prevNodeId] && table[prevNodeId].node.mode === node.mode) {
              graph[prevNodeId][key] = getSegmentBitsLength(table[prevNodeId].lastCount + node.length, node.mode) - getSegmentBitsLength(table[prevNodeId].lastCount, node.mode);
              table[prevNodeId].lastCount += node.length;
            } else {
              if (table[prevNodeId]) table[prevNodeId].lastCount = node.length;
              graph[prevNodeId][key] = getSegmentBitsLength(node.length, node.mode) + 4 + Mode.getCharCountIndicator(node.mode, version);
            }
          }
        }
        prevNodeIds = currentNodeIds;
      }
      for (let n = 0; n < prevNodeIds.length; n++) {
        graph[prevNodeIds[n]].end = 0;
      }
      return { map: graph, table };
    }
    function buildSingleSegment(data, modesHint) {
      let mode;
      const bestMode = Mode.getBestModeForData(data);
      mode = Mode.from(modesHint, bestMode);
      if (mode !== Mode.BYTE && mode.bit < bestMode.bit) {
        throw new Error('"' + data + '" cannot be encoded with mode ' + Mode.toString(mode) + ".\n Suggested mode is: " + Mode.toString(bestMode));
      }
      if (mode === Mode.KANJI && !Utils.isKanjiModeEnabled()) {
        mode = Mode.BYTE;
      }
      switch (mode) {
        case Mode.NUMERIC:
          return new NumericData(data);
        case Mode.ALPHANUMERIC:
          return new AlphanumericData(data);
        case Mode.KANJI:
          return new KanjiData(data);
        case Mode.BYTE:
          return new ByteData(data);
      }
    }
    exports2.fromArray = function fromArray(array) {
      return array.reduce(function(acc, seg) {
        if (typeof seg === "string") {
          acc.push(buildSingleSegment(seg, null));
        } else if (seg.data) {
          acc.push(buildSingleSegment(seg.data, seg.mode));
        }
        return acc;
      }, []);
    };
    exports2.fromString = function fromString(data, version) {
      const segs = getSegmentsFromString(data, Utils.isKanjiModeEnabled());
      const nodes = buildNodes(segs);
      const graph = buildGraph(nodes, version);
      const path = dijkstra.find_path(graph.map, "start", "end");
      const optimizedSegs = [];
      for (let i = 1; i < path.length - 1; i++) {
        optimizedSegs.push(graph.table[path[i]].node);
      }
      return exports2.fromArray(mergeSegments(optimizedSegs));
    };
    exports2.rawSplit = function rawSplit(data) {
      return exports2.fromArray(
        getSegmentsFromString(data, Utils.isKanjiModeEnabled())
      );
    };
  }
});

// node_modules/qrcode/lib/core/qrcode.js
var require_qrcode = __commonJS({
  "node_modules/qrcode/lib/core/qrcode.js"(exports2) {
    var Utils = require_utils();
    var ECLevel = require_error_correction_level();
    var BitBuffer = require_bit_buffer();
    var BitMatrix = require_bit_matrix();
    var AlignmentPattern = require_alignment_pattern();
    var FinderPattern = require_finder_pattern();
    var MaskPattern = require_mask_pattern();
    var ECCode = require_error_correction_code();
    var ReedSolomonEncoder = require_reed_solomon_encoder();
    var Version = require_version();
    var FormatInfo = require_format_info();
    var Mode = require_mode();
    var Segments = require_segments();
    function setupFinderPattern(matrix, version) {
      const size = matrix.size;
      const pos = FinderPattern.getPositions(version);
      for (let i = 0; i < pos.length; i++) {
        const row = pos[i][0];
        const col = pos[i][1];
        for (let r = -1; r <= 7; r++) {
          if (row + r <= -1 || size <= row + r) continue;
          for (let c = -1; c <= 7; c++) {
            if (col + c <= -1 || size <= col + c) continue;
            if (r >= 0 && r <= 6 && (c === 0 || c === 6) || c >= 0 && c <= 6 && (r === 0 || r === 6) || r >= 2 && r <= 4 && c >= 2 && c <= 4) {
              matrix.set(row + r, col + c, true, true);
            } else {
              matrix.set(row + r, col + c, false, true);
            }
          }
        }
      }
    }
    function setupTimingPattern(matrix) {
      const size = matrix.size;
      for (let r = 8; r < size - 8; r++) {
        const value = r % 2 === 0;
        matrix.set(r, 6, value, true);
        matrix.set(6, r, value, true);
      }
    }
    function setupAlignmentPattern(matrix, version) {
      const pos = AlignmentPattern.getPositions(version);
      for (let i = 0; i < pos.length; i++) {
        const row = pos[i][0];
        const col = pos[i][1];
        for (let r = -2; r <= 2; r++) {
          for (let c = -2; c <= 2; c++) {
            if (r === -2 || r === 2 || c === -2 || c === 2 || r === 0 && c === 0) {
              matrix.set(row + r, col + c, true, true);
            } else {
              matrix.set(row + r, col + c, false, true);
            }
          }
        }
      }
    }
    function setupVersionInfo(matrix, version) {
      const size = matrix.size;
      const bits = Version.getEncodedBits(version);
      let row, col, mod;
      for (let i = 0; i < 18; i++) {
        row = Math.floor(i / 3);
        col = i % 3 + size - 8 - 3;
        mod = (bits >> i & 1) === 1;
        matrix.set(row, col, mod, true);
        matrix.set(col, row, mod, true);
      }
    }
    function setupFormatInfo(matrix, errorCorrectionLevel, maskPattern) {
      const size = matrix.size;
      const bits = FormatInfo.getEncodedBits(errorCorrectionLevel, maskPattern);
      let i, mod;
      for (i = 0; i < 15; i++) {
        mod = (bits >> i & 1) === 1;
        if (i < 6) {
          matrix.set(i, 8, mod, true);
        } else if (i < 8) {
          matrix.set(i + 1, 8, mod, true);
        } else {
          matrix.set(size - 15 + i, 8, mod, true);
        }
        if (i < 8) {
          matrix.set(8, size - i - 1, mod, true);
        } else if (i < 9) {
          matrix.set(8, 15 - i - 1 + 1, mod, true);
        } else {
          matrix.set(8, 15 - i - 1, mod, true);
        }
      }
      matrix.set(size - 8, 8, 1, true);
    }
    function setupData(matrix, data) {
      const size = matrix.size;
      let inc = -1;
      let row = size - 1;
      let bitIndex = 7;
      let byteIndex = 0;
      for (let col = size - 1; col > 0; col -= 2) {
        if (col === 6) col--;
        while (true) {
          for (let c = 0; c < 2; c++) {
            if (!matrix.isReserved(row, col - c)) {
              let dark = false;
              if (byteIndex < data.length) {
                dark = (data[byteIndex] >>> bitIndex & 1) === 1;
              }
              matrix.set(row, col - c, dark);
              bitIndex--;
              if (bitIndex === -1) {
                byteIndex++;
                bitIndex = 7;
              }
            }
          }
          row += inc;
          if (row < 0 || size <= row) {
            row -= inc;
            inc = -inc;
            break;
          }
        }
      }
    }
    function createData(version, errorCorrectionLevel, segments) {
      const buffer = new BitBuffer();
      segments.forEach(function(data) {
        buffer.put(data.mode.bit, 4);
        buffer.put(data.getLength(), Mode.getCharCountIndicator(data.mode, version));
        data.write(buffer);
      });
      const totalCodewords = Utils.getSymbolTotalCodewords(version);
      const ecTotalCodewords = ECCode.getTotalCodewordsCount(version, errorCorrectionLevel);
      const dataTotalCodewordsBits = (totalCodewords - ecTotalCodewords) * 8;
      if (buffer.getLengthInBits() + 4 <= dataTotalCodewordsBits) {
        buffer.put(0, 4);
      }
      while (buffer.getLengthInBits() % 8 !== 0) {
        buffer.putBit(0);
      }
      const remainingByte = (dataTotalCodewordsBits - buffer.getLengthInBits()) / 8;
      for (let i = 0; i < remainingByte; i++) {
        buffer.put(i % 2 ? 17 : 236, 8);
      }
      return createCodewords(buffer, version, errorCorrectionLevel);
    }
    function createCodewords(bitBuffer, version, errorCorrectionLevel) {
      const totalCodewords = Utils.getSymbolTotalCodewords(version);
      const ecTotalCodewords = ECCode.getTotalCodewordsCount(version, errorCorrectionLevel);
      const dataTotalCodewords = totalCodewords - ecTotalCodewords;
      const ecTotalBlocks = ECCode.getBlocksCount(version, errorCorrectionLevel);
      const blocksInGroup2 = totalCodewords % ecTotalBlocks;
      const blocksInGroup1 = ecTotalBlocks - blocksInGroup2;
      const totalCodewordsInGroup1 = Math.floor(totalCodewords / ecTotalBlocks);
      const dataCodewordsInGroup1 = Math.floor(dataTotalCodewords / ecTotalBlocks);
      const dataCodewordsInGroup2 = dataCodewordsInGroup1 + 1;
      const ecCount = totalCodewordsInGroup1 - dataCodewordsInGroup1;
      const rs = new ReedSolomonEncoder(ecCount);
      let offset = 0;
      const dcData = new Array(ecTotalBlocks);
      const ecData = new Array(ecTotalBlocks);
      let maxDataSize = 0;
      const buffer = new Uint8Array(bitBuffer.buffer);
      for (let b = 0; b < ecTotalBlocks; b++) {
        const dataSize = b < blocksInGroup1 ? dataCodewordsInGroup1 : dataCodewordsInGroup2;
        dcData[b] = buffer.slice(offset, offset + dataSize);
        ecData[b] = rs.encode(dcData[b]);
        offset += dataSize;
        maxDataSize = Math.max(maxDataSize, dataSize);
      }
      const data = new Uint8Array(totalCodewords);
      let index = 0;
      let i, r;
      for (i = 0; i < maxDataSize; i++) {
        for (r = 0; r < ecTotalBlocks; r++) {
          if (i < dcData[r].length) {
            data[index++] = dcData[r][i];
          }
        }
      }
      for (i = 0; i < ecCount; i++) {
        for (r = 0; r < ecTotalBlocks; r++) {
          data[index++] = ecData[r][i];
        }
      }
      return data;
    }
    function createSymbol(data, version, errorCorrectionLevel, maskPattern) {
      let segments;
      if (Array.isArray(data)) {
        segments = Segments.fromArray(data);
      } else if (typeof data === "string") {
        let estimatedVersion = version;
        if (!estimatedVersion) {
          const rawSegments = Segments.rawSplit(data);
          estimatedVersion = Version.getBestVersionForData(rawSegments, errorCorrectionLevel);
        }
        segments = Segments.fromString(data, estimatedVersion || 40);
      } else {
        throw new Error("Invalid data");
      }
      const bestVersion = Version.getBestVersionForData(segments, errorCorrectionLevel);
      if (!bestVersion) {
        throw new Error("The amount of data is too big to be stored in a QR Code");
      }
      if (!version) {
        version = bestVersion;
      } else if (version < bestVersion) {
        throw new Error(
          "\nThe chosen QR Code version cannot contain this amount of data.\nMinimum version required to store current data is: " + bestVersion + ".\n"
        );
      }
      const dataBits = createData(version, errorCorrectionLevel, segments);
      const moduleCount = Utils.getSymbolSize(version);
      const modules = new BitMatrix(moduleCount);
      setupFinderPattern(modules, version);
      setupTimingPattern(modules);
      setupAlignmentPattern(modules, version);
      setupFormatInfo(modules, errorCorrectionLevel, 0);
      if (version >= 7) {
        setupVersionInfo(modules, version);
      }
      setupData(modules, dataBits);
      if (isNaN(maskPattern)) {
        maskPattern = MaskPattern.getBestMask(
          modules,
          setupFormatInfo.bind(null, modules, errorCorrectionLevel)
        );
      }
      MaskPattern.applyMask(maskPattern, modules);
      setupFormatInfo(modules, errorCorrectionLevel, maskPattern);
      return {
        modules,
        version,
        errorCorrectionLevel,
        maskPattern,
        segments
      };
    }
    exports2.create = function create(data, options) {
      if (typeof data === "undefined" || data === "") {
        throw new Error("No input text");
      }
      let errorCorrectionLevel = ECLevel.M;
      let version;
      let mask;
      if (typeof options !== "undefined") {
        errorCorrectionLevel = ECLevel.from(options.errorCorrectionLevel, ECLevel.M);
        version = Version.from(options.version);
        mask = MaskPattern.from(options.maskPattern);
        if (options.toSJISFunc) {
          Utils.setToSJISFunction(options.toSJISFunc);
        }
      }
      return createSymbol(data, version, errorCorrectionLevel, mask);
    };
  }
});

// node_modules/qrcode/lib/renderer/utils.js
var require_utils2 = __commonJS({
  "node_modules/qrcode/lib/renderer/utils.js"(exports2) {
    function hex2rgba(hex) {
      if (typeof hex === "number") {
        hex = hex.toString();
      }
      if (typeof hex !== "string") {
        throw new Error("Color should be defined as hex string");
      }
      let hexCode = hex.slice().replace("#", "").split("");
      if (hexCode.length < 3 || hexCode.length === 5 || hexCode.length > 8) {
        throw new Error("Invalid hex color: " + hex);
      }
      if (hexCode.length === 3 || hexCode.length === 4) {
        hexCode = Array.prototype.concat.apply([], hexCode.map(function(c) {
          return [c, c];
        }));
      }
      if (hexCode.length === 6) hexCode.push("F", "F");
      const hexValue = parseInt(hexCode.join(""), 16);
      return {
        r: hexValue >> 24 & 255,
        g: hexValue >> 16 & 255,
        b: hexValue >> 8 & 255,
        a: hexValue & 255,
        hex: "#" + hexCode.slice(0, 6).join("")
      };
    }
    exports2.getOptions = function getOptions(options) {
      if (!options) options = {};
      if (!options.color) options.color = {};
      const margin = typeof options.margin === "undefined" || options.margin === null || options.margin < 0 ? 4 : options.margin;
      const width = options.width && options.width >= 21 ? options.width : void 0;
      const scale = options.scale || 4;
      return {
        width,
        scale: width ? 4 : scale,
        margin,
        color: {
          dark: hex2rgba(options.color.dark || "#000000ff"),
          light: hex2rgba(options.color.light || "#ffffffff")
        },
        type: options.type,
        rendererOpts: options.rendererOpts || {}
      };
    };
    exports2.getScale = function getScale(qrSize, opts) {
      return opts.width && opts.width >= qrSize + opts.margin * 2 ? opts.width / (qrSize + opts.margin * 2) : opts.scale;
    };
    exports2.getImageWidth = function getImageWidth(qrSize, opts) {
      const scale = exports2.getScale(qrSize, opts);
      return Math.floor((qrSize + opts.margin * 2) * scale);
    };
    exports2.qrToImageData = function qrToImageData(imgData, qr, opts) {
      const size = qr.modules.size;
      const data = qr.modules.data;
      const scale = exports2.getScale(size, opts);
      const symbolSize = Math.floor((size + opts.margin * 2) * scale);
      const scaledMargin = opts.margin * scale;
      const palette = [opts.color.light, opts.color.dark];
      for (let i = 0; i < symbolSize; i++) {
        for (let j = 0; j < symbolSize; j++) {
          let posDst = (i * symbolSize + j) * 4;
          let pxColor = opts.color.light;
          if (i >= scaledMargin && j >= scaledMargin && i < symbolSize - scaledMargin && j < symbolSize - scaledMargin) {
            const iSrc = Math.floor((i - scaledMargin) / scale);
            const jSrc = Math.floor((j - scaledMargin) / scale);
            pxColor = palette[data[iSrc * size + jSrc] ? 1 : 0];
          }
          imgData[posDst++] = pxColor.r;
          imgData[posDst++] = pxColor.g;
          imgData[posDst++] = pxColor.b;
          imgData[posDst] = pxColor.a;
        }
      }
    };
  }
});

// node_modules/qrcode/lib/renderer/canvas.js
var require_canvas = __commonJS({
  "node_modules/qrcode/lib/renderer/canvas.js"(exports2) {
    var Utils = require_utils2();
    function clearCanvas(ctx, canvas, size) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (!canvas.style) canvas.style = {};
      canvas.height = size;
      canvas.width = size;
      canvas.style.height = size + "px";
      canvas.style.width = size + "px";
    }
    function getCanvasElement() {
      try {
        return document.createElement("canvas");
      } catch (e) {
        throw new Error("You need to specify a canvas element");
      }
    }
    exports2.render = function render(qrData, canvas, options) {
      let opts = options;
      let canvasEl = canvas;
      if (typeof opts === "undefined" && (!canvas || !canvas.getContext)) {
        opts = canvas;
        canvas = void 0;
      }
      if (!canvas) {
        canvasEl = getCanvasElement();
      }
      opts = Utils.getOptions(opts);
      const size = Utils.getImageWidth(qrData.modules.size, opts);
      const ctx = canvasEl.getContext("2d");
      const image = ctx.createImageData(size, size);
      Utils.qrToImageData(image.data, qrData, opts);
      clearCanvas(ctx, canvasEl, size);
      ctx.putImageData(image, 0, 0);
      return canvasEl;
    };
    exports2.renderToDataURL = function renderToDataURL(qrData, canvas, options) {
      let opts = options;
      if (typeof opts === "undefined" && (!canvas || !canvas.getContext)) {
        opts = canvas;
        canvas = void 0;
      }
      if (!opts) opts = {};
      const canvasEl = exports2.render(qrData, canvas, opts);
      const type = opts.type || "image/png";
      const rendererOpts = opts.rendererOpts || {};
      return canvasEl.toDataURL(type, rendererOpts.quality);
    };
  }
});

// node_modules/qrcode/lib/renderer/svg-tag.js
var require_svg_tag = __commonJS({
  "node_modules/qrcode/lib/renderer/svg-tag.js"(exports2) {
    var Utils = require_utils2();
    function getColorAttrib(color, attrib) {
      const alpha = color.a / 255;
      const str = attrib + '="' + color.hex + '"';
      return alpha < 1 ? str + " " + attrib + '-opacity="' + alpha.toFixed(2).slice(1) + '"' : str;
    }
    function svgCmd(cmd, x, y) {
      let str = cmd + x;
      if (typeof y !== "undefined") str += " " + y;
      return str;
    }
    function qrToPath(data, size, margin) {
      let path = "";
      let moveBy = 0;
      let newRow = false;
      let lineLength = 0;
      for (let i = 0; i < data.length; i++) {
        const col = Math.floor(i % size);
        const row = Math.floor(i / size);
        if (!col && !newRow) newRow = true;
        if (data[i]) {
          lineLength++;
          if (!(i > 0 && col > 0 && data[i - 1])) {
            path += newRow ? svgCmd("M", col + margin, 0.5 + row + margin) : svgCmd("m", moveBy, 0);
            moveBy = 0;
            newRow = false;
          }
          if (!(col + 1 < size && data[i + 1])) {
            path += svgCmd("h", lineLength);
            lineLength = 0;
          }
        } else {
          moveBy++;
        }
      }
      return path;
    }
    exports2.render = function render(qrData, options, cb) {
      const opts = Utils.getOptions(options);
      const size = qrData.modules.size;
      const data = qrData.modules.data;
      const qrcodesize = size + opts.margin * 2;
      const bg = !opts.color.light.a ? "" : "<path " + getColorAttrib(opts.color.light, "fill") + ' d="M0 0h' + qrcodesize + "v" + qrcodesize + 'H0z"/>';
      const path = "<path " + getColorAttrib(opts.color.dark, "stroke") + ' d="' + qrToPath(data, size, opts.margin) + '"/>';
      const viewBox = 'viewBox="0 0 ' + qrcodesize + " " + qrcodesize + '"';
      const width = !opts.width ? "" : 'width="' + opts.width + '" height="' + opts.width + '" ';
      const svgTag = '<svg xmlns="http://www.w3.org/2000/svg" ' + width + viewBox + ' shape-rendering="crispEdges">' + bg + path + "</svg>\n";
      if (typeof cb === "function") {
        cb(null, svgTag);
      }
      return svgTag;
    };
  }
});

// node_modules/qrcode/lib/browser.js
var require_browser = __commonJS({
  "node_modules/qrcode/lib/browser.js"(exports2) {
    var canPromise = require_can_promise();
    var QRCode = require_qrcode();
    var CanvasRenderer = require_canvas();
    var SvgRenderer = require_svg_tag();
    function renderCanvas(renderFunc, canvas, text, opts, cb) {
      const args = [].slice.call(arguments, 1);
      const argsNum = args.length;
      const isLastArgCb = typeof args[argsNum - 1] === "function";
      if (!isLastArgCb && !canPromise()) {
        throw new Error("Callback required as last argument");
      }
      if (isLastArgCb) {
        if (argsNum < 2) {
          throw new Error("Too few arguments provided");
        }
        if (argsNum === 2) {
          cb = text;
          text = canvas;
          canvas = opts = void 0;
        } else if (argsNum === 3) {
          if (canvas.getContext && typeof cb === "undefined") {
            cb = opts;
            opts = void 0;
          } else {
            cb = opts;
            opts = text;
            text = canvas;
            canvas = void 0;
          }
        }
      } else {
        if (argsNum < 1) {
          throw new Error("Too few arguments provided");
        }
        if (argsNum === 1) {
          text = canvas;
          canvas = opts = void 0;
        } else if (argsNum === 2 && !canvas.getContext) {
          opts = text;
          text = canvas;
          canvas = void 0;
        }
        return new Promise(function(resolve, reject) {
          try {
            const data = QRCode.create(text, opts);
            resolve(renderFunc(data, canvas, opts));
          } catch (e) {
            reject(e);
          }
        });
      }
      try {
        const data = QRCode.create(text, opts);
        cb(null, renderFunc(data, canvas, opts));
      } catch (e) {
        cb(e);
      }
    }
    exports2.create = QRCode.create;
    exports2.toCanvas = renderCanvas.bind(null, CanvasRenderer.render);
    exports2.toDataURL = renderCanvas.bind(null, CanvasRenderer.renderToDataURL);
    exports2.toString = renderCanvas.bind(null, function(data, _, opts) {
      return SvgRenderer.render(data, opts);
    });
  }
});

// plugin/qrcode.js
var require_qrcode2 = __commonJS({
  "plugin/qrcode.js"(exports2, module2) {
    "use strict";
    var QRCode = require_browser();
    function encode(text) {
      const r = QRCode.create(text, { errorCorrectionLevel: "L" });
      const size = r.modules.size;
      const data = r.modules.data;
      return {
        size,
        version: r.version,
        get: (row, col) => !!data[row * size + col]
      };
    }
    function toSvg(m, scale, margin) {
      const s = scale || 6;
      const q = margin == null ? 4 : margin;
      const dim = (m.size + q * 2) * s;
      let rects = "";
      for (let i = 0; i < m.size; i++) {
        for (let j = 0; j < m.size; j++) {
          if (!m.get(i, j)) continue;
          rects += `<rect x="${(j + q) * s}" y="${(i + q) * s}" width="${s}" height="${s}"/>`;
        }
      }
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${dim}" height="${dim}" viewBox="0 0 ${dim} ${dim}" shape-rendering="crispEdges"><rect width="${dim}" height="${dim}" fill="#fff"/><g fill="#000">${rects}</g></svg>`;
    }
    module2.exports = { encode, toSvg };
  }
});

// plugin/main.js
var {
  Plugin,
  PluginSettingTab,
  Setting,
  Modal,
  Notice,
  requestUrl,
  ItemView
} = require("obsidian");
var core = require_core();
var { createWebviewHost } = require_webview_host();
var qrcode = require_qrcode2();
var FREE_QUOTA = 50;
var CHAT_VIEW_TYPE = "knowledge-bridge-chat-view";
var CHAT_INDEX_TTL_MS = 5 * 60 * 1e3;
var PLATFORM_ORDER = ["bilibili", "xiaohongshu", "xiaoyuzhou", "twitter"];
var DEFAULT_SETTINGS = {
  version: 2,
  licenseKey: "",
  licenseValid: false,
  syncedCount: 0,
  // 内嵌浏览器兼容档位（v0.5.15）：崩溃一次自动降一档，见 WEBVIEW_PROFILES
  webviewProfile: 3,
  platforms: {
    bilibili: { enabled: true, auth: { sessdata: "" }, collections: [], userLabel: "" },
    xiaohongshu: { enabled: false, auth: { cookie: "", userId: "" }, collections: [], userLabel: "" },
    xiaoyuzhou: { enabled: false, auth: { refreshToken: "", deviceId: "" }, collections: [], userLabel: "" },
    twitter: { enabled: false, auth: { cookie: "" }, collections: [], userLabel: "" }
  },
  target: {
    type: "obsidian",
    // 默认目录用英文：中文目录名在部分同步工具/插件生态里出过 bug（用户 2026-09-03 拍板）
    obsidian: { savePath: "savault/", localizeCover: true, dirTemplate: "{root}/{platform}/{collection}", linkAuthor: true },
    notion: { token: "", parentId: "", parentType: "data_source_id", uploadImages: false }
  },
  ai: { enabled: false, baseUrl: "https://api.deepseek.com", key: "", model: "deepseek-chat" },
  // 口播转写（pro）：阿里云百炼 dashscope API key，Paraformer 直接吃视频 URL，不用下载
  dashscopeKey: "",
  // 问收藏（AI 对话）：参考条数与记忆轮数
  chatTopK: 8,
  chatMaxTurns: 6,
  fetchTranscript: false,
  autoSync: false,
  syncIntervalMin: 60
};
function makeRequest() {
  return async function request(url, opts) {
    const o = opts || {};
    const r = await requestUrl({
      url,
      method: o.method || "GET",
      headers: o.headers || {},
      body: o.body,
      throw: false
    });
    return {
      status: r.status,
      headers: r.headers || {},
      json: r.json,
      text: r.text,
      arrayBuffer: r.arrayBuffer
    };
  };
}
var PINNED_CHROME_VER = "120";
var PINNED_CHROME_FULL = "120.0.6099.129";
var MAC_UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/" + PINNED_CHROME_VER + ".0.0.0 Safari/537.36";
var WEBVIEW_PRELOAD = [
  ";(function () {",
  "  var VER = '" + PINNED_CHROME_VER + "';",
  "  var FULL = '" + PINNED_CHROME_FULL + "';",
  '  var brands = [{brand:"Not/A)Brand",version:"8"},{brand:"Chromium",version:VER},{brand:"Google Chrome",version:VER}];',
  '  var fullVersionList = [{brand:"Not/A)Brand",version:"8.0.0.0"},{brand:"Chromium",version:FULL},{brand:"Google Chrome",version:FULL}];',
  "  try {",
  '    Object.defineProperty(navigator, "userAgentData", {',
  "      get: function () { return {",
  '        brands: brands, mobile: false, platform: "macOS",',
  "        getHighEntropyValues: function () {",
  '          return Promise.resolve({ architecture: "arm", bitness: "64", brands: brands,',
  '            fullVersionList: fullVersionList, mobile: false, platform: "macOS",',
  '            platformVersion: "14.0.0", uaFullVersion: FULL });',
  "        } };",
  "      }, configurable: true });",
  "  } catch (_) {}",
  "})();"
].join("\n");
var WEBVIEW_PROFILES = [
  { name: "L0-\u5B8C\u6574", ua: true, preload: true, webprefs: true, allowpopups: true, liteUrl: false },
  { name: "L1-\u65E0\u6269\u5C55\u9879", ua: true, preload: true, webprefs: false, allowpopups: false, liteUrl: false },
  { name: "L2-\u65E0preload", ua: true, preload: false, webprefs: false, allowpopups: false, liteUrl: true },
  // L3 竞品复刻：与 xhs2obsidian 完全一致 —— Mac UA + preload + 加载 /explore。
  // v0.5.20 起不再用 liteUrl：「登录页更轻所以不崩」的假设已被证伪
  // （真凶是 webview 上的 border-radius，跟页面内容无关），
  // 而竞品恰恰加载满屏视频的 /explore 都不崩 —— 那就跟它保持一模一样。
  { name: "L3-\u7ADE\u54C1\u590D\u523B", ua: true, preload: true, webprefs: false, allowpopups: false, liteUrl: false },
  { name: "L4-\u88F8\u5954", ua: false, preload: false, webprefs: false, allowpopups: false, liteUrl: true }
  // ⚠️ 不许再往这张表里加「离屏/invisible」档（v0.5.21 血的教训）：
  // 这张表驱动的是登录/取数弹窗——用户必须看得见页面。v0.5.16 加过 L5 离屏档
  // （1×1 移出视口），崩溃自愈把档位一路降到 L5 并**持久化**，于是真凶修好之后
  // 用户打开登录窗仍然一片空白。离屏只适合「用户不需要看见」的后台 webview，
  // 那种组件如果有，应该自己写死样式，绝不能进这张通用档位表。
];
var DEFAULT_WEBVIEW_PROFILE = 3;
function webviewProfile(level) {
  const i = Math.max(0, Math.min(Number(level) || 0, WEBVIEW_PROFILES.length - 1));
  return WEBVIEW_PROFILES[i];
}
function ensureWebviewPreload() {
  try {
    const fs = require("fs");
    const os = require("os");
    const path = require("path");
    const p = path.join(os.tmpdir(), "savault-webview-preload.js");
    fs.writeFileSync(p, WEBVIEW_PRELOAD, "utf8");
    return "file://" + p.replace(/\\/g, "/");
  } catch (_) {
    return null;
  }
}
function makeWebviewEl(contentEl, partitionId, src, cls, opts) {
  const o = opts || webviewProfile(DEFAULT_WEBVIEW_PROFILE);
  const box = contentEl.createDiv({ cls: "clipin-webview-container" });
  const wv = document.createElement("webview");
  wv.setAttribute("partition", partitionId);
  if (o.ua) wv.setAttribute("useragent", MAC_UA);
  if (o.preload) {
    const preloadUrl = ensureWebviewPreload();
    if (preloadUrl) wv.setAttribute("preload", preloadUrl);
  }
  if (o.allowpopups) wv.setAttribute("allowpopups", "");
  if (o.webprefs) wv.setAttribute("webpreferences", "autoplayPolicy=document-user-activation-required");
  if (cls) wv.setAttribute("class", cls);
  wv.setAttribute("src", src || "about:blank");
  box.appendChild(wv);
  return wv;
}
function webviewCanAccessWebContents(wv) {
  return !!(wv && typeof wv.getWebContents === "function");
}
function getPartitionSession(partitionId) {
  try {
    const electron = require("electron");
    const session = electron.remote && electron.remote.session || electron.session;
    if (session && typeof session.fromPartition === "function") {
      const ses = session.fromPartition(partitionId);
      if (ses && ses.cookies) return ses;
    }
  } catch (_) {
  }
  return null;
}
async function readPartitionCookies(partitionId, url) {
  const ses = getPartitionSession(partitionId);
  if (ses && typeof ses.cookies.get === "function") {
    try {
      const list = await ses.cookies.get({ url });
      if (list) return { cookies: list, via: "session.fromPartition" };
    } catch (_) {
    }
  }
  return null;
}
function attachWebviewGuards(wv, plugin, tag) {
  if (!wv || !plugin) return;
  const log = (m) => plugin._log("info", `[${tag}] ${m}`);
  wv.addEventListener("dom-ready", () => log(`dom-ready url=${safeUrl(wv)}`));
  wv.addEventListener("did-start-loading", () => log("did-start-loading"));
  wv.addEventListener("did-finish-load", () => log("did-finish-load"));
  wv.addEventListener("new-window", (e) => log(`new-window \u2192 ${e && e.url || ""}`));
  wv.addEventListener("will-navigate", (e) => log(`will-navigate \u2192 ${e && e.url || ""}`));
  wv.addEventListener("unresponsive", () => plugin._log("error", `[${tag}] webview \u65E0\u54CD\u5E94`));
  wv.addEventListener("responsive", () => log("webview \u6062\u590D\u54CD\u5E94"));
  let beats = 0;
  const beat = () => {
    if (!wv.isConnected) return;
    beats += 1;
    let mem = "";
    try {
      const m = typeof process !== "undefined" && process.memoryUsage ? process.memoryUsage() : null;
      if (m) mem = ` rss=${Math.round((m.rss || 0) / 1048576)}MB heap=${Math.round((m.heapUsed || 0) / 1048576)}MB`;
    } catch (_) {
    }
    log(`\u5B58\u6D3B ${beats}s${mem}`);
    if (beats < 30) setTimeout(beat, 1e3);
  };
  wv.addEventListener("did-stop-loading", () => {
    log("did-stop-loading");
    setTimeout(beat, 1e3);
  });
  wv.addEventListener("render-process-gone", (e) => {
    plugin._log("error", `[${tag}] webview \u6E32\u67D3\u8FDB\u7A0B\u5D29\u6E83\uFF1A${e && e.details && e.details.reason || e && e.details || ""}`);
    new Notice("\u5185\u5D4C\u6D4F\u89C8\u5668\u5D29\u4E86\uFF08\u9875\u9762\u592A\u91CD\u6216\u5185\u5B58\u4E0D\u8DB3\uFF09\u3002\u5173\u6389\u672C\u7A97\u53E3\u91CD\u8BD5\u5373\u53EF\uFF0CObsidian \u672C\u4F53\u4E0D\u53D7\u5F71\u54CD\u3002", 8e3);
  });
}
function safeUrl(wv) {
  try {
    return wv.getURL() || "";
  } catch (_) {
    return "";
  }
}
function setModalSize(modal, wide) {
  try {
    if (!modal || !modal.modalEl || typeof modal.modalEl.addClass !== "function") return;
    if (wide) modal.modalEl.addClass("clipin-modal-wide");
    else modal.modalEl.addClass("clipin-modal-snap");
  } catch (_) {
  }
}
var LoginModal = class extends Modal {
  /**
   * @param {App} app
   * @param {ClipinPlugin} plugin
   * @param {Object} provider 平台 provider
   * @param {string} cookieName 要提取的 Cookie 名（B站是 SESSDATA）
   */
  constructor(app, plugin, provider, cookieName) {
    super(app);
    this.plugin = plugin;
    this.provider = provider;
    this.cookieName = cookieName;
  }
  onOpen() {
    const { contentEl } = this;
    const p = this.provider;
    contentEl.empty();
    setModalSize(this, true);
    contentEl.addClass("clipin-login-modal");
    contentEl.createEl("h3", { text: `\u767B\u5F55 ${p.name}` });
    contentEl.createEl("p", {
      text: "\u5728\u4E0B\u65B9\u7A97\u53E3\u767B\u5F55\uFF0C\u6210\u529F\u540E\u4F1A\u81EA\u52A8\u63D0\u53D6\u5E76\u5173\u95ED\u3002",
      cls: "clipin-tip"
    });
    const prof = webviewProfile(this.plugin.settings.webviewProfile);
    const url = prof.liteUrl && p.capabilities.liteLoginUrl || p.capabilities.loginUrl || "about:blank";
    this.plugin._log("info", `[login] \u6253\u5F00\u767B\u5F55\u7A97\u53E3\uFF1A${p.name} partition=persist:clipin-${p.id} \u6863\u4F4D=${prof.name} url=${url} preload=${prof.preload && ensureWebviewPreload() ? "yes" : "no"}`);
    this.webview = makeWebviewEl(contentEl, `persist:clipin-${p.id}`, url, "clipin-webview", prof);
    attachWebviewGuards(this.webview, this.plugin, "login");
    contentEl.createEl("p", {
      text: "\u767B\u5F55\u6210\u529F\u540E\u4F1A\u81EA\u52A8\u63D0\u53D6\u5E76\u5173\u95ED\u672C\u7A97\u53E3\uFF0C\u4F60\u4E0D\u7528\u70B9\u4EFB\u4F55\u6309\u94AE\u3002",
      cls: "clipin-tip"
    });
    const row = contentEl.createDiv({ cls: "clipin-btn-row" });
    const btn = row.createEl("button", { text: "\u63D0\u53D6\u767B\u5F55\u6001\uFF08\u81EA\u52A8\uFF0C\u53EF\u624B\u52A8\u70B9\uFF09" });
    btn.addClass("mod-cta");
    btn.onclick = async () => {
      btn.setAttr("disabled", "true");
      btn.setText("\u63D0\u53D6\u4E2D\u2026");
      try {
        await this.extract();
      } finally {
        btn.removeAttribute("disabled");
        btn.setText("\u63D0\u53D6\u767B\u5F55\u6001\uFF08\u81EA\u52A8\uFF0C\u53EF\u624B\u52A8\u70B9\uFF09");
      }
    };
    const close = row.createEl("button", { text: "\u5173\u95ED" });
    close.onclick = () => this.close();
    this.startAutoDetect();
  }
  /**
   * 自动检测登录成功（v0.5.15）：每 2 秒看一次登录态 cookie 是否出现，
   * 一旦出现立刻提取并关窗。这样页面还没跳转回 explore（视频瀑布流）就已经
   * 收工，全程不加载重页面 —— 从源头避开崩溃，用户也不需要碰 F12。
   */
  startAutoDetect() {
    const p = this.provider;
    const need = p.id === "bilibili" ? "SESSDATA" : p.id === "xiaohongshu" ? "web_session" : null;
    if (!need) return;
    let viaLogged = false;
    this._detectTimer = setInterval(async () => {
      if (this._busy || this._done) return;
      try {
        const url = p.id === "bilibili" ? "https://www.bilibili.com" : "https://www.xiaohongshu.com";
        const r = await readPartitionCookies(`persist:clipin-${p.id}`, url);
        if (!r) return;
        if (!viaLogged) {
          viaLogged = true;
          this.plugin._log("info", `[login] cookie \u8BFB\u53D6\u901A\u9053\uFF1A${r.via}`);
        }
        if (!(r.cookies || []).some((c) => c.name === need && c.value)) return;
        this.plugin._log("info", `[login] \u68C0\u6D4B\u5230 ${need}\uFF0C\u81EA\u52A8\u63D0\u53D6\u767B\u5F55\u6001`);
        clearInterval(this._detectTimer);
        this._done = true;
        this._busy = true;
        await this.extract();
      } catch (_) {
      }
    }, 2e3);
  }
  async extract() {
    const p = this.provider;
    try {
      const partition = `persist:clipin-${p.id}`;
      const targetUrl = p.id === "bilibili" ? "https://www.bilibili.com" : p.capabilities.loginUrl;
      let r = await readPartitionCookies(partition, targetUrl);
      if (r) {
        this.plugin._log("info", `[login] \u63D0\u53D6 cookie \u901A\u9053\uFF1A${r.via}`);
      } else if (webviewCanAccessWebContents(this.webview)) {
        const wc = this.webview.getWebContents();
        if (!wc) throw new Error("\u6D4F\u89C8\u5668\u7EC4\u4EF6\u5C1A\u672A\u5C31\u7EEA\uFF0C\u8BF7\u7A0D\u7B49\u4E24\u79D2\u518D\u8BD5");
        const all0 = await wc.session.cookies.get({ url: targetUrl });
        r = { cookies: all0 || [], via: "webview.getWebContents\uFF08\u9000\u8DEF\uFF09" };
        this.plugin._log("warn", `[login] \u63D0\u53D6 cookie \u8D70\u4E86\u9000\u8DEF\uFF1A${r.via}`);
      } else {
        const msg = p.id === "bilibili" ? "\u5F53\u524D\u73AF\u5883\u8BFB\u4E0D\u5230 Cookie\u3002\u8BF7\u5173\u6389\u672C\u7A97\u53E3\uFF0C\u6539\u7528\u300C\u626B\u7801\u767B\u5F55\u300D\u2014\u2014\u4E0D\u9700\u8981\u5185\u5D4C\u6D4F\u89C8\u5668\uFF0C\u4E5F\u4E0D\u4F1A\u5D29" : "\u5F53\u524D\u73AF\u5883\u8BFB\u4E0D\u5230 Cookie\u3002\u8BF7\u5728\u4E0A\u65B9\u7A97\u53E3\u5B8C\u6210\u767B\u5F55\u540E\uFF0C\u5728\u8BBE\u7F6E\u9875\u628A\u5B8C\u6574 Cookie\uFF08\u542B web_session\uFF09\u4E0E\u7528\u6237 ID \u624B\u52A8\u7C98\u8D34\u8FDB\u6765";
        new Notice(`${p.name}\uFF1A${msg}`, 9e3);
        return;
      }
      const all = r.cookies || [];
      let value = "";
      if (p.id === "bilibili") {
        const hit = all.find((c) => c.name === "SESSDATA" && c.value);
        if (!hit) throw new Error("\u672A\u627E\u5230 SESSDATA\uFF0C\u8BF7\u786E\u8BA4\u5DF2\u5728\u4E0A\u65B9\u7A97\u53E3\u767B\u5F55");
        value = hit.value;
      } else {
        value = all.map((c) => `${c.name}=${c.value}`).join("; ");
        if (!value) throw new Error("\u672A\u8BFB\u5230 Cookie\uFF0C\u8BF7\u786E\u8BA4\u5DF2\u767B\u5F55");
      }
      const cfg = this.plugin.settings.platforms[p.id];
      let userIdMissing = false;
      if (p.id === "bilibili") cfg.auth.sessdata = value;
      else {
        cfg.auth.cookie = value;
        if (p.id === "xiaohongshu") {
          const a1 = (all.find((c) => c.name === "a1") || {}).value || "";
          if (a1) cfg.auth.a1 = a1;
          try {
            let me = await p.fetchMe(makeRequest(), value);
            if (!me) {
              await new Promise((res2) => setTimeout(res2, 2e3));
              me = await p.fetchMe(makeRequest(), value);
            }
            if (me) {
              cfg.auth.userId = me.userId;
              if (me.nickname) cfg.auth.nickname = me.nickname;
            } else {
              userIdMissing = true;
              this.plugin._log("error", "[login] Cookie \u5DF2\u4FDD\u5B58\uFF0C\u4F46 HTML \u4E0E edith \u4E24\u6761\u8DEF\u90FD\u62FF\u4E0D\u5230 userId\uFF08\u672A\u5B8C\u6210\u767B\u5F55\u6216\u98CE\u63A7\uFF09");
            }
          } catch (_) {
            userIdMissing = true;
            this.plugin._log("error", "[login] fetchMe \u629B\u5F02\u5E38\uFF0CuserId \u672A\u4FDD\u5B58");
          }
        }
      }
      cfg.enabled = true;
      await this.plugin.saveSettings();
      if (userIdMissing) {
        new Notice(`${p.name}\uFF1ACookie \u5DF2\u5B58\uFF0C\u4F46\u6CA1\u62FF\u5230\u7528\u6237 ID\u3002\u8BF7\u786E\u8BA4\u4E0A\u65B9\u9875\u9762\u5DF2\u767B\u5F55\uFF08\u80FD\u770B\u5230\u81EA\u5DF1\u7684\u5934\u50CF\uFF09\uFF0C\u518D\u70B9\u4E00\u6B21\u300C\u63D0\u53D6\u767B\u5F55\u6001\u300D`, 9e3);
        return;
      }
      new Notice(`${p.name} \u767B\u5F55\u6001\u5DF2\u4FDD\u5B58`);
      this.close();
      const cfgNow = this.plugin.settings.platforms[p.id];
      if (p.capabilities && p.capabilities.collections && !(cfgNow.collections || []).length) {
        setTimeout(() => this.plugin.promptChooseCollections(p.id), 500);
      }
    } catch (e) {
      this.plugin._log("error", `\u63D0\u53D6\u767B\u5F55\u6001\u5931\u8D25\uFF1A${e && e.stack || e}`);
      new Notice("\u63D0\u53D6\u5931\u8D25\uFF1A" + e.message);
    }
  }
  onClose() {
    if (this._detectTimer) {
      clearInterval(this._detectTimer);
      this._detectTimer = null;
    }
    if (!this._closeLogged) {
      this._closeLogged = true;
      this.plugin._log("info", "[login] \u767B\u5F55\u7A97\u53E3\u5DF2\u5173\u95ED");
    }
    this.contentEl.empty();
  }
};
var QrLoginModal = class extends Modal {
  constructor(app, plugin, provider) {
    super(app);
    this.plugin = plugin;
    this.provider = provider;
    this.timer = null;
    this.done = false;
    this.jar = {};
    this.key = "";
  }
  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    setModalSize(this, false);
    contentEl.addClass("clipin-qr-modal");
    contentEl.addClass("clipin-qr-modal");
    contentEl.createEl("h3", { text: `${this.provider.name} \xB7 \u626B\u7801\u767B\u5F55` });
    this.qrEl = contentEl.createDiv({ cls: "clipin-qr-box" });
    this.statusEl = contentEl.createEl("p", { text: "\u6B63\u5728\u751F\u6210\u4E8C\u7EF4\u7801\u2026", cls: "clipin-tip" });
    const row = contentEl.createDiv({ cls: "clipin-btn-row" });
    const refresh = row.createEl("button", { text: "\u5237\u65B0\u4E8C\u7EF4\u7801" });
    refresh.onclick = () => this.start();
    const cancel = row.createEl("button", { text: "\u53D6\u6D88" });
    cancel.onclick = () => this.close();
    this.start();
  }
  onClose() {
    this.done = true;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.contentEl.empty();
  }
  setStatus(text) {
    if (this.statusEl) this.statusEl.setText(text);
  }
  async start() {
    const p = this.provider;
    if (!p.qrLogin) {
      this.setStatus("\u8BE5\u5E73\u53F0\u4E0D\u652F\u6301\u626B\u7801\u767B\u5F55");
      return;
    }
    this.done = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.setStatus("\u6B63\u5728\u751F\u6210\u4E8C\u7EF4\u7801\u2026");
    if (this.qrEl) this.qrEl.empty();
    try {
      const request = makeRequest();
      const { key, url, jar } = await p.qrLogin.createKey(request);
      this.key = key;
      this.jar = jar;
      if (this.qrEl) this.qrEl.innerHTML = qrcode.toSvg(qrcode.encode(url), 7);
      this.setStatus("\u8BF7\u7528\u624B\u673A App \u626B\u63CF\u4E0A\u65B9\u4E8C\u7EF4\u7801");
      this.plugin._log("info", `[qrlogin] ${p.name} \u4E8C\u7EF4\u7801\u5DF2\u751F\u6210\uFF0C\u7B49\u5F85\u626B\u7801`);
    } catch (e) {
      this.setStatus(`\u751F\u6210\u4E8C\u7EF4\u7801\u5931\u8D25\uFF1A${e.message}`);
      this.plugin._log("error", `[qrlogin] ${p.name} \u751F\u6210\u4E8C\u7EF4\u7801\u5931\u8D25\uFF1A${e.message}`);
      return;
    }
    const startedAt = Date.now();
    this.timer = setInterval(async () => {
      if (this.done) return;
      if (Date.now() - startedAt > 175e3) {
        clearInterval(this.timer);
        this.timer = null;
        this.setStatus("\u4E8C\u7EF4\u7801\u5DF2\u8FC7\u671F\uFF0C\u8BF7\u70B9\u300C\u5237\u65B0\u4E8C\u7EF4\u7801\u300D");
        return;
      }
      try {
        const r = await p.qrLogin.poll(makeRequest(), this.key, this.jar);
        if (r.jar) this.jar = r.jar;
        if (r.state === "waiting") {
          this.setStatus("\u5DF2\u626B\u7801\uFF0C\u8BF7\u5728\u624B\u673A\u4E0A\u70B9\u300C\u786E\u8BA4\u767B\u5F55\u300D");
          return;
        }
        if (r.state === "expired") {
          clearInterval(this.timer);
          this.timer = null;
          this.setStatus("\u4E8C\u7EF4\u7801\u5DF2\u5931\u6548\uFF0C\u8BF7\u70B9\u300C\u5237\u65B0\u4E8C\u7EF4\u7801\u300D");
          return;
        }
        if (r.state === "success") {
          clearInterval(this.timer);
          this.timer = null;
          this.done = true;
          await this.plugin.applyQrAuth(p.id, r.auth);
          this.setStatus("\u767B\u5F55\u6210\u529F\uFF01");
          this.plugin._log("info", `[qrlogin] ${p.name} \u626B\u7801\u767B\u5F55\u6210\u529F`);
          new Notice(`${p.name}\uFF1A\u626B\u7801\u767B\u5F55\u6210\u529F`, 5e3);
          setTimeout(() => this.close(), 900);
        }
      } catch (_) {
      }
    }, 2e3);
  }
};
var ClipinPlugin = class extends Plugin {
  async onload() {
    this._probeEnv();
    this._registerExitMarker();
    this._crashedLastRun = this._recoverCrashedPartitions();
    await this.migrateLegacySettings();
    await this.loadSettings();
    const crashedOnThisVersion = (this.settings.bootVersion || "") === this.manifest.version;
    this.settings.bootVersion = this.manifest.version;
    this._resetStaleWebviewProfile();
    this._applyCrashFallback(crashedOnThisVersion);
    this.http = core.createHttp({
      request: makeRequest(),
      // 限速（2026-09-03 用户要求，防风控）：
      //  平台 API 请求间隔 1.5~2.5s 随机。依据：B站收藏导出工具 bilibili-favorites-exporter
      //  默认翻页间隔 2s（0.1~10s 可调）；社区对 B站建议同目标 ≥2~3s + 随机抖动；
      //  小红书直连接口实测 5s 内 7 连发即触发 461 限流——所以小红书本体取数全走
      //  webview（平台前端自己签名发请求，速度受 webview 滚动节奏控制，见 xiaohongshu.js），
      //  这里主要兜底 B站等直连场景。固定间隔会被风控按模式识别，故加 jitterMax 随机化。
      intervalMs: 1500,
      // 最小间隔
      jitterMax: 1e3,
      // +0~1s 随机
      maxRetries: 3,
      // 快车道：图床 CDN / 用户自己的 AI 网关不是平台风控对象，不排队不占节流计时
      fastHosts: [
        ".xhscdn.com",
        // 小红书图床 / 视频 CDN
        ".hdslb.com",
        // B站图床 / 字幕静态文件
        "aliyuncs.com",
        // dashscope ASR（BYOK）
        "minimaxi.com",
        "api.openai.com",
        "anthropic.com",
        "moonshot.cn",
        "deepseek.com"
        // BYOK AI 网关
      ],
      logger: (m) => this._log("http", m)
    });
    this._trimLogFile();
    this.addRibbonIcon("scissors", "\u77E5\u8BC6\u6865\u6881\uFF1A\u7ACB\u5373\u540C\u6B65\u6536\u85CF", () => this.syncAll());
    this.registerView(CHAT_VIEW_TYPE, (leaf) => new ChatView(leaf, this));
    this.addRibbonIcon("message-circle", "\u77E5\u8BC6\u6865\u6881\uFF1A\u95EE\u6536\u85CF\uFF08AI \u5BF9\u8BDD\uFF09", () => this.openChatView());
    this.addCommand({ id: "clipin-sync", name: "\u540C\u6B65\u6536\u85CF", callback: () => this.syncAll() });
    this.addCommand({ id: "clipin-chat", name: "\u95EE\u6536\u85CF\uFF08AI \u5BF9\u8BDD\uFF09", callback: () => this.openChatView() });
    for (const id of PLATFORM_ORDER) {
      const p = core.getProvider(id);
      if (!p) continue;
      this.addCommand({
        id: `clipin-sync-${id}`,
        name: `\u540C\u6B65 ${p.name}`,
        callback: () => this.syncOne(id)
      });
    }
    this.settingTab = new ClipinSettingTab(this.app, this);
    this.addSettingTab(this.settingTab);
    this.setupAutoSync();
    console.log("[savault] \u5DF2\u52A0\u8F7D\uFF0C\u652F\u6301\u5E73\u53F0\uFF1A" + PLATFORM_ORDER.join(", "));
    this._log("info", `\u63D2\u4EF6\u5DF2\u52A0\u8F7D v${this.manifest && this.manifest.version || "?"}\uFF08\u540C\u6B65\u843D\u76D8\u65E5\u5FD7\u5DF2\u542F\u7528\uFF09`);
  }
  onUnload() {
    this._markCleanExit("Obsidian \u5173\u95ED\u6216\u63D2\u4EF6\u88AB\u7981\u7528/\u91CD\u8F7D");
  }
  /**
   * 干净退出标记（v0.5.22）。
   *
   * 背景（血泪）：v0.5.11 起的崩溃检测靠「上次没有『插件卸载』日志」推断崩溃。
   * 但 Windows 上 Obsidian 退出时 renderer 进程常被直接终止，onUnload 根本来不及跑
   * —— 真机 sync.log 里 11 次「插件已加载」对 0 次「插件卸载」，检测器**恒为真**。
   * 后果：每次重启都被判崩溃 → 隔离分区（用户每次都要重新登录）+ 自动降一档
   * （一路降到 L5 离屏，登录窗一片空白）。所谓「连崩 8 次」里，绝大部分是这么造出来的。
   *
   * 修法两步：① 给正常退出多留几个落点（提高分辨力）；② 判定必须有正向崩溃信号。
   */
  _registerExitMarker() {
    if (typeof window === "undefined" || this._exitMarkerRegistered) return;
    this._exitMarkerRegistered = true;
    const onBeforeUnload = () => this._markCleanExit("\u7A97\u53E3\u5173\u95ED\u524D\u6807\u8BB0\uFF08beforeunload\uFF09");
    const onPageHide = () => this._markCleanExit("\u9875\u9762\u9690\u85CF\uFF08pagehide\uFF09");
    window.addEventListener("beforeunload", onBeforeUnload);
    window.addEventListener("pagehide", onPageHide);
    this.register(() => {
      try {
        window.removeEventListener("beforeunload", onBeforeUnload);
        window.removeEventListener("pagehide", onPageHide);
      } catch (_) {
      }
    });
  }
  /** 写一次「我是正常退出的」。日志是同步 appendFileSync，进程被收尾前也来得及落盘。 */
  _markCleanExit(why) {
    if (this._cleanExitMarked) return;
    this._cleanExitMarked = true;
    try {
      this._log("info", `\u63D2\u4EF6\u5378\u8F7D\uFF08${why}\uFF09`);
    } catch (_) {
    }
  }
  /**
   * 崩溃自愈（v0.5.11 引入，v0.5.22 重写判定逻辑）。
   *
   * 作用：确认上次是崩在内嵌浏览器上时，把 persist:clipin-* 分区改名隔离
   * （不删，留底可查），下次 webview 从干净状态重建——避免分区 SQLite 写一半
   * 损坏后「一加载就崩」的崩溃循环。必须在 onload 最前面跑（此时分区文件无锁）。
   *
   * ⚠️ v0.5.22 重写的原因：旧判定「上次没有『插件卸载』日志 = 崩了」在 Windows 上
   * **恒为真**。Obsidian 退出时 renderer 进程常被直接终止，onUnload 来不及执行。
   * 真机 sync.log 实证：11 次「插件已加载」对 0 次「插件卸载」。
   * 于是每重启一次就误判一次崩溃 → 隔离分区（登录态被抹）+ 自动降一档
   * （一路降到 L5 离屏，登录窗一片空白）。所谓「连崩 8 次」，绝大部分是这么造出来的。
   *
   * 新判定：**必须有正向崩溃信号**（Chromium 自己上报的），没信号就当「原因不明」，
   * 不动登录态、不降档。宁可漏判——漏判最多偶发分区损坏（设置里有手动重置按钮），
   * 误判则是每次重启都把用户的登录态抹掉，代价不可比。
   *
   * @returns {boolean|null} true=确认真崩（会隔离分区+触发降档）；false=非正常退出但无崩溃信号；null=正常退出或无日志
   */
  _recoverCrashedPartitions() {
    try {
      const fs = require("fs");
      const path = require("path");
      const a = this.app.vault.adapter;
      const base = a && typeof a.getBasePath === "function" ? a.getBasePath() : "";
      const logPath = path.join(base, this.logFilePath);
      if (!fs.existsSync(logPath)) return null;
      const lines = fs.readFileSync(logPath, "utf8").slice(-2e4).split("\n").filter(Boolean);
      let lastLoadIdx = -1;
      for (let i = lines.length - 1; i >= 0; i--) {
        if (lines[i].includes("\u63D2\u4EF6\u5DF2\u52A0\u8F7D")) {
          lastLoadIdx = i;
          break;
        }
      }
      if (lastLoadIdx < 0) return null;
      const lastRun = lines.slice(lastLoadIdx + 1);
      if (lastRun.some((l) => l.includes("\u63D2\u4EF6\u5378\u8F7D"))) return null;
      const CRASH_RE = /渲染进程崩溃|render-process-gone|out of memory|FATAL ERROR/i;
      const crashLine = lastRun.filter((l) => CRASH_RE.test(l)).pop() || "";
      if (!crashLine) {
        this._log("info", "[webview] \u4E0A\u6B21\u662F\u975E\u6B63\u5E38\u9000\u51FA\uFF08\u6CA1\u7559\u4E0B\u5E72\u51C0\u5378\u8F7D\u8BB0\u5F55\uFF09\uFF0C\u4F46\u5185\u5D4C\u6D4F\u89C8\u5668\u6CA1\u6709\u4E0A\u62A5\u5D29\u6E83 \u2192 \u6309\u300C\u539F\u56E0\u4E0D\u660E\u300D\u5904\u7406\uFF1A\u4FDD\u7559\u767B\u5F55\u6001\u3001\u4E0D\u964D\u6863\u3002\u82E5\u786E\u5B9E\u611F\u89C9\u95EA\u9000\uFF0C\u5728\u8BBE\u7F6E\u91CC\u70B9\u4E00\u6B21\u300C\u91CD\u7F6E\u6D4F\u89C8\u5668\u6570\u636E\u300D\u5373\u53EF\u3002");
        return false;
      }
      this._quarantinePartitions(`\u68C0\u6D4B\u5230\u5185\u5D4C\u6D4F\u89C8\u5668\u5D29\u6E83\uFF08${crashLine.replace(/^\[[^\]]*\]\s*/, "").slice(0, 120)}\uFF09`);
      return true;
    } catch (_) {
      return null;
    }
  }
  /**
   * 崩溃自动降档（v0.5.15）：上次确实崩在内嵌浏览器上，就把兼容档位降一级。
   * 这样用户不用手动试——每崩一次，下次启动自动换成更保守的配置，
   * 最多几轮就会落到「不崩」的组合，日志里会写明当前档位。
   */
  /**
   * 环境探测（v0.5.18）：把「这台机器到底能不能用新方案」一次性记进日志。
   *
   * 内嵌浏览器连崩 7 个版本，每次都是靠改代码 + 用户重启来验证，成本极高。
   * 与其猜，不如让插件自己把环境讲清楚：下次再出问题，日志里直接有答案。
   * 重点探测 WebContentsView —— Electron 30+ 官方推荐的 <webview> 替代品
   * （<webview> 已被标记 deprecated），Obsidian-Surfing 已在新版里用它。
   */
  _probeEnv() {
    try {
      const v = typeof process !== "undefined" && process.versions || {};
      const info = {
        electron: v.electron || "?",
        chrome: v.chrome || "?",
        node: v.node || "?",
        platform: typeof process !== "undefined" && process.platform || "?",
        obsidian: typeof require !== "undefined" && (() => {
          try {
            return require("obsidian").version || "?";
          } catch (_) {
            return "?";
          }
        })() || "?"
      };
      let remote = false, wcv = false, fromPartition = false;
      try {
        const e = require("electron");
        const r = e.remote || e.require && e.require("@electron/remote");
        remote = !!(r && typeof r.getCurrentWindow === "function");
        fromPartition = !!(e.session || r && r.session);
        wcv = !!(e.WebContentsView || r && r.WebContentsView);
      } catch (_) {
      }
      info.remote = remote;
      info.WebContentsView = wcv;
      info.fromPartition = fromPartition;
      info.wcvUsable = wcv && remote && Number(String(info.electron).split(".")[0]) >= 30;
      this._env = info;
      this._log("info", `[env] ${JSON.stringify(info)}`);
    } catch (_) {
    }
  }
  /**
   * 档位卫生（v0.5.21）：别让持久化的档位把新版本的修复成果抵消掉。
   *
   * 教训（真机实锤）：v0.5.10~0.5.18 连崩 7 次，自动降档把 webviewProfile
   * 一路降到 5（离屏档）并持久化。v0.5.18 修好真凶后，档位仍卡在离屏档，
   * 登录窗打开就是一片空白 —— 修复完全没机会生效。
   *
   * 规则：
   * 1. 越界钳制：档位表会随版本变化（比如删掉某档），旧值可能越界 → 拉回默认
   * 2. 版本绑定：自动降档只在**同一版本**内累积；插件一更新（版本号变了），
   *    说明代码变了、可能就修好了 → 自动回默认档重新验证。
   * 3. 旧数据迁移：没有 crashedAt 标记但档位被降过（> 默认档）的，
   *    只可能是旧版本自动降档留下的 → 同样重置一次。
   *    手动降档的用户会被误伤一次，但档位就在设置页，他们能一眼看到、随手调回。
   */
  _resetStaleWebviewProfile() {
    try {
      const cur = Number(this.settings.webviewProfile);
      const maxIdx = WEBVIEW_PROFILES.length - 1;
      const crashedAt = this.settings.webviewProfileCrashedAt || "";
      const outOfRange = !Number.isFinite(cur) || cur < 0 || cur > maxIdx;
      const staleAutoDrop = crashedAt && crashedAt !== this.manifest.version;
      const legacyAutoDrop = !crashedAt && Number.isFinite(cur) && cur > DEFAULT_WEBVIEW_PROFILE;
      if (!outOfRange && !staleAutoDrop && !legacyAutoDrop) return;
      const from = Number.isFinite(cur) ? webviewProfile(cur).name : String(this.settings.webviewProfile);
      this.settings.webviewProfile = DEFAULT_WEBVIEW_PROFILE;
      this.settings.webviewProfileCrashedAt = "";
      this._log("info", `[webview] \u6863\u4F4D\u91CD\u7F6E\u4E3A\u9ED8\u8BA4\uFF08${webviewProfile(DEFAULT_WEBVIEW_PROFILE).name}\uFF09\uFF1A\u539F\u6863\u4F4D ${from}` + (outOfRange ? " \u8D8A\u754C\uFF08\u6863\u4F4D\u8868\u5DF2\u53D8\u66F4\uFF09" : "") + (staleAutoDrop ? ` \u662F ${crashedAt} \u5D29\u6E83\u65F6\u81EA\u52A8\u964D\u7684\uFF0C\u5F53\u524D\u5DF2\u662F ${this.manifest.version}` : "") + (legacyAutoDrop ? " \u662F\u65E7\u7248\u672C\u81EA\u52A8\u964D\u6863\u7684\u9057\u7559\uFF08\u65E0\u7248\u672C\u6807\u8BB0\uFF09" : ""));
      this.saveSettings();
    } catch (_) {
    }
  }
  _applyCrashFallback(crashedOnThisVersion) {
    if (!this._crashedLastRun) return;
    if (!crashedOnThisVersion) {
      this._log("info", "[webview] \u4E0A\u6B21\u5D29\u6E83\u53D1\u751F\u5728\u65E7\u7248\u672C\uFF0C\u672C\u6B21\u4E0D\u964D\u6863\uFF08\u5148\u8BA9\u65B0\u4EE3\u7801\u9A8C\u8BC1\uFF09");
      return;
    }
    const cur = Number(this.settings.webviewProfile);
    const maxIdx = WEBVIEW_PROFILES.length - 1;
    const next = Math.min((Number.isFinite(cur) ? cur : DEFAULT_WEBVIEW_PROFILE) + 1, maxIdx);
    if (next === cur) {
      this._log("error", `\u5DF2\u662F\u6700\u4F4E\u517C\u5BB9\u6863\u4F4D\uFF08${webviewProfile(cur).name}\uFF09\u4ECD\u7136\u5D29\u6E83\uFF1A\u672C\u673A\u5185\u5D4C\u6D4F\u89C8\u5668\u4E0D\u53EF\u7528\uFF0C\u8BF7\u6539\u7528\u626B\u7801\u767B\u5F55`);
      setTimeout(() => {
        const qrPlatforms = PLATFORM_ORDER.map((id) => core.getProvider(id)).filter((p) => p && p.qrLogin).map((p) => p.name);
        new Notice(
          `Savault\uFF1A\u5185\u5D4C\u6D4F\u89C8\u5668\u5728\u8FD9\u53F0\u673A\u5668\u4E0A\u59CB\u7EC8\u4F1A\u5D29\u6E83\uFF08\u5DF2\u8BD5\u5230\u6700\u4FDD\u5B88\u914D\u7F6E\uFF09\u3002` + (qrPlatforms.length ? `\u8BF7\u6539\u7528\u300C\u626B\u7801\u767B\u5F55\u300D\u2014\u2014${qrPlatforms.join("\u3001")}\u652F\u6301\uFF0C\u4E0D\u52A0\u8F7D\u7F51\u9875\uFF0C\u4E0D\u4F1A\u5D29\u6E83\u3002` : `\u8BF7\u6539\u7528\u300C\u7CFB\u7EDF\u6D4F\u89C8\u5668\u300D\u6309\u94AE\u767B\u5F55\uFF0C\u6216\u5728\u4E0B\u65B9\u624B\u52A8\u7C98\u8D34\u51ED\u8BC1\u3002`),
          15e3
        );
      }, 2e3);
      return;
    }
    this.settings.webviewProfile = next;
    this.settings.webviewProfileCrashedAt = this.manifest.version;
    this.saveSettings();
    this._log("warn", `\u4E0A\u6B21\u5D29\u6E83\uFF0C\u5185\u5D4C\u6D4F\u89C8\u5668\u517C\u5BB9\u6863\u4F4D\u81EA\u52A8\u964D\u7EA7\uFF1A${webviewProfile(cur).name} \u2192 ${webviewProfile(next).name}\uFF08\u4EC5\u5F53\u524D\u7248\u672C ${this.manifest.version} \u5185\u6709\u6548\uFF0C\u63D2\u4EF6\u66F4\u65B0\u540E\u81EA\u52A8\u56DE\u9ED8\u8BA4\uFF09`);
  }
  /** 把 persist:clipin-* 分区改名隔离（不删，留底可查）。供自愈与设置页手动重置共用。 */
  _quarantinePartitions(reason) {
    const fs = require("fs");
    const path = require("path");
    const appdata = process.env.APPDATA;
    if (!appdata) return [];
    const partRoot = path.join(appdata, "obsidian", "Partitions");
    if (!fs.existsSync(partRoot)) return [];
    const stamp = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const moved = [];
    for (const name of fs.readdirSync(partRoot)) {
      if (!name.startsWith("clipin-") || name.includes(".crashed-") || name.includes(".manual-")) continue;
      try {
        fs.renameSync(path.join(partRoot, name), path.join(partRoot, `${name}.crashed-${stamp}`));
        moved.push(name);
      } catch (_) {
      }
    }
    const priorCrashes = fs.readdirSync(partRoot).filter((n) => n.includes(".crashed-")).length;
    if (moved.length) {
      this._log("error", `${reason}\uFF0C\u5DF2\u91CD\u7F6E\u6D4F\u89C8\u5668\u6570\u636E\uFF08${moved.join(", ")} \u2192 .crashed-${stamp}\uFF09\uFF1B\u9700\u91CD\u65B0\u767B\u5F55\u4E00\u6B21\uFF08\u7D2F\u8BA1\u5D29\u6E83 ${priorCrashes} \u6B21\uFF09`);
      setTimeout(() => {
        if (priorCrashes >= 2) {
          new Notice(
            "Savault\uFF1A\u5DF2\u8FDE\u7EED\u591A\u6B21\u91CD\u7F6E\u5185\u5D4C\u6D4F\u89C8\u5668\u6570\u636E\uFF0C\u4F46\u6BCF\u6B21\u52A0\u8F7D\u9875\u9762\u4ECD\u7136\u95EA\u9000 \u2014\u2014 \u8BF4\u660E\u4E0D\u662F\u7F13\u5B58\u635F\u574F\uFF0C\u800C\u662F\u5185\u5D4C\u6D4F\u89C8\u5668\u6E32\u67D3\u8BE5\u9875\u9762\u65F6\u5D29\u6E83\uFF08\u89C6\u9891\u89E3\u7801/GPU\uFF09\u3002\u8BF7\u5B8C\u5168\u9000\u51FA Obsidian\uFF0C\u7528 --disable-gpu \u53C2\u6570\u542F\u52A8\u4E00\u6B21\u505A\u5BF9\u7167\uFF08\u8BE6\u89C1\u8BBE\u7F6E \u2192 \u6545\u969C\u6392\u67E5\uFF09\u3002",
            2e4
          );
        } else {
          new Notice(`Savault\uFF1A${reason}\uFF0C\u5DF2\u81EA\u52A8\u91CD\u7F6E\u5185\u5D4C\u6D4F\u89C8\u5668\u6570\u636E\uFF08\u9700\u91CD\u65B0\u767B\u5F55\u4E00\u6B21\uFF09\u3002`, 9e3);
        }
      }, 1500);
    }
    return moved;
  }
  /* ---------- 落盘日志：渲染进程 console 不进 obsidian.log，报错写 sync.log 才能排查 ---------- */
  get logFilePath() {
    const cfgDir = this.app.vault && this.app.vault.configDir || ".obsidian";
    return `${cfgDir}/plugins/savault/sync.log`;
  }
  _appendFileLog(text) {
    try {
      const fs = require("fs");
      const path = require("path");
      const a = this.app.vault.adapter;
      const base = a && typeof a.getBasePath === "function" ? a.getBasePath() : "";
      fs.appendFileSync(path.join(base, this.logFilePath), text);
      return;
    } catch (_) {
    }
    try {
      const a = this.app.vault.adapter;
      if (a && typeof a.append === "function") a.append(this.logFilePath, text);
    } catch (_) {
    }
  }
  /** 同时打 console 与 sync.log */
  _log(level, msg) {
    try {
      const ts = (/* @__PURE__ */ new Date()).toLocaleString("zh-CN", { hour12: false });
      const line = `[${ts}] [${level}] ${msg}
`;
      if (level === "error") console.error("[savault]", msg);
      else console.log("[savault]", msg);
      this._appendFileLog(line);
    } catch (_) {
    }
  }
  async _trimLogFile() {
    try {
      const a = this.app.vault.adapter;
      if (!a || typeof a.stat !== "function" || typeof a.write !== "function") return;
      const s = await a.stat(this.logFilePath);
      if (s && s.size > 512 * 1024) await a.write(this.logFilePath, "[sync.log \u8D85 512KB\uFF0C\u5DF2\u4ECE\u672C\u8F6E\u91CD\u65B0\u8BB0\u5F55]\n");
    } catch (_) {
    }
  }
  /**
   * 登录成功后的专辑引导：读一次专辑列表 → 弹勾选窗。
   * 用户不用再手动写专辑名，登录完直接点选。
   * 设置页「选择专辑」按钮也走这里（统一入口）。
   */
  async promptChooseCollections(platformId) {
    const p = core.getProvider(platformId);
    const cfg = this.settings.platforms[platformId];
    if (!p || !cfg) return;
    if (!(p.capabilities && p.capabilities.collections)) return;
    const sel = cfg.collections || [];
    try {
      let list = null;
      if (p.mode === "webview") {
        new Notice("\u6B63\u5728\u8BFB\u53D6\u4E13\u8F91\u5217\u8868\u2026\uFF08\u6D4F\u89C8\u5668\u7A97\u53E3\u81EA\u52A8\u6253\u5F00\uFF09", 4e3);
        let modal = null;
        const host = await this.openBrowser(p, cfg.auth && cfg.auth.cookie, {
          title: `\u6B63\u5728\u8BFB\u53D6 ${p.name} \u4E13\u8F91\u5217\u8868\uFF08\u767B\u5F55\u540E\u70B9\u300C\u5F00\u59CB\u8BFB\u53D6\u300D\uFF09`,
          onOpened: (m) => {
            modal = m;
          }
        });
        if (!host) return;
        try {
          list = await p.listCollections({ auth: cfg.auth, http: this.http, webviewHost: host, logger: (m) => this._log("info", m) });
        } catch (e) {
          if (modal) modal.close();
          this._log("error", `\u8BFB\u4E13\u8F91\u5217\u8868\u5931\u8D25\uFF1A${e && e.message || e}`);
          new Notice(`\u81EA\u52A8\u8BFB\u4E13\u8F91\u5217\u8868\u5931\u8D25\uFF1A${e && e.message || e}`, 5e3);
          new ManualCollectionsModal(this.app, p, async (names, all) => {
            cfg.collections = names;
            cfg.collectionsConfirmed = true;
            await this.saveSettings();
            if (this.settingTab) this.settingTab.display();
            new Notice(all ? "\u5DF2\u786E\u8BA4\u4E3A\u540C\u6B65\u5168\u90E8\u6536\u85CF" : names.length ? `\u5DF2\u8BBE\u4E3A\u53EA\u540C\u6B65\uFF1A${names.join("\u3001")}` : "\u5DF2\u53D6\u6D88\uFF0C\u672A\u8BBE\u7F6E\u540C\u6B65\u8303\u56F4");
          }).open();
          return;
        } finally {
          if (modal) modal.close();
        }
      } else {
        list = await p.listCollections({ auth: cfg.auth, http: this.http });
      }
      if (!list || !list.length) {
        new ManualCollectionsModal(this.app, p, async (names, all) => {
          cfg.collections = names;
          cfg.collectionsConfirmed = true;
          await this.saveSettings();
          if (this.settingTab) this.settingTab.display();
          new Notice(all ? "\u5DF2\u786E\u8BA4\u4E3A\u540C\u6B65\u5168\u90E8\u6536\u85CF" : names.length ? `\u5DF2\u8BBE\u4E3A\u53EA\u540C\u6B65\uFF1A${names.join("\u3001")}` : "\u5DF2\u53D6\u6D88\uFF0C\u672A\u8BBE\u7F6E\u540C\u6B65\u8303\u56F4");
        }).open();
        return;
      }
      new CollectionPickerModal(this.app, list, sel, async (chosen) => {
        cfg.collections = chosen;
        cfg.collectionsConfirmed = true;
        await this.saveSettings();
        if (this.settingTab) this.settingTab.display();
        new Notice(chosen.length ? `\u5DF2\u8BBE\u4E3A\u53EA\u540C\u6B65\uFF1A${chosen.join("\u3001")}` : "\u5DF2\u8BBE\u4E3A\u540C\u6B65\u5168\u90E8\u6536\u85CF");
      }).open();
    } catch (e) {
      this._log("error", `\u8BFB\u53D6\u4E13\u8F91\u5931\u8D25\uFF1A${e && e.stack || e}`);
      new Notice("\u8BFB\u53D6\u4E13\u8F91\u5931\u8D25\uFF1A" + e.message);
    }
  }
  /** 打开对话侧栏；已经开着就直接聚焦，不重复开 */
  async openChatView() {
    const existing = this.app.workspace.getLeavesOfType(CHAT_VIEW_TYPE);
    if (existing.length) {
      this.app.workspace.revealLeaf(existing[0]);
      return;
    }
    const leaf = this.app.workspace.getRightLeaf(false);
    if (!leaf) {
      new Notice("\u6253\u4E0D\u5F00\u4FA7\u680F");
      return;
    }
    await leaf.setViewState({ type: CHAT_VIEW_TYPE, active: true });
    this.app.workspace.revealLeaf(leaf);
  }
  /** 同步完有新内容，让已打开的对话侧栏把索引作废，下次提问自动重建 */
  invalidateChatIndex() {
    this.app.workspace.getLeavesOfType(CHAT_VIEW_TYPE).forEach((leaf) => {
      if (leaf.view && typeof leaf.view.invalidateIndex === "function") leaf.view.invalidateIndex();
    });
  }
  onunload() {
    this.clearAutoSync();
  }
  /**
   * 旧 id（bili2obsidian）设置迁移：插件 id 改成 savault 后，
   * 老用户的设置（含授权码、Cookie）还躺在旧目录里。首次加载时自动搬过来。
   * 只在新目录还没有 data.json、且旧目录存在时触发；旧目录保留不删，可回滚。
   */
  async migrateLegacySettings() {
    try {
      const adapter = this.app.vault.adapter;
      const legacyData = this.app.vault.configDir + "/plugins/bili2obsidian/data.json";
      const currentData = this.manifest.dir + "/data.json";
      if (await adapter.exists(currentData)) return;
      if (!await adapter.exists(legacyData)) return;
      const data = JSON.parse(await adapter.read(legacyData));
      await this.saveData(data);
      console.log("[savault] \u5DF2\u4ECE\u65E7 id bili2obsidian \u8FC1\u79FB\u8BBE\u7F6E");
      new Notice("\u77E5\u8BC6\u6865\u6881\uFF1A\u5DF2\u81EA\u52A8\u8FC1\u79FB\u65E7\u7248\u8BBE\u7F6E\uFF08\u542B\u6388\u6743\u7801\uFF09\uFF0C\u65E0\u9700\u91CD\u65B0\u6FC0\u6D3B");
    } catch (e) {
      console.warn("[savault] \u65E7\u8BBE\u7F6E\u8FC1\u79FB\u5931\u8D25\uFF0C\u53EF\u624B\u52A8\u628A .obsidian/plugins/bili2obsidian/data.json \u590D\u5236\u5230 savault \u76EE\u5F55", e);
    }
  }
  async loadSettings() {
    const loaded = await this.loadData() || {};
    this.settings = {
      ...DEFAULT_SETTINGS,
      ...loaded,
      platforms: { ...DEFAULT_SETTINGS.platforms, ...loaded.platforms || {} },
      target: { ...DEFAULT_SETTINGS.target, ...loaded.target || {} },
      ai: { ...DEFAULT_SETTINGS.ai, ...loaded.ai || {} }
    };
    for (const id of PLATFORM_ORDER) {
      this.settings.platforms[id] = { ...DEFAULT_SETTINGS.platforms[id], ...this.settings.platforms[id] || {} };
    }
    this.settings.target.obsidian = { ...DEFAULT_SETTINGS.target.obsidian, ...this.settings.target.obsidian || {} };
    this.settings.target.notion = { ...DEFAULT_SETTINGS.target.notion, ...this.settings.target.notion || {} };
  }
  async saveSettings() {
    await this.saveData(this.settings);
    this.setupAutoSync();
  }
  setupAutoSync() {
    this.clearAutoSync();
    if (this.settings.autoSync && this.settings.syncIntervalMin > 0) {
      const ms = this.settings.syncIntervalMin * 60 * 1e3;
      this._timer = window.setInterval(() => this.syncAll(), ms);
      this.registerInterval(this._timer);
    }
  }
  clearAutoSync() {
    if (this._timer) {
      window.clearInterval(this._timer);
      this._timer = null;
    }
  }
  /** 按当前目标端配置构造 target 实例 */
  buildTarget() {
    const t = this.settings.target;
    if (t.type === "notion") {
      return core.createNotionTarget({
        http: this.http,
        token: t.notion.token,
        parentId: t.notion.parentId,
        parentType: t.notion.parentType,
        opts: { uploadImages: t.notion.uploadImages }
      });
    }
    return core.createObsidianTarget({
      vault: this.app.vault,
      http: this.http,
      opts: {
        localizeCover: t.obsidian.localizeCover,
        rootPath: t.obsidian.savePath
      }
    });
  }
  /**
   * 扫码登录成功后写入凭证（v0.5.16）
   * @param {string} platformId
   * @param {Object} auth provider.qrLogin 返回的凭证
   */
  async applyQrAuth(platformId, auth) {
    const cfg = this.settings.platforms[platformId];
    if (!cfg) return;
    cfg.auth = Object.assign({}, cfg.auth, auth || {});
    cfg.enabled = true;
    await this.saveSettings();
    const p = core.getProvider(platformId);
    if (!p || typeof p.validate !== "function") return;
    try {
      const r = await p.validate({ auth: cfg.auth, http: this.http });
      if (r && r.ok && r.user) {
        cfg.userLabel = r.user;
        await this.saveSettings();
      }
    } catch (_) {
    }
  }
  /** 同步单个平台 */
  async syncOne(platformId) {
    const p = core.getProvider(platformId);
    if (!p) {
      new Notice("\u672A\u77E5\u5E73\u53F0");
      return;
    }
    const cfg = this.settings.platforms[platformId];
    if (!cfg || !cfg.enabled) {
      new Notice(`${p.name} \u672A\u542F\u7528\uFF0C\u8BF7\u5728\u8BBE\u7F6E\u91CC\u6253\u5F00`);
      return;
    }
    if (this._syncing) {
      new Notice("\u4E0A\u4E00\u6B21\u540C\u6B65\u5C1A\u672A\u5B8C\u6210\uFF0C\u8BF7\u7A0D\u5019");
      return;
    }
    this._syncing = true;
    this._log("info", `\u5F00\u59CB\u540C\u6B65 ${p.name}\uFF08${platformId}\uFF09`);
    try {
      new Notice(`\u5F00\u59CB\u540C\u6B65 ${p.name}\u2026\uFF08\u5982\u5F39\u51FA\u6D4F\u89C8\u5668\u7A97\u53E3\uFF0C\u767B\u5F55\u540E\u70B9\u300C\u5F00\u59CB\u8BFB\u53D6\u300D\uFF09`);
      const isPro = !!this.settings.licenseValid;
      const needHost = platformId === "xiaohongshu" || platformId === "twitter";
      if (needHost && p.capabilities && p.capabilities.collections && !(cfg.collections || []).length && !cfg.collectionsConfirmed) {
        new Notice("\u7B2C\u4E00\u6B21\u540C\u6B65\u524D\uFF0C\u5148\u9009\u62E9\u8981\u540C\u6B65\u54EA\u4E9B\u4E13\u8F91", 4e3);
        await this.promptChooseCollections(platformId);
        if (!(cfg.collections || []).length && !cfg.collectionsConfirmed) {
          new Notice("\u6CA1\u6709\u786E\u8BA4\u540C\u6B65\u8303\u56F4\uFF0C\u5DF2\u53D6\u6D88\u672C\u6B21\u540C\u6B65\u3002\u53EF\u5728\u8BBE\u7F6E\u9875 \u2192 \u300C\u91CD\u65B0\u9009\u62E9\u4E13\u8F91\u300D\u91CC\u518D\u914D");
          return;
        }
      }
      const host = needHost ? await this.openBrowser(p, cfg.auth && cfg.auth.cookie) : void 0;
      if (needHost && !host) {
        new Notice("\u5DF2\u53D6\u6D88\u540C\u6B65\uFF08\u6D4F\u89C8\u5668\u7A97\u53E3\u5DF2\u5173\u95ED\uFF09");
        return;
      }
      const result = await core.sync({
        provider: p,
        target: this.buildTarget(),
        http: this.http,
        auth: cfg.auth,
        collections: cfg.collections || [],
        quota: { max: FREE_QUOTA, used: this.settings.syncedCount || 0, isPro },
        enrich: {
          transcript: isPro && this.settings.fetchTranscript,
          asr: { apiKey: this.settings.dashscopeKey || "", model: "" },
          detail: true,
          ai: isPro && this.settings.ai.enabled ? { enabled: true, baseUrl: this.settings.ai.baseUrl, apiKey: this.settings.ai.key, model: this.settings.ai.model } : { enabled: false }
        },
        renderOpts: {
          rootPath: this.settings.target.obsidian.savePath,
          dirTemplate: this.settings.target.obsidian.dirTemplate,
          linkAuthor: this.settings.target.obsidian.linkAuthor
        },
        webviewHost: host,
        onProgress: (s) => {
          if (s && s.message) new Notice(s.message, 2e3);
        },
        logger: (m) => this._log("info", m),
        // 小宇宙 refresh_token 每次同步都会轮换，必须回写，否则第二次同步必然失败
        onTokenRefresh: async ({ refreshToken }) => {
          if (!refreshToken) return;
          this.settings.platforms[platformId].auth.refreshToken = refreshToken;
          await this.saveSettings();
          this._log("info", "\u5DF2\u56DE\u5199\u8F6E\u6362\u540E\u7684 refresh_token");
        }
      });
      this._log("info", `[${p.name}] \u540C\u6B65\u7ED3\u675F created=${result.created} skipped=${result.skipped} failed=${result.failed} quotaHit=${result.quotaHit} aborted=${result.aborted}`);
      for (const err of result.errors || []) this._log("error", `[${p.name}] ${err}`);
      this.settings.syncedCount = (this.settings.syncedCount || 0) + Math.max(0, result.created);
      await this.saveSettings();
      if (result.quotaHit) {
        new Notice(`\u514D\u8D39\u7248 ${FREE_QUOTA} \u6761\u989D\u5EA6\u5DF2\u7528\u5B8C\u3002\u5347\u7EA7\u6C38\u4E45\u7248\u53EF\u65E0\u9650\u540C\u6B65\uFF08\u8BBE\u7F6E\u9875 \u2192 \u6388\u6743\uFF09`);
      } else if (result.errors.length) {
        new Notice(`${p.name}\uFF1A\u65B0\u589E ${result.created} \u6761\uFF0C${result.errors.length} \u6761\u51FA\u9519\uFF08\u8BE6\u60C5\u89C1\u63D2\u4EF6\u76EE\u5F55 sync.log\uFF09`);
      } else {
        new Notice(`${p.name} \u540C\u6B65\u5B8C\u6210\uFF1A\u65B0\u589E ${result.created} \u6761\uFF0C\u8DF3\u8FC7 ${result.skipped} \u6761`);
      }
    } catch (e) {
      this._log("error", `[${p.name}] \u540C\u6B65\u5F02\u5E38\uFF1A${e && e.stack || e}`);
      new Notice("\u540C\u6B65\u5931\u8D25\uFF1A" + e.message);
    } finally {
      this._syncing = false;
    }
  }
  /** 同步所有已启用的平台 */
  async syncAll() {
    const ids = PLATFORM_ORDER.filter((id) => this.settings.platforms[id] && this.settings.platforms[id].enabled);
    if (!ids.length) {
      new Notice("\u8BF7\u5148\u5728\u8BBE\u7F6E\u91CC\u542F\u7528\u81F3\u5C11\u4E00\u4E2A\u5E73\u53F0");
      return;
    }
    for (const id of ids) await this.syncOne(id);
    this.invalidateChatIndex();
  }
  /**
   * 打开内嵌浏览器（webview 平台用）。
   * 返回一个 Promise，在用户关闭浏览器时用 webview host 兑现。
   */
  openBrowser(provider, authCookie, opts) {
    return new Promise((resolve) => {
      const modal = new BrowserModal(this.app, this, provider, resolve, authCookie, opts);
      modal.open();
      if (opts && typeof opts.onOpened === "function") opts.onOpened(modal);
    });
  }
  /** AI 接口探活 */
  async testAI() {
    return core.testConnection({
      http: this.http,
      baseUrl: this.settings.ai.baseUrl,
      apiKey: this.settings.ai.key
    });
  }
  /** Notion 连接测试 */
  async testNotion() {
    const t = this.settings.target.notion;
    if (!t.token) return { ok: false, msg: "\u8BF7\u5148\u586B Notion token" };
    try {
      const target = core.createNotionTarget({ http: this.http, token: t.token, parentId: t.parentId || "x", parentType: t.parentType });
      const r = await target.ping();
      return { ok: true, msg: `\u5DF2\u8FDE\u63A5\u5230 ${r.user || "Notion"}` };
    } catch (e) {
      return { ok: false, msg: e.message };
    }
  }
};
var ChatView = class extends ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
    this.history = [];
    this._idx = null;
    this._idxAt = 0;
    this._busy = false;
  }
  getViewType() {
    return CHAT_VIEW_TYPE;
  }
  getDisplayText() {
    return "\u95EE\u6536\u85CF";
  }
  getIcon() {
    return "message-circle";
  }
  async onOpen() {
    injectChatStyle();
    this.render();
  }
  async onClose() {
    this.contentEl.empty();
  }
  /** 同步完新内容后由插件调用，让索引失效 */
  invalidateIndex() {
    this._idx = null;
  }
  render() {
    const root = this.contentEl;
    root.empty();
    root.addClass("bridge-chat");
    const head = root.createDiv({ cls: "bridge-chat-head" });
    head.createEl("strong", { text: "\u95EE\u6536\u85CF" });
    this.statusEl = head.createSpan({ cls: "bridge-chat-status", text: "\u672A\u5EFA\u7ACB\u7D22\u5F15" });
    const btnRefresh = head.createEl("button", { text: "\u5237\u65B0\u7D22\u5F15", cls: "bridge-chat-mini" });
    btnRefresh.onclick = () => this.buildIndex(true);
    const btnClear = head.createEl("button", { text: "\u6E05\u7A7A\u5BF9\u8BDD", cls: "bridge-chat-mini" });
    btnClear.onclick = () => {
      this.history = [];
      this.logEl.empty();
      this.statusEl.setText("\u5BF9\u8BDD\u5DF2\u6E05\u7A7A");
    };
    this.logEl = root.createDiv({ cls: "bridge-chat-log" });
    const bar = root.createDiv({ cls: "bridge-chat-input" });
    this.inputEl = bar.createEl("textarea", {
      placeholder: "\u95EE\u95EE\u4F60\u7684\u6536\u85CF\uFF0C\u4F8B\u5982\uFF1A\u6211\u4E0A\u4E2A\u6708\u6536\u85CF\u7684 B\u7AD9\u89C6\u9891\u91CC\u54EA\u51E0\u4E2A\u8BB2\u4E86 Rust\uFF1F"
    });
    this.inputEl.rows = 2;
    this.inputEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        this.send();
      }
    });
    this.sendBtn = bar.createEl("button", { text: "\u53D1\u9001", cls: "mod-cta" });
    this.sendBtn.onclick = () => this.send();
    this.buildIndex(false);
  }
  /** 扫库建索引。几千条的库是秒级，但要给用户可见的状态 */
  async buildIndex(force) {
    if (this.statusEl) this.statusEl.setText("\u6B63\u5728\u626B\u63CF\u2026");
    try {
      const rootPath = (this.plugin.settings.target.obsidian || {}).savePath || "\u77E5\u8BC6\u6865\u6881/";
      const vi = core.createVaultIndex({ vault: this.app.vault, rootPath });
      const entries = await vi.scan({ force: !!force });
      this._idx = core.buildIndex(entries);
      this._idxAt = Date.now();
      if (this.statusEl) {
        this.statusEl.setText(entries.length ? `\u5DF2\u7D22\u5F15 ${entries.length} \u6761` : "\u5E93\u662F\u7A7A\u7684\uFF0C\u5148\u540C\u6B65");
      }
    } catch (e) {
      if (this.statusEl) this.statusEl.setText("\u626B\u63CF\u5931\u8D25\uFF1A" + (e.message || e));
    }
  }
  async ensureIndex() {
    if (this._idx && Date.now() - this._idxAt < CHAT_INDEX_TTL_MS) return this._idx;
    await this.buildIndex(false);
    return this._idx;
  }
  bubble(role, text) {
    const el = this.logEl.createDiv({ cls: `bridge-chat-msg bridge-chat-${role}` });
    el.setText(text);
    this.logEl.scrollTop = this.logEl.scrollHeight;
    return el;
  }
  async send() {
    const q = (this.inputEl.value || "").trim();
    if (!q || this._busy) return;
    const s = this.plugin.settings;
    if (!s.licenseValid) {
      new Notice("\u300C\u95EE\u6536\u85CF\u300D\u662F\u6C38\u4E45\u7248\u529F\u80FD\uFF0C\u8BF7\u5148\u5728\u8BBE\u7F6E\u91CC\u586B\u5165\u6388\u6743\u7801");
      return;
    }
    if (s.target.type !== "obsidian") {
      new Notice("\u5F53\u524D\u5199\u5165\u76EE\u6807\u662F Notion\uFF0C\u300C\u95EE\u6536\u85CF\u300D\u53EA\u652F\u6301 Obsidian \u6A21\u5F0F");
      return;
    }
    const ai = s.ai || {};
    if (!ai.enabled || !ai.baseUrl || !ai.key) {
      new Notice("\u8BF7\u5148\u5728\u8BBE\u7F6E\u91CC\u5F00\u542F AI\uFF0C\u586B\u597D\u63A5\u53E3\u5730\u5740\u4E0E Key");
      return;
    }
    this._busy = true;
    this.sendBtn.disabled = true;
    this.inputEl.value = "";
    this.bubble("user", q);
    const out = this.bubble("assistant", "\u68C0\u7D22\u4E2D\u2026");
    try {
      const idx = await this.ensureIndex();
      if (!idx || !idx.N) {
        out.setText("\u6536\u85CF\u5E93\u91CC\u8FD8\u6CA1\u6709\u5185\u5BB9\u3002\u5148\u540C\u6B65\u51E0\u6761\uFF0C\u518D\u6765\u95EE\u5B83\u3002");
        return;
      }
      const { hits, filter } = core.retrieve(idx, q, { topK: s.chatTopK || 8 });
      out.setText(hits.length ? `\u547D\u4E2D ${hits.length} \u6761\uFF0C\u6B63\u5728\u751F\u6210\u56DE\u7B54\u2026` : "\u6CA1\u68C0\u7D22\u5230\u76F8\u5173\u6536\u85CF\uFF0C\u76F4\u63A5\u95EE\u6A21\u578B\u2026");
      this.renderFilterNote(out, filter);
      const chat = core.createChat({
        http: this.plugin.http,
        baseUrl: ai.baseUrl,
        apiKey: ai.key,
        model: ai.model
      });
      const r = await chat.ask(q, {
        hits,
        history: this.history,
        maxTurns: s.chatMaxTurns || 6
      });
      this.history.push({ role: "user", content: q });
      this.history.push({ role: "assistant", content: r.answer });
      out.setText(r.answer);
      this.renderSources(out, r.sources, r.dropped);
    } catch (e) {
      out.setText("\u51FA\u9519\u4E86\uFF1A" + (e.message || e));
    } finally {
      this._busy = false;
      this.sendBtn.disabled = false;
      this.logEl.scrollTop = this.logEl.scrollHeight;
    }
  }
  /**
   * 把识别到的筛选条件显示出来。
   * 目的不是好看，是让用户在它理解错的时候能一眼看出来——
   * 静默地筛错了，比不筛选更糟，用户会以为是模型在胡编。
   */
  renderFilterNote(anchorEl, filter) {
    const f = filter || {};
    const parts = [];
    if (f.platform) {
      const p = core.PLATFORMS[f.platform];
      parts.push(p ? p.name : f.platform);
    }
    if (f.savedAfter && f.savedBefore) parts.push(`${f.savedAfter} ~ ${f.savedBefore}`);
    else if (f.savedAfter) parts.push(`${f.savedAfter} \u8D77`);
    else if (f.savedBefore) parts.push(`\u622A\u81F3 ${f.savedBefore}`);
    if (!parts.length) return;
    anchorEl.createDiv({ cls: "bridge-chat-filter", text: "\u9650\u5B9A\uFF1A" + parts.join(" \xB7 ") });
  }
  /** 来源引用：点一下直接跳到那篇笔记，方便核对模型是不是在胡编 */
  renderSources(anchorEl, sources, dropped) {
    if (!sources || !sources.length) return;
    const box = anchorEl.createDiv({ cls: "bridge-chat-sources" });
    box.createDiv({
      cls: "bridge-chat-sources-title",
      text: `\u53C2\u8003 ${sources.length} \u6761${dropped ? `\uFF08\u53E6\u6709 ${dropped} \u6761\u8D85\u51FA\u4E0A\u4E0B\u6587\u88AB\u7701\u7565\uFF09` : ""}`
    });
    sources.forEach((s) => {
      const item = box.createDiv({ cls: "bridge-chat-source" });
      const link = item.createEl("a", {
        text: `[${s.n}] ${s.title}${s.author ? " \xB7 " + s.author : ""}`,
        href: s.url || "#"
      });
      link.onclick = (e) => {
        e.preventDefault();
        this.openSource(s);
      };
    });
  }
  openSource(s) {
    const file = s.path && this.app.vault.getAbstractFileByPath(s.path);
    if (file) {
      this.app.workspace.getLeaf(false).openFile(file);
      return;
    }
    if (s.url) window.open(s.url, "_blank");
  }
};
var CHAT_STYLE_INJECTED = false;
function injectChatStyle() {
  if (CHAT_STYLE_INJECTED) return;
  CHAT_STYLE_INJECTED = true;
  const el = document.createElement("style");
  el.textContent = `
.bridge-chat { display: flex; flex-direction: column; height: 100%; gap: 8px; }
.bridge-chat-head { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.bridge-chat-status { color: var(--text-muted); font-size: 12px; margin-left: auto; }
.bridge-chat-mini { font-size: 11px; padding: 2px 6px; }
.bridge-chat-log {
  flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 8px;
  padding: 4px 2px; border: 1px solid var(--background-modifier-border); border-radius: 6px;
}
.bridge-chat-msg { padding: 6px 9px; border-radius: 8px; font-size: 13px; line-height: 1.5; white-space: pre-wrap; word-break: break-word; }
.bridge-chat-user { background: var(--interactive-accent); color: var(--text-on-accent); align-self: flex-end; max-width: 85%; }
.bridge-chat-assistant { background: var(--background-secondary); align-self: flex-start; max-width: 95%; }
.bridge-chat-sources { margin-top: 6px; border-top: 1px dashed var(--background-modifier-border); padding-top: 5px; }
.bridge-chat-sources-title { font-size: 11px; color: var(--text-muted); margin-bottom: 3px; }
.bridge-chat-source { font-size: 12px; padding: 1px 0; }
.bridge-chat-filter {
  margin-top: 4px; font-size: 11px; color: var(--text-accent);
  background: var(--background-modifier-hover); display: inline-block;
  padding: 1px 6px; border-radius: 4px;
}
.bridge-chat-input { display: flex; gap: 6px; align-items: flex-end; }
.bridge-chat-input textarea { flex: 1; resize: vertical; min-height: 44px; font-size: 13px; }
.bridge-chat-input button { height: 44px; padding: 0 14px; }
`;
  document.head.appendChild(el);
}
var BrowserModal = class extends Modal {
  constructor(app, plugin, provider, resolveHost, authCookie, opts) {
    super(app);
    this.plugin = plugin;
    this.provider = provider;
    this.resolveHost = resolveHost;
    this.authCookie = authCookie || "";
    this.opts = opts || {};
    this.closed = false;
    this.cookiesInjected = false;
  }
  onOpen() {
    const { contentEl } = this;
    const p = this.provider;
    contentEl.empty();
    setModalSize(this, true);
    contentEl.addClass("clipin-browser-modal");
    contentEl.createEl("h3", { text: this.opts.title || `\u6B63\u5728\u8BFB\u53D6 ${p.name} \u6536\u85CF` });
    const hasCookie = !!(this.authCookie || "").trim();
    contentEl.createEl("p", {
      text: this.opts.title ? "" : hasCookie ? "\u68C0\u6D4B\u5230\u8BBE\u7F6E\u91CC\u7684\u767B\u5F55\u4FE1\u606F\uFF0C\u4F1A\u81EA\u52A8\u5C1D\u8BD5\u514D\u767B\u5F55\u3002\u82E5\u7A97\u53E3\u4ECD\u662F\u767B\u5F55\u9875\uFF0C\u8BF7\u5728\u6B64\u767B\u5F55\u4E00\u6B21\uFF08\u53EA\u9700\u8FD9\u4E00\u6B21\uFF0C\u4E4B\u540E\u81EA\u52A8\u4FDD\u6301\uFF09\u3002\u786E\u8BA4\u767B\u5F55\u540E\u70B9\u300C\u5F00\u59CB\u8BFB\u53D6\u300D\u3002" : "\u6B64\u7A97\u53E3\u5C31\u662F\u6D4F\u89C8\u5668\uFF1A\u767B\u5F55\u4E00\u6B21\u540E\u70B9\u300C\u5F00\u59CB\u8BFB\u53D6\u300D\uFF1B\u767B\u5F55\u6001\u4F1A\u81EA\u52A8\u4FDD\u5B58\uFF0C\u4EE5\u540E\u4E0D\u7528\u518D\u767B\u3002",
      cls: "clipin-tip"
    });
    const _prof = webviewProfile(this.plugin.settings.webviewProfile);
    this.plugin._log("info", `[browser] \u6253\u5F00\u8BFB\u53D6\u7A97\u53E3\uFF1A${p.name} partition=persist:clipin-${p.id} \u6863\u4F4D=${_prof.name} hasCookie=${hasCookie}`);
    this.webview = makeWebviewEl(contentEl, `persist:clipin-${p.id}`, p.capabilities && p.capabilities.loginUrl || "about:blank", "clipin-webview", _prof);
    attachWebviewGuards(this.webview, this.plugin, "browser");
    this.webview.addEventListener("dom-ready", async () => {
      if (this.cookiesInjected) return;
      this.cookiesInjected = true;
      const cookieStr = (this.authCookie || "").trim();
      if (cookieStr) {
        const ses = getPartitionSession(`persist:clipin-${p.id}`);
        if (!ses) {
          this.plugin._log("info", `[webview] \u672C\u73AF\u5883\u4E0D\u652F\u6301\u81EA\u52A8\u6CE8\u5165 Cookie\uFF1B\u8BF7\u5728\u7A97\u53E3\u4E2D\u767B\u5F55\u4E00\u6B21\uFF08\u767B\u5F55\u6001\u6301\u4E45\u4FDD\u5B58\u5728 persist:clipin-${p.id}\uFF09`);
          return;
        }
        try {
          const host = new URL(this.webview.getURL() || p.capabilities.loginUrl).hostname;
          const rootDomain = host.split(".").slice(-2).join(".");
          const pairs = cookieStr.split(";").map((x) => x.trim()).filter((x) => x.includes("="));
          let setCount = 0;
          for (const pair of pairs) {
            const eq = pair.indexOf("=");
            const name = pair.slice(0, eq).trim();
            const value = pair.slice(eq + 1).trim();
            if (!name) continue;
            const base = { url: "https://" + rootDomain, domain: "." + rootDomain, name, value };
            try {
              await ses.cookies.set(base);
              setCount += 1;
            } catch (e1) {
              try {
                await ses.cookies.set({ ...base, httpOnly: true });
                setCount += 1;
              } catch (_) {
                this.plugin._log("info", `cookie ${name} \u6CE8\u5165\u8DF3\u8FC7\uFF08\u5206\u533A\u5DF2\u6709\u6216\u88AB\u62D2\uFF09\uFF0C\u4E0D\u5F71\u54CD\u767B\u5F55\u6001`);
              }
            }
          }
          this.plugin._log("info", `\u5DF2\u6CE8\u5165 ${setCount}/${pairs.length} \u6761 cookie \u5230 persist:clipin-${p.id}`);
          this.webview.reload();
        } catch (e) {
          this.plugin._log("info", `\u81EA\u52A8\u6CE8\u5165 Cookie \u672A\u751F\u6548\uFF08${e.message}\uFF09\uFF0C\u8BF7\u5728\u7A97\u53E3\u4E2D\u767B\u5F55\u4E00\u6B21\u5373\u53EF`);
        }
      }
    });
    const row = contentEl.createDiv({ cls: "clipin-btn-row" });
    this.goBtn = row.createEl("button", { text: "\u5DF2\u767B\u5F55\uFF0C\u5F00\u59CB\u8BFB\u53D6" });
    this.goBtn.addClass("mod-cta");
    this.goBtn.onclick = () => this.startRead();
    const close = row.createEl("button", { text: "\u5173\u95ED" });
    close.onclick = () => this.close();
  }
  startRead() {
    if (this.started) return;
    this.started = true;
    if (this.goBtn) {
      this.goBtn.setText("\u8BFB\u53D6\u4E2D\u2026\uFF08\u5B8C\u6210\u540E\u53EF\u5173\u95ED\uFF09");
      this.goBtn.setAttr("disabled", "true");
    }
    this.resolveHost(createWebviewHost({
      webview: this.webview,
      onStatus: (s) => this.plugin._log("info", `[webview] ${s}`)
    }));
  }
  onClose() {
    this.plugin._log("info", "[browser] \u8BFB\u53D6\u7A97\u53E3\u5DF2\u5173\u95ED");
    this.contentEl.empty();
    if (!this.closed) {
      this.closed = true;
      this.resolveHost(null);
    }
  }
};
var CollectionPickerModal = class extends Modal {
  constructor(app, items, selected, onSave) {
    super(app);
    this.items = items;
    this.selected = new Set(selected || []);
    this.onSave = onSave;
  }
  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    setModalSize(this, false);
    contentEl.createEl("h3", { text: "\u9009\u62E9\u8981\u540C\u6B65\u7684\u4E13\u8F91 / \u6536\u85CF\u5939" });
    contentEl.createEl("p", { text: "\u4E00\u4E2A\u90FD\u4E0D\u52FE = \u540C\u6B65\u5168\u90E8\u6536\u85CF\u3002", cls: "clipin-tip" });
    const list = contentEl.createDiv({ cls: "clipin-picker-list" });
    for (const it of this.items) {
      const key = String(it.id || it.title);
      const row = list.createDiv({ cls: "clipin-picker-row" });
      const cb = row.createEl("input", { type: "checkbox" });
      cb.checked = this.selected.has(key) || this.selected.has(String(it.title));
      cb.onchange = () => {
        cb.checked ? this.selected.add(key) : this.selected.delete(key);
      };
      row.createEl("span", { text: it.title + (it.count ? `\uFF08${it.count} \u6761\uFF09` : "") });
    }
    const row2 = contentEl.createDiv({ cls: "clipin-btn-row" });
    const save = row2.createEl("button", { text: "\u4FDD\u5B58", cls: "mod-cta" });
    save.onclick = async () => {
      await this.onSave([...this.selected]);
      this.close();
    };
    const clear = row2.createEl("button", { text: "\u5168\u4E0D\u9009\uFF08\u540C\u6B65\u5168\u90E8\uFF09" });
    clear.onclick = async () => {
      await this.onSave([]);
      this.close();
    };
  }
  onClose() {
    this.contentEl.empty();
  }
};
var ManualCollectionsModal = class extends Modal {
  /**
   * @param {App} app
   * @param {Object} provider
   * @param {Function} onSave (names: string[], all: boolean) => void
   */
  constructor(app, provider, onSave) {
    super(app);
    this.provider = provider;
    this.onSave = onSave;
  }
  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    setModalSize(this, false);
    contentEl.createEl("h3", { text: `\u624B\u52A8\u586B\u8981\u540C\u6B65\u7684${this.provider.name}\u4E13\u8F91` });
    contentEl.createEl("p", {
      text: "\u6253\u5F00\u5C0F\u7EA2\u4E66 App \u2192 \u6211 \u2192 \u6536\u85CF \u2192 \u4E13\u8F91\uFF0C\u628A\u4E13\u8F91\u540D\u539F\u6837\u586B\u8FDB\u6765\uFF0C\u591A\u4E2A\u7528\u9017\u53F7\u5206\u9694\u3002\u540C\u6B65\u65F6\u6309\u540D\u5B57\u5339\u914D\uFF0C\u586B\u9519\u540D\u5B57\u7684\u4E13\u8F91\u4F1A\u88AB\u8DF3\u8FC7\u5E76\u5728\u65E5\u5FD7\u91CC\u8BF4\u660E\u3002",
      cls: "clipin-tip"
    });
    const input = contentEl.createEl("input", { type: "text" });
    input.setAttr("placeholder", "\u4F8B\uFF1AAI \u5B66\u4E60, \u722C\u866B\u5B9E\u6218");
    input.addClass("clipin-manual-collections-input");
    const row = contentEl.createDiv({ cls: "clipin-btn-row" });
    const save = row.createEl("button", { text: "\u4FDD\u5B58\u5E76\u53EA\u540C\u6B65\u8FD9\u4E9B\u4E13\u8F91", cls: "mod-cta" });
    save.onclick = async () => {
      const names = String(input.value || "").split(/[,，、;；\n]+/).map((s) => s.trim()).filter(Boolean);
      await this.onSave(names, false);
      this.close();
    };
    const all = row.createEl("button", { text: "\u540C\u6B65\u5168\u90E8\u6536\u85CF" });
    all.onclick = async () => {
      await this.onSave([], true);
      this.close();
    };
    const cancel = row.createEl("button", { text: "\u53D6\u6D88" });
    cancel.onclick = () => this.close();
  }
  onClose() {
    this.contentEl.empty();
  }
};
var ClipinSettingTab = class extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    const plugin = this.plugin;
    const s = plugin.settings;
    containerEl.empty();
    containerEl.addClass("clipin-settings");
    containerEl.createEl("h2", { text: "\u77E5\u8BC6\u6865\u6881 Savault" });
    const pro = !!s.licenseValid;
    if (pro) {
      containerEl.createEl("p", { text: "\u2705 \u6C38\u4E45\u7248\u5DF2\u6FC0\u6D3B\uFF1A\u5168\u5E73\u53F0\u65E0\u9650\u540C\u6B65 + \u9010\u5B57\u7A3F + AI \u603B\u7ED3", cls: "clipin-pro" });
    } else {
      containerEl.createEl("p", {
        text: `\u514D\u8D39\u7248\uFF1A\u7D2F\u8BA1\u53EF\u540C\u6B65 ${FREE_QUOTA} \u6761\uFF08\u5DF2\u7528 ${s.syncedCount || 0}/${FREE_QUOTA}\uFF09`
      });
      containerEl.createEl("p", {
        text: "\u6C38\u4E45\u7248\uFF1A\u5168\u5E73\u53F0\u65E0\u9650\u540C\u6B65 + \u9010\u5B57\u7A3F + AI \u603B\u7ED3 \u2192 product.aiprice.store/bili",
        cls: "clipin-tip"
      });
    }
    new Setting(containerEl).setName("\u6388\u6743\u7801").setDesc(pro ? "\u5DF2\u6FC0\u6D3B" : "\u7C98\u8D34\u8D2D\u4E70\u540E\u83B7\u5F97\u7684\u6388\u6743\u7801\uFF08CLP- \u6216 B2O- \u5F00\u5934\u90FD\u652F\u6301\uFF09").addText((t) => t.setPlaceholder("CLP-...").setValue(s.licenseKey).onChange(async (v) => {
      s.licenseKey = v.trim();
      await plugin.saveSettings();
    })).addButton((b) => b.setButtonText("\u8D2D\u4E70").onClick(() => window.open("https://product.aiprice.store/bili#buy"))).addButton((b) => b.setButtonText("\u6FC0\u6D3B").setCta().onClick(async () => {
      const ok = await core.verifyLicenseCodeAsync(s.licenseKey);
      s.licenseValid = ok;
      await plugin.saveSettings();
      new Notice(ok ? "\u6C38\u4E45\u7248\u5DF2\u6FC0\u6D3B\uFF0C\u611F\u8C22\u652F\u6301\uFF01" : "\u6388\u6743\u7801\u65E0\u6548\uFF0C\u8BF7\u68C0\u67E5\u540E\u91CD\u8BD5");
      this.display();
    }));
    containerEl.createEl("h2", { text: "\u5199\u5230\u54EA\u91CC" });
    new Setting(containerEl).setName("\u76EE\u6807").setDesc("\u9009\u62E9\u628A\u6536\u85CF\u5199\u8FDB Obsidian \u8FD8\u662F Notion\uFF08\u53EF\u968F\u65F6\u5207\u6362\uFF0C\u4E24\u8FB9\u90FD\u80FD\u5199\uFF09").addDropdown((dd) => {
      dd.addOption("obsidian", "Obsidian\uFF08\u672C\u5730 Markdown\uFF09");
      dd.addOption("notion", "Notion\uFF08\u4E91\u7AEF\u6570\u636E\u5E93\uFF09");
      dd.setValue(s.target.type);
      dd.onChange(async (v) => {
        s.target.type = v;
        await plugin.saveSettings();
        this.display();
      });
    });
    if (s.target.type === "obsidian") {
      const o = s.target.obsidian;
      new Setting(containerEl).setName("\u4FDD\u5B58\u8DEF\u5F84").setDesc("vault \u5185\u7684\u6839\u76EE\u5F55").addText((t) => t.setValue(o.savePath).onChange(async (v) => {
        o.savePath = v.trim() || "\u77E5\u8BC6\u6865\u6881/";
        await plugin.saveSettings();
      }));
      new Setting(containerEl).setName("\u76EE\u5F55\u6A21\u677F").setDesc("\u652F\u6301 {root} {platform} {collection}\uFF0C\u9ED8\u8BA4\u6309\u5E73\u53F0\u4E0E\u6536\u85CF\u5939\u5206\u5C42").addText((t) => t.setValue(o.dirTemplate).onChange(async (v) => {
        o.dirTemplate = v.trim();
        await plugin.saveSettings();
      }));
      new Setting(containerEl).setName("\u5C01\u9762\u672C\u5730\u5316").setDesc("\u628A\u5C01\u9762\u4E0B\u8F7D\u5230\u672C\u5730\uFF0C\u907F\u514D\u5916\u94FE\u5931\u6548").addToggle((g) => g.setValue(o.localizeCover).onChange(async (v) => {
        o.localizeCover = v;
        await plugin.saveSettings();
      }));
      new Setting(containerEl).setName("\u4F5C\u8005\u53CC\u94FE").setDesc("\u628A\u4F5C\u8005\u6E32\u67D3\u6210 [[\u53CC\u94FE]]\uFF0C\u8BA9\u7B14\u8BB0\u8FDB\u5165\u56FE\u8C31\uFF08\u7ADE\u54C1\u6CA1\u6709\u8FD9\u4E2A\uFF09").addToggle((g) => g.setValue(o.linkAuthor).onChange(async (v) => {
        o.linkAuthor = v;
        await plugin.saveSettings();
      }));
    } else {
      const n = s.target.notion;
      new Setting(containerEl).setName("Notion Token").setDesc("\u5728 notion.so/my-integrations \u521B\u5EFA internal integration \u540E\u83B7\u5F97").addText((t) => {
        t.setPlaceholder("ntn_...").setValue(n.token).onChange(async (v) => {
          n.token = v.trim();
          await plugin.saveSettings();
        });
        t.inputEl.type = "password";
      });
      new Setting(containerEl).setName("\u76EE\u6807\u6570\u636E\u5E93 / \u9875\u9762 ID").setDesc("\u4ECE Notion \u94FE\u63A5\u91CC\u53D6\u90A3\u4E32 ID\uFF1B\u522B\u5FD8\u4E86\u5728\u8BE5\u9875\u9762\u300CAdd connections\u300D\u91CC\u6DFB\u52A0\u4F60\u7684 integration").addText((t) => t.setValue(n.parentId).onChange(async (v) => {
        n.parentId = v.trim();
        await plugin.saveSettings();
      }));
      new Setting(containerEl).setName("\u8FDE\u63A5\u6D4B\u8BD5").setDesc("\u9A8C\u8BC1 token \u662F\u5426\u6709\u6548").addButton((b) => b.setButtonText("\u6D4B\u8BD5").onClick(async () => {
        b.setButtonText("\u6D4B\u8BD5\u4E2D\u2026").setDisabled(true);
        const r = await plugin.testNotion();
        new Notice((r.ok ? "\u2705 " : "\u274C ") + r.msg);
        b.setButtonText("\u6D4B\u8BD5").setDisabled(false);
      }));
      new Setting(containerEl).setName("\u5BFC\u5165\u5C01\u9762\u5230 Notion").setDesc("\u628A\u5916\u94FE\u56FE\u7247\u5B58\u8FDB Notion \u81EA\u5BB6\u5B58\u50A8\uFF0C\u907F\u514D CDN \u9632\u76D7\u94FE\u5931\u6548\uFF08\u4F1A\u6162\u4E00\u4E9B\uFF09").addToggle((g) => g.setValue(n.uploadImages).onChange(async (v) => {
        n.uploadImages = v;
        await plugin.saveSettings();
      }));
    }
    containerEl.createEl("h2", { text: "\u540C\u6B65\u54EA\u4E9B\u5E73\u53F0" });
    for (const id of PLATFORM_ORDER) {
      const p = core.getProvider(id);
      if (!p) continue;
      const cfg = s.platforms[id];
      const statusTag = { stable: "\u7A33\u5B9A", beta: "\u6D4B\u8BD5\u7248", experimental: "\u5B9E\u9A8C\u6027" }[p.status] || "";
      const loggedIn = Object.values(cfg.auth || {}).some((v) => !!v);
      new Setting(containerEl).setName(`${p.emoji} ${p.name}`).setDesc([
        statusTag ? `\u3010${statusTag}\u3011` : "",
        cfg.enabled ? loggedIn ? "\u5DF2\u542F\u7528\u5E76\u767B\u5F55" : "\u5DF2\u542F\u7528\uFF0C\u4F46\u672A\u767B\u5F55" : "\u672A\u542F\u7528",
        cfg.userLabel ? `\uFF08${cfg.userLabel}\uFF09` : ""
      ].filter(Boolean).join(" ")).addToggle((g) => g.setValue(cfg.enabled).onChange(async (v) => {
        cfg.enabled = v;
        await plugin.saveSettings();
        this.display();
      }));
      if (cfg.enabled) {
        if (p.warning) {
          containerEl.createEl("p", { text: "\u26A0\uFE0F " + p.warning, cls: "clipin-warning" });
        }
        if (p.capabilities.loginUrl) {
          const loginSetting = new Setting(containerEl).setName("\u3000\u767B\u5F55").setDesc(loggedIn ? "\u5DF2\u4FDD\u5B58\u767B\u5F55\u6001\uFF0C\u53EF\u70B9\u6B64\u91CD\u65B0\u767B\u5F55" : p.qrLogin ? "\u63A8\u8350\u300C\u626B\u7801\u767B\u5F55\u300D\uFF1A\u4E0D\u7528\u5185\u5D4C\u6D4F\u89C8\u5668\uFF0C\u4E0D\u4F1A\u5D29\u6E83" : "\u6253\u5F00\u5185\u5D4C\u6D4F\u89C8\u5668\u767B\u5F55\u540E\u81EA\u52A8\u63D0\u53D6");
          if (p.qrLogin) {
            loginSetting.addButton((b) => {
              b.setButtonText("\u626B\u7801\u767B\u5F55");
              if (typeof b.setTooltip === "function") {
                b.setTooltip("\u5728 Obsidian \u91CC\u76F4\u63A5\u663E\u793A\u4E8C\u7EF4\u7801\uFF0C\u624B\u673A App \u626B\u4E00\u4E0B\u5373\u53EF\u3002\u4E0D\u52A0\u8F7D\u7F51\u9875\uFF0C\u4E0D\u53EF\u80FD\u5D29\u6E83");
              }
              b.setCta();
              b.onClick(() => new QrLoginModal(this.app, plugin, p).open());
            });
          }
          loginSetting.addButton((b) => b.setButtonText("\u6E05\u9664\u767B\u5F55\u6001").setWarning().onClick(async () => {
            const moved = plugin._quarantinePartitions(`\u624B\u52A8\u6E05\u9664 ${p.name} \u767B\u5F55\u6001`);
            cfg.auth = {};
            cfg.userLabel = "";
            await plugin.saveSettings();
            this.display();
            new Notice(moved.length ? `\u5DF2\u6E05\u9664 ${p.name} \u767B\u5F55\u6001\u4E0E\u5185\u5D4C\u6D4F\u89C8\u5668\u6570\u636E\uFF0C\u4E0B\u6B21\u540C\u6B65\u9700\u91CD\u65B0\u767B\u5F55` : `\u5DF2\u6E05\u9664 ${p.name} \u4FDD\u5B58\u7684\u767B\u5F55\u6001\uFF08\u6D4F\u89C8\u5668\u7F13\u5B58\u65E0\u6570\u636E\u6216\u6B63\u88AB\u5360\u7528\uFF0C\u8BF7\u5148\u5173\u95ED\u6240\u6709\u7A97\u53E3\uFF09`);
          })).addButton((b) => {
            b.setButtonText(p.qrLogin ? "\u5185\u5D4C\u767B\u5F55" : "\u767B\u5F55");
            if (!p.qrLogin) b.setCta();
            if (typeof b.setTooltip === "function" && p.qrLogin) {
              b.setTooltip("\u7528\u5185\u5D4C\u6D4F\u89C8\u5668\u6253\u5F00\u767B\u5F55\u9875\u3002\u5C11\u6570 Windows \u673A\u5668\u4F1A\u51FA\u73B0\u6574\u4E2A Obsidian \u5D29\u6E83\uFF0C\u4F18\u5148\u7528\u300C\u626B\u7801\u767B\u5F55\u300D");
            }
            b.onClick(() => new LoginModal(this.app, plugin, p, id === "bilibili" ? "SESSDATA" : null).open());
          }).addButton((b) => b.setButtonText("\u7CFB\u7EDF\u6D4F\u89C8\u5668").setTooltip("\u7528\u7CFB\u7EDF\u9ED8\u8BA4\u6D4F\u89C8\u5668\u6253\u5F00\u767B\u5F55\u9875\u3002\u767B\u5F55\u540E\u6309 F12 \u2192 Console \u7C98\u8D34 document.cookie \u590D\u5236\uFF0C\u518D\u586B\u5230\u4E0B\u65B9 Cookie \u6846\u91CC").onClick(() => {
            try {
              require("electron").shell.openExternal(p.capabilities.loginUrl);
              new Notice("\u5DF2\u5728\u7CFB\u7EDF\u6D4F\u89C8\u5668\u6253\u5F00\u3002\u767B\u5F55\u540E\u6309 F12\uFF0C\u5728 Console \u8F93\u5165 document.cookie \u56DE\u8F66\uFF0C\u590D\u5236\u7ED3\u679C\u7C98\u5230\u4E0B\u65B9\u300CCookie\u300D\u6846\u3002", 12e3);
            } catch (e) {
              new Notice("\u6253\u5F00\u5931\u8D25\uFF1A" + e.message);
            }
          }));
        }
        for (const f of p.authFields) {
          new Setting(containerEl).setName("\u3000" + f.label).setDesc(f.help || "").addText((t) => {
            t.setPlaceholder(f.placeholder || "").setValue(cfg.auth[f.key] || "").onChange(async (v) => {
              cfg.auth[f.key] = v.trim();
              await plugin.saveSettings();
            });
            if (f.secret) t.inputEl.type = "password";
          });
        }
        if (id === "xiaoyuzhou" && !cfg.auth.deviceId) {
          new Setting(containerEl).setName("\u3000\u751F\u6210 Device ID").setDesc("\u5C0F\u5B87\u5B99\u8981\u6C42\u63D0\u4F9B\u8BBE\u5907 ID\uFF0C\u53EF\u81EA\u52A8\u751F\u6210").addButton((b) => b.setButtonText("\u751F\u6210").onClick(async () => {
            cfg.auth.deviceId = core.getProvider("xiaoyuzhou").newDeviceId();
            await plugin.saveSettings();
            this.display();
          }));
        }
        if (p.capabilities && p.capabilities.collections) {
          const sel = cfg.collections || [];
          new Setting(containerEl).setName("\u3000\u540C\u6B65\u8303\u56F4").setDesc(sel.length ? "\u53EA\u540C\u6B65\uFF1A" + sel.join("\u3001") : "\u5168\u90E8\u6536\u85CF\uFF08\u70B9\u300C\u9009\u62E9\u4E13\u8F91\u300D\u6311\uFF0C\u4E00\u4E2A\u4E0D\u52FE = \u5168\u90E8\uFF09").addButton((b) => b.setButtonText(sel.length ? "\u91CD\u65B0\u9009\u62E9" : "\u9009\u62E9\u4E13\u8F91").onClick(async () => {
            b.setButtonText("\u8BFB\u53D6\u4E2D\u2026").setDisabled(true);
            try {
              await plugin.promptChooseCollections(id);
            } finally {
              b.setButtonText((plugin.settings.platforms[id].collections || []).length ? "\u91CD\u65B0\u9009\u62E9" : "\u9009\u62E9\u4E13\u8F91").setDisabled(false);
            }
          })).addButton((b) => b.setButtonText("\u6E05\u7A7A\u8303\u56F4").setWarning().setDisabled(!sel.length).onClick(async () => {
            cfg.collections = [];
            await plugin.saveSettings();
            this.display();
            new Notice("\u5DF2\u6E05\u7A7A\u8303\u56F4\uFF1A\u5C06\u540C\u6B65\u5168\u90E8\u6536\u85CF");
          }));
        }
        new Setting(containerEl).setName("\u3000\u7ACB\u5373\u540C\u6B65").setDesc(`\u628A ${p.name} \u7684\u6536\u85CF\u540C\u6B65\u5230${s.target.type === "notion" ? " Notion" : " Obsidian"}`).addButton((b) => b.setButtonText("\u540C\u6B65").onClick(async () => {
          b.setButtonText("\u540C\u6B65\u4E2D\u2026").setDisabled(true);
          try {
            await plugin.syncOne(id);
          } finally {
            b.setButtonText("\u540C\u6B65").setDisabled(false);
          }
        }));
      }
    }
    containerEl.createEl("h2", { text: "\u589E\u5F3A\u529F\u80FD\uFF08\u6C38\u4E45\u7248\uFF09" });
    new Setting(containerEl).setName("\u540C\u6B65\u9010\u5B57\u7A3F").setDesc(pro ? "\u6293\u53D6\u5B57\u5E55\u5199\u5165\u7B14\u8BB0\uFF08\u6BCF\u4E2A\u6761\u76EE\u591A 2-3 \u6B21\u8BF7\u6C42\uFF0C\u4F1A\u6162\u4E00\u4E9B\uFF09\uFF1B\u5C0F\u7EA2\u4E66\u89C6\u9891\u8D70\u53E3\u64AD\u8F6C\u5199\uFF08\u9700\u914D dashscope key\uFF09" : "\u6C38\u4E45\u7248\u529F\u80FD").addToggle((g) => g.setValue(pro && s.fetchTranscript).setDisabled(!pro).onChange(async (v) => {
      s.fetchTranscript = v;
      await plugin.saveSettings();
    }));
    if (pro) {
      new Setting(containerEl).setName("\u3000\u53E3\u64AD\u8F6C\u5199 dashscope Key").setDesc("\u5C0F\u7EA2\u4E66\u89C6\u9891\u7B14\u8BB0\u7528\uFF1A\u963F\u91CC\u4E91\u767E\u70BC API key\uFF08Paraformer \u76F4\u63A5\u8BFB\u89C6\u9891 URL\uFF0C\u4E0D\u4E0B\u8F7D\u89C6\u9891\uFF09\u3002\u53EA\u5B58\u672C\u5730").addText((t) => {
        t.setPlaceholder("sk-...").setValue(s.dashscopeKey || "").onChange(async (v) => {
          s.dashscopeKey = v.trim();
          await plugin.saveSettings();
        });
        t.inputEl.type = "password";
      });
    }
    new Setting(containerEl).setName("AI \u603B\u7ED3").setDesc(pro ? "\u7528\u4F60\u81EA\u5DF1\u7684 key \u8C03\u7528\u6A21\u578B\uFF0C\u81EA\u52A8\u751F\u6210\u6838\u5FC3\u89C2\u70B9/\u8981\u70B9/\u91D1\u53E5" : "\u6C38\u4E45\u7248\u529F\u80FD").addToggle((g) => g.setValue(pro && s.ai.enabled).setDisabled(!pro).onChange(async (v) => {
      s.ai.enabled = v;
      await plugin.saveSettings();
    }));
    if (pro) {
      new Setting(containerEl).setName("\u3000\u63A5\u53E3\u5730\u5740").setDesc("OpenAI \u517C\u5BB9\u63A5\u53E3\u3002\u4E0D\u77E5\u9053\u9009\u54EA\u5BB6\uFF1F\u53BB product.aiprice.store/ask \u6BD4\u4EF7").addText((t) => t.setValue(s.ai.baseUrl).onChange(async (v) => {
        s.ai.baseUrl = v.trim();
        await plugin.saveSettings();
      }));
      new Setting(containerEl).setName("\u3000API Key").setDesc("\u53EA\u5B58\u5728\u672C\u5730 vault\uFF0C\u4E0D\u4E0A\u4F20").addText((t) => {
        t.setPlaceholder("sk-...").setValue(s.ai.key).onChange(async (v) => {
          s.ai.key = v.trim();
          await plugin.saveSettings();
        });
        t.inputEl.type = "password";
      });
      new Setting(containerEl).setName("\u3000\u6A21\u578B").setDesc("\u5982 deepseek-chat\u3002\u601D\u8003\u8FC7\u7A0B\u4F1A\u88AB\u81EA\u52A8\u5265\u79BB\uFF0C\u4E0D\u4F1A\u5199\u8FDB\u7B14\u8BB0").addText((t) => t.setValue(s.ai.model).onChange(async (v) => {
        s.ai.model = v.trim();
        await plugin.saveSettings();
      }));
      new Setting(containerEl).setName("\u3000\u8FDE\u63A5\u6D4B\u8BD5").addButton((b) => b.setButtonText("\u6D4B\u8BD5").onClick(async () => {
        b.setButtonText("\u6D4B\u8BD5\u4E2D\u2026").setDisabled(true);
        const r = await plugin.testAI();
        new Notice((r.ok ? "\u2705 " : "\u274C ") + r.msg);
        b.setButtonText("\u6D4B\u8BD5").setDisabled(false);
      }));
    }
    containerEl.createEl("h2", { text: "\u95EE\u6536\u85CF" });
    containerEl.createEl("p", {
      text: pro ? "\u7528\u4F60\u81EA\u5DF1\u7684 key\uFF0C\u76F4\u63A5\u95EE\u540C\u6B65\u8FDB\u6765\u7684\u6536\u85CF\u3002\u70B9\u5DE6\u4FA7\u300C\u6D88\u606F\u300D\u56FE\u6807\uFF0C\u6216\u547D\u4EE4\u9762\u677F\u641C\u300C\u95EE\u6536\u85CF\u300D\u3002" : "\u6C38\u4E45\u7248\u529F\u80FD\uFF1A\u7528\u4F60\u81EA\u5DF1\u7684 key \u76F4\u63A5\u95EE\u6536\u85CF\u5E93\u3002\u652F\u6301\u300C\u4E0A\u4E2A\u6708\u6536\u85CF\u7684 B\u7AD9\u89C6\u9891\u91CC\u54EA\u51E0\u4E2A\u8BB2\u4E86 X\u300D\u8FD9\u7C7B\u5E26\u5E73\u53F0\u3001\u4F5C\u8005\u3001\u65F6\u95F4\u7B5B\u9009\u7684\u63D0\u95EE\u2014\u2014\u901A\u7528 RAG \u63D2\u4EF6\u505A\u4E0D\u5230\uFF0C\u5B83\u4EEC\u8BFB\u4E0D\u5230\u7B14\u8BB0\u91CC\u7684\u6765\u6E90\u4FE1\u606F\u3002",
      cls: "setting-item-description"
    });
    if (pro) {
      new Setting(containerEl).setName("\u53C2\u8003\u6761\u6570").setDesc("\u6BCF\u6B21\u63D0\u95EE\u6700\u591A\u68C0\u7D22\u51E0\u6761\u4F5C\u4E3A\u4F9D\u636E\u3002\u8D8A\u591A\u8D8A\u51C6\uFF0C\u4F46\u6D88\u8017 token \u8D8A\u591A").addText((t) => t.setValue(String(s.chatTopK || 8)).onChange(async (v) => {
        const n = parseInt(v, 10);
        s.chatTopK = isNaN(n) ? 8 : Math.min(30, Math.max(1, n));
        await plugin.saveSettings();
      }));
      new Setting(containerEl).setName("\u8BB0\u5FC6\u8F6E\u6570").setDesc("\u4FDD\u7559\u6700\u8FD1\u51E0\u8F6E\u5BF9\u8BDD\u3002\u66F4\u65E9\u7684\u4F1A\u538B\u6210\u6458\u8981\uFF0C\u4E0D\u4F1A\u8BA9\u4E0A\u4E0B\u6587\u65E0\u9650\u81A8\u80C0").addText((t) => t.setValue(String(s.chatMaxTurns || 6)).onChange(async (v) => {
        const n = parseInt(v, 10);
        s.chatMaxTurns = isNaN(n) ? 6 : Math.min(20, Math.max(0, n));
        await plugin.saveSettings();
      }));
      new Setting(containerEl).setName("\u6253\u5F00\u5BF9\u8BDD\u4FA7\u680F").setDesc(s.ai.enabled ? "" : "\u26A0\uFE0F \u9700\u8981\u5148\u5728\u4E0A\u9762\u7684\u300CAI \u603B\u7ED3\u300D\u91CC\u586B\u597D\u63A5\u53E3\u5730\u5740\u4E0E Key").addButton((b) => b.setButtonText("\u6253\u5F00").onClick(() => plugin.openChatView()));
    }
    containerEl.createEl("h2", { text: "\u81EA\u52A8\u540C\u6B65" });
    new Setting(containerEl).setName("\u5F00\u542F\u81EA\u52A8\u540C\u6B65").setDesc("\u6309\u4E0B\u9762\u7684\u95F4\u9694\u5B9A\u65F6\u540C\u6B65\u6240\u6709\u5DF2\u542F\u7528\u5E73\u53F0").addToggle((g) => g.setValue(s.autoSync).onChange(async (v) => {
      s.autoSync = v;
      await plugin.saveSettings();
    }));
    new Setting(containerEl).setName("\u95F4\u9694\uFF08\u5206\u949F\uFF09").setDesc("0 \u8868\u793A\u4E0D\u81EA\u52A8\u540C\u6B65").addText((t) => t.setValue(String(s.syncIntervalMin)).onChange(async (v) => {
      const n = parseInt(v, 10);
      s.syncIntervalMin = isNaN(n) ? 60 : Math.max(0, n);
      await plugin.saveSettings();
    }));
    containerEl.createEl("h2", { text: "\u6545\u969C\u6392\u67E5" });
    new Setting(containerEl).setName("\u5185\u5D4C\u6D4F\u89C8\u5668\u517C\u5BB9\u6863\u4F4D").setDesc("\u6253\u5F00\u767B\u5F55/\u540C\u6B65\u7A97\u53E3\u5C31\u95EA\u9000\u65F6\uFF0C\u5207\u6362\u66F4\u4FDD\u5B88\u7684\u5185\u5D4C\u6D4F\u89C8\u5668\u914D\u7F6E\u3002\u540C\u4E00\u7248\u672C\u5185\u6BCF\u5D29\u4E00\u6B21\u4F1A\u81EA\u52A8\u964D\u4E00\u6863\uFF1B\u63D2\u4EF6\u66F4\u65B0\u540E\u81EA\u52A8\u56DE\u9ED8\u8BA4\u6863\u91CD\u65B0\u9A8C\u8BC1\uFF08\u4EE3\u7801\u53D8\u4E86\uFF0C\u53EF\u80FD\u5C31\u4FEE\u597D\u4E86\uFF09\u3002\u624B\u52A8\u9009\u62E9\u4E0D\u53D7\u6B64\u9650").addDropdown((d) => {
      for (let i = 0; i < WEBVIEW_PROFILES.length; i++) {
        d.addOption(String(i), `${WEBVIEW_PROFILES[i].name}${i === DEFAULT_WEBVIEW_PROFILE ? "\uFF08\u9ED8\u8BA4\uFF09" : ""}`);
      }
      d.setValue(String(plugin.settings.webviewProfile));
      d.onChange(async (v) => {
        plugin.settings.webviewProfile = parseInt(v, 10);
        plugin.settings.webviewProfileCrashedAt = "";
        await plugin.saveSettings();
        new Notice(`\u5DF2\u5207\u6362\u5230 ${webviewProfile(plugin.settings.webviewProfile).name}`);
      });
    });
    new Setting(containerEl).setName("\u91CD\u7F6E\u5185\u5D4C\u6D4F\u89C8\u5668\u6570\u636E").setDesc("\u70B9\u300C\u767B\u5F55\u300D/\u5F00\u540C\u6B65\u7A97\u53E3\u5C31\u95EA\u9000\u65F6\u7528\uFF1A\u6E05\u6389\u5185\u5D4C\u6D4F\u89C8\u5668\u7684\u7F13\u5B58\u4E0E\u767B\u5F55\u6001\uFF08\u65E7\u6570\u636E\u6539\u540D\u7559\u5E95\u4E0D\u5220\u9664\uFF09\uFF0C\u7136\u540E\u4ECE\u5E72\u51C0\u72B6\u6001\u91CD\u5EFA\u3002\u9700\u5148\u5173\u95ED\u6240\u6709\u540C\u6B65/\u767B\u5F55\u7A97\u53E3").addButton((b) => b.setButtonText("\u7ACB\u5373\u91CD\u7F6E").setWarning().onClick(() => {
      const moved = plugin._quarantinePartitions("\u624B\u52A8\u91CD\u7F6E");
      new Notice(moved.length ? `\u5DF2\u91CD\u7F6E\uFF08${moved.join(", ")}\uFF09\u3002\u4E0B\u6B21\u6253\u5F00\u767B\u5F55/\u540C\u6B65\u7A97\u53E3\u5C06\u4ECE\u5E72\u51C0\u72B6\u6001\u5F00\u59CB\uFF0C\u9700\u91CD\u65B0\u767B\u5F55\u4E00\u6B21` : "\u6CA1\u6709\u53EF\u91CD\u7F6E\u7684\u6D4F\u89C8\u5668\u6570\u636E\uFF08\u6216\u6587\u4EF6\u6B63\u88AB\u5360\u7528\u2014\u2014\u8BF7\u5148\u5173\u95ED\u6240\u6709\u767B\u5F55/\u540C\u6B65\u7A97\u53E3\u518D\u8BD5\uFF09");
    }));
    new Setting(containerEl).setName("\u8BCA\u65AD\u65E5\u5FD7").setDesc("\u51FA\u9519/\u95EA\u9000\u540E\u628A\u63D2\u4EF6\u76EE\u5F55\u4E0B\u7684 sync.log \u53D1\u7ED9\u5F00\u53D1\u8005\uFF0C\u91CC\u9762\u8BB0\u5F55\u4E86\u5D29\u6E83\u524D\u6BCF\u4E00\u6B65\uFF08\u542B\u6BCF\u79D2\u5185\u5B58\u5FC3\u8DF3\uFF09").addButton((b) => b.setButtonText("\u6253\u5F00\u63D2\u4EF6\u76EE\u5F55").onClick(() => {
      try {
        const path = require("path");
        const base = plugin.app.vault.adapter.getBasePath();
        require("electron").shell.openPath(path.join(base, plugin.app.vault.configDir || ".obsidian", "plugins", "savault"));
      } catch (e) {
        new Notice("\u6253\u5F00\u5931\u8D25\uFF1A" + e.message);
      }
    }));
    new Setting(containerEl).setName("\u53CD\u590D\u95EA\u9000\u7684\u5BF9\u7167\u5B9E\u9A8C\uFF08--disable-gpu\uFF09").setDesc([
      "\u5982\u679C\u91CD\u7F6E\u540E\u4ECD\u7136\u4E00\u70B9\u300C\u767B\u5F55\u300D\u5C31\u6574\u4E2A Obsidian \u95EA\u9000\uFF0C\u8BF4\u660E\u4E0D\u662F\u7F13\u5B58\u95EE\u9898\uFF0C\u800C\u662F\u6E32\u67D3\u8FDB\u7A0B\u5D29\u5728\u89C6\u9891\u89E3\u7801/GPU \u4E0A\u3002",
      "\u505A\u6CD5\uFF1A\u5B8C\u5168\u9000\u51FA Obsidian\uFF08\u542B\u6258\u76D8\uFF09\u2192 \u5728 Obsidian \u5FEB\u6377\u65B9\u5F0F\u300C\u76EE\u6807\u300D\u672B\u5C3E\u52A0\u7A7A\u683C\u548C --disable-gpu \u2192 \u53CC\u51FB\u542F\u52A8 \u2192 \u518D\u70B9\u300C\u767B\u5F55\u300D\u3002",
      "\u82E5\u52A0\u4E0A\u53C2\u6570\u540E\u4E0D\u95EA\u9000\uFF0C\u5C31\u662F GPU \u76F8\u5173\uFF1B\u628A\u7ED3\u679C\u544A\u8BC9\u6211\uFF0C\u6211\u6765\u505A\u65E0 GPU \u964D\u7EA7\u65B9\u6848\u3002"
    ].join("\n")).addButton((b) => b.setButtonText("\u590D\u5236\u53C2\u6570").onClick(() => {
      try {
        navigator.clipboard.writeText("--disable-gpu");
        new Notice("\u5DF2\u590D\u5236 --disable-gpu");
      } catch (e) {
        new Notice("\u590D\u5236\u5931\u8D25\uFF0C\u8BF7\u624B\u52A8\u8F93\u5165\uFF1A--disable-gpu");
      }
    }));
  }
};
module.exports = ClipinPlugin;
module.exports.FREE_QUOTA = FREE_QUOTA;
