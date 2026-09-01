/**
 * Bili2Obsidian —— B 站收藏夹同步到 Obsidian 的最小可用插件（V1）
 *
 * 功能概览：
 *   1. 设置页：SESSDATA / 同步间隔 / 开关 / 保存路径 / 封面本地化
 *   2. 登录辅助：Modal 内嵌 webview 打开 bilibili.com，一键提取 SESSDATA
 *   3. 同步引擎：收藏夹列表 → 逐夹分页拉视频 → 写 Markdown → 可选封面本地化
 *   4. 侧边栏图标手动触发同步，Notice 提示进度
 *   5. Cookie 失效（code -101）时提示重新登录；请求间隔 300ms 防风控
 *
 * 接口调用方式参考 ../tools/demo.mjs（已验证）
 * 注意：Obsidian 插件里必须用 requestUrl（绕 CORS），不要用 fetch。
 */

const {
  Plugin,
  PluginSettingTab,
  Setting,
  Modal,
  Notice,
  requestUrl,
  normalizePath,
} = require('obsidian');

/** 浏览器 UA，B 站接口对空 UA 会风控 */
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36';
/** 每次请求之间的间隔（毫秒），防风控 */
const REQUEST_INTERVAL_MS = 300;
/** 收藏夹内容分页大小（B 站接口上限 40） */
const PAGE_SIZE = 40;
/** 免费版额度：累计最多同步 50 条视频笔记 */
const FREE_QUOTA = 50;
/** 授权码签名密钥（离线校验用；买断制单机授权，与分发码生成器配对） */
const LICENSE_SECRET = 'bili2obsidian::v1::aiprice';

/**
 * HMAC-SHA256（Obsidian/Electron 自带 crypto.subtle）
 * 授权码格式：B2O-<nonce8>-<hmac前16位>，本地离线校验，不依赖服务器
 */
async function hmacHex(msg) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(LICENSE_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(msg));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
async function verifyLicenseCode(code) {
  const m = /^B2O-([A-Za-z0-9]{8})-([a-f0-9]{16})$/i.exec((code || '').trim());
  if (!m) return false;
  const expect = (await hmacHex('lic:' + m[1])).slice(0, 16);
  return expect === m[2].toLowerCase();
}

/** 默认设置 */
const DEFAULT_SETTINGS = {
  sessdata: '',          // B 站登录 Cookie（SESSDATA）
  syncIntervalMin: 60,   // 自动同步间隔（分钟）
  autoSync: false,       // 自动同步开关
  savePath: 'Bilibili/', // 笔记保存根目录
  localizeCover: true,   // 是否把封面下载到本地
  licenseKey: '',        // 永久版授权码
  licenseValid: false,   // 授权码校验结果缓存
  syncedCount: 0,        // 已同步笔记数（免费版额度计数）
  fetchSubtitle: false,  // 逐字稿同步（永久版功能）
  folderWhitelist: [],   // 收藏夹白名单（收藏夹 id 数组；空 = 同步全部）
  biliUname: '',         // 缓存的 B 站用户名（登录状态展示用）
};

/** 休眠工具：实现请求间隔 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/* ------------------------------------------------------------------ */
/* 登录辅助 Modal：内嵌 webview 打开 B 站，登录后一键提取 SESSDATA        */
/* ------------------------------------------------------------------ */
class LoginModal extends Modal {
  /**
   * @param {App} app Obsidian App 实例
   * @param {Bili2ObsidianPlugin} plugin 插件实例（用于回写设置）
   */
  constructor(app, plugin) {
    super(app);
    this.plugin = plugin;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass('bili2obsidian-login-modal');
    contentEl.createEl('h3', { text: '登录 B 站账号' });
    contentEl.createEl('p', {
      text: '在下方窗口中扫码/账号登录，成功后点击「提取 Cookie」。',
      cls: 'bili2obsidian-tip',
    });

    // Electron 环境下 <webview> 标签可用（Obsidian 桌面端基于 Electron）
    // 需要 webview 标签支持：Obsidian 默认已允许（isDesktopOnly）
    this.webview = contentEl.createEl('webview');
    this.webview.setAttribute('src', 'https://www.bilibili.com');
    this.webview.setAttribute('allowpopups', '');
    // 使用持久化分区，登录态会保留，下次打开不用重新登录
    this.webview.setAttribute('partition', 'persist:bili2obsidian');
    this.webview.addClass('bili2obsidian-webview');

    const btnRow = contentEl.createDiv({ cls: 'bili2obsidian-btn-row' });
    const extractBtn = btnRow.createEl('button', { text: '提取 Cookie' });
    extractBtn.addClass('mod-cta');
    extractBtn.onclick = () => this.extractCookie();

    const closeBtn = btnRow.createEl('button', { text: '关闭' });
    closeBtn.onclick = () => this.close();
  }

