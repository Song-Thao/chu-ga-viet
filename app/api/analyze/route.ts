export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ===== TỪ ĐIỂN 92 VẢY =====
const VAY_DATABASE = {
  tot: {
    'Án Thiên': { vi_tri: 'vảy lớn sát đầu gối trên cao nhất hàng Thành/Quách', y_nghia: 'Sức lực bền bỉ, tránh né tài tình, ra đòn chính xác. Rất tốt.' },
    'Phủ Địa': { vi_tri: 'hình dáng như Án Thiên nhưng đặt dưới cựa sát đầu bốn ngón', y_nghia: 'Tinh nhanh khi chinh chiến, cựa địch khó xuyên thấu. Tốt.' },
    'Huyền Trâm': { vi_tri: 'vảy nhỏ màu đen tuyền giữa hàng Thành và Quách, ngang với cựa', y_nghia: 'Đâm nhiều chém dữ, hay hỏng mắt đối thủ. Tốt.' },
    'Khai Vương': { vi_tri: '4 vảy dính nhau tạo hình chữ Vương', y_nghia: 'Gà quý tướng. Tốt.' },
    'Ám Long': { vi_tri: 'vảy nhỏ ẩn ngay ngón giữa trước khi đụng ngón, màu hồng gọi là Ẩn Son', y_nghia: 'Linh Kê - gà quý hiếm.' },
    'Gạc Thập': { vi_tri: '4 vảy sát nhau (2 hàng Thành + 2 hàng Quách) tạo hình chữ thập ngang hàng cựa', y_nghia: 'Đâm cựa liên hoàn. Rất tốt.' },
    'Tam Tài': { vi_tri: 'từ sát gối xuống đến vảy thứ 3 có 3 hàng vảy liên tiếp', y_nghia: 'Quý Kê - đòn tài mãnh liệt, đá đồng chạng dễ thắng.' },
    'Tứ Trực': { vi_tri: 'một chân có Án Thiên, chân kia có Phủ Địa', y_nghia: 'Quý Kê.' },
    'Song Phủ Đao': { vi_tri: '2 vảy hàng Quách sát cựa, 2 đầu nhọn chỉ vào cựa', y_nghia: 'Nhạy cựa, khôn lanh, trả đòn tức thì.' },
    'Địa Giáp': { vi_tri: 'vảy nhỏ mọc giữa lòng bàn chân luôn chạm đất', y_nghia: 'Linh Kê.' },
    'Liên Châu': { vi_tri: 'vảy ngón nội đi thẳng lên quá cựa nhập vào đường thới, thẳng no tròn', y_nghia: 'Dùng cựa rất giỏi.' },
    'Đại Giáp': { vi_tri: '3 vảy hàng Quách dính lại thành vảy lớn gần cựa', y_nghia: 'Nhiều thế, đâm đòn hiểm độc.' },
    'Trễ Giáp': { vi_tri: '2 vảy hàng Quách song song sát nhau, đuôi chỉ vào cựa', y_nghia: 'Ra đòn rất nhanh, hay tạt hay quăng.' },
    'Thập Hậu': { vi_tri: 'hàng hậu và hàng kẽm có 4 vảy tạo hình chữ thập', y_nghia: 'Quý tướng.' },
    'Thập Độ': { vi_tri: 'hàng độ và hàng kẽm có 4 vảy tạo hình chữ thập', y_nghia: 'Giỏi, đá đồng chạng dễ thắng.' },
    'Liên Kẽm': { vi_tri: '2 vảy hàng kẽm dính nhau', y_nghia: 'Bảo vệ mạng gà, vừa đánh vừa thủ.' },
    'Độc Biên': { vi_tri: 'hàng Biên có 1 hàng thẳng từ trên xuống không đứt quãng', y_nghia: 'Gà tốt.' },
    'Tam Vinh': { vi_tri: 'hàng độ, kẽm đúng cách, biên liên tục, hậu xuống quá cựa', y_nghia: 'Linh Kê.' },
    'Ngũ Quỷ': { vi_tri: '1 chân có 3 hàng vảy liên tiếp từ gối xuống đến vảy thứ 5', y_nghia: 'Hung ác vô cùng.' },
    'No Hậu': { vi_tri: 'hàng hậu từ gối không chia đôi, xuống đến cựa vẫn to rõ', y_nghia: 'Thắng trận bền bỉ.' },
    'Phản Hậu': { vi_tri: 'hàng hậu úp xuống (ngược chiều thường)', y_nghia: 'Quý Kê.' },
    'Huỳnh Kiều': { vi_tri: 'vảy vấn đóng hàng thứ 2-5, đầu hàng Thành đuôi hàng Quách', y_nghia: 'May độ, có đòn chết gà.' },
    'Bản Phủ': { vi_tri: 'vảy vấn đầu nhỏ đuôi to hình lưỡi búa, đầu hàng Thành đuôi hàng Quách', y_nghia: 'Rất hay, ăn được kích giáp, yểm long.' },
    'Kích Giáp': { vi_tri: 'vảy như vấn cán cách 4 hàng từ gối xuống', y_nghia: 'Tướng kê - ra đòn nhanh dũng mãnh, địch thường tử trận.' },
    'Nghịch Lân': { vi_tri: 'vảy vấn ngang cựa gồm 1 vảy hàng Quách + 2 vảy hàng Thành', y_nghia: 'Thiện nghệ dùng cựa và cưa, cực kỳ uy lực.' },
    'Giao Long': { vi_tri: 'vảy vấn hàng 2-3 đầu to đuôi nhỏ, đầu hàng Quách đuôi hàng Thành', y_nghia: 'Chuyên chui lòn, cắn gối, đá phá đùi đối thủ.' },
  },
  xau: {
    'Khai Tiền': { vi_tri: '1 vảy hàng Thành nứt ra bất kể trên hay dưới cựa', y_nghia: 'Thời vàng son đã tận, không nên dùng. Rất xấu.' },
    'Tứ Hoành Khai': { vi_tri: 'dưới gối có 4 vảy nhỏ', y_nghia: 'Kém tài, bở hơi, yếu sức, hay bị mù mắt khi ra trận. Xấu.' },
    'Dậm Chậu': { vi_tri: '1 vảy nhỏ sát ngón trước khi giáp ngón', y_nghia: 'Xấu.' },
    'Rọc Chậu': { vi_tri: 'vảy sát chân ngón bị cắt đứt', y_nghia: 'Xấu.' },
    'Liên Giáp Ngoại': { vi_tri: '2 vảy hàng Thành dính nhau thành 1 vảy lớn', y_nghia: 'Không tốt (trừ từ hàng 4 từ gối xuống).' },
    'Khai Hậu': { vi_tri: '1 vảy hậu bị nứt vỡ đôi', y_nghia: 'Không tốt.' },
    'Lộc Điền Ngoại': { vi_tri: 'đường đất giữa Thành Quách mũi quay ra ngoài', y_nghia: 'Hữu dũng vô mưu. Xấu.' },
    'Kém Hậu': { vi_tri: 'hàng hậu từ gối chia đôi, chưa đến cựa đã nhỏ lăn tăn', y_nghia: 'Không nên dùng.' },
    'Thất Hậu': { vi_tri: 'hàng hậu từ gối chia 2 hàng hoặc không liền mạch', y_nghia: 'Không nên dùng.' },
    'Ngậm Thẻ': { vi_tri: '2 hàng vảy đều bỗng có 1 vảy chen vào chia đôi', y_nghia: 'Đá tứ tung, vô đòn vô thế.' },
  },
};

