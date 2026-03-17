/**
 * 从 URL 解析 query、按 keys 过滤、按 strategy 决定是否写入
 * 写入时调用 storage 双写并触发 onCapture 回调
 */
import type { StorageConfig } from './storage';
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
export declare function captureFromUrl(urlOrSearch: string | undefined, options: CaptureOptions): CaptureResult;
