/**
 * tokenStore.ts — In-memory access token storage
 *
 * [SECURITY FIX] Token lưu trong closure JS thuần, không dùng localStorage.
 *
 * Tại sao quan trọng:
 *  - localStorage bị đọc bởi bất kỳ JS nào trên cùng origin (XSS → đánh cắp token)
 *  - Memory variable chỉ tồn tại trong tab hiện tại, không thể đọc qua XSS payload
 *    vì attacker không có reference đến closure này
 *  - Refresh token được lưu trong HttpOnly cookie (server set) → không thể đọc bằng JS
 *
 * Trade-off đã chấp nhận:
 *  - Token mất khi refresh trang → tự động silent-refresh qua HttpOnly cookie ở api-client
 *  - Không share token giữa các tab → mỗi tab tự refresh độc lập (acceptable)
 */

let _accessToken: string | null = null

export const tokenStore = {
  /** Lấy token hiện tại (null nếu chưa đăng nhập hoặc sau khi refresh trang) */
  get(): string | null {
    return _accessToken
  },

  /** Lưu token mới vào memory sau khi login hoặc silent-refresh */
  set(token: string): void {
    _accessToken = token
  },

  /** Xóa token khi logout hoặc refresh thất bại */
  clear(): void {
    _accessToken = null
  },
}