  /** 从 webview 的会话里读取 SESSDATA 并回写到设置 */
  async extractCookie() {
    try {
      // Electron webview 元素提供 getWebContents() 拿到 WebContents，
      // 再通过 session.cookies.get 读取指定 Cookie。
      // TODO（需人工确认）：部分 Obsidian/Electron 版本里 webview 未 attach 完成时
      // getWebContents 可能抛错，正式使用前请在该环境实测一次。
      const webContents = this.webview.getWebContents();
      const cookies = await webContents.session.cookies.get({
        url: 'https://www.bilibili.com',
        name: 'SESSDATA',
      });
      if (!cookies || cookies.length === 0) {
        new Notice('未找到 SESSDATA，请确认已在上方窗口登录 B 站');
        return;
      }
      this.plugin.settings.sessdata = cookies[0].value;
      await this.plugin.saveSettings();
      new Notice('SESSDATA 已提取并保存');
      this.close();
    } catch (e) {
      console.error('[bili2obsidian] 提取 Cookie 失败', e);
      new Notice('提取 Cookie 失败：' + e.message);
    }
  }

  onClose() {
    this.contentEl.empty();
  }
}

/* ------------------------------------------------------------------ */
/* 收藏夹白名单选择弹窗                                                  */
/* ------------------------------------------------------------------ */
class FolderPickModal extends Modal {
  constructor(app, plugin, onDone) {
    super(app);
    this.plugin = plugin;
    this.onDone = onDone;
  }

  async onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl('h3', { text: '选择要同步的收藏夹' });
    contentEl.createEl('p', {
      text: '都不勾选 = 同步全部。勾选后只同步选中的收藏夹。',
      cls: 'bili2obsidian-tip',
    });
    const listEl = contentEl.createDiv({ cls: 'bili2obsidian-folder-list' });
    listEl.setText('加载中…');

    // 拉登录态 + 收藏夹列表
    try {
      if (!this.plugin.settings.sessdata) {
        listEl.setText('请先登录 B 站（设置页 → 登录 B 站）');
        return;
      }
      const nav = await this.plugin.biliApi('https://api.bilibili.com/x/web-interface/nav');
      if (nav.code !== 0 || !nav.data || !nav.data.isLogin) {
        listEl.setText('登录态无效，请重新登录');
        return;
      }
      this.plugin.settings.biliUname = nav.data.uname || '';
      const folders = await this.plugin.biliApi(
        `https://api.bilibili.com/x/v3/fav/folder/created/list-all?up_mid=${nav.data.mid}`
      );
      const list = (folders.data && folders.data.list) || [];
      listEl.empty();
      if (!list.length) { listEl.setText('没有收藏夹'); return; }

      const wl = this.plugin.settings.folderWhitelist || [];
      for (const f of list) {
        const row = listEl.createDiv({ cls: 'bili2obsidian-folder-row' });
        const cb = row.createEl('input', { type: 'checkbox' });
        cb.checked = wl.length === 0 ? true : wl.includes(f.id); // 未配置时视觉全选
        row.createEl('span', { text: `${f.title}（${f.media_count} 条）` });
        cb.onchange = () => {
          let cur = this.plugin.settings.folderWhitelist || [];
          // 从「全选状态」第一次操作时：先固化为全部 id 再增删
          if (cur.length === 0) cur = list.map((x) => x.id);
          if (cb.checked) { if (!cur.includes(f.id)) cur.push(f.id); }
          else { cur = cur.filter((x) => x !== f.id); }
          // 全部勾选 = 回到「不限制」
          this.plugin.settings.folderWhitelist = cur.length === list.length ? [] : cur;
        };
      }
      const btnRow = contentEl.createDiv({ cls: 'bili2obsidian-btn-row' });
      const saveBtn = btnRow.createEl('button', { text: '保存' });
      saveBtn.addClass('mod-cta');
      saveBtn.onclick = async () => {
        await this.plugin.saveSettings();
        new Notice('收藏夹选择已保存');
        this.close();
        if (this.onDone) this.onDone();
      };
    } catch (e) {
      listEl.setText('加载失败：' + e.message);
    }
  }

  onClose() {
    this.contentEl.empty();
  }
}

