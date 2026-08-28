const http = require("http");
const fs = require("fs");
const path = require("path");
const root = __dirname, port = Number(process.env.PORT) || 8765;
const mime = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8" };
const send = (res, status, data) => { res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" }); res.end(JSON.stringify(data)); };
function cleanJson(value) { const text = String(value || "").replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim(), start = text.indexOf("{"), end = text.lastIndexOf("}"); if (start < 0 || end < start) throw new Error("AI가 올바른 슬라이드 JSON을 반환하지 않았습니다."); return JSON.parse(text.slice(start, end + 1)); }
function promptFor({ content, sourceType, slideCount }) { return `You are a presentation strategist. Create a Korean presentation outline using this ${sourceType} input. Return JSON only: {"title":"...","subtitle":"...","slides":[{"title":"...","bullets":["...","..."]}]}. Create exactly ${slideCount} slides, each with 3 to 5 concise Korean bullets. Preserve material numbers, units, dates and facts.\n\nSOURCE:\n${content}`; }
async function generate({ provider, apiKey, content, sourceType, slideCount } = {}) {
  if (!apiKey || !["openai", "anthropic"].includes(provider)) throw new Error("사용할 AI와 API 키를 확인하세요.");
  if (typeof content !== "string" || !content.trim() || content.length > 120000) throw new Error("입력 내용은 1~120,000자여야 합니다.");
  if (!Number.isInteger(slideCount) || slideCount < 2 || slideCount > 30) throw new Error("슬라이드 장수는 2~30 사이여야 합니다.");
  const prompt = promptFor({ content, sourceType, slideCount }); let endpoint, headers, request;
  if (provider === "openai") { endpoint = "https://api.openai.com/v1/chat/completions"; headers = { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` }; request = { model: "gpt-4.1-mini", temperature: 0.4, response_format: { type: "json_object" }, messages: [{ role: "user", content: prompt }] }; }
  else { endpoint = "https://api.anthropic.com/v1/messages"; headers = { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" }; request = { model: "claude-sonnet-4-20250514", max_tokens: 5000, temperature: 0.4, messages: [{ role: "user", content: prompt }] }; }
  const upstream = await fetch(endpoint, { method: "POST", headers, body: JSON.stringify(request) }), result = await upstream.json().catch(() => ({}));
  if (!upstream.ok) throw new Error(result?.error?.message || "AI 제공자가 요청을 처리하지 못했습니다.");
  const raw = provider === "openai" ? result?.choices?.[0]?.message?.content : result?.content?.map((part) => part.text || "").join("\n"), presentation = cleanJson(raw);
  if (!Array.isArray(presentation.slides) || presentation.slides.length !== slideCount) throw new Error("AI가 요청한 장수의 슬라이드를 반환하지 않았습니다. 다시 시도하세요."); return presentation;
}
http.createServer((req, res) => {
  if (req.method === "POST" && req.url === "/api/generate") { let raw = ""; req.on("data", (chunk) => { raw += chunk; if (raw.length > 130000) req.destroy(); }); req.on("end", async () => { try { send(res, 200, { presentation: await generate(JSON.parse(raw)) }); } catch (error) { send(res, 400, { error: error.message || "AI 요청에 실패했습니다." }); } }); return; }
  if (req.method !== "GET" && req.method !== "HEAD") return send(res, 405, { error: "Method not allowed" });
  const relative = req.url === "/" ? "index.html" : decodeURIComponent(req.url.split("?")[0]).replace(/^\/+/, ""), filePath = path.resolve(root, relative);
  if (!filePath.startsWith(root + path.sep)) return send(res, 403, { error: "Forbidden" });
  fs.readFile(filePath, (error, data) => { if (error) return send(res, error.code === "ENOENT" ? 404 : 500, { error: "File not found" }); res.writeHead(200, { "Content-Type": mime[path.extname(filePath)] || "application/octet-stream" }); res.end(req.method === "HEAD" ? undefined : data); });
}).listen(port, "127.0.0.1", () => console.log(`Local PPT is running at http://127.0.0.1:${port}`));