function mapVayFromDescription(moTa: string) {
  const obs = moTa.toLowerCase();
  for (const [ten, data] of Object.entries(VAY_DATABASE.tot)) {
    if (obs.includes(ten.toLowerCase())) {
      const tinCay = obs.includes('rõ') || obs.includes('xác định') ? 85 : obs.includes('dấu hiệu') || obs.includes('nghi') ? 55 : 40;
      return { ten, loai: 'tot' as const, y_nghia: data.y_nghia, tin_cay: tinCay };
    }
    const viTriWords = data.vi_tri.toLowerCase().split(' ').filter(w => w.length > 4);
    if (viTriWords.filter(w => obs.includes(w)).length >= 3) {
      return { ten, loai: 'tot' as const, y_nghia: data.y_nghia, tin_cay: 50 };
    }
  }
  for (const [ten, data] of Object.entries(VAY_DATABASE.xau)) {
    if (obs.includes(ten.toLowerCase())) {
      return { ten, loai: 'xau' as const, y_nghia: data.y_nghia, tin_cay: 75 };
    }
  }
  return { ten: null, loai: 'thuong' as const, tin_cay: 50, y_nghia: 'Không quan sát thấy vảy quý hay vảy xấu đặc biệt. Vảy thuộc dạng phổ thông.' };
}

