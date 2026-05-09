# X信息屏蔽器

这个项目基于原仓库 [xuanyuanzhifeng/x-block](https://github.com/xuanyuanzhifeng/x-block) 修改而来，我在原基础上做了一些规则和界面上的调整。

## 功能

- 屏蔽 `x.com` 页面中的垃圾信息，特别是黄评
- 支持账号敏感词管理
- 支持白名单账号管理
- 支持内容敏感词在线管理
- 支持点击恢复查看被屏蔽内容

## 当前规则

### 账号规则

以下任一命中即屏蔽：

- 昵称命中账号敏感词
- 昵称包含 `🌸`
- 昵称包含 emoji，且 `@ID` 末尾至少 5 位数字

### 内容规则

以下任一命中即屏蔽：

- 正文含 3 个或以上 emoji
- 命中内容敏感词

### 白名单

- 白名单账号按 `@handle` 精确匹配
- 命中白名单后不再屏蔽

## 使用

1. 打开 `chrome://extensions/`
2. 开启开发者模式
3. 选择“加载已解压的扩展程序”
4. 选择当前项目目录

## 文件

- `manifest.json`: 插件配置
- `content.js`: 页面匹配与遮罩逻辑
- `shared.js`: 规则与存储逻辑
- `popup.html` / `popup.js`: Popup 管理界面
- `options.html` / `options.js`: 完整管理页
