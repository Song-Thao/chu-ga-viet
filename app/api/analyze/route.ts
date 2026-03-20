import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SYSTEM_PROMPT = `Bạn là một sư kê gà chọi Việt Nam có hơn 20 năm kinh nghiệm thực chiến.
Nhiệm vụ của bạn:
- Phân tích gà dựa trên hình ảnh người dùng cung cấp
- Sử dụng thuật ngữ chuyên môn của giới chơi gà Việt Nam
- KHÔNG được phán bừa hoặc khẳng định 100%
- Nếu không chắc chắn phải nói rõ: "có dấu hiệu", "nghi ngờ", "cần ảnh rõ hơn"

KIẾN THỨC BẮT BUỘC PHẢI ÁP DỤNG:
Các loại vảy tốt:
- Án Thiên: vảy lớn sát gối → ra đòn chính xác, hiểm
- Phủ Địa: vảy sát chậu → gà bền, lì
- Huyền Trâm: vảy nhỏ ngang cựa → gà tài, đòn độc
- Khai Vương: 4 vảy tạo chữ Vương → quý tướng
- Ám Long: vảy ẩn ngón giữa → hiếm, rất hay
- Gạc Thập: hình chữ thập → đá tàn
Các loại vảy xấu:
- Tứ Hoành Khai: dễ bỏ chạy
- Dậm Chậu: yếu
- Rọc Chậu: không bền
- Liên Giáp: tướng xấu`;

const USER_PROMPT = `Phân tích con gà trong ảnh theo đúng format sau, trả về JSON thuần không có backtick:

{"nhan_dien":"mô tả mắt, chân, vảy thấy được từ ảnh","phan_tich_vay":"phân tích vảy với từ có dấu hiệu hoặc nghi ngờ","nhan_dinh":"giải thích theo dân chơi gà miền Tây","loi_da":"đá bền / đá nhanh / đá hiểm với lý do ngắn","canh_bao":"điểm chưa chắc, thiếu góc, nhắc phụ thuộc nuôi luyện","tong_diem":8.5,"do_tin_cay":75,"gia_de_xuat":"6.000.000 - 10.000.000","ly_do_gia":"giải thích ngắn tại sao giá này"}

Thang giá theo điểm:
- Dưới 6: 500k - 1.5tr
- 6.0-6.9: 1.5tr - 3tr
- 7.0-7.9: 3tr - 6tr
- 8.0-8.9: 6tr - 15tr
- 9.0-10: 15tr - 30tr`;

export async function POST(req: NextRequest) {
  try {
    const { imageBase64 } = await req.json();

    if (!imageBase64) {
      return NextResponse.json({ error: 'Không có ảnh' }, { status: 400 });
    }

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 1500,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'text', text: USER_PROMPT },
            { type: 'image_url', image_url: { url: imageBase64 } },
          ],
        },
      ],
    });

    const content = response.choices[0].message.content || '';
    console.log('AI response:', content);

    try {
      const result = JSON.parse(content);
      return NextResponse.json(result);
    } catch {
      const match = content.match(/\{[\s\S]*\}/);
      if (match) {
        const result = JSON.parse(match[0]);
        return NextResponse.json(result);
      }
      return NextResponse.json({ error: 'Không parse được kết quả' }, { status: 500 });
    }

  } catch (error: any) {
    console.error('AI Error:', error?.message || error);
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}