function tinhDiem(mat: string, chan: string, longDang: string, mappedVay: ReturnType<typeof mapVayFromDescription>, doRo: number) {
  let s = 5.0;
  const all = `${mat} ${chan} ${longDang}`.toLowerCase();
  if (all.includes('sáng') || all.includes('linh hoạt') || all.includes('lanh')) s += 0.4;
  if (all.includes('khô') || all.includes('gân nổi')) s += 0.4;
  if (all.includes('cân đối') || all.includes('thẳng')) s += 0.3;
  if (mappedVay.loai === 'tot') s += mappedVay.tin_cay >= 75 ? 2.0 : 1.2;
  if (mappedVay.loai === 'xau') s -= 1.5;
  if (doRo < 50) s -= 1.0;
  else if (doRo < 65) s -= 0.5;
  return Math.round(Math.max(3.0, Math.min(10.0, s)) * 10) / 10;
}

// ── RULE-BASED GIÁ (có tích hợp gaData) ──
function tinhGiaVaRule(
  diemNgoaiHinh: number,
  mappedVay: ReturnType<typeof mapVayFromDescription>,
  gaData?: any
) {
  // Giá base từ ngoại hình + vảy
  let giaMin: number;
  let giaMax: number;
  if (mappedVay.loai === 'xau') { giaMin = 500_000; giaMax = 1_500_000; }
  else if (diemNgoaiHinh >= 9.0) { giaMin = 15_000_000; giaMax = 30_000_000; }
  else if (diemNgoaiHinh >= 8.0) { giaMin = 6_000_000; giaMax = 15_000_000; }
  else if (diemNgoaiHinh >= 7.0) { giaMin = 3_000_000; giaMax = 6_000_000; }
  else if (diemNgoaiHinh >= 6.0) { giaMin = 1_500_000; giaMax = 3_000_000; }
  else { giaMin = 500_000; giaMax = 1_500_000; }

  const dieuChinhLyDo: string[] = [];
  let diemChienDau: number | null = null;
  let riskLevel = 'trung_binh';
  let riskLyDo = '';
  let canhBaoBenh = '';

  if (gaData) {
    const tran = parseInt(gaData.thanh_tich_tran) || 0;
    const thang = parseInt(gaData.thanh_tich_thang) || 0;
    const tuoi = parseInt(gaData.tuoi) || 0;
    const can = parseFloat(gaData.can_nang) || 0;
    const tyLeThang = tran > 0 ? thang / tran : 0;

    // ── RULE 1: Bệnh → cảnh báo + giảm giá mạnh ──
    if (gaData.tinh_trang === 'nghi_benh') {
      giaMin = Math.round(giaMin * 0.5);
      giaMax = Math.round(giaMax * 0.5);
      dieuChinhLyDo.push('⚠️ Nghi bệnh: giảm 50% giá');
      canhBaoBenh = 'Gà đang nghi bệnh. Cần kiểm tra kỹ trước khi mua bán. Người mua nên yêu cầu giám định thú y.';
      riskLevel = 'cao';
      riskLyDo = 'Tình trạng sức khỏe chưa rõ ràng — rủi ro cao khi đầu tư.';
    }
    if (gaData.tinh_trang === 'dang_tri') {
      giaMin = Math.round(giaMin * 0.4);
      giaMax = Math.round(giaMax * 0.4);
      dieuChinhLyDo.push('🏥 Đang điều trị: giảm 60% giá');
      canhBaoBenh = 'Gà đang trong quá trình điều trị bệnh. Chưa đánh giá được thực lực. Không nên giao dịch vội.';
      riskLevel = 'cao';
      riskLyDo = 'Gà đang bệnh — không thể đánh giá thực lực, rủi ro rất cao.';
    }

    // ── RULE 2: Thành tích tốt → tăng giá ──
    if (tran > 0) {
      if (thang >= 5 && tyLeThang >= 0.7) {
        giaMin = Math.round(giaMin * 1.35);
        giaMax = Math.round(giaMax * 1.35);
        dieuChinhLyDo.push(`🏆 Thành tích xuất sắc ${thang}/${tran} (${Math.round(tyLeThang*100)}%): +35% giá`);
        riskLevel = 'thap';
        riskLyDo = `Tỉ lệ thắng ${Math.round(tyLeThang*100)}% qua ${tran} trận — đã được kiểm chứng thực chiến.`;
      } else if (thang >= 3 && tyLeThang >= 0.5) {
        giaMin = Math.round(giaMin * 1.15);
        giaMax = Math.round(giaMax * 1.15);
        dieuChinhLyDo.push(`⚔️ Có thành tích ${thang}/${tran} trận: +15% giá`);
        riskLevel = 'thap';
        riskLyDo = `Đã có ${tran} trận chiến, tỉ lệ thắng ${Math.round(tyLeThang*100)}% — mức rủi ro thấp.`;
      } else if (tyLeThang < 0.4 && tran >= 3) {
        giaMin = Math.round(giaMin * 0.85);
        giaMax = Math.round(giaMax * 0.85);
        dieuChinhLyDo.push(`📉 Thành tích yếu ${thang}/${tran} trận: -15% giá`);
        riskLevel = 'trung_binh';
        riskLyDo = `Tỉ lệ thắng chỉ ${Math.round(tyLeThang*100)}% — cần xem lại phong độ.`;
      }

      diemChienDau = Math.min(10, Math.max(3, Math.round((tyLeThang * 6 + (thang >= 5 ? 2 : thang >= 3 ? 1 : 0)) * 10) / 10));
    }

    // ── RULE 3: Gà tơ chưa đá ──
    if (tuoi > 0 && tuoi < 10 && tran === 0) {
      if (riskLevel !== 'cao') riskLevel = 'trung_binh';
      riskLyDo = `Gà tơ ${tuoi} tháng chưa qua thực chiến — tiềm năng chưa được kiểm chứng.`;
      dieuChinhLyDo.push(`🐣 Gà tơ ${tuoi} tháng chưa đá: đánh giá rủi ro trung bình`);
    }

    // ── RULE 4: Cân nặng bất thường ──
    if (can > 0 && (can < 1.5 || can > 5.5)) {
      if (riskLevel === 'thap') riskLevel = 'trung_binh';
      dieuChinhLyDo.push(`⚖️ Cân nặng ${can}kg bất thường — cần kiểm tra thêm`);
    }
  } else {
    // Không có data → gà tơ chưa biết
    riskLevel = 'trung_binh';
    riskLyDo = 'Chưa có thông tin thành tích — không thể đánh giá rủi ro đầy đủ.';
  }

  const formatGia = (n: number) => {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace('.0', '') + '.000.000';
    return n.toLocaleString('vi-VN');
  };

  return {
    gia_de_xuat: `${formatGia(giaMin)} – ${formatGia(giaMax)}`,
    gia_dieu_chinh_ly_do: dieuChinhLyDo.length > 0 ? dieuChinhLyDo.join(' • ') : null,
    diem_chien_dau: diemChienDau,
    risk_level: riskLevel,
    risk_ly_do: riskLyDo,
    canh_bao_benh: canhBaoBenh || null,
  };
}

