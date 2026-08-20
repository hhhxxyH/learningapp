# 繁简学堂

一个给自己用的繁体字学习网页应用，风格偏多邻国、卡通圆滑。没有打卡、连续天数、经验值、等级等花哨功能，只保留学习和复习。

## 当前学习流程

- 按「组」学习，每组 10 个字。
- 题型只有「繁→简」和「简→繁」选择题，判断题已去掉。
- 选错的字会在本组队列最后再次出现；继续错就继续回到队尾，直到全组每个字都答对。
- 学习中实时显示本组成绩。
- 全组答对后进入临摹：按笔顺描红每个繁体字。
- 一组结束后返回主页，会保留该组的「进入/复习」入口；主页主按钮继续开启下一组。
- 成绩保存在浏览器 `localStorage`（仅自己设备可见），复习已完成的组会保留最高成绩。

## 本地运行（开电脑时）

Windows 双击 `start.bat`，或命令行：

```powershell
node serve.js
```

浏览器打开 http://localhost:4173

> `start.bat` 会优先使用系统里的 `node`；如果找不到，会回退到本项目运行环境中的 Node 路径。

## 手机使用（不开电脑）

本地 `localhost` 只有开电脑时能用。想不开电脑随时在手机上学习，需要把 `app/` 这个静态文件夹发布到免费的 HTTPS 静态托管平台一次，之后手机浏览器打开网址即可；首次打开后建议「添加到主屏幕」，之后就像 App 一样离线使用。

推荐按下面任一方式发布：

### 方式一：Netlify Drop（最简单，临时私密链接）

1. 在手机或电脑浏览器打开 https://app.netlify.com/drop
2. 把 `D:\codex\learningapp\app` 文件夹拖进页面（电脑浏览器操作）
3. 页面会立刻生成一个形如 `https://xxxxx.netlify.app` 的网址
4. 手机浏览器打开该网址，选择「添加到主屏幕」

- 未登录时链接可能只是临时有效；想长期保留需注册免费 Netlify 账号后认领该站点。

### 方式二：GitHub Pages（长期稳定）

1. 在 GitHub 新建一个仓库（可设为 Private，但 Pages 需要公开或 Pro；若介意可改用方式一/三）
2. 把 `D:\codex\learningapp\app` 里的文件推送到该仓库
3. 仓库 Settings → Pages → Source 选 `main` 分支的 `/ (root)` 或把 `app` 内容放到仓库根目录
4. 等待生成 `https://用户名.github.io/仓库名/`，手机打开后「添加到主屏幕」

### 方式三：Vercel（长期稳定）

1. 注册 https://vercel.com 并新建项目
2. 导入 `D:\codex\learningapp`，Framework Preset 选 Other，Root Directory 选 `app`，Build Command 留空，Output Directory 留空（静态）
3. Deploy 后得到 `https://xxx.vercel.app`，手机打开后「添加到主屏幕」

### 为什么首次必须联网

PWA 的 Service Worker 首次安装需要联网缓存全部文件；之后只要不清理浏览器缓存，打开已安装的图标即可离线学习。核心数据 `app/data/characters.js` 约 14 MB，请保证手机首次加载时有网络和足够存储。

## 目录结构

- `app/` 前端页面（静态文件，可直接托管）
  - `index.html`
  - `css/styles.css`
  - `js/app.js`
  - `vendor/hanzi-writer.min.js`
  - `data/characters.js`（由工具生成，体积较大）
  - `manifest.webmanifest`、`sw.js`、图标
- `study_source/` 下载的专业数据源
- `tools/build-data.js` 从数据源构建 `app/data/characters.js`
- `serve.js` 本地静态服务器
- `start.bat` Windows 启动脚本

## 数据来源与许可证

学习内容全部来自网上的现成专业数据，不是手写生成：

- OpenCC 官方繁简词典：https://github.com/BYVoid/OpenCC ，Apache-2.0
  - 数据位于 `study_source/opencc/`
- HanziWriter：https://github.com/chanind/hanzi-writer ，MIT
  - 运行时文件位于 `app/vendor/hanzi-writer.min.js`
  - 许可证见 `app/vendor/hanzi-writer-LICENSE.txt`
- HanziWriter Data / Make Me a Hanzi 笔顺数据：https://github.com/chanind/hanzi-writer-data ，ARPHICPL
  - 数据位于 `study_source/hanzi-writer-data/`
  - 许可证见 `study_source/ARPHICPL.TXT`
- 《通用规范汉字表》8105 字顺序表：https://github.com/iDvel/The-Table-of-General-Standard-Chinese-Characters
  - 数据位于 `study_source/general-standard-characters/`

## 重建学习数据

修改数据源后，运行：

```powershell
node tools/build-data.js
```

脚本会读取 OpenCC 映射、《通用规范汉字表》和 HanziWriter 笔顺数据，重新生成 `app/data/characters.js`。构建时会跳过缺少笔顺数据的汉字，确保临摹题型可用。