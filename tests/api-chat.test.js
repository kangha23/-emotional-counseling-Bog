const assert = require("assert");

process.env.GEMINI_API_KEY = "test-key-fake";
const handler = require("../api/chat.js");

function makeRes() {
  const res = {
    statusCode: null,
    headers: {},
    chunks: [],
    ended: false,
    jsonBody: undefined,
    setHeader(k, v) {
      this.headers[k.toLowerCase()] = v;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.jsonBody = data;
      return this;
    },
    writeHead(code, headers) {
      this.statusCode = code;
      for (const [k, v] of Object.entries(headers || {})) {
        this.headers[k.toLowerCase()] = v;
      }
    },
    flushHeaders() {},
    write(chunk) {
      this.chunks.push(chunk);
    },
    end() {
      this.ended = true;
    }
  };
  return res;
}

function sseBody(events) {
  const encoder = new TextEncoder();
  const data = events.map((e) => `data: ${JSON.stringify(e)}\n\n`).join("");
  let sent = false;
  return {
    getReader() {
      return {
        read: async () => {
          if (!sent) {
            sent = true;
            return { done: false, value: encoder.encode(data) };
          }
          return { done: true, value: undefined };
        }
      };
    }
  };
}

const GEMINI_CHUNK = {
  candidates: [{ content: { parts: [{ text: "Xin chào từ hội đồng" }] } }]
};