// ── ĐÁNH GIÁ CHIẾN ĐẤU bằng text ──
function buildChienDauNhanXet(gaData: any): string | null {
  if (!gaData) return null;
  const tran = parseInt(gaData.thanh_tich_tran) || 0;
  const thang = parseInt(gaData.thanh_tich_thang) || 0;
  const tuoi = parseInt(gaData.tuoi) || 0;
  const loai = gaData.loai;
  const nguon = gaData.nguon_goc;

  if (tran === 0 && tuoi === 0 && !loai) return null;

  const parts: string[] = [];

  if (loai) {
    const loaiMap: Record<string, string> = {
      ga_don: 'Gà đòn — chiến theo lối bền bỉ, hay dùng đòn đấm mổ liên tục.',
      ga_cua: 'Gà cựa — đòn cựa hiểm, một đòn có thể kết liễu đối thủ.',
      ga_tre: 'Gà tre — nhỏ con nhưng nhanh nhẹn, khó bắt được đòn.',
    };
    parts.push(loaiMap[loai] || '');
  }

  if (tuoi > 0) {
    if (tuoi < 10) parts.push(`Tuổi ${tuoi} tháng — gà tơ, đang trong giai đoạn phát triển.`);
    else if (tuoi <= 24) parts.push(`Tuổi ${tuoi} tháng — độ tuổi chiến đấu tốt nhất.`);
    else parts.push(`Tuổi ${tuoi} tháng — gà lớn tuổi, kinh nghiệm cao nhưng sức bền có thể giảm.`);
  }

  if (tran > 0) {
    const ty = Math.round((thang / tran) * 100);
    parts.push(`Thành tích: ${thang} thắng / ${tran} trận (${ty}%). ${ty >= 70 ? 'Phong độ xuất sắc.' : ty >= 50 ? 'Phong độ ổn định.' : 'Phong độ cần cải thiện.'}`);
  } else {
    parts.push('Chưa qua thực chiến — chưa đánh giá được thực lực.');
  }

  if (nguon) {
    parts.push(nguon === 'ga_nha' ? 'Gà nhà nuôi — biết rõ nguồn gốc, ít rủi ro bệnh ẩn.' : 'Gà mua lại — cần kiểm tra kỹ lịch sử.');
  }

  return parts.filter(Boolean).join(' ');
}

