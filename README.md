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
4. 插件设置里配置平台凭证（B站 SESSDATA / 小红书内嵌登录）与目标端

> 从旧版 Bili2Obsidian 升级：旧目录 `.obsidian/plugins/bili2obsidian/` 里的设置（含授权码）会在新版首次启动时自动迁移，旧目录保留不删。

## 合规说明

本插件仅同步你自己账号可见的收藏内容，纯本地运行，仅供个人学习使用。不批量下载、不分发他人内容、不绕过任何付费或权限限制。请合理控制同步频率，勿用于商业抓取。

## 许可

插件本体为专有软件（付费功能需授权码激活）；本仓库仅用于发布与反馈，欢迎开 Issue。
