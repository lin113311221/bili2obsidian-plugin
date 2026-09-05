# 知识桥梁 Savault

把你自己的收藏同步成知识库笔记：小红书 / B站 → Obsidian / Notion，两个平台、两个终点，共用一份引擎。

- 官网与下载：https://product.aiprice.store/clipin/
- 免费版：50 条同步额度（元数据 + 封面本地化 + frontmatter + 增量同步）
- 全功能码（内测期免费领，正式版 ¥99 买断）：无限同步 + 问收藏（AI 对话收藏库，BYOK）+ 逐字稿 + AI 总结
- 老用户：旧 `B2O-` / `CLP-` 授权码继续有效；从 bili2obsidian 旧版升级时设置会自动迁移

## 安装

1. 下载 [最新 Release](https://github.com/lin113311221/savault-plugin/releases) 里的 `savault.zip`
2. 在你的 Vault 下新建 `.obsidian/plugins/savault/` 目录，把 zip 里的 `main.js` / `manifest.json` / `styles.css` 解压进去
3. Obsidian → 设置 → 第三方插件 → 关闭安全模式 → 刷新 → 启用「知识桥梁 Savault」
4. 插件设置里配置平台凭证（见下方各平台教程）

> 从旧版 Bili2Obsidian 升级：旧目录 `.obsidian/plugins/bili2obsidian/` 里的设置（含授权码）会在新版首次启动时自动迁移，旧目录保留不删。

## 免打扰采集（v0.5.66 起，默认开）

登录态有效时，同步**不再弹「开始读取」窗口**：插件在离屏页面里取数，同步完自动销毁，全程无窗口。

只有这三种情况才会弹窗让你登录：登录态校验没过、离屏页面起不来、一条数据都没读到（会自动重跑一次）。

设置页可关掉「免打扰采集」，退回每次弹窗确认的老行为。

## 各平台配置教程

### 小红书

**推荐方式：内嵌登录（最省心）**

插件设置 → 小红书 → 点「登录」按钮 → 弹出的窗口里用小红书 App 扫码登录 → 插件自动保存登录态。不需要手动复制任何 cookie。

> 备选：如果内嵌登录不可用，手动复制 cookie：浏览器打开 xiaohongshu.com 并登录 → F12 → Network → 随便点一个请求 → 复制 Request Headers 里的完整 Cookie 字符串 → 粘贴到设置页的 Cookie 输入框。

### B站

**扫码登录（推荐）**：插件设置 → B站 → 点「扫码登录」→ 用 B站 App 扫弹出的二维码 → 自动保存。不需要手动找 SESSDATA。

> 备选：手动填 SESSDATA：浏览器登录 bilibili.com → F12 → Application → Cookies → 找 `SESSDATA` 的值复制粘贴。

### 小宇宙

**refreshToken + deviceId**：手机抓包小宇宙 App 的登录响应获取 refreshToken；deviceId 随便填一个 UUID 即可（插件会用它做请求标识）。

### X（Twitter）

**auth_token cookie**：浏览器登录 x.com → F12 → Application → Cookies → 找 `auth_token` 的值粘贴。

## 可选功能配置

### 口播转写（视频→文字稿）

把视频笔记的口播内容转成文字稿。需要阿里云百炼的 API Key：

1. 打开 [阿里云百炼控制台](https://bailian.console.aliyun.com/#/api-key) → 登录（可用支付宝/淘宝账号）
2. 左侧「API-KEY」→ 创建新的 API Key → 复制 `sk-` 开头的字符串
3. 粘贴到插件设置 → 「口播转写 dashscope Key」
4. 打开「口播转写」开关

> 转写用的是阿里云的 Paraformer 模型，直接读视频地址（不用下载视频）。免费额度对新用户通常够用。

### AI 总结

同步时自动生成核心观点/要点。用你自己的大模型 API Key（BYOK）：

1. 在设置页填「接口地址」（默认 DeepSeek，也兼容任何 OpenAI 格式的 API）
2. 填 API Key 和模型名
3. 打开「AI 总结」开关

### 同步评论（实验功能，默认关）

读取笔记的置顶/热评（最多 5 条），渲染到笔记的「精选评论」区块。很多笔记的关键信息（链接、工具名）在评论区。

- 设置页 → 打开「同步评论」开关（打开时会提示风险，需手动确认）
- ⚠️ 这条链路要逐条跳进详情页并滚动页面触发评论加载，**历史上把整个 Obsidian 带崩过**（Windows 上表现为进程直接消失、日志戛然而止）。所以做成默认关 + 限量试跑（一次最多 3 条），验证稳定后会放开
- 试的时候请从左侧「剪刀」按钮启动同步（单层窗口），不要从设置页点同步
- 崩溃了就重启 Obsidian，回设置页把这个开关关掉即可，正文/转写/AI 总结不受影响

## 合规说明

本插件仅同步你自己账号可见的收藏内容，纯本地运行，仅供个人学习使用。不批量下载、不分发他人内容、不绕过任何付费或权限限制。请合理控制同步频率，勿用于商业抓取。

## 许可

插件本体为专有软件（付费功能需授权码激活）；本仓库仅用于发布与反馈，欢迎开 Issue。