async function run() {
  const originalFetch = global.fetch;
  const originalKey = process.env.GEMINI_API_KEY;
  const captured = {};

  try {
    // 1. OPTIONS -> 204
    {
      const res = makeRes();
      await handler({ method: "OPTIONS", body: {} }, res);
      assert.strictEqual(res.statusCode, 204);
      assert.strictEqual(res.headers["access-control-allow-origin"], "*");
      console.log("PASS: OPTIONS -> 204 + CORS");
    }

    // 2. GET -> 405
    {
      const res = makeRes();
      await handler({ method: "GET", body: null }, res);
      assert.strictEqual(res.statusCode, 405);
      console.log("PASS: GET -> 405");
    }

    // 3. Thiếu API key -> 500, không lộ key
    try {
      delete process.env.GEMINI_API_KEY;
      const res = makeRes();
      await handler({ method: "POST", body: { message: "hi" } }, res);
      assert.strictEqual(res.statusCode, 500);
      assert.strictEqual(res.jsonBody.error, "Thiếu biến môi trường GEMINI_API_KEY");
      console.log("PASS: thiếu GEMINI_API_KEY -> 500");
    } finally {
      process.env.GEMINI_API_KEY = originalKey;
    }

    // 4. Thiếu message -> 400
    {
      const res = makeRes();
      await handler({ method: "POST", body: {} }, res);
      assert.strictEqual(res.statusCode, 400);
      console.log("PASS: thiếu message -> 400");
    }

    // 5. Message toàn khoảng trắng -> 400
    {
      const res = makeRes();
      await handler({ method: "POST", body: { message: "   " } }, res);
      assert.strictEqual(res.statusCode, 400);
      console.log("PASS: message rỗng -> 400");
    }

    // 6. Happy path SSE: hội đồng phase clarify
    {
      global.fetch = async (url, opts) => {
        captured.url = url;
        captured.body = JSON.parse(opts.body);
        return { ok: true, body: sseBody([GEMINI_CHUNK, GEMINI_CHUNK]) };
      };
      const res = makeRes();
      await handler(
        {
          method: "POST",
          body: {
            message: "(kick)",
            mode: "council",
            phase: "clarify",
            scenario: { situation: "Crush rep tin ít", question: "Có thích không?" },
            history: []
          }
        },
        res
      );
      assert.strictEqual(res.statusCode, 200);
      assert.match(res.headers["content-type"] || "", /text\/event-stream/);
      const all = res.chunks.join("");
      assert.ok(all.includes('"text":"Xin chào từ hội đồng"'));
      assert.ok(all.includes("data: [DONE]"));
      assert.strictEqual(res.ended, true);
      // system prompt đúng phase + có schema
      const sys = captured.body.system_instruction.parts[0].text;
      assert.ok(sys.includes("needsClarification"));
      assert.ok(sys.includes("<tinh_huong>Crush rep tin ít</tinh_huong>"));
      console.log("PASS: SSE happy path + prompt đúng phase");
    }

    // 7. History chuẩn hoá: gộp role liền kề, bỏ model đầu, merge message hiện tại
    {
      global.fetch = async (url, opts) => {
        captured.body = JSON.parse(opts.body);
        return { ok: true, body: sseBody([GEMINI_CHUNK]) };
      };
      const res = makeRes();
      await handler(
        {
          method: "POST",
          body: {
            message: "Câu hỏi tiếp theo",
            history: [
              { role: "model", parts: [{ text: "phân tích cũ" }] },
              { role: "user", parts: [{ text: "kịch bản" }] },
              { role: "user", parts: [{ text: "thêm chi tiết" }] },
              { role: "bot", parts: [{ text: "phản hồi" }] }
            ]
          }
        },
        res
      );
      const contents = captured.body.contents;
      assert.strictEqual(contents[0].role, "user", "phải bắt đầu bằng user");
      for (let i = 1; i < contents.length; i++) {
        assert.notStrictEqual(contents[i].role, contents[i - 1].role, "phải xen kẽ user/model");
      }
      assert.strictEqual(contents[contents.length - 1].role, "user");
      console.log("PASS: history chuẩn hoá (xen kẽ, không model đầu)");
    }

    // 8. Upstream lỗi -> trả JSON lỗi, không crash
    {
      global.fetch = async () => ({
        ok: false,
        status: 429,
        json: async () => ({ error: { message: "Rate limited" } })
      });
      const res = makeRes();
      await handler({ method: "POST", body: { message: "hi" } }, res);
      assert.strictEqual(res.statusCode, 429);
      assert.strictEqual(res.jsonBody.error, "Rate limited");
      console.log("PASS: upstream 429 -> lỗi thân thiện, không crash");
    }

    // 9. Upstream ném exception -> 502
    {
      global.fetch = async () => {
        throw new Error("network down");
      };
      const res = makeRes();
      await handler({ method: "POST", body: { message: "hi" } }, res);
      assert.strictEqual(res.statusCode, 502);
      console.log("PASS: fetch ném exception -> 502");
    }

    // 10. Upstream stream giữa chừng ném lỗi -> gửi event error + [DONE], không crash
    {
      global.fetch = async () => ({
        ok: true,
        body: {
          getReader() {
            return {
              read: async () => {
                throw new Error("stream broken");
              }
            };
          }
        }
      });
      const res = makeRes();
      await handler({ method: "POST", body: { message: "hi" } }, res);
      assert.strictEqual(res.statusCode, 200);
      const all = res.chunks.join("");
      assert.ok(all.includes('"error"'));
      assert.ok(all.includes("data: [DONE]"));
      assert.strictEqual(res.ended, true);
      console.log("PASS: stream đứt giữa chừng -> event error + [DONE]");
    }

    // 11. Phase lạ -> mặc định deliberate
    {
      global.fetch = async (url, opts) => {
        captured.body = JSON.parse(opts.body);
        return { ok: true, body: sseBody([GEMINI_CHUNK]) };
      };
      const res = makeRes();
      await handler(
        {
          method: "POST",
          body: { message: "hi", mode: "council", phase: "hack-phase", scenario: { situation: "x" } }
        },
        res
      );
      const sys = captured.body.system_instruction.parts[0].text;
      assert.ok(sys.includes("TRANH LUẬN"));
      console.log("PASS: phase lạ -> deliberate");
    }

    // 12. maxDuration export
    assert.strictEqual(typeof handler.maxDuration, "number");
    console.log("PASS: export maxDuration");

    console.log("\nTất cả API tests PASSED ✅");
  } finally {
    global.fetch = originalFetch;
    process.env.GEMINI_API_KEY = originalKey;
  }
}

run().catch((e) => {
  console.error("TEST FAILED:", e.message);
  process.exit(1);
});
