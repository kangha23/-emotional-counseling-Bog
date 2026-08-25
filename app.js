const chatBox = document.getElementById("chatBox");
const chatForm = document.getElementById("chatForm");
const messageInput = document.getElementById("messageInput");
const suggestions = document.getElementById("suggestions");

let history = [];

function spawnHearts() {
  const decor = document.getElementById("bgDecor");
  const symbols = ["💗", "🩷", "💕", "🌸", "✨"];
  for (let i = 0; i < 14; i++) {
    const h = document.createElement("span");
    h.className = "heart";
    h.textContent = symbols[i % symbols.length];
    h.style.left = Math.random() * 100 + "%";
    h.style.fontSize = 12 + Math.random() * 16 + "px";
    h.style.setProperty("--o", (0.15 + Math.random() * 0.25).toFixed(2));
    h.style.animationDuration = 10 + Math.random() * 12 + "s";
    h.style.animationDelay = -Math.random() * 20 + "s";
    decor.appendChild(h);
  }
}

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderRich(text) {
  const escaped = escapeHtml(text);
  const lines = escaped.split("\n");
  const out = [];
  let listItems = [];

  const flushList = () => {
    if (listItems.length) {
      out.push("<ul>" + listItems.map((li) => `<li>${li}</li>`).join("") + "</ul>");
      listItems = [];
    }
  };

  for (const line of lines) {
    const bullet = line.match(/^\s*[-•*]\s+(.*)$/);
    if (bullet) {
      listItems.push(bullet[1]);
    } else {
      flushList();
      if (line.trim()) out.push(line);
    }
  }
  flushList();

  return out
    .map((part) => (part.startsWith("<ul>") ? part : part.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\n/g, "<br>")))
    .join("");
}

function timeNow() {
  return new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}

function addMessage(text, role, rich = false) {
  const wrapper = document.createElement("div");
  wrapper.className = `message ${role}`;

  if (role === "bot") {
    const avatar = document.createElement("div");
    avatar.className = "msg-avatar";
    avatar.textContent = "💗";
    wrapper.appendChild(avatar);
  }

  const body = document.createElement("div");
  body.className = "msg-body";

  const bubble = document.createElement("div");
  bubble.className = "bubble";
  if (rich) {
    bubble.innerHTML = renderRich(text);
  } else {
    bubble.textContent = text;
  }
  body.appendChild(bubble);

  const time = document.createElement("div");
  time.className = "timestamp";
  time.textContent = timeNow();
  body.appendChild(time);

  wrapper.appendChild(body);
  chatBox.appendChild(wrapper);
  chatBox.scrollTop = chatBox.scrollHeight;
}

function showTyping() {
  const wrapper = document.createElement("div");
  wrapper.className = "message bot";
  wrapper.id = "typing";
  wrapper.innerHTML =
    '<div class="msg-avatar">💗</div><div class="msg-body"><div class="bubble typing"><span></span><span></span><span></span></div></div>';
  chatBox.appendChild(wrapper);
  chatBox.scrollTop = chatBox.scrollHeight;
}

function removeTyping() {
  const typing = document.getElementById("typing");
  if (typing) typing.remove();
}

async function sendMessage(text) {
  const message = text.trim();
  if (!message || sendMessage.busy) return;

  sendMessage.busy = true;
  addMessage(message, "user");
  suggestions.classList.add("hidden");
  showTyping();

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, history })
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      const msg =
        res.status === 429
          ? "Bot đang quá tải, bạn chờ chút rồi thử lại nhé 🌷"
          : data?.error || `HTTP ${res.status}`;
      throw new Error(msg);
    }

    removeTyping();
    addMessage(data.reply, "bot", true);
    history.push({ role: "user", parts: [{ text: message }] });
    history.push({ role: "model", parts: [{ text: data.reply }] });
  } catch (e) {
    removeTyping();
    const hint =
      e.message === "Failed to fetch"
        ? "Mất kết nối mạng. Bạn kiểm tra internet rồi thử lại nhé 📶"
        : `Có lỗi xảy ra: ${e.message}`;
    addMessage(`⚠️ ${hint}`, "bot");
  } finally {
    sendMessage.busy = false;
    messageInput.focus();
  }
}

chatForm.addEventListener("submit", (e) => {
  e.preventDefault();
  sendMessage(messageInput.value);
  messageInput.value = "";
});

suggestions.addEventListener("click", (e) => {
  const chip = e.target.closest(".chip");
  if (!chip) return;
  sendMessage(chip.textContent.replace(/[^\p{L}\p{N}?.,! ]/gu, "").trim());
});

spawnHearts();

addMessage(
  "Chào bạn 🌷 Mình là **JinXuan**, trợ lý tư vấn tình cảm của bạn.\n\nDù là crush, yêu đương hay chia tay... cứ tâm sự với mình nha, mình luôn sẵn lòng lắng nghe 💕",
  "bot",
  true
);
