# Hướng dẫn sử dụng cho Người vận hành

## Bước 1: Chuẩn bị hình ảnh
Chụp ảnh các nguồn dữ liệu sau:
1. **Màn hình HMI:** Chụp rõ con số chu kỳ chạy (Cycle).
2. **Bảng điều khiển (Control Panel):** Chụp trực diện các bộ điều khiển nhiệt độ. Có thể chụp nhiều ảnh nếu dải nhiệt dài.
3. **Phiếu Lab:** Chụp rõ các chỉ số cơ lý và ghi chú COM/COX.

## Bước 2: Tải ảnh lên ứng dụng
- Nhấn vào các ô **"Ảnh 1", "Ảnh 2"...** để tải ảnh lên.
- Nếu ảnh quá tối hoặc mờ, hãy sử dụng thanh trượt **"Sáng"** bên dưới mỗi ảnh để điều chỉnh cho AI dễ đọc hơn.

## Bước 3: Chạy trích xuất
- Chọn đúng **Dây chuyền** (DC1/DC2) và **Loại lò** (Men/Xương).
- Nhấn nút **"🚀 CHẠY TRÍCH XUẤT"**.
- Đợi AI xử lý trong vài giây.

## Bước 4: Kiểm tra và Chỉnh sửa
- Dữ liệu trích xuất sẽ hiển thị ở cột bên phải.
- **Ô nhấp nháy đỏ:** AI không đọc được (missing), bạn cần nhập thủ công.
- **Ô nhấp nháy đỏ đậm:** Giá trị nhiệt độ bất thường (ngoài ngưỡng 500-1300°C), hãy kiểm tra lại.
- Bạn có thể nhấn trực tiếp vào các con số để chỉnh sửa nếu AI đọc sai.

## Bước 5: Lưu trữ và Đồng bộ
- **Lưu Snapshot:** Nhấn nút này để lưu dữ liệu vào lịch sử máy (LocalStorage).
- **Đồng bộ Google Sheets:** Nhấn biểu tượng **Tải lên (Sync)** màu xanh để gửi dữ liệu về bảng tính trung tâm (Yêu cầu đã kết nối Google trước đó).

---
*Lưu ý: Luôn đảm bảo camera sạch và đủ ánh sáng khi chụp ảnh để đạt độ chính xác cao nhất.*