// ── PROMPT ──
const SYSTEM_PROMPT = `Bạn là chuyên gia xem tướng gà chọi Việt Nam với bộ kiến thức 92 loại vảy chuẩn.

NHIỆM VỤ: Quan sát và mô tả thực tế — KHÔNG tự đặt tên vảy.

KIẾN THỨC VỊ TRÍ CHÂN GÀ:
- Hàng Quách (Nội): theo ngón giữa đi thẳng lên gối
- Hàng Thành (Ngoại): theo ngón ngoại đi thẳng lên gối
- Hàng Hậu: mặt sau chân, 1 hàng vảy lớn
- Hàng Độ: từ cựa lên đến gối
- Hàng Kẽm: giữa hàng Hậu và hàng Độ (mặt trong)
- Hàng Biên: giữa hàng Ngoại và hàng Hậu

QUY TẮC:
1. Tất cả ảnh là CÙNG 1 CON GÀ
2. CHỈ mô tả vảy — KHÔNG đặt tên
3. Nếu không rõ → nói rõ lý do
4. Viết kiểu dân chơi gà miền Nam
5. Nếu có dữ liệu gà (tuổi, thành tích, tình trạng) → kết hợp vào nhận xét tổng`;

function buildUserPrompt(gaData: any): string {
  let gaInfo = '';
  if (gaData) {
    const parts: string[] = [];
    if (gaData.loai) parts.push(`Loại: ${gaData.loai === 'ga_don' ? 'Gà đòn' : gaData.loai === 'ga_cua' ? 'Gà cựa' : 'Gà tre'}`);
    if (gaData.tuoi) parts.push(`Tuổi: ${gaData.tuoi} tháng`);
    if (gaData.can_nang) parts.push(`Cân nặng: ${gaData.can_nang} kg`);
    if (gaData.thanh_tich_tran) parts.push(`Thành tích: ${gaData.thanh_tich_thang || 0} thắng / ${gaData.thanh_tich_tran} trận`);
    if (gaData.tinh_trang) parts.push(`Tình trạng: ${gaData.tinh_trang === 'khoe' ? 'Khỏe mạnh' : gaData.tinh_trang === 'nghi_benh' ? 'Nghi bệnh' : 'Đang điều trị'}`);
    if (gaData.nguon_goc) parts.push(`Nguồn gốc: ${gaData.nguon_goc === 'ga_nha' ? 'Gà nhà nuôi' : 'Mua lại'}`);
    if (parts.length > 0) gaInfo = `\n\nThông tin chủ gà cung cấp:\n${parts.join('\n')}`;
  }

  return `Nhìn tất cả ảnh — đây là CÙNG 1 CON GÀ nhiều góc.${gaInfo}

Trả về JSON thuần (không backtick, không markdown):
{
  "so_anh": số ảnh,
  "nhan_dien_anh": "Ảnh 1: ... Ảnh 2: ...",
  "do_ro_trung_binh": 0-100,
  "phan_thay_ro": "...",
  "phan_khong_ro": "...",
  "mat": "mô tả mắt",
  "chan": "mô tả chân",
  "long_dang": "mô tả lông dáng",
  "vay_quan_sat": "mô tả kỹ vảy theo thuật ngữ hàng Quách/Thành/Hậu/Độ/Kẽm — KHÔNG đặt tên vảy",
  "hau_do_kem": "mô tả riêng hàng Hậu, Độ, Kẽm",
  "diem_manh": "điểm mạnh ngoại hình",
  "diem_han_che": "điểm yếu ngoại hình",
  "nhan_xet_tong": "nhận xét tổng thể kiểu dân chơi gà${gaData && Object.values(gaData).some(v => v) ? ', kết hợp cả thông tin chủ gà cung cấp' : ''}"
}`;
}