/* ------------------------------------------------------------------ */
/* 主插件                                                              */
/* ------------------------------------------------------------------ */
class Bili2ObsidianPlugin extends Plugin {
  async onload() {
    await this.loadSettings();

    // 侧边栏图标：点击手动同步
    this.addRibbonIcon('star', 'Bili2Obsidian：立即同步收藏夹', async () => {
      await this.syncFavorites();
    });

    // 命令面板入口
    this.addCommand({
      id: 'sync-favorites',
      name: '同步 B 站收藏夹',
      callback: () => this.syncFavorites(),
    });

    this.addSettingTab(new Bili2ObsidianSettingTab(this.app, this));
    this.setupAutoSync();
    console.log('[bili2obsidian] 插件已加载');
  }

  onunload() {
    this.clearAutoSync();
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
    this.setupAutoSync(); // 设置变化后重建定时器
  }

  /** 按设置重建自动同步定时器（Obsidian 注册的 interval 会随插件卸载自动清理） */
  setupAutoSync() {
    this.clearAutoSync();
    if (this.settings.autoSync && this.settings.syncIntervalMin > 0) {
      const ms = this.settings.syncIntervalMin * 60 * 1000;
      this._timer = window.setInterval(() => this.syncFavorites(), ms);
      this.registerInterval(this._timer);
    }
  }

  clearAutoSync() {
    if (this._timer) {
      window.clearInterval(this._timer);
      this._timer = null;
    }
  }

  /* ------------------------- 网络层 ------------------------- */

  /**
   * 带 Cookie 头请求 B 站 API，返回解析后的 JSON。
   * 使用 requestUrl 绕开浏览器 CORS 限制。
   * @param {string} url 接口地址
   * @param {string} [referer] 可选 Referer
   */
  async biliApi(url, referer) {
    const resp = await requestUrl({
      url,
      headers: {
        'User-Agent': UA,
        Referer: referer || 'https://www.bilibili.com',
        Cookie: this.settings.sessdata ? `SESSDATA=${this.settings.sessdata}` : '',
      },
    });
    return resp.json;
  }

  /* ------------------------- 同步引擎 ------------------------- */

