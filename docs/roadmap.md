
# Lộ trình phát triển (Roadmap) - KILN AI OCR

## ✅ ĐÃ HOÀN THÀNH (v1.0.0 - v1.8.0)
- [x] **Trích xuất Cặp số Xanh chuẩn:** `Mxx/M0xx = Trên/Dưới` dựa trên Spatial Mapping.
- [x] **X-Axis Locking (Khóa trục X):** Dóng hàng dọc tuyệt đối 90 độ từ nhãn M xuống M0 để chống lệch cột.
- [x] **Label Cross-Checking:** Đối chiếu nhãn dán vật lý (M31 -> M031) trước khi trả kết quả.
- [x] **PV/SV Distinction:** Loại bỏ hoàn toàn dòng Đỏ (PV), chỉ lấy thông số cài đặt Xanh (SV).
- [x] **OCR Phiếu Lab (Min/Max Scan):** Quét toàn bộ ca Ngày/Đêm để tìm dải Min ÷ Max cho CĐX và CĐM.
- [x] **Chu kỳ cháy (CK LÒ):** Tách biệt chính xác CK Lò Xương (CĐX) và Lò Men (CĐM).
- [x] **Data Cleaning Pipeline:** Tự động xử lý ký tự rác OCR (', ..) thành dấu " ÷ " chuẩn.
- [x] **Webhook Integration:** Hỗ trợ đẩy dữ liệu qua Google Apps Script Web App.
- [x] **Tailwind CSS v4:** Nâng cấp engine giao diện lên phiên bản mới nhất.
- [x] **Google Sheets Sync & OAuth 2.0:** Đồng bộ dữ liệu thời gian thực an toàn.

## 🚀 GIAI ĐOẠN TIẾP THEO (Giai đoạn Tự động hóa - 2025)

### 1. Báo cáo & Phân tích (Reporting & Analytics)
- [ ] **Export PDF/Excel:** Xuất biên bản kiểm tra dải nhiệt ca làm việc chuyên nghiệp.
- [ ] **Heatmap Visualization:** Hiển thị biểu đồ nhiệt dọc theo chiều dài lò để phát hiện các điểm nóng cục bộ.
- [ ] **Trend Analysis:** Cảnh báo nếu dải nhiệt có xu hướng trôi (drift) so với chuẩn qua các ca.
- [ ] **Product Recipe:** Tự động đối chiếu dải nhiệt hiện tại với "Công thức chuẩn" của mã sản phẩm đang chạy.

### 2. Tích hợp & Thông báo (Integration & Notification)
- [ ] **Telegram/Zalo Bot:** Tự động gửi báo cáo tổng hợp sau mỗi ca về nhóm quản lý.
- [ ] **Multi-Sheet Support:** Cho phép người dùng chọn Sheet cụ thể để ghi dữ liệu.

### 3. Nâng cao trải nghiệm người dùng
- [ ] **Offline OCR:** Nghiên cứu sử dụng các model nhỏ hơn để chạy OCR ngay cả khi mất kết nối Internet.
- [ ] **Auto-Capture:** Chế độ tự động chụp và gửi ảnh định kỳ mỗi 30 phút.
- [ ] **Voice Input:** Hỗ trợ nhập liệu bằng giọng nói cho các ô `missing`.

