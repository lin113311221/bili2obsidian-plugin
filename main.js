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
      const maxRetries = conf.maxRetries == null ? 3 : conf.maxRetries;
      const onThrottle = conf.onThrottle || (() => {
      });
      const log = conf.logger || (() => {
      });
      let lastRequestAt = 0;
      async function throttle() {
        if (intervalMs <= 0) return;
        const wait = lastRequestAt + intervalMs - Date.now();
        if (wait > 0) {
          onThrottle(wait);
          await sleep(wait);
        }
        lastRequestAt = Date.now();
      }
      async function fetchOnce(url, opts) {
        await throttle();
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
        _config: { intervalMs, maxRetries }
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
      const maxWaitMs = o.maxWaitMs || 12e4;
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
      for (; ; ) {
        if (Date.now() > deadline) throw new Error("\u8F6C\u5199\u8D85\u65F6\uFF08" + Math.round(maxWaitMs / 1e3) + "s\uFF09");
        await sleep(pollMs);
        const t = await http.json(TASK_URL + taskId, { headers: authHeaders });
        const st = t && t.output && t.output.task_status;
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
      let collections = [];
      if (provider.capabilities && provider.capabilities.collections) {
        progress({ phase: "collections", message: "\u6B63\u5728\u83B7\u53D6\u6536\u85CF\u5939\u5217\u8868\u2026" });
        try {
          collections = await provider.listCollections({ auth: o.auth, http, webviewHost: o.webviewHost });
        } catch (e) {
          log("[engine] \u83B7\u53D6\u6536\u85CF\u5939\u5931\u8D25\uFF1A" + e.message);
          collections = [];
        }
      }
      const whitelist = Array.isArray(o.collections) ? o.collections.filter(Boolean) : [];
      if (whitelist.length) {
        const before = collections.length;
        collections = collections.filter((c) => whitelist.includes(String(c.id)) || whitelist.includes(String(c.title)));
        log(`[engine] \u6536\u85CF\u5939\u767D\u540D\u5355\uFF1A${before} \u2192 ${collections.length}`);
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
            if (detail.transcript) item.transcript = detail.transcript;
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
        loginUrl: WEB
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
        await webviewHost.sleep(2500);
        await webviewHost.scrollToBottom();
        await webviewHost.sleep(1500);
        const captured = await webviewHost.getCaptured();
        const albums = extractAlbums(captured);
        log(`[xhs] \u55C5\u63A2\u5230 ${albums.length} \u4E2A\u4E13\u8F91\uFF08\u6765\u81EA ${captured.length} \u4E2A\u54CD\u5E94\uFF09`);
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
            await webviewHost.clickByText({ selector: '.reds-tab, .feeds-tab, [class*="tab-item"]', text: "\u6536\u85CF" });
            if (albumTitle) {
              await webviewHost.sleep(2e3);
              const clicked = await webviewHost.clickByText({
                selector: '[class*="board"], [class*="album"], [class*="collect"] a, a, div',
                text: albumTitle
              });
              if (!clicked) throw new Error(`\u6CA1\u627E\u5230\u4E13\u8F91\u300C${albumTitle}\u300D\uFF08\u5148\u5728\u8BBE\u7F6E\u91CC\u62C9\u4E00\u6B21\u4E13\u8F91\u5217\u8868\u6838\u5BF9\u540D\u5B57\uFF09`);
              await webviewHost.sleep(2500);
            }
          },
          // 4) 滚动加载，直到没有新数据或到达上限
          async drive() {
            const scrolls = maxScrolls || 60;
            for (let i = 0; i < scrolls; i++) {
              await webviewHost.scrollToBottom();
              await webviewHost.sleep(1200);
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
            if (title && (id || count) && !it.note_card && !it.note_id && it.desc === void 0) {
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
          const t = setTimeout(() => reject(new Error("\u9875\u9762\u52A0\u8F7D\u8D85\u65F6")), timeoutMs || 45e3);
          const handler = () => {
            clearTimeout(t);
            resolve();
          };
          if (webview.executeJavaScript) {
            webview.executeJavaScript("document.readyState").then((rs) => {
              if (rs === "complete" || rs === "interactive") {
                clearTimeout(t);
                resolve();
              }
            }).catch(() => {
            });
          }
          webview.addEventListener("dom-ready", handler, { once: true });
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
        var els = document.querySelectorAll(${JSON.stringify(o.selector || "*")});
        for (var i = 0; i < els.length; i++){
          var t = (els[i].innerText || els[i].textContent || '').trim();
          if (t === ${JSON.stringify(o.text)} || t.indexOf(${JSON.stringify(o.text)}) === 0) {
            els[i].click(); return true;
          }
        }
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
var FREE_QUOTA = 50;
var CHAT_VIEW_TYPE = "knowledge-bridge-chat-view";
var CHAT_INDEX_TTL_MS = 5 * 60 * 1e3;
var PLATFORM_ORDER = ["bilibili", "xiaohongshu", "xiaoyuzhou", "twitter"];
var DEFAULT_SETTINGS = {
  version: 2,
  licenseKey: "",
  licenseValid: false,
  syncedCount: 0,
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
    contentEl.addClass("clipin-login-modal");
    contentEl.createEl("h3", { text: `\u767B\u5F55 ${p.name}` });
    contentEl.createEl("p", {
      text: "\u5728\u4E0B\u65B9\u7A97\u53E3\u4E2D\u767B\u5F55\u540E\uFF0C\u70B9\u51FB\u300C\u63D0\u53D6\u767B\u5F55\u6001\u300D\u3002",
      cls: "clipin-tip"
    });
    this.webview = contentEl.createEl("webview");
    this.webview.setAttribute("src", p.capabilities.loginUrl || "about:blank");
    this.webview.setAttribute("allowpopups", "");
    this.webview.setAttribute("partition", `persist:clipin-${p.id}`);
    this.webview.addClass("clipin-webview");
    const row = contentEl.createDiv({ cls: "clipin-btn-row" });
    const btn = row.createEl("button", { text: "\u63D0\u53D6\u767B\u5F55\u6001" });
    btn.addClass("mod-cta");
    btn.onclick = async () => {
      btn.setAttr("disabled", "true");
      btn.setText("\u63D0\u53D6\u4E2D\u2026");
      try {
        await this.extract();
      } finally {
        btn.removeAttribute("disabled");
        btn.setText("\u63D0\u53D6\u767B\u5F55\u6001");
      }
    };
    const close = row.createEl("button", { text: "\u5173\u95ED" });
    close.onclick = () => this.close();
  }
  async extract() {
    const p = this.provider;
    try {
      const wc = this.webview.getWebContents();
      if (!wc) throw new Error("\u6D4F\u89C8\u5668\u7EC4\u4EF6\u5C1A\u672A\u5C31\u7EEA\uFF0C\u8BF7\u7A0D\u7B49\u4E24\u79D2\u518D\u8BD5");
      let value = "";
      let userId = "";
      if (p.id === "bilibili") {
        const cookies = await wc.session.cookies.get({ url: "https://www.bilibili.com", name: "SESSDATA" });
        if (!cookies || !cookies.length) throw new Error("\u672A\u627E\u5230 SESSDATA\uFF0C\u8BF7\u786E\u8BA4\u5DF2\u5728\u4E0A\u65B9\u7A97\u53E3\u767B\u5F55");
        value = cookies[0].value;
      } else {
        const all = await wc.session.cookies.get({ url: p.capabilities.loginUrl });
        value = (all || []).map((c) => `${c.name}=${c.value}`).join("; ");
        if (!value) throw new Error("\u672A\u8BFB\u5230 Cookie\uFF0C\u8BF7\u786E\u8BA4\u5DF2\u767B\u5F55");
        const uid = (all || []).find((c) => /^(web_session|a1|userid|uid)$/i.test(c.name));
        if (uid) userId = uid.value;
      }
      const cfg = this.plugin.settings.platforms[p.id];
      if (p.id === "bilibili") cfg.auth.sessdata = value;
      else {
        cfg.auth.cookie = value;
        if (p.id === "xiaohongshu") {
          try {
            const href = await this.webview.executeJavaScript("location.href");
            const m = /\/user\/profile\/([a-f0-9]{16,32})/i.exec(href || "");
            if (m) userId = m[1];
          } catch (_) {
          }
          if (userId) cfg.auth.userId = userId;
        }
      }
      cfg.enabled = true;
      await this.plugin.saveSettings();
      new Notice(`${p.name} \u767B\u5F55\u6001\u5DF2\u4FDD\u5B58`);
      this.close();
    } catch (e) {
      console.error("[clipin] \u63D0\u53D6\u767B\u5F55\u6001\u5931\u8D25", e);
      new Notice("\u63D0\u53D6\u5931\u8D25\uFF1A" + e.message);
    }
  }
  onClose() {
    this.contentEl.empty();
  }
};
var ClipinPlugin = class extends Plugin {
  async onload() {
    await this.migrateLegacySettings();
    await this.loadSettings();
    this.http = core.createHttp({ request: makeRequest(), intervalMs: 300 });
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
    this.addSettingTab(new ClipinSettingTab(this.app, this));
    this.setupAutoSync();
    console.log("[clipin] \u5DF2\u52A0\u8F7D\uFF0C\u652F\u6301\u5E73\u53F0\uFF1A" + PLATFORM_ORDER.join(", "));
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
    try {
      new Notice(`\u5F00\u59CB\u540C\u6B65 ${p.name}\u2026`);
      const isPro = !!this.settings.licenseValid;
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
        webviewHost: platformId === "xiaohongshu" || platformId === "twitter" ? await this.openBrowser(p, cfg.auth && cfg.auth.cookie) : void 0,
        onProgress: (s) => {
          if (s && s.message) new Notice(s.message, 2e3);
        },
        logger: (m) => console.log("[clipin] " + m),
        // 小宇宙 refresh_token 每次同步都会轮换，必须回写，否则第二次同步必然失败
        onTokenRefresh: async ({ refreshToken }) => {
          if (!refreshToken) return;
          this.settings.platforms[platformId].auth.refreshToken = refreshToken;
          await this.saveSettings();
          console.log("[clipin] \u5DF2\u56DE\u5199\u8F6E\u6362\u540E\u7684 refresh_token");
        }
      });
      this.settings.syncedCount = (this.settings.syncedCount || 0) + Math.max(0, result.created);
      await this.saveSettings();
      if (result.quotaHit) {
        new Notice(`\u514D\u8D39\u7248 ${FREE_QUOTA} \u6761\u989D\u5EA6\u5DF2\u7528\u5B8C\u3002\u5347\u7EA7\u6C38\u4E45\u7248\u53EF\u65E0\u9650\u540C\u6B65\uFF08\u8BBE\u7F6E\u9875 \u2192 \u6388\u6743\uFF09`);
      } else if (result.errors.length) {
        new Notice(`${p.name}\uFF1A\u65B0\u589E ${result.created} \u6761\uFF0C${result.errors.length} \u6761\u51FA\u9519\uFF08\u8BE6\u89C1\u63A7\u5236\u53F0\uFF09`);
      } else {
        new Notice(`${p.name} \u540C\u6B65\u5B8C\u6210\uFF1A\u65B0\u589E ${result.created} \u6761\uFF0C\u8DF3\u8FC7 ${result.skipped} \u6761`);
      }
    } catch (e) {
      console.error("[clipin] \u540C\u6B65\u5931\u8D25", e);
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
  openBrowser(provider, authCookie) {
    return new Promise((resolve) => {
      const modal = new BrowserModal(this.app, provider, resolve, authCookie);
      modal.open();
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
  constructor(app, provider, resolveHost, authCookie) {
    super(app);
    this.provider = provider;
    this.resolveHost = resolveHost;
    this.authCookie = authCookie || "";
    this.closed = false;
    this.cookiesInjected = false;
  }
  onOpen() {
    const { contentEl } = this;
    const p = this.provider;
    contentEl.empty();
    contentEl.addClass("clipin-browser-modal");
    contentEl.createEl("h3", { text: `\u6B63\u5728\u8BFB\u53D6 ${p.name} \u6536\u85CF` });
    contentEl.createEl("p", {
      text: this.authCookie ? "\u5DF2\u7528\u8BBE\u7F6E\u91CC\u7684 Cookie \u81EA\u52A8\u767B\u5F55\u3002\u786E\u8BA4\u9875\u9762\u662F\u767B\u5F55\u72B6\u6001\u540E\u70B9\u300C\u5F00\u59CB\u8BFB\u53D6\u300D\u3002" : "\u4FDD\u6301\u6B64\u7A97\u53E3\u6253\u5F00\uFF0C\u63D2\u4EF6\u4F1A\u81EA\u52A8\u6EDA\u52A8\u52A0\u8F7D\u3002\u5982\u672A\u767B\u5F55\u8BF7\u5148\u767B\u5F55\uFF0C\u767B\u5F55\u540E\u70B9\u300C\u5DF2\u767B\u5F55\uFF0C\u5F00\u59CB\u8BFB\u53D6\u300D\u3002",
      cls: "clipin-tip"
    });
    this.webview = contentEl.createEl("webview");
    this.webview.setAttribute("src", p.capabilities && p.capabilities.loginUrl || "about:blank");
    this.webview.setAttribute("allowpopups", "");
    this.webview.setAttribute("partition", `persist:clipin-${p.id}`);
    this.webview.addClass("clipin-webview");
    this.webview.addEventListener("dom-ready", async () => {
      if (this.cookiesInjected) return;
      this.cookiesInjected = true;
      const cookieStr = (this.authCookie || "").trim();
      if (!cookieStr) return;
      try {
        const ses = this.webview.getWebContents().session;
        const host = new URL(this.webview.getURL() || p.capabilities.loginUrl).hostname;
        const rootDomain = host.split(".").slice(-2).join(".");
        const pairs = cookieStr.split(";").map((x) => x.trim()).filter((x) => x.includes("="));
        for (const pair of pairs) {
          const eq = pair.indexOf("=");
          const name = pair.slice(0, eq).trim();
          const value = pair.slice(eq + 1).trim();
          if (!name) continue;
          await ses.cookies.set({
            url: "https://" + rootDomain,
            domain: "." + rootDomain,
            name,
            value
          });
        }
        console.log(`[savault] \u5DF2\u6CE8\u5165 ${pairs.length} \u6761 cookie \u5230 persist:clipin-${p.id}`);
        this.webview.reload();
      } catch (e) {
        console.warn("[savault] cookie \u6CE8\u5165\u5931\u8D25\uFF0C\u9000\u56DE\u624B\u52A8\u767B\u5F55\uFF1A", e);
      }
    });
    this.webview.addEventListener("render-process-gone", (e) => {
      console.error("[savault] webview \u5D29\u6E83\uFF1A", e && e.details);
      new Notice("\u5185\u5D4C\u6D4F\u89C8\u5668\u5D29\u4E86\uFF08\u9875\u9762\u592A\u91CD\u6216\u5185\u5B58\u4E0D\u8DB3\uFF09\u3002\u5173\u6389\u672C\u7A97\u53E3\u91CD\u8BD5\u5373\u53EF\uFF0CObsidian \u672C\u4F53\u4E0D\u53D7\u5F71\u54CD\u3002", 8e3);
    });
    const row = contentEl.createDiv({ cls: "clipin-btn-row" });
    const go = row.createEl("button", { text: this.authCookie ? "\u5F00\u59CB\u8BFB\u53D6" : "\u5DF2\u767B\u5F55\uFF0C\u5F00\u59CB\u8BFB\u53D6" });
    go.addClass("mod-cta");
    go.onclick = () => {
      go.setText("\u8BFB\u53D6\u4E2D\u2026");
      go.setAttr("disabled", "true");
      this.resolveHost(createWebviewHost({
        webview: this.webview,
        onStatus: (s) => console.log("[clipin][webview] " + s)
      }));
      go.setText("\u8BFB\u53D6\u4E2D\u2026\uFF08\u5B8C\u6210\u540E\u53EF\u5173\u95ED\uFF09");
    };
    const close = row.createEl("button", { text: "\u5173\u95ED" });
    close.onclick = () => this.close();
  }
  onClose() {
    this.contentEl.empty();
    if (!this.closed) {
      this.closed = true;
      this.resolveHost(null);
    }
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
          new Setting(containerEl).setName("\u3000\u767B\u5F55").setDesc(loggedIn ? "\u5DF2\u4FDD\u5B58\u767B\u5F55\u6001\uFF0C\u53EF\u70B9\u6B64\u91CD\u65B0\u767B\u5F55" : "\u6253\u5F00\u5185\u5D4C\u6D4F\u89C8\u5668\u767B\u5F55\u540E\u63D0\u53D6").addButton((b) => b.setButtonText("\u767B\u5F55").setCta().onClick(() => new LoginModal(this.app, plugin, p, id === "bilibili" ? "SESSDATA" : null).open()));
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
          new Setting(containerEl).setName("\u3000\u53EA\u540C\u6B65\u6307\u5B9A\u4E13\u8F91").setDesc("\u586B\u4E13\u8F91\u540D\uFF0C\u9017\u53F7\u5206\u9694\uFF08\u5982\uFF1A\u79D1\u6280, \u6548\u7387\u5DE5\u5177\uFF09\u3002\u7559\u7A7A = \u540C\u6B65\u5168\u90E8\u6536\u85CF").addText((t) => t.setPlaceholder("\u7559\u7A7A\u540C\u6B65\u5168\u90E8").setValue((cfg.collections || []).join(", ")).onChange(async (v) => {
            cfg.collections = v.split(/[,，]/).map((x) => x.trim()).filter(Boolean);
            await plugin.saveSettings();
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
  }
};
module.exports = ClipinPlugin;
module.exports.FREE_QUOTA = FREE_QUOTA;