  /** 同步入口：登录态校验 → 收藏夹列表 → 逐夹同步 */
  async syncFavorites() {
    if (this._syncing) {
      new Notice('上一次同步尚未完成，请稍候');
      return;
    }
    if (!this.settings.sessdata) {
      new Notice('请先设置 SESSDATA（设置页可内嵌登录提取）');
      return;
    }
    this._syncing = true;
    try {
      // 1) 登录态校验：拿 mid，同时验证 Cookie 有效性
      const nav = await this.biliApi('https://api.bilibili.com/x/web-interface/nav');
      // code -101：账号未登录 / Cookie 失效
      if (nav.code === -101 || !nav.data || !nav.data.isLogin) {
        new Notice('B 站登录已失效（code -101），请重新登录并更新 SESSDATA');
        return;
      }
      const mid = nav.data.mid;
      this.settings.biliUname = nav.data.uname || '';
      new Notice(`已登录：${nav.data.uname}，开始同步收藏夹…`);

      // 2) 拉取收藏夹列表
      await sleep(REQUEST_INTERVAL_MS);
      const folders = await this.biliApi(
        `https://api.bilibili.com/x/v3/fav/folder/created/list-all?up_mid=${mid}`
      );
      if (folders.code !== 0) {
        new Notice('获取收藏夹列表失败：' + (folders.message || folders.code));
        return;
      }
      let list = (folders.data && folders.data.list) || [];
      // 收藏夹白名单：非空时只同步选中的
      const wl = this.settings.folderWhitelist || [];
      if (wl.length) list = list.filter((f) => wl.includes(f.id));
      let created = 0, skipped = 0;

      // 3) 逐收藏夹同步
      let quotaHit = false;
      for (const folder of list) {
        const result = await this.syncOneFolder(folder);
        created += result.created;
        skipped += result.skipped;
        if (result.quotaHit) { quotaHit = true; break; }
      }
      await this.saveSettings(); // 持久化 syncedCount
      if (quotaHit) {
        new Notice(`免费版 ${FREE_QUOTA} 条额度已用完（已同步 ${this.settings.syncedCount} 条）`);
      } else {
        new Notice(`同步完成：新增 ${created} 条，跳过 ${skipped} 条（共 ${list.length} 个收藏夹）`);
      }
    } catch (e) {
      console.error('[bili2obsidian] 同步失败', e);
      new Notice('同步失败：' + e.message);
    } finally {
      this._syncing = false;
    }
  }

  /**
   * 同步单个收藏夹：分页拉视频 → 逐条写 Markdown
   * @returns {Promise<{created:number, skipped:number}>}
   */
  async syncOneFolder(folder) {
    let created = 0, skipped = 0;
    let pn = 1;
    while (true) {
      await sleep(REQUEST_INTERVAL_MS);
      const fav = await this.biliApi(
        `https://api.bilibili.com/x/v3/fav/resource/list?media_id=${folder.id}&ps=${PAGE_SIZE}&pn=${pn}`
      );
      if (fav.code !== 0) {
        new Notice(`收藏夹「${folder.title}」拉取失败：${fav.message || fav.code}`);
        break;
      }
      const medias = (fav.data && fav.data.medias) || [];
      for (const media of medias) {
        // 免费版额度闸门：累计 50 条后停止
        if (!this.settings.licenseValid && this.settings.syncedCount >= FREE_QUOTA) {
          new Notice(`免费版已同步满 ${FREE_QUOTA} 条。升级永久版可无限同步 + 逐字稿（见设置页）`);
          return { created, skipped, quotaHit: true };
        }
        // 失效视频（is_deleted / title 为空）跳过
        if (!media.bvid || media.attr === 9 || media.title === '已失效视频') {
          skipped++;
          continue;
        }
        // 增量逻辑：vault 内已存在同 bvid 的 frontmatter 则跳过
        if (await this.existsByBvid(media.bvid)) {
          skipped++;
          continue;
        }
        try {
          await this.writeVideoNote(media, folder.title);
          created++;
          this.settings.syncedCount++;
        } catch (e) {
          console.error(`[bili2obsidian] 写入失败 ${media.bvid}`, e);
        }
        await sleep(REQUEST_INTERVAL_MS);
      }
      // 翻页判断：has_more 为 false 或本页为空则结束
      if (!fav.data || !fav.data.has_more || medias.length === 0) break;
      pn++;
    }
    return { created, skipped };
  }

  /**
   * 检查 vault 中是否已有包含该 bvid 的笔记（扫描保存目录下的 md 文件 frontmatter）
   * 数据量不大时直接全文匹配 "bvid: BV..." 足够快
   */
  async existsByBvid(bvid) {
    const folderPath = normalizePath(this.settings.savePath);
    const folder = this.app.vault.getAbstractFileByPath(folderPath);
    if (!folder) return false;
    // 只扫保存根目录及其子目录里的 md 文件
    const files = this.app.vault.getMarkdownFiles().filter((f) =>
      f.path.startsWith(folderPath.endsWith('/') ? folderPath : folderPath + '/')
    );
    for (const file of files) {
      const cache = this.app.metadataCache.getFileCache(file);
      const fmBvid = cache && cache.frontmatter && cache.frontmatter.bvid;
      if (fmBvid === bvid) return true;
    }
    return false;
  }

