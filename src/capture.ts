/**
 * 从 URL 解析 query、按 keys 过滤、按 strategy 决定是否写入
 * 写入时调用 storage 双写并触发 onCapture 回调
 */

import type { UtmTrackPromoData } from './defaults';
import * as storage from './storage';
import type { StorageConfig } from './storage';

/** 解析 query 字符串为键值对（支持 ? 前缀或裸字符串） */
function parseQuery(search: string): Record<string, string> {
  const params: Record<string, string> = {};
  if (!search || search.charAt(0) !== '?') return params;
  const rest = search.slice(1);
  rest.split('&').forEach((pair) => {
    const i = pair.indexOf('=');
    if (i === -1) {
      const key = decodeURIComponent(pair.replace(/\+/g, ' '));
      if (key) params[key] = '';
    } else {
      const key = decodeURIComponent(pair.slice(0, i).replace(/\+/g, ' '));
      const value = decodeURIComponent(pair.slice(i + 1).replace(/\+/g, ' '));
      if (key) params[key] = value;
    }
  });
  return params;
}

/** 只保留 keys 匹配的参数：字符串为精确匹配（大小写不敏感），正则则 test(key) */
function pickParams(all: Record<string, string>, keys: (string | RegExp)[]): Record<string, string> {
  const out: Record<string, string> = {};
  const strSet = new Set(
    keys.filter((p): p is string => typeof p === 'string').map((k) => k.toLowerCase())
  );
  const regexList = keys.filter((p): p is RegExp => p instanceof RegExp);
  for (const [k, v] of Object.entries(all)) {
    if (v === undefined || v === null) continue;
    const match =
      strSet.has(k.toLowerCase()) || regexList.some((re) => re.test(k));
    if (match) out[k] = String(v);
  }
  return out;
}

function hasAnyParam(picked: Record<string, string>): boolean {
  return Object.keys(picked).length > 0;
}

/** 解析为捕获时的完整落地页 URL（用于存储） */
function resolveUrl(urlOrSearch: string | undefined): string {
  if (typeof location === 'undefined') return '';
  if (urlOrSearch === undefined) return location.href;
  if (urlOrSearch.indexOf('://') !== -1) return urlOrSearch;
  const base = location.origin + location.pathname;
  return urlOrSearch.startsWith('?') ? base + urlOrSearch : base + (urlOrSearch.startsWith('/') ? urlOrSearch : '?' + urlOrSearch);
}

/** captureFromUrl 的返回：是否写入 + 原因，便于调试与展示 */
export interface CaptureResult {
  wrote: boolean;
  /** no_params | written | skipped_first_touch */
  reason: 'no_params' | 'written' | 'skipped_first_touch';
}

/** 捕获逻辑所需选项（由 index 合并 init 与 storage 配置后传入） */
export interface CaptureOptions {
  keys: (string | RegExp)[];
  strategy: 'first' | 'last';
  captureAllQuery?: boolean;
  onCapture?: (params: Record<string, string>) => void;
  _storageConfig: StorageConfig;
}

/**
 * 从 urlOrSearch 或当前页 location.search 解析参数，按 strategy 决定是否写入。
 * 若写入则双写 LS+Cookie 并调用 onCapture。返回 { wrote, reason } 便于区分无参数、已写入、有效期内未覆盖等。
 */
export function captureFromUrl(
  urlOrSearch: string | undefined,
  options: CaptureOptions
): CaptureResult {
  const search =
    urlOrSearch === undefined && typeof location !== 'undefined'
      ? location.search
      : typeof urlOrSearch === 'string'
        ? urlOrSearch.includes('?')
          ? urlOrSearch.slice(urlOrSearch.indexOf('?'))
          : urlOrSearch
        : '';
  const allParams = parseQuery(search);
  const picked = pickParams(allParams, options.keys);
  if (!hasAnyParam(picked)) return { wrote: false, reason: 'no_params' };

  const config = options._storageConfig;
  const existing = storage.get(config);
  const now = Date.now();
  const expireMs = config.expireMs;

  const shouldWrite =
    options.strategy === 'last' ||
    existing === null ||
    (typeof existing.expiresAt === 'number' && existing.expiresAt < now);

  if (!shouldWrite) return { wrote: false, reason: 'skipped_first_touch' };

  const url = resolveUrl(urlOrSearch);
  const paramsToSave = options.captureAllQuery ? allParams : picked;
  const data: UtmTrackPromoData = {
    params: paramsToSave,
    url,
    savedAt: now,
    expiresAt: storage.computeExpires(expireMs),
  };

  storage.write(config, data);
  try {
    options.onCapture?.(paramsToSave);
  } catch {
    // ignore callback errors
  }
  return { wrote: true, reason: 'written' };
}
