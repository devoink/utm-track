/**
 * LocalStorage + Cookie 双写/双读与过期判断
 * 读取顺序：LocalStorage → Cookie → 内存兜底；写入时同时写 LS 与 Cookie（若启用）
 */

import {
  DEFAULT_STORAGE_KEY,
  DEFAULT_COOKIE_NAME,
  DEFAULT_EXPIRE_MS,
  COOKIE_MAX_BYTES,
  type UtmTrackPromoData,
  type CookieOptions,
} from './defaults';

/** 无 LS/Cookie 时的内存兜底（仅当前页有效，刷新即丢） */
const memoryFallback: { data: UtmTrackPromoData | null } = { data: null };

function getLocalStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function getDocument(): Document | null {
  if (typeof document === 'undefined') return null;
  return document;
}

function safeJsonParse<T>(raw: string, fallback: T): T {
  try {
    const v = JSON.parse(raw) as T;
    return v != null ? v : fallback;
  } catch {
    return fallback;
  }
}

/** 判断一条记录是否已过期 */
function isExpired(data: UtmTrackPromoData): boolean {
  return typeof data.expiresAt === 'number' && data.expiresAt < Date.now();
}

/** 存储层使用的配置（由 init 归一化后传入） */
export interface StorageConfig {
  storageKey: string;
  cookie: false | CookieOptions;
  /** 有效期毫秒；<=0 表示不过期 */
  expireMs: number;
}

function getCookieOptions(cookie: false | CookieOptions): CookieOptions | null {
  if (cookie === false) return null;
  return {
    name: cookie.name ?? DEFAULT_COOKIE_NAME,
    domain: cookie.domain,
    path: cookie.path ?? '/',
    sameSite: cookie.sameSite ?? 'lax',
  };
}

/** 仅从 LocalStorage 读取（不判断过期，由 get 统一判断） */
export function readFromLocalStorage(storageKey: string): UtmTrackPromoData | null {
  const ls = getLocalStorage();
  if (!ls) return null;
  try {
    const raw = ls.getItem(storageKey);
    if (raw == null) return null;
    const data = safeJsonParse<UtmTrackPromoData>(raw, null as unknown as UtmTrackPromoData);
    if (!data || typeof data.params !== 'object' || typeof data.expiresAt !== 'number') return null;
    return data;
  } catch {
    return null;
  }
}

/** 仅从 Cookie 读取 */
export function readFromCookie(storageKey: string, cookieOpts: CookieOptions): UtmTrackPromoData | null {
  const doc = getDocument();
  if (!doc?.cookie) return null;
  const name = cookieOpts.name ?? DEFAULT_COOKIE_NAME;
  const match = doc.cookie.match(new RegExp('(?:^|;\\s*)' + encodeURIComponent(name) + '=([^;]*)'));
  const value = match ? decodeURIComponent(match[1]) : null;
  if (!value) return null;
  const data = safeJsonParse<UtmTrackPromoData>(value, null as unknown as UtmTrackPromoData);
  if (!data || typeof data.params !== 'object' || typeof data.expiresAt !== 'number') return null;
  return data;
}

/**
 * 读取：优先 LS，不可用时读 Cookie，再不行用内存兜底。
 * 若已过期或不存在则返回 null。
 */
export function get(config: StorageConfig): UtmTrackPromoData | null {
  const cookieOpts = getCookieOptions(config.cookie);
  let data: UtmTrackPromoData | null = readFromLocalStorage(config.storageKey);
  if (data == null && cookieOpts) data = readFromCookie(config.storageKey, cookieOpts);
  if (data == null) data = memoryFallback.data;
  if (data == null) return null;
  if (isExpired(data)) return null;
  return data;
}

export function writeToLocalStorage(storageKey: string, data: UtmTrackPromoData): boolean {
  const ls = getLocalStorage();
  if (!ls) return false;
  try {
    ls.setItem(storageKey, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

function setCookie(name: string, value: string, maxAgeSec: number, opts: CookieOptions): void {
  const doc = getDocument();
  if (!doc) return;
  const encoded = encodeURIComponent(value);
  if (encoded.length * 2 > COOKIE_MAX_BYTES) return;
  let cookie = `${encodeURIComponent(name)}=${encoded}; path=${opts.path ?? '/'}; max-age=${maxAgeSec}; SameSite=${opts.sameSite ?? 'lax'}`;
  if (opts.domain) cookie += `; domain=${opts.domain}`;
  doc.cookie = cookie;
}

export function writeToCookie(data: UtmTrackPromoData, expireMs: number, cookieOpts: CookieOptions): void {
  const doc = getDocument();
  if (!doc) return;
  const raw = JSON.stringify(data);
  if (raw.length > COOKIE_MAX_BYTES) return;
  const maxAgeSec = expireMs <= 0 ? 10 * 365 * 24 * 60 * 60 : Math.max(0, Math.floor(expireMs / 1000));
  setCookie(cookieOpts.name ?? DEFAULT_COOKIE_NAME, raw, maxAgeSec, cookieOpts);
}

/** 双写：LS + Cookie（若启用）+ 内存兜底 */
export function write(config: StorageConfig, data: UtmTrackPromoData): void {
  writeToLocalStorage(config.storageKey, data);
  const cookieOpts = getCookieOptions(config.cookie);
  if (cookieOpts) writeToCookie(data, config.expireMs, cookieOpts);
  memoryFallback.data = data;
}

/**
 * 清空 LS 与 Cookie（若启用）。
 */
export function clearStorage(config: StorageConfig): void {
  const ls = getLocalStorage();
  if (ls) {
    try {
      ls.removeItem(config.storageKey);
    } catch {
      // ignore
    }
  }
  const cookieOpts = getCookieOptions(config.cookie);
  if (cookieOpts && getDocument()) {
    const name = cookieOpts.name ?? DEFAULT_COOKIE_NAME;
    const doc = getDocument()!;
    doc.cookie = `${encodeURIComponent(name)}=; path=${cookieOpts.path ?? '/'}; max-age=0`;
    if (cookieOpts.domain) doc.cookie += `; domain=${cookieOpts.domain}`;
  }
  memoryFallback.data = null;
}

/** 计算过期时间戳；expireMs <= 0 表示不过期，返回 Infinity */
export function computeExpires(expireMs: number): number {
  return expireMs <= 0 ? Infinity : Date.now() + expireMs;
}
