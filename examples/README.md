# 本地调试示例

本目录用于在本地验证 utm-track 的捕获、读取与清空行为。示例页左侧为安装与 API 文档（含 `storage`、`autoCapture` 等），右侧为可配置的演示区。

## 使用步骤

### 1. 在项目根目录构建

```bash
cd ..   # 回到 utm-track 根目录
npm install
npm run build
```

构建产物在 `dist/`，示例页会通过相对路径引用 `../dist/utm-track.umd.js`。

### 2. 启动本地静态服务

建议用本地服务打开，避免 `file://` 下 Cookie 等行为不一致：

```bash
# 在项目根目录执行
npx serve . -p 3000
```

**开发时需要热刷新**（改 HTML/CSS/JS 或 dist 后自动刷新）：

```bash
npm run dev
```

会启动 live-server，默认打开示例页；修改本目录或 `dist/` 下文件并保存后，浏览器会自动刷新。

### 3. 打开示例页

- **模拟落地页（带 UTM）**：  
  http://localhost:3000/examples/index.html?utm_source=google&utm_medium=cpc&utm_campaign=dev  

- **站内页（无参数）**：  
  http://localhost:3000/examples/index.html  

### 4. 页面上的操作

- **当前 URL**：展示当前地址和 query，便于确认是否带 UTM。
- **本次是否写入**：调用 `captureFromUrl()` 后的返回值（wrote / reason）。
- **当前存储内容**：`UtmTrack.get()` 的结果（未过期则显示 params、url、savedAt、expiresAt）。
- **配置表单**：可修改 `storage.key`、`storage.cookie`、keys、expire、strategy、autoCapture 等，点击「应用配置」后重新 init（若开启 autoCapture 会同时用当前页 URL 执行一次捕获）。
- **模拟落地 URL**：在输入框里填 URL 或 query（如 `?utm_source=baidu&ref=test`），点击后用该字符串调用 `captureFromUrl(url)`，不跳转页面即可测试写入。
- **读取并刷新展示**：再次调用 `get()` 并刷新展示，不重新 init。
- **强制清空**：调用 `clear()` 并刷新展示（无参数，即强制清空）。

可先访问带 UTM 的链接，确认写入；再访问无参链接或点击「模拟落地 URL」，验证 first/last 策略及过期逻辑。
