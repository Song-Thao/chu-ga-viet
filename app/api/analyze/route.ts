import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SYSTEM_PROMPT = `Bạn là hệ thống phân tích gà chọi kết hợp thị giác máy tính và kiến thức sư kê thực chiến Việt Nam.

NGUYÊN TẮC BẮT BUỘC:
1. CHỈ được gọi tên vảy khi: nhìn thấy rõ vị trí + hình dạng đúng + độ rõ ảnh >= 70%
   - Nếu không đủ → ghi: "chưa đủ dữ liệu xác định"
   - Nếu hơi giống → ghi: "có dấu hiệu" hoặc "nghi ngờ"
2. KHÔNG được suy ra lối đá nếu chưa chắc vảy
3. KHÔNG dùng câu chung chung như "gà đẹp", "rất hay"
4. KHÔNG được bịa hoặc suy đoán vượt quá dữ liệu ảnh
5. Mỗi lần viết phải khác cách diễn đạt, không copy mẫu

KIẾN THỨC VẢY:
Tốt: Án Thiên (vảy lớn sát gối→đòn hiểm), Phủ Địa (sát chậu→bền lì), Huyền Trâm (nhỏ ngang cựa→đòn độc), Khai Vương (4 vảy chữ Vương→quý), Ám Long (ẩn ngón giữa→hiếm), Gạc Thập (chữ thập→đá tàn)
Xấu: Tứ Hoành Khai (bỏ chạy), Dậm Chậu (yếu), Rọc Chậu (không bền), Liên Giáp (tướng xấu)`;

const USER_PROMPT = `Phân tích con gà trong ảnh. Trả về JSON thuần không backtick không markdown:

{
  "chat_luong_anh": "mô tả độ rõ, thiếu góc gì",
  "do_ro_anh": 75,
  "nhan_dien": "mô tả cụ thể mắt/chân/lông/dáng CHỈ những gì THẤY RÕ",
  "phan_tich_vay": "gọi đúng tên vảy nếu rõ>=70%, nghi ngờ nếu hơi giống, chưa đủ dữ liệu nếu không rõ",
  "dien_giai": "giải thích chuyên môn CHỈ dựa vảy đã xác định, viết kiểu dân chơi miền Tây",
  "loi_da": "chỉ kết luận lối đá nếu vảy đã chắc, không thì ghi nghi thiên về X",
  "nhan_dinh_ai": "nhận định tổng thể, ghi rõ đây là nhận định AI từ hình ảnh, không phán chắc chắn",
  "gia_de_xuat": "X.000.000 - Y.000.000",
  "ly_do_gia": "lý do cụ thể dựa trên những gì thấy được",
  "yeu_cau_bo_sung": "liệt kê rõ: thiếu ảnh gì, góc gì, điểm chưa tốt nếu có",
  "canh_bao": "nhắc phụ thuộc nuôi luyện, giá chỉ tham khảo từ dữ liệu thị trường",
  "tong_diem": 7.5,
  "do_tin_cay": 65
}

Thang giá theo điểm thực tế:
- Dưới 6: 500k-1.5tr | 6-6.9: 1.5tr-3tr | 7-7.9: 3tr-6tr | 8-8.9: 6tr-15tr | 9-10: 15tr-30tr
Nếu độ rõ ảnh thấp → giảm điểm tin cậy và kéo giá về khoảng thấp hơn.`;

export async function POST(req: NextRequest) {
  try {
    const { imageBase64 } = await req.json();
    if (!imageBase64) return NextResponse.json({ error: 'Không có ảnh' }, { status: 400 });

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 1500,
      temperature: 0.7,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'text', text: USER_PROMPT },
            { type: 'image_url', image_url: { url: imageBase64, detail: 'high' } },
          ],
        },
      ],
    });

    const content = response.choices[0].message.content || '';
    console.log('AI raw:', content);

    try {
      return NextResponse.json(JSON.parse(content));
    } catch {
      const match = content.match(/\{[\s\S]*\}/);
      if (match) return NextResponse.json(JSON.parse(match[0]));
      return NextResponse.json({ error: 'Không parse được' }, { status: 500 });
    }

  } catch (error: any) {
    console.error('Error:', error?.message);
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}
