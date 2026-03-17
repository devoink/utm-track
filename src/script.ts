/**
 * Script / UMD 入口
 * 在浏览器环境下将 API 挂到 window.UtmTrack，供 <script> 直接引用时使用
 */
import * as api from './index';

if (typeof window !== 'undefined') {
  (window as unknown as { UtmTrack: typeof api }).UtmTrack = api;
}

export default api;
