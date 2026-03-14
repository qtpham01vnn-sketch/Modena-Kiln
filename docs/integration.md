# Hướng dẫn tích hợp Google Sheets & Cấu hình

## 1. Google Cloud Console Setup
Để ứng dụng có thể ghi dữ liệu vào Google Sheets, bạn cần cấu hình dự án trên [Google Cloud Console](https://console.cloud.google.com/):

### A. Bật API
- Tìm và kích hoạt **Google Sheets API**.

### B. Cấu hình OAuth Consent Screen
- Thiết lập màn hình chấp thuận (OAuth Consent Screen).
- Chọn loại **External**.
- Thêm các phạm vi (Scopes): `.../auth/spreadsheets` và `.../auth/userinfo.profile`.

### C. Tạo Credentials
- Tạo **OAuth 2.0 Client ID** cho loại ứng dụng là **Web Application**.
- Thêm **Authorized redirect URIs**:
    - `https://ais-dev-zpjydnx2p3imlp66n4owq4-332485587695.asia-east1.run.app/auth/google/callback`
    - `https://ais-pre-zpjydnx2p3imlp66n4owq4-332485587695.asia-east1.run.app/auth/google/callback`

## 2. Biến môi trường (Environment Variables)
Bạn cần thiết lập các biến sau trong phần **Settings > Environment Variables** của AI Studio:

| Tên biến (Key) | Ý nghĩa |
| :--- | :--- |
| `GEMINI_API_KEY` | Mã API Key để gọi mô hình Gemini (đã được hệ thống tự động thiết lập). |
| `GOOGLE_CLIENT_ID` | Client ID từ Google Cloud Console. |
| `GOOGLE_CLIENT_SECRET` | Client Secret từ Google Cloud Console. |
| `GOOGLE_SPREADSHEET_ID` | ID của bảng tính Google Sheets (lấy từ URL của bảng tính). |
| `GOOGLE_APPS_SCRIPT_URL` | URL Web App của Google Apps Script để đẩy dữ liệu qua Webhook. |
| `APP_URL` | URL của ứng dụng (hệ thống tự động cung cấp). |

## 3. Tích hợp Webhook (Google Apps Script)
Ứng dụng hỗ trợ đẩy dữ liệu trực tiếp qua Webhook tới một Google Apps Script Web App.
- **URL hiện tại:** `https://script.google.com/macros/s/AKfycbyTQNsxBgcORWAWQOKXBJBTIaIr_3aGSqbXfxhsiWZnfOdDwSQGnlzngGWPWVSFbcTrLw/exec`
- **Cách dùng:** Nhấn nút **PUSH WEBHOOK** trong giao diện kết quả để gửi dữ liệu JSON.
- **Lợi ích:** Cho phép xử lý logic phức tạp hơn (tự động tạo báo cáo, gửi thông báo Telegram...) ngay khi có dữ liệu.
