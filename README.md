# 三角洲行动 · 装备搭配分析站

> Delta Force Hawk Ops 武器/载具/弹药量化评分 · 版本强势推荐 · 搭配构建器

🔗 **线上访问**: https://deltaforce-loadout.github.io/delta-force-loadout/

## 功能特性

### 🎯 搭配构建器
选择武器 + 弹药 + 干员 + 载具，自动计算量化评分：
- **攻击力** — 伤害 × 0.35 + 射速 × 0.25 + 精准 × 0.2 + 射程 × 0.2
- **防御/生存** — 控制性 × 0.3 + 机动性 × 0.3 + 伤害 × 0.2 + 载具装甲
- **机动性** — 武器移速 + 载具速度加成
- **续航/操控** — 操控速度 × 0.4 + 射程 × 0.3 + 弹药容量

### 🔫 武器库
- 30+ 把武器完整数据（突击步枪/冲锋枪/狙击枪/精确射手/机枪/霰弹枪/战斗步枪）
- 按类型/模式/S/A/B级筛选
- 雷达图属性可视化
- 配装码一键复制（可导入游戏）

### 🚁 全面战场载具库
- 15 种载具（坦克/直升机/步战车/攻击机/装甲车/防空炮）
- HP/装甲/武器配置/速度/隐蔽全维度数据
- 载具评分引擎

### 💨 弹药对比
- 16 种弹药口径（5.56/7.62/5.45/9x39/.300/.338等）
- 穿深/伤害/射程条形图对比
- 适用武器标注

### 🏆 版本强势推荐
- 基于社区使用率排序的 S/A 级武器排行
- 持续更新

## 技术栈

- **纯前端** — HTML5 + CSS3 + Vanilla JS，无框架依赖
- **图表** — Chart.js 雷达图
- **部署** — GitHub Pages（免费托管）
- **数据源** — deltaforcetools.gg、deltaforcefps.com、BiliBili Wiki

## 本地运行

```bash
# 直接用浏览器打开 index.html 即可
open index.html

# 或者用任意静态服务器
npx serve .
python -m http.server 8080
```

## GitHub Pages 部署

仓库推送到 GitHub 后，在 **Settings → Pages → Source** 选择 `main` 分支即可自动部署。

## 数据来源

- 武器数据：[deltaforcetools.gg](https://deltaforcetools.gg/weapon-builds)
- 武器攻略：[deltaforcefps.com](https://deltaforcefps.com/)
- 载具资料：BiliBili Wiki
- 官方百科：[playdeltaforce.com](https://www.playdeltaforce.com/act/officialwiki/zh-tw/)

## 免责声明

本项目为粉丝向非官方工具，所有游戏数据均整理自公开信息，与腾讯游戏/英雄游戏无关联。配装码版权归游戏开发商所有。

---

*Built with 🎯 · Delta Force Hawk Ops Fan Project*