  /** 生成笔记文件名：收藏夹名/标题(bvid).md，过滤非法字符 */
  async writeVideoNote(media, folderTitle) {
    const root = normalizePath(this.settings.savePath);
    const folderDir = normalizePath(`${root}/${this.sanitize(folderTitle)}`);
    await this.ensureFolder(root);
    await this.ensureFolder(folderDir);

    const fileName = `${this.sanitize(media.title)}(${media.bvid}).md`;
    const filePath = normalizePath(`${folderDir}/${fileName}`);
    const favTime = media.fav_time
      ? new Date(media.fav_time * 1000).toISOString().slice(0, 10)
      : '';

    // 封面本地化：下载到 Bilibili/Media/{bvid}.jpg
    let coverRef = media.cover || '';
    if (this.settings.localizeCover && media.cover) {
      const local = await this.downloadCover(media.bvid, media.cover);
      if (local) coverRef = local;
    }

    // 逐字稿（永久版功能）：view 接口拿 cid → player/v2 拿字幕 → 拼接正文
    let subtitleSection = '';
    if (this.settings.licenseValid && this.settings.fetchSubtitle) {
      const sub = await this.fetchSubtitle(media.bvid);
      if (sub) {
        subtitleSection = ['', '## 逐字稿', '', sub, ''].join('\n');
      }
    }

    // frontmatter：bvid/title/up/link/duration/fav_time/tags
    const md = [
      '---',
      `bvid: ${media.bvid}`,
      `title: ${JSON.stringify(media.title)}`,
      `up: ${JSON.stringify(media.upper && media.upper.name || '')}`,
      `link: https://www.bilibili.com/video/${media.bvid}`,
      `duration: ${media.duration || 0}`,
      `fav_time: ${favTime}`,
      `tags: [bilibili, 收藏]`,
      '---',
      '',
      `# ${media.title}`,
      '',
      `> UP 主：${media.upper ? media.upper.name : '未知'}`,
      '',
      `![cover](${coverRef})`,
      '',
      media.intro || '',
      subtitleSection,
      `[B 站原文链接](https://www.bilibili.com/video/${media.bvid})`,
      '',
    ].join('\n');

    await this.app.vault.create(filePath, md);
  }

