/**
 * LocalStorage + Cookie 双写/双读与过期判断
 * 读取顺序：LocalStorage → Cookie → 内存兜底；写入时同时写 LS 与 Cookie（若启用）
 */
import { type UtmTrackPromoData, type CookieOptions } from './defaults';
/** 存储层使用的配置（由 init 归一化后传入） */
export interface StorageConfig {
    storageKey: string;
    cookie: false | CookieOptions;
    /** 有效期毫秒；<=0 表示不过期 */
    expireMs: number;
}
/** 仅从 LocalStorage 读取（不判断过期，由 get 统一判断） */
export declare function readFromLocalStorage(storageKey: string): UtmTrackPromoData | null;
/** 仅从 Cookie 读取 */
export declare function readFromCookie(storageKey: string, cookieOpts: CookieOptions): UtmTrackPromoData | null;
/**
 * 读取：优先 LS，不可用时读 Cookie，再不行用内存兜底。
 * 若已过期或不存在则返回 null。
 */
export declare function get(config: StorageConfig): UtmTrackPromoData | null;
export declare function writeToLocalStorage(storageKey: string, data: UtmTrackPromoData): boolean;
export declare function writeToCookie(data: UtmTrackPromoData, expireMs: number, cookieOpts: CookieOptions): void;
/** 双写：LS + Cookie（若启用）+ 内存兜底 */
export declare function write(config: StorageConfig, data: UtmTrackPromoData): void;
/**
 * 清空 LS 与 Cookie（若启用）。
 */
export declare function clearStorage(config: StorageConfig): void;
/** 计算过期时间戳；expireMs <= 0 表示不过期，返回 Infinity */
export declare function computeExpires(expireMs: number): number;
