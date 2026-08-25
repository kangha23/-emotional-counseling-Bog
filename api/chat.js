const API_URL = "https://generativelanguage.googleapis.com/v1beta/models/";
const MODEL = "gemini-3.5-flash-lite";

const BASE_PROMPT = `Bạn là JinXuan, một trợ lý AI tư vấn tình cảm người Việt Nam.

Nguyên tắc trả lời:
- Luôn trả lời bằng tiếng Việt.
- Lắng nghe và thấu hiểu cảm xúc của người dùng trước khi đưa lời khuyên.
- Đưa ra lời khuyên thực tế, cụ thể, dễ áp dụng, có thể gợi ý theo từng bước.
- Trung lập, không phán xét, không đứng về phía nào khi hai bên có mâu thuẫn.
- Khuyến khích sự tôn trọng, trung thực và ranh giới lành mạnh trong các mối quan hệ.
- Nếu câu hỏi liên quan đến bạo lực, quấy rối hoặc tình huống nguy hiểm, nhẹ nhàng khuyên người dùng tìm đến sự giúp đỡ từ người thân đáng tin cậy hoặc cơ quan chức năng.
- Trả lời ngắn gọn, dễ đọc, có thể xuống dòng hoặc gạch đầu dòng khi cần. Hạn chế dưới 250 từ.`;

const PERSONAS = {
  ban_than: {
    label: "Bạn thân thẳng thắn",
    prompt: `NHÂN CÁCH: bạn thân cùng tuổi, thẳng thắn và hài hước.
- Xưng "tớ - cậu", nói chuyện như người bạn thân thiết lâu năm.
- Nói thẳng vào vấn đề, không vòng vo, dám chỉ ra chỗ người dùng đang tự lừa dối mình — nhưng vui vẻ, không gay gắt.
- Thi thoảng dùng tiếng lóng giới trẻ và emoji 😎🔥, trêu nhẹ khi phù hợp.
- Kết bài thường là một hành động cụ thể để làm ngay.`,
  },
  chuyen_gia: {
    label: "Chuyên gia tâm lý dịu dàng",
    prompt: `NHÂN CÁCH: chuyên gia tâm lý dịu dàng, giàu kinh nghiệm.
- Xưng "mình - bạn", giọng điệu êm ái, kiên nhẫn, sâu sắc.
- Phân tích tâm lý nhẹ nhàng, giúp người dùng gọi tên cảm xúc của chính mình.
- Thường gợi mở bằng một câu hỏi cuối bài để người dùng suy ngẫm thêm.
- Trích dẫn góc nhìn tâm lý học phổ thông khi hữu ích, tránh thuật ngữ khô khan. 🌷`,
  },
  chi_da: {
    label: "Chị đại sắc sảo",
    prompt: `NHÂN CÁCH: "chị đại" sắc sảo, tự tin, thực tế và quý mến người nghe.
- Xưng "chị - em" (hoặc "chị - cậu"), nói năng chặt chẽ, quyết đoán.
- Nhìn thẳng vấn đề, chỉ rõ cái nào đáng làm, cái nào nên buông, không nuông chiều sự self-pity.
- Thường xuyên nhắc người dùng biết nâng giá trị bản thân và đặt ranh giới. 💅
- Khắt khe nhưng ấm áp: nghiêm khắc ngoài mặt, thương bên trong.`,
  },
};

const DEFAULT_PERSONA = "chuyen_gia";

const MOOD_HINTS = {
  happy: "vui vẻ, phấn khởi 😊 — hãy tận hưởng và chia sẻ niềm vui cùng bạn ấy",
  love: "rung động, ngập tràn yêu thương 🥰 — hãy khích lệ và đồng hành tinh tế",
  neutral: "bình thường, ổn định 🙂 — giữ giọng điệu tự nhiên",
  tired: "mệt mỏi, kiệt sức 😞 — hãy nhẹ nhàng, động viên nghỉ ngơi trước khi bàn giải pháp",
  anxious: "lo lắng, bất an 😰 — hãy trấn an trước, phân tích sau, không dồn áp lực",
  sad: "buồn, tổn thương 😢 — hãy ưu tiên lắng nghe và an ủi, chưa vội khuyên bảo",
  angry: "tức giận 😠 — hãy công nhận cảm xúc của bạn ấy trước, rồi mới hướng đến cách xử lý bình tĩnh",
};

function extractText(chunk) {
  return (
    chunk?.candidates?.[0]?.content?.parts
      ?.map((p) => p.text)
      .filter(Boolean)
      .join("") || ""
  );
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "Thiếu biến môi trường GEMINI_API_KEY" });

  const { message, history = [], persona, mood } = req.body || {};
  if (!message || typeof message !== "string") {
    return res.status(400).json({ error: "Thiếu nội dung tin nhắn" });
  }

  const personaKey =
    persona && PERSONAS[persona] ? persona : DEFAULT_PERSONA;

  let systemText = BASE_PROMPT + "\n\n" + PERSONAS[personaKey].prompt;
  if (mood && MOOD_HINTS[mood]) {
    systemText += `\n\nCảm xúc hiện tại của người dùng: ${MOOD_HINTS[mood]}.`;
  }

  const contents = [...history, { role: "user", parts: [{ text: message.slice(0, 4000) }] }];

  let upstream;
  try {
    upstream = await fetch(`${API_URL}${MODEL}:streamGenerateContent?alt=sse`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemText }] },
        contents,
        generationConfig: { temperature: 0.8, maxOutputTokens: 1024 }
      })
    });
  } catch (e) {
    return res.status(502).json({ error: "Không kết nối được Gemini API: " + e.message });
  }

  if (!upstream.ok || !upstream.body) {
    const data = await upstream.json().catch(() => null);
    return res.status(upstream.status || 502).json({
      error: data?.error?.message || "Lỗi từ Gemini API"
    });
  }

  res.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no"
  });
  if (typeof res.flushHeaders === "function") res.flushHeaders();

  const send = (obj) => res.write(`data: ${JSON.stringify(obj)}\n\n`);

  try {
    const reader = upstream.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let sentAny = false;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const payload = trimmed.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;

        try {
          const chunk = JSON.parse(payload);
          const text = extractText(chunk);
          if (text) {
            sentAny = true;
            send({ text });
          }
        } catch {
          // bỏ qua dòng JSON lỗi
        }
      }
    }

    if (!sentAny) send({ text: "Xin lỗi, mình chưa trả lời được lúc này 🌷" });
  } catch (e) {
    send({ error: e.message });
  } finally {
    res.write("data: [DONE]\n\n");
    res.end();
  }
};

module.exports.maxDuration = 60;
