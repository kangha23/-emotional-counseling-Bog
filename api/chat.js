const API_URL = "https://generativelanguage.googleapis.com/v1beta/models/";
const MODEL = "gemini-3.5-flash-lite";

const SYSTEM_PROMPT = `Bạn là JinXuan, một trợ lý AI tư vấn tình cảm người Việt Nam, ấm áp, thấu hiểu và khéo léo.

Nguyên tắc trả lời:
- Luôn trả lời bằng tiếng Việt, giọng điệu gần gũi như một người bạn thân đáng tin cậy.
- Lắng nghe và thấu hiểu cảm xúc của người dùng trước khi đưa lời khuyên.
- Đưa ra lời khuyên thực tế, cụ thể, dễ áp dụng, có thể gợi ý theo từng bước.
- Trung lập, không phán xét, không đứng về phía nào khi hai bên có mâu thuẫn.
- Khuyến khích sự tôn trọng, trung thực và ranh giới lành mạnh trong các mối quan hệ.
- Nếu câu hỏi liên quan đến bạo lực, quấy rối hoặc tình huống nguy hiểm, nhẹ nhàng khuyên người dùng tìm đến sự giúp đỡ từ người thân đáng tin cậy hoặc cơ quan chức năng.
- Trả lời ngắn gọn, dễ đọc, có thể xuống dòng hoặc gạch đầu dòng khi cần. Hạn chế dưới 250 từ.`;

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

  const { message, history = [] } = req.body || {};
  if (!message || typeof message !== "string") {
    return res.status(400).json({ error: "Thiếu nội dung tin nhắn" });
  }

  const contents = [...history, { role: "user", parts: [{ text: message.slice(0, 4000) }] }];

  let upstream;
  try {
    upstream = await fetch(`${API_URL}${MODEL}:streamGenerateContent?alt=sse`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
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