export async function POST(req: NextRequest) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: 'Chưa cấu hình OPENAI_API_KEY trong .env.local' }, { status: 500 });
  }

  let body: any;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Request body không hợp lệ' }, { status: 400 }); }

  const validImages: string[] = (body.images || []).filter(
    (img: any) => typeof img === 'string' && img.startsWith('data:image')
  );
  if (validImages.length === 0) {
    return NextResponse.json({ error: 'Cần ít nhất 1 ảnh hợp lệ.' }, { status: 400 });
  }

  // gaData từ client (có thể null/undefined nếu không nhập)
  const gaData = body.gaData && Object.values(body.gaData).some(v => v !== '') ? body.gaData : null;

  const content: any[] = [{ type: 'text', text: buildUserPrompt(gaData) }];
  validImages.forEach((img, i) => {
    content.push({ type: 'text', text: `--- Ảnh ${i + 1} ---` });
    content.push({ type: 'image_url', image_url: { url: img, detail: 'high' } });
  });

  let response: any;
  try {
    response = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 1800,
      temperature: 0.8,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content },
      ],
    });
  } catch (apiErr: any) {
    const msg: string = apiErr?.message || '';
    console.error('OpenAI error:', msg);
    if (msg.includes('401') || msg.includes('invalid_api_key')) return NextResponse.json({ error: 'OPENAI_API_KEY không hợp lệ.' }, { status: 401 });
    if (msg.includes('429') || msg.includes('rate_limit')) return NextResponse.json({ error: 'Quá nhiều yêu cầu. Thử lại sau.' }, { status: 429 });
    if (msg.includes('insufficient_quota') || msg.includes('billing')) return NextResponse.json({ error: 'Tài khoản OpenAI hết credits.' }, { status: 402 });
    return NextResponse.json({ error: `Lỗi OpenAI: ${msg.slice(0, 200)}` }, { status: 500 });
  }

  const raw = response.choices?.[0]?.message?.content || '';
  let ai: any;
  const attempts = [
    raw,
    raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim(),
    (raw.match(/\{[\s\S]*\}/) || [])[0] || '',
  ];
  for (const attempt of attempts) {
    if (!attempt) continue;
    try { ai = JSON.parse(attempt); break; } catch { /* next */ }
  }
  if (!ai) {
    return NextResponse.json({ error: 'AI trả về định dạng không hợp lệ. Vui lòng thử lại.' }, { status: 500 });
  }

  // ── Tính toán ──
  const vayText = `${ai.vay_quan_sat || ''} ${ai.hau_do_kem || ''}`;
  const mappedVay = mapVayFromDescription(vayText);
  const doRo = typeof ai.do_ro_trung_binh === 'number' ? ai.do_ro_trung_binh : 60;
  const diemNgoaiHinh = tinhDiem(ai.mat || '', ai.chan || '', ai.long_dang || '', mappedVay, doRo);
  const doTinCay = Math.min(90, Math.round(doRo * 0.5 + mappedVay.tin_cay * 0.5));

  // ── Rule-based ──
  const rule = tinhGiaVaRule(diemNgoaiHinh, mappedVay, gaData);
  const chienDauNhanXet = buildChienDauNhanXet(gaData);

  // ── Điểm tổng hợp ──
  let tongDiem = diemNgoaiHinh;
  if (rule.diem_chien_dau !== null) {
    tongDiem = Math.round((diemNgoaiHinh * 0.6 + rule.diem_chien_dau * 0.4) * 10) / 10;
  }

  return NextResponse.json({
    so_anh: validImages.length,
    nhan_dien_anh: ai.nhan_dien_anh || '',
    do_ro: doRo,
    phan_thay_ro: ai.phan_thay_ro || '',
    phan_khong_ro: ai.phan_khong_ro || '',
    mat: ai.mat || '',
    chan: ai.chan || '',
    long_dang: ai.long_dang || '',
    vay_quan_sat: ai.vay_quan_sat || '',
    hau_do_kem: ai.hau_do_kem || '',
    diem_manh: ai.diem_manh || '',
    diem_han_che: ai.diem_han_che || '',
    nhan_xet_tong: ai.nhan_xet_tong || '',

    // Điểm
    tong_diem: tongDiem,
    diem_ngoai_hinh: diemNgoaiHinh,
    diem_chien_dau: rule.diem_chien_dau,
    do_tin_cay: doTinCay,

    // Vảy
    vay_ten: mappedVay.ten,
    vay_loai: mappedVay.loai,
    vay_ket_luan: mappedVay.ten
      ? `${mappedVay.loai === 'xau' ? '⚠️' : '✅'} Phát hiện: ${mappedVay.ten}`
      : '📊 Vảy phổ thông — không phát hiện vảy quý hay vảy xấu trong 92 loại',
    vay_y_nghia: mappedVay.y_nghia,
    tin_cay_vay: mappedVay.tin_cay,

    // Giá + rule
    gia_de_xuat: rule.gia_de_xuat,
    gia_dieu_chinh_ly_do: rule.gia_dieu_chinh_ly_do,
    ly_do_gia: `Điểm ngoại hình ${diemNgoaiHinh}/10 — ${mappedVay.ten ? `phát hiện ${mappedVay.ten} (${mappedVay.tin_cay}%)` : 'vảy phổ thông'} — độ rõ ${doRo}%`,

    // Chiến đấu + risk
    chien_dau_nhan_xet: chienDauNhanXet,
    risk_level: rule.risk_level,
    risk_ly_do: rule.risk_ly_do,
    canh_bao_benh: rule.canh_bao_benh,

    // Bổ sung
    yeu_cau_bo_sung: doRo < 70
      ? `Cần ảnh rõ hơn: ${ai.phan_khong_ro || 'ảnh chân sát gối, ngang cựa, dưới ngón giữa'}`
      : validImages.length < 3
        ? `Có ${validImages.length}/4 ảnh. Thêm ảnh để phân tích chính xác hơn.`
        : !gaData
          ? 'Nhập thêm thông tin gà (tuổi, thành tích, tình trạng) để AI định giá chính xác hơn.'
          : 'Ảnh và thông tin đủ tốt. Có video đá thử càng chính xác hơn.',
    canh_bao: 'Nhận định AI từ hình ảnh — không phải đánh giá thực chiến. Giá tham khảo thị trường.',
  });
}
