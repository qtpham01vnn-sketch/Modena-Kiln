
# Đặc tả kỹ thuật tổng thể - KILN AI OCR (v1.8.0)

## 1. Kiến trúc hệ thống (Full-Stack)
Ứng dụng được xây dựng theo mô hình Full-Stack (Express + Vite) để đảm bảo bảo mật cho các API Key và hỗ trợ các tính năng phía máy chủ.

### A. Frontend (Vite + React + Tailwind CSS v4)
- **Framework:** React 19.
- **Styling:** Tailwind CSS v4 với `@tailwindcss/vite` plugin.
- **Image Processing:** Canvas API (1200px scale) để nén và điều chỉnh độ sáng/tương phản.
- **Data Cleaning:** Regex-based cleaning cho các chỉ số cơ lý và nhiệt độ.

### B. Backend (Express.js)
- **Runtime:** Node.js với `tsx`.
- **Authentication:** Google OAuth 2.0 (Popup flow).
- **Session:** Secure cookies (`SameSite: none`, `Secure: true`) cho môi trường iframe.

### C. AI Engine (Gemini 3 Flash Preview)
- **Model:** `gemini-3-flash-preview`.
- **Spatial Logic:** X-Axis Locking & Label Cross-Checking.
- **Response Schema:** Định nghĩa chặt chẽ cấu trúc JSON cho DC1/DC2.

## 2. Các tính năng cốt lõi (v1.8.0 Spatial Logic)

### A. Vision AI Engine
- **X-Axis Locking:** Khóa tọa độ ngang để dóng hàng dọc tuyệt đối, chống nhầm cột nhiệt.
- **Label Cross-Checking:** Xác minh nhãn dán vật lý (Mxx vs M0xx).
- **SV Priority:** Chỉ trích xuất số Xanh (Setpoint), bỏ qua số Đỏ (Process Value).
- **Lab Min/Max Scan:** Quét đa ca (Ngày/Đêm) để trích xuất dải chỉ số cơ lý chuẩn.

### B. Giao diện & Trải nghiệm (UI/UX)
- **Smart Validation:** Cảnh báo lỗi đọc (`ERR / ERR`) và giá trị ngoài ngưỡng.
- **Google Sheets Sync:** Đồng bộ một chạm lên hệ thống báo cáo trung tâm.

## 3. Cấu trúc dữ liệu
- **Nhiệt độ:** `SốTrên / SốDưới` (Ví dụ: `1050 / 1045`).
- **Cơ lý:** `Min ÷ Max` (Ví dụ: `321.6 ÷ 427.5`).
- **Chu kỳ:** Tách biệt `CK_LO` cho Xương (CĐX) và Men (CĐM).

