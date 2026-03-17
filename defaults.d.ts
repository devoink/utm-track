/**
 * utm-track 默认配置与类型定义
 * 提供默认要捕获的参数名、存储 key、TTL、Cookie 名等常量及选项类型
 */
/** 默认要捕获的 URL 参数名（常见 UTM + ref） */
export declare const DEFAULT_KEYS: readonly ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "ref"];
/** LocalStorage 默认 key */
export declare const DEFAULT_STORAGE_KEY = "utm_track_promo";
/** 默认有效期（毫秒），7 天 */
export declare const DEFAULT_EXPIRE_MS: number;
/** Cookie 默认名称 */
export declare const DEFAULT_COOKIE_NAME = "utm_promo";
/** Cookie 单条约 4KB 限制，超长则不写 Cookie */
export declare const COOKIE_MAX_BYTES = 4096;
/** 归因策略：first 首次触达不覆盖，last 末次触达每次覆盖 */
export type Strategy = 'first' | 'last';
/** Cookie 配置：名称、域、路径、SameSite */
export interface CookieOptions {
    name?: string;
    domain?: string;
    path?: string;
    sameSite?: 'strict' | 'lax' | 'none';
}
/** 存储配置：LocalStorage key + Cookie 开关/选项，一处配齐 */
export interface StorageOption {
    /** LocalStorage 的 key，默认 'utm_track_promo' */
    key?: string;
    /** Cookie：false 关闭，true 用默认名，对象可配 name/domain/path/sameSite */
    cookie?: boolean | CookieOptions;
}
/** init() 的完整配置选项 */
export interface UtmTrackOptions {
    /** 要捕获的 URL 参数名：字符串为精确匹配（大小写不敏感），正则则 test(key) 匹配 */
    keys?: (string | RegExp)[];
    /** 存储配置：key 为 LocalStorage 的 key，cookie 为是否双写及 Cookie 选项。不传则用默认 key + 默认 Cookie */
    storage?: StorageOption;
    /** 有效期，单位毫秒。不传则默认 7 天；<=0 表示不过期 */
    expire?: number;
    /** 归因策略 */
    strategy?: Strategy;
    /** 本次写入成功后的回调，可用于上报/埋点 */
    onCapture?: (params: Record<string, string>) => void;
    /** 为 true 时：只要 URL 中有任一 keys 匹配项就触发捕获，且存储该 URL 的**全部** query 参数；为 false 时仅存储 keys 匹配到的参数（默认） */
    captureAllQuery?: boolean;
    /** 为 true 时，init 完成后自动用当前页 URL 执行一次 captureFromUrl()，落地页只需 init 即可 */
    autoCapture?: boolean;
}
/** 存储的推广数据结构（LS 与 Cookie 一致） */
export interface UtmTrackPromoData {
    params: Record<string, string>;
    /** 捕获时的完整落地页 URL */
    url?: string;
    savedAt: number;
    expiresAt: number;
}
