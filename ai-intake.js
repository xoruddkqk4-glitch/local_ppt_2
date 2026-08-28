(() => {
  const $ = (selector) => document.querySelector(selector);
  const intake = $("#aiIntake"), form = $("#aiGenerationForm"), sourceInput = $("#intakeSourceInput"), selectionHint = $("#intakeSelectionHint");
  const textLabel = $("#intakeTextLabel"), textInput = $("#intakeText"), fileLabel = $("#intakeFileLabel"), fileInput = $("#intakeFile");
  const fileName = $("#intakeFileName"), fileInfo = $("#intakeFileInfo"), status = $("#aiIntakeStatus"), submitButton = $("#generatePresentationButton");
  let sourceType = null;
  const sourceLabels = { prose: "줄글 붙여넣기", outline: "개요 붙여넣기", pdf: "PDF 파일 업로드", spreadsheet: "엑셀 파일 업로드" };
  function setStatus(message = "", isError = false) { status.textContent = message; status.classList.toggle("is-error", isError); }
  function selectSource(type) {
    sourceType = type; sourceInput.hidden = false; selectionHint.textContent = `${sourceLabels[type]}를 선택했습니다.`;
    document.querySelectorAll("[data-intake-action]").forEach((button) => button.classList.toggle("is-selected", button.dataset.intakeAction === type));
    const isFile = type === "pdf" || type === "spreadsheet";
    textLabel.hidden = isFile; fileLabel.hidden = !isFile; fileInfo.hidden = !isFile; fileInput.value = ""; fileInfo.textContent = "";
    textInput.placeholder = type === "outline" ? "예: 1. 시장 문제\n   - 고객의 불편\n   - 시장 규모\n2. 해결 방법\n   - 제품의 핵심 기능" : "핵심 내용, 수치, 대상 독자, 꼭 담아야 할 메시지를 붙여넣으세요.";
    if (type === "spreadsheet") { fileInput.accept = ".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"; fileName.textContent = "엑셀 파일 선택"; }
    else { fileInput.accept = ".pdf,application/pdf"; fileName.textContent = "PDF 파일 선택"; }
    setStatus();
  }
  function selectedProvider() { const openai = $("#openaiApiKey").value.trim(), anthropic = $("#anthropicApiKey").value.trim(); return openai && anthropic ? $("input[name=aiProvider]:checked")?.value || "openai" : openai ? "openai" : anthropic ? "anthropic" : null; }
  function updateProviderChoice() {
    const both = Boolean($("#openaiApiKey").value.trim() && $("#anthropicApiKey").value.trim()), choice = $("#providerChoice"); choice.hidden = !both;
    if (both) choice.innerHTML = '<span>사용할 AI</span><label><input type="radio" name="aiProvider" value="openai" checked> ChatGPT</label><label><input type="radio" name="aiProvider" value="anthropic"> Claude</label>';
  }
  async function extractPdf(file) {
    const pdfjs = await import("https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.min.mjs");
    pdfjs.GlobalWorkerOptions.workerSrc = "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs";
    const pdf = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise, pages = [];
    for (let i = 1; i <= Math.min(pdf.numPages, 30); i += 1) { const content = await (await pdf.getPage(i)).getTextContent(); pages.push(content.items.map((item) => item.str).join(" ")); }
    return pages.join("\n\n").trim();
  }
  async function extractSpreadsheet(file) {
    if (!window.XLSX) throw new Error("엑셀 파일 분석 도구를 불러오지 못했습니다. 인터넷 연결을 확인한 뒤 다시 시도하세요.");
    const workbook = window.XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
    return workbook.SheetNames.slice(0, 5).map((name) => `[시트: ${name}]\n${window.XLSX.utils.sheet_to_csv(workbook.Sheets[name], { blankrows: false }).split("\n").slice(0, 200).join("\n")}`).join("\n\n").trim();
  }
  async function sourceContent() {
    if (sourceType === "prose" || sourceType === "outline") return textInput.value.trim();
    const file = fileInput.files[0]; if (!file) return ""; setStatus(`${file.name} 분석 중…`);
    const content = sourceType === "pdf" ? await extractPdf(file) : await extractSpreadsheet(file);
    fileInfo.textContent = `${file.name} · 추출된 텍스트 ${content.length.toLocaleString()}자`; return content;
  }
  async function generate(event) {
    event.preventDefault(); const provider = selectedProvider(), apiKey = provider === "openai" ? $("#openaiApiKey").value.trim() : $("#anthropicApiKey").value.trim(), model = provider === "openai" ? $("#openaiModel").value : $("#anthropicModel").value, slideCount = Number($("#aiSlideCount").value);
    if (!apiKey) return setStatus("ChatGPT 또는 Claude API 키를 하나 이상 입력하세요.", true);
    if (!Number.isInteger(slideCount) || slideCount < 2 || slideCount > 30) return setStatus("슬라이드 장수는 2~30 사이로 입력하세요.", true);
    let completed = false;
    try {
      submitButton.disabled = true; const content = await sourceContent();
      if (!content) throw new Error("프레젠테이션으로 만들 텍스트 또는 파일을 입력하세요.");
      if (content.length > 120000) throw new Error("입력 내용이 너무 깁니다. 120,000자 이하의 파일 또는 텍스트를 사용하세요.");
      if (window.location.protocol === "file:") throw new Error("AI 기능을 사용하려면 터미널에서 node server.js를 실행한 뒤 http://127.0.0.1:8765으로 접속하세요.");
      setStatus("AI가 슬라이드 구조를 만들고 있습니다…");
      const response = await fetch("/api/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ provider, model, apiKey, sourceType, content, slideCount }) });
      const result = await response.json().catch(() => ({})); if (!response.ok) throw new Error(result.error || "AI 요청에 실패했습니다.");
      window.LocalPptApp.applyAiPresentation(result.presentation); completed = true; intake.hidden = true;
    } catch (error) {
      const message = /failed to fetch|networkerror/i.test(String(error?.message || ""))
        ? "로컬 AI 서버에 연결할 수 없습니다. 터미널에서 node server.js를 실행한 뒤 http://127.0.0.1:8765으로 접속하세요."
        : error.message || "AI PPT를 만들지 못했습니다.";
      setStatus(message, true);
    }
    finally {
      if (completed) { $("#openaiApiKey").value = ""; $("#anthropicApiKey").value = ""; updateProviderChoice(); }
      submitButton.disabled = false;
    }
  }
  function showStartScreen() { intake.hidden = false; sourceType = null; sourceInput.hidden = true; selectionHint.textContent = "입력 방식을 선택하세요."; document.querySelectorAll("[data-intake-action]").forEach((button) => button.classList.remove("is-selected")); setStatus(); }
  document.querySelectorAll("[data-intake-action]").forEach((button) => button.addEventListener("click", () => { const action = button.dataset.intakeAction; if (action === "empty") { window.LocalPptApp.startBlank(); intake.hidden = true; } else if (action === "project") $("#intakeProjectFile").click(); else selectSource(action); }));
  $("#goHomeButton").addEventListener("click", showStartScreen);
  $("#intakeProjectFile").addEventListener("change", async (event) => { const file = event.target.files[0]; if (!file) return; await window.LocalPptApp.loadProjectFile(file); intake.hidden = true; });
  fileInput.addEventListener("change", () => { const file = fileInput.files[0]; fileName.textContent = file ? file.name : (sourceType === "pdf" ? "PDF 파일 선택" : "엑셀 파일 선택"); });
  [$("#openaiApiKey"), $("#anthropicApiKey")].forEach((input) => input.addEventListener("input", updateProviderChoice)); form.addEventListener("submit", generate);
})();
