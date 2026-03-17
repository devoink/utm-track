# utm-track

[![npm version](https://img.shields.io/npm/v/utm-track.svg)](https://www.npmjs.com/package/utm-track) [![GitHub](https://img.shields.io/badge/GitHub-devoink%2Futm--track-blue)](https://github.com/devoink/utm-track)

落地页 UTM / 推广参数持久化库，支持 **LocalStorage 与 Cookie 双写**、**first / last 归因策略**，站内跳转不丢失；捕获时若已过期会先清除旧数据再写入，`clear()` 为强制清空。

**仓库**: [GitHub](https://github.com/devoink/utm-track) · **在线示例**: [GitHub Pages](https://devoink.github.io/utm-track/)

## 功能概览

- **双写存储**：同一份数据同时写入 LocalStorage 与 Cookie（可关 Cookie 仅用 LS）
- **归因策略**：`first` 有效期内不覆盖，`last` 每次带参访问都覆盖
- **过期控制**：捕获时若发现当前存储已过期，会先清除旧数据再写入新数据；`clear()` 为强制清空
- **onCapture 回调**：写入成功后触发，便于对接统计/埋点
- **双入口**：npm 包（ESM）+ 浏览器 `<script>`（UMD 全局 `UtmTrack`）

---

## 安装

```bash
npm install utm-track
```

---

## 快速开始

### NPM (ESM)

**落地页**：`init` 时加上 `autoCapture: true`，会用当前页 URL 自动捕获一次，无需再调 `captureFromUrl()`。

```js
import UtmTrack from 'utm-track';

// 落地页：init 即完成捕获（不传参时 captureFromUrl 也会用当前页 URL）
UtmTrack.init({
  autoCapture: true,
  expire: 14 * 24 * 60 * 60 * 1000,  // 14 天，单位毫秒
  strategy: 'first',
  storage: { key: 'utm_track_promo', cookie: true },
  onCapture: (params) => console.log('推广来源已记录', params),
});

// 任意页面读取（表单提交、下单等场景）
const promo = UtmTrack.get();
if (promo) {
  console.log(promo.params);       // { utm_source, utm_medium, ... }
  console.log(promo.savedAt);     // 写入时间戳
  console.log(promo.expiresAt);    // 过期时间戳
}
```

需要自己控制时机时，可不用 `autoCapture`，在合适位置调用 `UtmTrack.captureFromUrl()`（不传参即使用当前页地址）。

### Script 标签 (UMD)

```html
<script src="https://unpkg.com/utm-track/dist/utm-track.umd.js"></script>
<script>
  UtmTrack.init({
    autoCapture: true,
    keys: ['utm_source', 'utm_medium', 'ref'],
    expire: 7 * 24 * 60 * 60 * 1000,  // 7 天，单位毫秒
    strategy: 'first',
    storage: { key: 'utm_track_promo', cookie: true },
    onCapture: (params) => console.log('推广来源已记录', params),
  });
  // 落地页到此即可；任意页: var data = UtmTrack.get();
</script>
```

---

## 详细用法

### 何时调用 `captureFromUrl()`

- **省事**：在落地页用 `init({ autoCapture: true })`，init 完成后会自动用当前页 URL 执行一次捕获，无需再写 `captureFromUrl()`。
- **手动**：在落地页加载时调用一次 `captureFromUrl()`；**不传参即使用当前页 `location.search`**，无需传入当前地址。也可传入完整 URL 或仅 query 字符串，用于服务端/测试场景。

```js
// 使用当前页 URL（最常见）
UtmTrack.captureFromUrl();

// 传入完整 URL（如 SSR 把 URL 传给前端）
UtmTrack.captureFromUrl('https://example.com/landing?utm_source=google&utm_medium=cpc');

// 仅传入 query 字符串
UtmTrack.captureFromUrl('?utm_source=baidu&ref=campaign1');
```

### 在表单/下单时带上推广参数

将 `UtmTrack.get()` 得到的 `params` 写入隐藏域或请求体，随表单/接口提交到后端。

```js
const promo = UtmTrack.get();
if (promo) {
  document.querySelector('#utm_source').value = promo.params.utm_source || '';
  document.querySelector('#utm_medium').value = promo.params.utm_medium || '';
  // 或随 Ajax 提交
  fetch('/api/order', {
    method: 'POST',
    body: JSON.stringify({ ...orderData, attribution: promo.params }),
  });
}
```

### 存储配置（`storage`）

```js
// storage.key 为 LocalStorage 的 key，storage.cookie 为是否双写及 Cookie 选项
UtmTrack.init({
  storage: {
    key: 'utm_track_promo',
    cookie: true,   // 或 false 仅用 LS；或 { name, domain, path, sameSite }
  },
});

// 仅用 LS、不写 Cookie
UtmTrack.init({ storage: { key: 'my_promo', cookie: false } });

// 自定义 Cookie 名称与域（如跨子域）
UtmTrack.init({
  storage: {
    key: 'utm_track_promo',
    cookie: { name: 'my_promo', domain: '.example.com', path: '/', sameSite: 'lax' },
  },
});
```

### 清空存储

```js
// 强制清空（同时清 LocalStorage 与 Cookie）
UtmTrack.clear();
```

### 自定义要捕获的参数名

默认会捕获 `utm_source`、`utm_medium`、`utm_campaign`、`utm_content`、`utm_term`、`ref`。可覆盖或扩展；**支持正则**，对 query 的 key 做匹配：

```js
UtmTrack.init({
  keys: [
    'utm_source',
    'ref',
    /^utm_/,           // 匹配所有 utm_ 开头的参数
    /^from_|campaign/, // 匹配 from_xxx 或含 campaign 的 key
  ],
});
```

---

## API 说明

### `init(options?)`

初始化配置，建议在首次使用前调用（使用 script 标签时**必须**先 `init`）。

| 选项 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `storage` | `{ key?, cookie? }` | key 默认 `'utm_track_promo'`，cookie 默认 `true` | 存储配置：`key` 为 LocalStorage 的 key，`cookie` 为 false/true/对象（name、domain、path、sameSite） |
| `keys` | `(string \| RegExp)[]` | 常见 UTM + `ref` | 要捕获的 URL 参数名：字符串为精确匹配（大小写不敏感），正则则对 key 执行 test 匹配 |
| `expire` | `number` | `604800000`（7 天） | 有效期，单位毫秒；<=0 表示不过期 |
| `strategy` | `'first' \| 'last'` | `'first'` | **first**：有效期内不覆盖；**last**：每次带参访问都覆盖 |
| `captureAllQuery` | `boolean` | `false` | 为 `true` 时：只要 URL 中有任一 keys 匹配就触发捕获，且存储该 URL 的**全部** query；为 `false` 时仅存 keys 匹配到的参数 |
| `onCapture` | `(params) => void` | - | 本次写入成功后回调，用于上报/埋点 |
| `autoCapture` | `boolean` | `false` | 为 `true` 时，init 完成后自动用当前页 URL 执行一次 `captureFromUrl()`，落地页只需 init 即可 |

### `captureFromUrl(urlOrSearch?)`

从 URL 或当前页 `location.search` 解析 query，若包含配置的 `keys` 且按当前 `strategy` 允许写入，则**同时写 LocalStorage 与 Cookie**，并调用 `onCapture`。

- 不传参时使用当前页 `location.search`。
- 返回 `{ wrote, reason }`：`wrote` 为是否本次写入；`reason` 为 `'no_params'`（无匹配参数）、`'written'`（已写入）、`'skipped_first_touch'`（有效期内已有记录未覆盖，first 策略）。

### `get()`

读取已存储的推广数据。**读取顺序**：优先 LocalStorage，不可用时再读 Cookie。

- 未过期：返回 `{ params, url, savedAt, expiresAt }`。
- 过期或不存在：返回 `null`。

### `clear()`

清空存储，**同时清除 LocalStorage 与 Cookie**（若已启用 cookie），即强制清除。无参数。

---

## 存储结构

LocalStorage 与 Cookie 存同一份 JSON：

```json
{
  "params": { "utm_source": "google", "utm_medium": "cpc", "ref": "campaign1" },
  "url": "https://example.com/landing?utm_source=google&utm_medium=cpc&ref=campaign1",
  "savedAt": 1710672000000,
  "expiresAt": 1711276800000
}
```

- `url`：捕获时的完整落地页 URL（不传参时为当前页 `location.href`，传 query 时会拼成完整 URL）。

- **LocalStorage**：主存储，key 默认为 `utm_track_promo`（可配置 `storage.key`）。
- **Cookie**：同一 JSON 序列化写入，过期时间与 `expire` 一致（`expire<=0` 时 Cookie 会设较长 max-age）；**约 4KB 限制**，payload 过大会不写 Cookie，仅 LS 有效。

---

## 规则摘要

- 仅当 URL 带有配置的「特征参数」时才会写入。
- **first**：有效期内已有未过期记录则不再覆盖；**last**：每次带参访问都覆盖。
- **捕获时**：若当前存储已过期，会先清除旧数据再写入新数据。
- **清空**：`clear()` 无参数，调用即强制清空。
- Script 入口不会自动执行捕获，需先 `init` 再调用 `captureFromUrl()`。

---

## 本地开发与调试

推荐直接使用 [在线示例](https://devoink.github.io/utm-track/) 体验。本地调试可执行：

```bash
npm install && npm run build && npm run dev
```

浏览器会打开示例页并支持热刷新。带 UTM 测试可在 URL 后加 `?utm_source=google&utm_medium=cpc` 等参数。

---

## 与其它库对比

| 库 | 存储 | 归因 |
|----|------|------|
| **utm-track** | LocalStorage + Cookie 双写 | first / last 可配，有效期内 first 不覆盖 |
| utm-manager | Cookie | first / last / 自定义 |
| utm-persist | LocalStorage | 简单持久化（已归档） |

- 需要**服务端可见**或**跨子域**：Cookie 随请求发送，可配合双写使用。
- 仅需**同源长期备份**：可 `storage: { cookie: false }` 仅用 LocalStorage。

---

## License

MIT
