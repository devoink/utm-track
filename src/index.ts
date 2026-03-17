/**
 * utm-track 主入口
 * 落地页 UTM / 推广参数持久化：LocalStorage + Cookie 双写，first/last 归因策略
 */

import {
  DEFAULT_KEYS,
  DEFAULT_STORAGE_KEY,
  DEFAULT_EXPIRE_MS,
  type UtmTrackOptions,
  type UtmTrackPromoData,
  type CookieOptions,
  type StorageOption,
} from './defaults';
import * as storage from './storage';
import { captureFromUrl as doCapture } from './capture';

type Strategy = 'first' | 'last';

/** 将用户传入的 cookie 选项归一化为 false | CookieOptions（不传 true） */
function normalizeCookie(cookie: boolean | CookieOptions | undefined): false | CookieOptions {
  if (cookie === false) return false;
  if (cookie === undefined) return { name: 'utm_promo' };
  if (cookie === true) return { name: 'utm_promo' };
  return cookie;
}

let storageConfig: storage.StorageConfig | null = null;
let mergedOptions: MergedOptions = {
  keys: [...DEFAULT_KEYS],
  strategy: 'first',
};

interface MergedOptions {
  keys: (string | RegExp)[];
  strategy: Strategy;
  captureAllQuery?: boolean;
  onCapture?: (params: Record<string, string>) => void;
}

function getConfig(): storage.StorageConfig {
  if (!storageConfig) {
    storageConfig = {
      storageKey: DEFAULT_STORAGE_KEY,
      cookie: { name: 'utm_promo' },
      expireMs: DEFAULT_EXPIRE_MS,
    };
  }
  return storageConfig;
}

/** 从 init 选项解析出 storageKey 与 cookie（仅来自 storage） */
function resolveStorage(options: UtmTrackOptions): { storageKey: string; cookie: false | CookieOptions } {
  return {
    storageKey: options.storage?.key ?? DEFAULT_STORAGE_KEY,
    cookie: normalizeCookie(options.storage?.cookie ?? true),
  };
}

/**
 * 初始化配置。使用 script 标签时必须先调用。
 */
export function init(options: UtmTrackOptions = {}): void {
  const keys = options.keys ?? [...DEFAULT_KEYS];
  const { storageKey, cookie } = resolveStorage(options);
  const expireMs = typeof options.expire === 'number'
    ? (options.expire <= 0 ? 0 : options.expire)
    : DEFAULT_EXPIRE_MS;
  const strategy = (options.strategy ?? 'first') as Strategy;

  storageConfig = {
    storageKey,
    cookie,
    expireMs,
  };

  mergedOptions = {
    keys,
    strategy,
    captureAllQuery: options.captureAllQuery,
    onCapture: options.onCapture,
  };

  if (options.autoCapture === true) {
    doCapture(undefined, { ...mergedOptions, _storageConfig: storageConfig });
  }
}

/**
 * 从当前页 URL 或传入的 url/search 解析参数并按策略写入。
 * 不传参时使用 location.search。返回 { wrote, reason }：是否写入及原因（no_params / written / skipped_first_touch）。
 */
export function captureFromUrl(urlOrSearch?: string): { wrote: boolean; reason: 'no_params' | 'written' | 'skipped_first_touch' } {
  const config = getConfig();
  return doCapture(urlOrSearch, {
    ...mergedOptions,
    _storageConfig: config,
  });
}

/**
 * 读取已存储的推广数据。优先 LS，不可用时读 Cookie。过期或不存在返回 null。
 */
export function get(): UtmTrackPromoData | null {
  return storage.get(getConfig());
}

/**
 * 清空存储（同时清 LS 与 Cookie），即强制清除。
 */
export function clear(): void {
  storage.clearStorage(getConfig());
}

// 导出类型供 TS 用户使用
export type { UtmTrackOptions, UtmTrackPromoData, CookieOptions, StorageOption };
export type { Strategy } from './defaults';
export type { CaptureResult } from './capture';