  /**
   * 抓取视频字幕/逐字稿（永久版）
   * 流程：view 接口拿 cid → player/v2 拿字幕列表 → 下载第一条字幕正文
   * 无字幕返回 null（UP 主没传且 AI 字幕未开，属正常情况）
   */
  async fetchSubtitle(bvid) {
    try {
      await sleep(REQUEST_INTERVAL_MS);
      const view = await this.biliApi(`https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`);
      const cid = view.data && view.data.cid;
      if (!cid) return null;
      await sleep(REQUEST_INTERVAL_MS);
      const player = await this.biliApi(
        `https://api.bilibili.com/x/player/v2?bvid=${bvid}&cid=${cid}`,
        `https://www.bilibili.com/video/${bvid}`
      );
      const subs = player.data && player.data.subtitle && player.data.subtitle.subtitles || [];
      if (!subs.length) return null;
      await sleep(REQUEST_INTERVAL_MS);
      const body = await this.biliApi(subs[0].subtitle_url.replace(/^\/\//, 'https://'));
      if (!body.body || !body.body.length) return null;
      // 合并为带时间轴的段落文本（[mm:ss] 内容）
      return body.body
        .map((line) => `[${this.fmtTime(line.from)}] ${line.content}`)
        .join('\n');
    } catch (e) {
      console.error(`[bili2obsidian] 字幕抓取失败 ${bvid}`, e);
      return null;
    }
  }

  /** 秒 → mm:ss */
  fmtTime(sec) {
    const s = Math.floor(sec || 0);
    return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  }

  /** 下载封面到本地，成功返回相对路径（供 Markdown 引用），失败返回 null */
  async downloadCover(bvid, coverUrl) {
    try {
      const mediaDir = normalizePath(`${this.settings.savePath}/Media`);
      await this.ensureFolder(mediaDir);
      const imgPath = normalizePath(`${mediaDir}/${bvid}.jpg`);
      if (this.app.vault.getAbstractFileByPath(imgPath)) return imgPath; // 已下载过
      await sleep(REQUEST_INTERVAL_MS);
      const resp = await requestUrl({ url: coverUrl, headers: { 'User-Agent': UA, Referer: 'https://www.bilibili.com' } });
      await this.app.vault.createBinary(imgPath, resp.arrayBuffer);
      return imgPath;
    } catch (e) {
      console.error(`[bili2obsidian] 封面下载失败 ${bvid}`, e);
      return null; // 失败时回退为网络链接
    }
  }

  /** 确保文件夹存在（不存在才创建，避免 createFolder 抛错） */
  async ensureFolder(path) {
    if (!this.app.vault.getAbstractFileByPath(path)) {
      await this.app.vault.createFolder(path);
    }
  }

  /** 过滤文件名非法字符（Windows/Obsidian 通用） */
  sanitize(name) {
    return (name || '未命名')
      .replace(/[\\/:*?"<>|]/g, '_')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 80); // 防止超长文件名
  }
}

/* ------------------------------------------------------------------ */
/* 设置页                                                              */
/* ------------------------------------------------------------------ */
class Bili2ObsidianSettingTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl('h2', { text: 'Bili2Obsidian 设置' });

    // ===== 版本与授权 =====
    const pro = this.plugin.settings.licenseValid;
    const verEl = containerEl.createDiv({ cls: 'bili2obsidian-version' });
    if (pro) {
      verEl.createEl('p', { text: '✅ 永久版已激活：无限同步 + 逐字稿', cls: 'bili2obsidian-pro' });
    } else {
      verEl.createEl('p', {
        text: `免费版：可同步 ${FREE_QUOTA} 条视频笔记（已用 ${this.plugin.settings.syncedCount}/${FREE_QUOTA}）`,
      });
      verEl.createEl('p', {
        text: '永久版 ¥99 买断：无限同步 + 逐字稿 + AI 总结（V2 免费升级）→ https://product.aiprice.store/bili',
        cls: 'bili2obsidian-tip',
      });
    }
    new Setting(containerEl)
      .setName('授权码')
      .setDesc(pro ? '已激活永久版' : '粘贴购买后获得的授权码（格式 B2O-XXXXXXXX-xxxxxxxxxxxxxxxx）')
      .addText((text) =>
        text
          .setPlaceholder('B2O-...')
          .setValue(this.plugin.settings.licenseKey)
          .onChange(async (value) => {
            this.plugin.settings.licenseKey = value.trim();
            await this.plugin.saveSettings();
          })
      )
      .addButton((btn) =>
        btn
          .setButtonText('购买授权码')
          .onClick(() => window.open('https://product.aiprice.store/bili#buy'))
      )
      .addButton((btn) =>
        btn
          .setButtonText('激活')
          .setCta()
          .onClick(async () => {
            const ok = await verifyLicenseCode(this.plugin.settings.licenseKey);
            this.plugin.settings.licenseValid = ok;
            await this.plugin.saveSettings();
            new Notice(ok ? '永久版已激活，感谢支持！' : '授权码无效，请检查后重试');
            this.display(); // 刷新设置页状态
          })
      );

    // ===== B站登录状态 =====
    const uname = this.plugin.settings.biliUname;
    const hasCookie = !!this.plugin.settings.sessdata;
    new Setting(containerEl)
      .setName('B 站登录状态')
      .setDesc(hasCookie ? (uname ? `已登录：${uname}` : '已保存 Cookie（点同步验证有效性）') : '未登录。点右侧按钮内嵌登录，自动提取登录态')
      .addButton((btn) =>
        btn
          .setButtonText(hasCookie ? '重新登录' : '登录 B 站')
          .setCta()
          .onClick(() => new LoginModal(this.app, this.plugin).open())
      )
      .addButton((btn) =>
        btn
          .setButtonText('退出登录')
          .setWarning()
          .onClick(async () => {
            this.plugin.settings.sessdata = '';
            this.plugin.settings.biliUname = '';
            await this.plugin.saveSettings();
            new Notice('已退出登录');
            this.display();
          })
      );

    // SESSDATA 输入框（密码样式防偷窥，高级用户手动粘贴用）
    new Setting(containerEl)
      .setName('SESSDATA Cookie')
      .setDesc('一般不用管：上面的「登录 B 站」会自动填。也可手动粘贴。')
      .addText((text) => {
        text
          .setPlaceholder('粘贴 SESSDATA')
          .setValue(this.plugin.settings.sessdata)
          .onChange(async (value) => {
            this.plugin.settings.sessdata = value.trim();
            await this.plugin.saveSettings();
          });
        text.inputEl.type = 'password';
      });

    // ===== 收藏夹白名单 =====
    const wl = this.plugin.settings.folderWhitelist || [];
    new Setting(containerEl)
      .setName('同步收藏夹')
      .setDesc(wl.length ? `已选 ${wl.length} 个收藏夹（只同步勾选的）` : '默认同步全部收藏夹；点右侧按钮可选择')
      .addButton((btn) =>
        btn
          .setButtonText('选择收藏夹')
          .onClick(() => new FolderPickModal(this.app, this.plugin, () => this.display()).open())
      );

    // 同步间隔（分钟）
    new Setting(containerEl)
      .setName('同步间隔（分钟）')
      .setDesc('自动同步的时间间隔，0 表示不自动同步')
      .addText((text) =>
        text
          .setPlaceholder('60')
          .setValue(String(this.plugin.settings.syncIntervalMin))
          .onChange(async (value) => {
            const n = parseInt(value, 10);
            this.plugin.settings.syncIntervalMin = isNaN(n) ? 60 : Math.max(0, n);
            await this.plugin.saveSettings();
          })
      );

    // 自动同步开关
    new Setting(containerEl)
      .setName('自动同步')
      .setDesc('按上面的间隔定时同步收藏夹')
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.autoSync)
          .onChange(async (value) => {
            this.plugin.settings.autoSync = value;
            await this.plugin.saveSettings();
          })
      );

    // 保存路径
    new Setting(containerEl)
      .setName('保存路径')
      .setDesc('笔记存放的 vault 内目录，默认 Bilibili/')
      .addText((text) =>
        text
          .setPlaceholder('Bilibili/')
          .setValue(this.plugin.settings.savePath)
          .onChange(async (value) => {
            this.plugin.settings.savePath = value.trim() || 'Bilibili/';
            await this.plugin.saveSettings();
          })
      );

    // 逐字稿开关（永久版功能）
    new Setting(containerEl)
      .setName('同步逐字稿（永久版）')
      .setDesc(
        this.plugin.settings.licenseValid
          ? '抓取视频字幕/AI 字幕，写入笔记「逐字稿」章节（每个视频多 2-3 次请求）'
          : '永久版功能：抓取视频字幕/AI 字幕，写入笔记「逐字稿」章节'
      )
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.licenseValid && this.plugin.settings.fetchSubtitle)
          .setDisabled(!this.plugin.settings.licenseValid)
          .onChange(async (value) => {
            this.plugin.settings.fetchSubtitle = value;
            await this.plugin.saveSettings();
          })
      );

    // 封面本地化开关
    new Setting(containerEl)
      .setName('封面本地化')
      .setDesc('把视频封面下载到 保存路径/Media/{bvid}.jpg，关闭则使用网络链接')
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.localizeCover)
          .onChange(async (value) => {
            this.plugin.settings.localizeCover = value;
            await this.plugin.saveSettings();
          })
      );
  }
}

module.exports = Bili2ObsidianPlugin;
