import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const { imageBase64 } = await req.json();

    if (!imageBase64) {
      return NextResponse.json({ error: 'Không có ảnh' }, { status: 400 });
    }

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Bạn là chuyên gia xem tướng gà chiến Việt Nam. Hãy phân tích con gà trong ảnh và trả về JSON với format sau (chỉ trả JSON, không giải thích thêm):
{
  "tong_diem": 8.5,
  "nhan_xet": "Nhận xét tổng quan về con gà",
  "chi_tiet": [
    { "phan": "👁 Mắt", "diem": 9, "mo_ta": "mô tả mắt gà" },
    { "phan": "🦵 Chân", "diem": 8, "mo_ta": "mô tả chân gà" },
    { "phan": "🐾 Vảy", "diem": 7.5, "mo_ta": "mô tả vảy gà" },
    { "phan": "🐓 Đầu", "diem": 8.5, "mo_ta": "mô tả đầu gà" },
    { "phan": "💪 Thân", "diem": 8, "mo_ta": "mô tả thân gà" },
    { "phan": "🪶 Lông", "diem": 8, "mo_ta": "mô tả lông gà" }
  ],
  "gia_de_xuat": "3.000.000 - 5.000.000"
}`
            },
            {
              type: 'image_url',
              image_url: {
                url: imageBase64,
              },
            },
          ],
        },
      ],
      max_tokens: 1000,
    });

    const content = response.choices[0].message.content || '';
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Không parse được kết quả AI');
    }
    const result = JSON.parse(jsonMatch[0]);
    return NextResponse.json(result);

  } catch (error) {
    console.error('AI Error:', error);
    return NextResponse.json({
      tong_diem: 7.5,
      nhan_xet: 'Không thể phân tích ảnh. Vui lòng thử lại với ảnh rõ hơn.',
      chi_tiet: [
        { phan: '👁 Mắt', diem: 7.5, mo_ta: 'Cần ảnh rõ hơn để phân tích' },
        { phan: '🦵 Chân', diem: 7.5, mo_ta: 'Cần ảnh rõ hơn để phân tích' },
        { phan: '🐾 Vảy', diem: 7.5, mo_ta: 'Cần ảnh rõ hơn để phân tích' },
        { phan: '🐓 Đầu', diem: 7.5, mo_ta: 'Cần ảnh rõ hơn để phân tích' },
        { phan: '💪 Thân', diem: 7.5, mo_ta: 'Cần ảnh rõ hơn để phân tích' },
        { phan: '🪶 Lông', diem: 7.5, mo_ta: 'Cần ảnh rõ hơn để phân tích' },
      ],
      gia_de_xuat: '3.000.000 - 5.000.000'
    }, { status: 200 });
  }
}
