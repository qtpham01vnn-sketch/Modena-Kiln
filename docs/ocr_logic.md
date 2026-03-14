# Nguyên lý Vision AI OCR - Spatial Precision Mapping

## 1. Bản chất của Thử thách
Bảng điều khiển lò nung Modena có hàng chục bộ điều khiển nhiệt độ xếp chồng lên nhau. Mỗi bộ hiển thị hai con số: **Số Đỏ (Nhiệt độ thực tế)** và **Số Xanh (Nhiệt độ cài đặt - Setpoint)**. 
Người vận hành chỉ cần ghi lại **Số Xanh**. Thách thức là AI phải phân biệt được đâu là số Xanh và nó thuộc về nhãn (Mxx) nào.

## 2. Giải pháp: Spatial Precision Prompt
Chúng tôi sử dụng một System Instruction cực kỳ chi tiết để hướng dẫn Gemini:

### A. Chiến thuật Dóng hàng dọc (X-Axis Locking)
- AI không tìm nhãn M0 tự do. Nó xác định tọa độ X của nhãn M hàng trên.
- Kẻ một đường thẳng ảo 90 độ xuống dưới. Chỉ lấy số SV của bộ đồng hồ nằm trên đường thẳng này.
- **Label Cross-Checking:** AI phải đọc nhãn vật lý của bộ đồng hồ dưới để xác nhận nó khớp với nhãn trên (ví dụ: M31 phải đi với M031).

### B. Ưu tiên Số Xanh (SV Priority)
- Mỗi đồng hồ có 2 số: Đỏ (PV) và Xanh (SV).
- AI được chỉ thị: **CHỈ LẤY SỐ XANH LÁ**.
- **Cảnh báo sai lầm:** Tuyệt đối không ghép cặp Số Đỏ và Số Xanh của cùng một đồng hồ. Cặp phải là Số Xanh Trên / Số Xanh Dưới.

### C. Phân tích Phiếu Lab (Min/Max Logic)
- AI quét toàn bộ các hàng CĐX (Xương) và CĐM (Men) của cả ca Ngày (N) và ca Đêm (Đ).
- Tìm giá trị nhỏ nhất và lớn nhất trong tất cả các mẫu đó để tạo thành dải `Min ÷ Max`.
- **Data Cleaning:** Tự động thay thế các ký tự nhiễu OCR (dấu nháy, dấu chấm kép) thành dấu " ÷ " chuẩn.

## 3. Cấu trúc Prompt (Rút gọn)
```text
BẠN LÀ CHUYÊN GIA OCR CÔNG NGHIỆP CẤP CAO.
NHIỆM VỤ: TRÍCH XUẤT NHIỆT ĐỘ CÀI ĐẶT (SV - SỐ XANH) THEO CẤU TRÚC CỘT DỌC.
1. CẤU TRÚC NHIỆT ĐỘ: Trích xuất cặp "SốXanhTrên/SốXanhDưới".
2. CHU KỲ CHÁY: Chỉ lấy từ màn hình HMI.
3. PHIẾU LAB: Tìm cơ lý và phân loại COM/COX.
NGUYÊN TẮC VÀNG: Ưu tiên dóng hàng dọc. Không đoán số mờ.
```

## 4. Response Schema (JSON)
Để đảm bảo tính nhất quán, chúng tôi sử dụng `responseSchema` để ép kiểu dữ liệu trả về luôn là một Object JSON với các key cố định (M31/M031, CHU_KY_CHAY, LAB_MEN, LAB_XUONG...).
