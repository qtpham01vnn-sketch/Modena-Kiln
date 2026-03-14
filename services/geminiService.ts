
import { GoogleGenAI, Type, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { KilnOCRResult } from "../types";

export interface ImageInput {
  base64: string;
  description: string;
}

const SPATIAL_PRECISION_PROMPT = `
BẠN LÀ CHUYÊN GIA GIÁM SÁT SẢN XUẤT TẠI NHÀ MÁY PHƯƠNG NAM.
NHIỆM VỤ TRỌNG TÂM: TRÍCH XUẤT NHIỆT ĐỘ CÀI ĐẶT THEO CẶP DỌC TUYỆT ĐỐI VÀ DỮ LIỆU PHIẾU LAB.

1. CẤU TRÚC ĐỒNG HỒ ĐƠN:
- Một đồng hồ có 2 số: Số Đỏ (nằm trên - PV) và Số Xanh (nằm dưới - SV).
- NHIỆM VỤ: Tuyệt đối KHÔNG lấy số Đỏ. CHỈ lấy số Xanh (Setpoint - SV).

2. CHIẾN THUẬT DÓNG HÀNG DỌC TUYỆT ĐỐI (X-AXIS LOCKING):
- AI không được phép tìm nhãn M0 tự do. 
- QUY TRÌNH DÓNG HÀNG: 
  + Bước 1: Xác định vị trí tâm ngang (tọa độ X) của nhãn dán "M" (ví dụ M31). Lấy duy nhất SỐ XANH (SV) của đồng hồ hàng TRÊN đó.
  + Bước 2: Kẻ một đường thẳng ảo CHỈ THEO TRỤC DỌC (Y-axis) từ vị trí X đó xuống dưới cùng của ảnh.
  + Bước 3: Chỉ được phép trích xuất số XANH LÁ (SV) của bộ đồng hồ nào nằm TRÊN đường thẳng dọc này. Đó chính là giá trị M0 tương ứng (ví dụ M031).
  + Bước 4: KIỂM TRA CHÉO NHÃN: Trước khi trả về, phải xác nhận bộ đồng hồ dưới có đúng nhãn là M0 tương ứng không (ví dụ M031). Nếu nhãn là M029 hoặc M033 -> SAI, phải tìm lại đúng bộ thẳng hàng X.
- ĐỊNH DẠNG TRẢ VỀ: Luôn luôn là "SốXanh_HàngTrên / SốXanh_HàngDưới". Ví dụ: "800 / 810".
- Nếu hàng dưới bị khuất, trả về "Số / ERR".

3. CẢNH BÁO SAI LẦM NGHIÊM TRỌNG:
- TUYỆT ĐỐI KHÔNG lấy Số Đỏ và Số Xanh của cùng một đồng hồ để ghép cặp. 
- TUYỆT ĐỐI KHÔNG lấy số của bộ đồng hồ nằm lệch sang trái hoặc phải đường thẳng dọc (dù nó có vẻ gần hơn).

4. QUY TẮC KÝ TỰ CƠ LÝ (PHIẾU LAB):
- Tuyệt đối không sử dụng dấu nháy ('), dấu chấm (..) hay bất kỳ ký tự nào khác để ngăn cách dải chỉ số.
- BẮT BUỘC dùng dấu chia " ÷ " hoặc dấu gạch ngang " - ".
- CÔNG THỨC: [Số thấp nhất trong tất cả các ca Ngày và Đêm] ÷ [Số cao nhất trong tất cả các ca Ngày và Đêm].
- VÍ DỤ: "321.6 ÷ 427.5".

5. TÁCH BIỆT CA NGÀY VÀ ĐÊM:
- Quét toàn bộ các hàng ghi "CĐX" (Xương) của cả ca Ngày (N) và ca Đêm (Đ). Tìm giá trị Min và Max trong tất cả các mẫu đó để đưa vào dải kết quả của Lò Xương.
- Làm tương tự cho "CĐM" (Men).

NGUYÊN TẮC VÀNG:
- Đọc chính xác ký tự đặc biệt (/, ÷).
- Nếu số mờ hoặc không có, trả về "ERR / ERR". KHÔNG ĐƯỢC ĐOÁN.
- Luôn trả về định dạng JSON chuẩn theo schema yêu cầu.
`;

export async function processUnifiedImages(
  images: ImageInput[], 
  configs: Record<string, string[]> // { "DC1": ["M31_M031", ...], "DC2": [...] }
): Promise<KilnOCRResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set in environment variables.");
  }
  const ai = new GoogleGenAI({ apiKey });
  
  const createLineSchema = (pairs: string[]) => {
    const nhietDoProperties: Record<string, any> = {};
    pairs.forEach(pair => {
      nhietDoProperties[pair] = { 
        type: Type.STRING, 
        description: "Kết quả dạng: SốTrên / SốDưới cho cặp " + pair 
      };
    });

    return {
      type: Type.OBJECT,
      properties: {
        "MA_SP": { type: Type.STRING, description: "Lấy từ ô 'Loại sản phẩm' trên phiếu LAB" },
        "LO_XUONG": {
          type: Type.OBJECT,
          properties: {
            "CK_LO": { type: Type.STRING, description: "Số CK LÒ dòng CĐX trên phiếu" },
            "NHIET_DO": {
              type: Type.OBJECT,
              description: "Dải M31_M031 đến M57_M057. Định dạng: SốTrên / SốDưới",
              properties: nhietDoProperties
            }
          }
        },
        "LO_MEN": {
          type: Type.OBJECT,
          properties: {
            "CK_LO": { type: Type.STRING, description: "Số CK LÒ dòng CĐM trên phiếu" },
            "NHIET_DO": {
              type: Type.OBJECT,
              description: "Dải M31_M031 đến M57_M057. Định dạng: SốTrên / SốDưới",
              properties: nhietDoProperties
            }
          }
        },
        "LAB_CO_LY": {
          type: Type.OBJECT,
          description: "Dải Min ÷ Max từ ca Ngày và Đêm",
          properties: {
            "XUONG": {
              type: Type.OBJECT,
              properties: {
                "CUONG_DO_BE": { type: Type.STRING, description: "Dải Min ÷ Max" },
                "DO_DAY_MIN": { type: Type.STRING, description: "Dải Min ÷ Max" },
                "PHA_HUY": { type: Type.STRING, description: "Dải Min ÷ Max" },
                "BEN_UON": { type: Type.STRING, description: "Dải Min ÷ Max" }
              }
            },
            "MEN": {
              type: Type.OBJECT,
              properties: {
                "CUONG_DO_BE": { type: Type.STRING, description: "Dải Min ÷ Max" },
                "DO_DAY_MIN": { type: Type.STRING, description: "Dải Min ÷ Max" },
                "PHA_HUY": { type: Type.STRING, description: "Dải Min ÷ Max" },
                "BEN_UON": { type: Type.STRING, description: "Dải Min ÷ Max" }
              }
            }
          }
        }
      }
    };
  };

  const properties: Record<string, any> = {};
  Object.keys(configs).forEach(lineId => {
    properties[lineId] = createLineSchema(configs[lineId]);
  });

  const imageParts = images.flatMap(img => [
    { inlineData: { mimeType: 'image/jpeg', data: img.base64.split(',')[1] } },
    { text: img.description }
  ]);

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          ...imageParts,
          { text: `Yêu cầu trích xuất toàn bộ dữ liệu dải nhiệt cột dọc, chu kỳ cháy (cột 'CK LÒ') và cơ lý từ phiếu giấy cho các dây chuyền: ${Object.keys(configs).join(', ')}.` }
        ]
      },
      config: {
        systemInstruction: SPATIAL_PRECISION_PROMPT,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: properties
        },
        safetySettings: [
          { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        ],
      }
    });

    const result = JSON.parse(response.text || "{}");
    return result;
  } catch (error) {
    console.error("Lỗi Spatial AI OCR:", error);
    throw error;
  }
}
