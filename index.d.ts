/**
 * utm-track 主入口
 * 落地页 UTM / 推广参数持久化：LocalStorage + Cookie 双写，first/last 归因策略
 */
import { type UtmTrackOptions, type UtmTrackPromoData, type CookieOptions, type StorageOption } from './defaults';
/**
 * 初始化配置。使用 script 标签时必须先调用。
 */
export declare function init(options?: UtmTrackOptions): void;
/**
 * 从当前页 URL 或传入的 url/search 解析参数并按策略写入。
 * 不传参时使用 location.search。返回 { wrote, reason }：是否写入及原因（no_params / written / skipped_first_touch）。
 */
export declare function captureFromUrl(urlOrSearch?: string): {
    wrote: boolean;
    reason: 'no_params' | 'written' | 'skipped_first_touch';
};
/**
 * 读取已存储的推广数据。优先 LS，不可用时读 Cookie。过期或不存在返回 null。
 */
export declare function get(): UtmTrackPromoData | null;
/**
 * 清空存储（同时清 LS 与 Cookie），即强制清除。
 */
export declare function clear(): void;
export type { UtmTrackOptions, UtmTrackPromoData, CookieOptions, StorageOption };
export type { Strategy } from './defaults';
export type { CaptureResult } from './capture';
