(() => {
  const $ = (selector) => document.querySelector(selector);
  const intake = $("#aiIntake"), form = $("#aiGenerationForm"), sourceInput = $("#intakeSourceInput"), selectionHint = $("#intakeSelectionHint");
  const proseLabel = $("#intakeProseTextLabel"), proseInput = $("#intakeProseText");
  const outlineLabel = $("#intakeOutlineTextLabel"), outlineInput = $("#intakeOutlineText");
  const fileLabel = $("#intakeFileLabel"), fileInput = $("#intakeFile");
  const fileName = $("#intakeFileName"), fileInfo = $("#intakeFileInfo"), status = $("#aiIntakeStatus");
  const aiGenerateButton = $("#generatePresentationButton");
  const startStyleButton = $("#startPresentationWithStyleButton");
  const styleModal = $("#styleConfigModal");
  let sourceType = null;
  let progressTimer = null;
  const generateButtonLabel = "AI로 슬라이드 만들기";
  const startButtonLabel = "✨ 선택한 디자인 & 스타일로 프레젠테이션 시작하기";
  const sourceLabels = { prose: "줄글 붙여넣기", outline: "개요 붙여넣기", pdf: "PDF 파일 업로드", spreadsheet: "엑셀 파일 업로드" };

  function getIntakePalette() {
    return [
      $("#intakeColorHex1")?.value || "#e11d48",
      $("#intakeColorHex2")?.value || "#2563eb",
      $("#intakeColorHex3")?.value || "#f59e0b"
    ];
  }

  function setIntakePalette(colors) {
    if (!Array.isArray(colors) || colors.length < 3) return;
    [1, 2, 3].forEach((index) => {
      const hex = colors[index - 1];
      const picker = $(`#intakeColorPicker${index}`);
      const hexInput = $(`#intakeColorHex${index}`);
      const swatch = $(`#intakeColorSwatch${index}`);
      if (picker) picker.value = hex;
      if (hexInput) hexInput.value = hex;
      if (swatch) swatch.style.background = hex;
    });
  }

  function renderDesignThumbnailHTML(design, c1, c2, c3) {
    const designMeta = window.PptDesigns?.[design];
    const name = designMeta?.name || design.toUpperCase();
    const desc = designMeta?.description || "프레젠테이션 디자인 테마 미리보기";

    return `
      <div class="thumb-header">
        <span class="thumb-title" style="color:${c1}; font-weight:900;">${name}</span>
        <span class="thumb-badge" style="border:1px solid ${c1}; color:${c1}; font-weight:800;">개요식 템플릿</span>
      </div>
      <p class="thumb-desc">${desc}</p>
      <div class="thumb-slide-frame design-frame-${design}" data-design="${design}">
        <div class="frame-overlay-top" style="color:${c1}; font-weight:900;">PAGE 02 · 개요식 템플릿</div>
        <div class="frame-bullet-content">
          <h2 class="frame-bullet-title">핵심 메시지</h2>
          <div class="frame-bullet-list">
            <div class="thumb-bullet-item" style="border-left-color:${c1};">
              <span class="bullet-text">첫 번째 핵심 내용</span>
            </div>
            <div class="thumb-bullet-item" style="border-left-color:${c1};">
              <span class="bullet-text">두 번째 핵심 내용</span>
            </div>
            <div class="thumb-bullet-item" style="border-left-color:${c1};">
              <span class="bullet-text">세 번째 핵심 내용</span>
            </div>
          </div>
        </div>
        <div class="frame-footer-dots">
          <span class="thumb-color-dot" style="background:${c1};" title="1순위: ${c1}"></span>
          <span class="thumb-color-dot" style="background:${c2};" title="2순위: ${c2}"></span>
          <span class="thumb-color-dot" style="background:${c3};" title="3순위: ${c3}"></span>
        </div>
      </div>
    `;
  }

  function renderDesignThumbnail(design) {
    const palette = getIntakePalette();
    const html = renderDesignThumbnailHTML(design, palette[0], palette[1], palette[2]);
    ["#intakeDesignThumbnail", "#modalDesignThumbnail"].forEach((selector) => {
      const box = $(selector);
      if (box) {
        box.className = `design-thumbnail-preview design-thumb-${design}`;
        box.innerHTML = html;
      }
    });
  }

  function getIntakeFixedOverlays() {
    const overlays = {
      applyToTitle: $("#intakeOverlayApplyToTitle")?.checked || $("#modalOverlayApplyToTitle")?.checked || false
    };
    ["tl", "tc", "tr", "bl", "bc", "br"].forEach((pos) => {
      overlays[pos] = {
        text: $(`#intakeOverlayText_${pos}`)?.value || "",
        size: $(`#intakeOverlaySize_${pos}`)?.value || "13px",
        weight: $(`#intakeOverlayWeight_${pos}`)?.value || "700"
      };
    });
    return overlays;
  }

  function setIntakeFixedOverlays(overlays) {
    if (!overlays) return;
    const titleToggle = $("#intakeOverlayApplyToTitle");
    const modalTitleToggle = $("#modalOverlayApplyToTitle");
    if (titleToggle) titleToggle.checked = !!overlays.applyToTitle;
    if (modalTitleToggle) modalTitleToggle.checked = !!overlays.applyToTitle;

    ["tl", "tc", "tr", "bl", "bc", "br"].forEach((pos) => {
      const cfg = overlays[pos] || { text: "", size: "13px", weight: "700" };
      const textInput = $(`#intakeOverlayText_${pos}`);
      const sizeSelect = $(`#intakeOverlaySize_${pos}`);
      const weightSelect = $(`#intakeOverlayWeight_${pos}`);
      if (textInput) textInput.value = cfg.text || "";
      if (sizeSelect) sizeSelect.value = cfg.size || "13px";
      if (weightSelect) weightSelect.value = cfg.weight || "700";
    });
  }

  document.addEventListener("change", (e) => {
    if (e.target && e.target.classList.contains("overlay-preset-select")) {
      const targetId = e.target.dataset.target;
      const targetInput = $(`#${targetId}`);
      if (targetInput && e.target.value) {
        targetInput.value = e.target.value;
        e.target.value = "";
      }
    }
  });

  function syncIntakePaletteFromDesign(design) {
    const designMeta = window.PptDesigns?.[design];
    const defaultColors = designMeta?.defaultColors || ["#e11d48", "#2563eb", "#f59e0b"];
    setIntakePalette(defaultColors);
    const hint = $("#intakeDesignHint");
    if (hint) hint.textContent = designMeta?.description || "";
    renderDesignThumbnail(design);
  }

  function getIntakeStartOptions() {
    return {
      design: $("#intakeDesignSelect")?.value || "bauhaus",
      customPalette: getIntakePalette(),
      fixedOverlays: getIntakeFixedOverlays()
    };
  }

  function scrollToStylePanel() {
    const stylePanel = $("#intakeStyleSettings");
    if (stylePanel) {
      stylePanel.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  function scrollToSourceSection() {
    const sourceGrid = document.querySelector(".intake-source-grid");
    if (sourceGrid) {
      sourceGrid.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  $("#intakeDesignSelect")?.addEventListener("change", (event) => {
    syncIntakePaletteFromDesign(event.target.value);
  });

  $("#intakeResetPaletteButton")?.addEventListener("click", () => {
    const design = $("#intakeDesignSelect")?.value || "bauhaus";
    syncIntakePaletteFromDesign(design);
  });

  [1, 2, 3].forEach((index) => {
    const picker = $(`#intakeColorPicker${index}`);
    const hexInput = $(`#intakeColorHex${index}`);
    const swatch = $(`#intakeColorSwatch${index}`);

    picker?.addEventListener("input", (event) => {
      if (hexInput) hexInput.value = event.target.value;
      if (swatch) swatch.style.background = event.target.value;
      renderDesignThumbnail($("#intakeDesignSelect")?.value || "bauhaus");
    });

    hexInput?.addEventListener("input", (event) => {
      let hex = event.target.value.trim();
      if (!hex.startsWith("#")) hex = "#" + hex;
      if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
        if (picker) picker.value = hex;
        if (swatch) swatch.style.background = hex;
        renderDesignThumbnail($("#intakeDesignSelect")?.value || "bauhaus");
      }
    });

    hexInput?.addEventListener("change", (event) => {
      let hex = event.target.value.trim();
      if (!hex.startsWith("#")) hex = "#" + hex;
      if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) {
        const fallback = picker?.value || "#151515";
        hexInput.value = fallback;
      }
      renderDesignThumbnail($("#intakeDesignSelect")?.value || "bauhaus");
    });
  });

  syncIntakePaletteFromDesign($("#intakeDesignSelect")?.value || "bauhaus");

  /* --- Standalone Style Editing Modal Handlers --- */
  function getModalPalette() {
    return [
      $("#modalColorHex1")?.value || "#e11d48",
      $("#modalColorHex2")?.value || "#2563eb",
      $("#modalColorHex3")?.value || "#f59e0b"
    ];
  }

  function setModalPalette(colors) {
    if (!Array.isArray(colors) || colors.length < 3) return;
    [1, 2, 3].forEach((index) => {
      const hex = colors[index - 1];
      const picker = $(`#modalColorPicker${index}`);
      const hexInput = $(`#modalColorHex${index}`);
      const swatch = $(`#modalColorSwatch${index}`);
      if (picker) picker.value = hex;
      if (hexInput) hexInput.value = hex;
      if (swatch) swatch.style.background = hex;
    });
  }

  function renderModalDesignThumbnail(design) {
    const thumbBox = $("#modalDesignThumbnail");
    if (!thumbBox) return;
    const palette = getModalPalette();
    thumbBox.className = `design-thumbnail-preview design-thumb-${design}`;
    thumbBox.innerHTML = renderDesignThumbnailHTML(design, palette[0], palette[1], palette[2]);
  }

  function syncModalPaletteFromDesign(design) {
    const designMeta = window.PptDesigns?.[design];
    const defaultColors = designMeta?.defaultColors || ["#e11d48", "#2563eb", "#f59e0b"];
    setModalPalette(defaultColors);
    const hint = $("#modalDesignHint");
    if (hint) hint.textContent = designMeta?.description || "";
    renderModalDesignThumbnail(design);
  }

  function getModalFixedOverlays() {
    const overlays = {};
    ["tl", "tc", "tr", "bl", "bc", "br"].forEach((pos) => {
      overlays[pos] = {
        text: $(`#modalOverlayText_${pos}`)?.value || "",
        size: $(`#modalOverlaySize_${pos}`)?.value || "13px",
        weight: $(`#modalOverlayWeight_${pos}`)?.value || "700"
      };
    });
    return overlays;
  }

  function setModalFixedOverlays(overlays) {
    if (!overlays) return;
    ["tl", "tc", "tr", "bl", "bc", "br"].forEach((pos) => {
      const cfg = overlays[pos] || { text: "", size: "13px", weight: "700" };
      const textInput = $(`#modalOverlayText_${pos}`);
      const sizeSelect = $(`#modalOverlaySize_${pos}`);
      const weightSelect = $(`#modalOverlayWeight_${pos}`);
      if (textInput) textInput.value = cfg.text || "";
      if (sizeSelect) sizeSelect.value = cfg.size || "13px";
      if (weightSelect) weightSelect.value = cfg.weight || "700";
    });
  }

  function openStyleModal() {
    if (!styleModal) return;
    const opts = window.LocalPptApp?.getOptions ? window.LocalPptApp.getOptions() : {};
    const design = opts.design || "bauhaus";
    if ($("#modalDesignSelect")) $("#modalDesignSelect").value = design;
    if (opts.customPalette) setModalPalette(opts.customPalette);
    else syncModalPaletteFromDesign(design);
    if (opts.fixedOverlays) setModalFixedOverlays(opts.fixedOverlays);

    const designMeta = window.PptDesigns?.[design];
    const hint = $("#modalDesignHint");
    if (hint) hint.textContent = designMeta?.description || "";
    renderModalDesignThumbnail(design);
    styleModal.hidden = false;
  }

  function closeStyleModal() {
    if (styleModal) styleModal.hidden = true;
  }

  function applyStyleModal() {
    const design = $("#modalDesignSelect")?.value || "bauhaus";
    const customPalette = getModalPalette();
    const fixedOverlays = getModalFixedOverlays();

    if (window.LocalPptApp?.updateOptions) {
      window.LocalPptApp.updateOptions({ design, customPalette, fixedOverlays });
    }
    if ($("#intakeDesignSelect")) $("#intakeDesignSelect").value = design;
    setIntakePalette(customPalette);
    setIntakeFixedOverlays(fixedOverlays);
    renderDesignThumbnail(design);

    closeStyleModal();
  }

  $("#modalDesignSelect")?.addEventListener("change", (event) => {
    syncModalPaletteFromDesign(event.target.value);
  });

  $("#modalResetPaletteButton")?.addEventListener("click", () => {
    const design = $("#modalDesignSelect")?.value || "bauhaus";
    syncModalPaletteFromDesign(design);
  });

  [1, 2, 3].forEach((index) => {
    const picker = $(`#modalColorPicker${index}`);
    const hexInput = $(`#modalColorHex${index}`);
    const swatch = $(`#modalColorSwatch${index}`);

    picker?.addEventListener("input", (event) => {
      if (hexInput) hexInput.value = event.target.value;
      if (swatch) swatch.style.background = event.target.value;
      renderModalDesignThumbnail($("#modalDesignSelect")?.value || "bauhaus");
    });

    hexInput?.addEventListener("input", (event) => {
      let hex = event.target.value.trim();
      if (!hex.startsWith("#")) hex = "#" + hex;
      if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
        if (picker) picker.value = hex;
        if (swatch) swatch.style.background = hex;
        renderModalDesignThumbnail($("#modalDesignSelect")?.value || "bauhaus");
      }
    });

    hexInput?.addEventListener("change", (event) => {
      let hex = event.target.value.trim();
      if (!hex.startsWith("#")) hex = "#" + hex;
      if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) {
        const fallback = picker?.value || "#151515";
        hexInput.value = fallback;
      }
      renderModalDesignThumbnail($("#modalDesignSelect")?.value || "bauhaus");
    });
  });

  $("#openStyleModalFromPanel")?.addEventListener("click", openStyleModal);
  $("#closeStyleModalButton")?.addEventListener("click", closeStyleModal);
  $("#cancelStyleModalButton")?.addEventListener("click", closeStyleModal);
  $("#applyStyleModalButton")?.addEventListener("click", applyStyleModal);

  /* --- AI Generation & Source Handlers --- */
  function setStatus(message = "", isError = false) { status.textContent = message; status.classList.toggle("is-error", isError); }
  function setProgress(value, label) {
    const progress = Math.max(0, Math.min(100, Math.round(value)));
    if (aiGenerateButton) {
      aiGenerateButton.classList.add("is-progress");
      aiGenerateButton.style.setProperty("--generation-progress", `${progress}%`);
      aiGenerateButton.textContent = `${label} · ${progress}%`;
      aiGenerateButton.setAttribute("aria-valuenow", String(progress));
    }
  }
  function stopProgressTimer() {
    if (progressTimer) window.clearInterval(progressTimer);
    progressTimer = null;
  }
  function resetProgress() {
    stopProgressTimer();
    if (aiGenerateButton) {
      aiGenerateButton.classList.remove("is-progress");
      aiGenerateButton.style.removeProperty("--generation-progress");
      aiGenerateButton.textContent = generateButtonLabel;
      aiGenerateButton.removeAttribute("aria-valuenow");
    }
  }
  function startAiProgress() {
    stopProgressTimer();
    let progress = 35;
    setProgress(progress, "AI가 슬라이드 구성 중");
    progressTimer = window.setInterval(() => {
      progress = Math.min(90, progress + Math.max(1, Math.round((91 - progress) / 9)));
      setProgress(progress, "AI가 슬라이드 구성 중");
    }, 800);
  }
  function selectSource(type) {
    sourceType = type;
    sourceInput.hidden = false;
    selectionHint.textContent = `${sourceLabels[type]}를 선택했습니다. 내용을 입력한 뒤 'AI로 슬라이드 만들기' 또는 하단 '프레젠테이션 시작하기'를 누르세요.`;
    document.querySelectorAll("[data-intake-action]").forEach((button) => button.classList.toggle("is-selected", button.dataset.intakeAction === type));

    const isFile = type === "pdf" || type === "spreadsheet";
    proseLabel.hidden = type !== "prose";
    outlineLabel.hidden = type !== "outline";
    fileLabel.hidden = !isFile;
    fileInfo.hidden = !isFile;
    fileInput.value = "";
    fileInfo.textContent = "";

    if (type === "spreadsheet") {
      fileInput.accept = ".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv";
      fileName.textContent = "엑셀 파일 선택";
    } else if (type === "pdf") {
      fileInput.accept = ".pdf,application/pdf";
      fileName.textContent = "PDF 파일 선택";
    }
    setStatus();
    scrollToSourceSection();
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
    const pageCount = Math.min(pdf.numPages, 30);
    for (let i = 1; i <= pageCount; i += 1) {
      const content = await (await pdf.getPage(i)).getTextContent();
      pages.push(content.items.map((item) => item.str).join(" "));
      setProgress(10 + i / pageCount * 20, `PDF ${i}/${pageCount} 분석 중`);
    }
    return pages.join("\n\n").trim();
  }
  async function extractSpreadsheet(file) {
    if (!window.XLSX) throw new Error("엑셀 파일 분석 도구를 불러오지 못했습니다. 인터넷 연결을 확인한 뒤 다시 시도하세요.");
    const workbook = window.XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
    const content = workbook.SheetNames.slice(0, 5).map((name) => `[시트: ${name}]\n${window.XLSX.utils.sheet_to_csv(workbook.Sheets[name], { blankrows: false }).split("\n").slice(0, 200).join("\n")}`).join("\n\n").trim();
    setProgress(30, "엑셀 데이터 분석 완료");
    return content;
  }
  async function sourceContent() {
    if (sourceType === "prose") {
      setProgress(25, "입력 내용 정리 중");
      return proseInput.value.trim();
    }
    if (sourceType === "outline") {
      setProgress(25, "입력 내용 정리 중");
      return outlineInput.value.trim();
    }
    const file = fileInput.files[0]; if (!file) return ""; setStatus(`${file.name} 분석 중…`); setProgress(8, "파일 분석 준비 중");
    const content = sourceType === "pdf" ? await extractPdf(file) : await extractSpreadsheet(file);
    fileInfo.textContent = `${file.name} · 추출된 텍스트 ${content.length.toLocaleString()}자`; return content;
  }
  async function generate(event) {
    if (event) event.preventDefault();
    const provider = selectedProvider(), apiKey = provider === "openai" ? $("#openaiApiKey").value.trim() : $("#anthropicApiKey").value.trim(), model = provider === "openai" ? $("#openaiModel").value : $("#anthropicModel").value, slideCount = Number($("#aiSlideCount").value);
    if (!apiKey) return setStatus("ChatGPT 또는 Claude API 키를 하나 이상 입력하세요.", true);
    if (!Number.isInteger(slideCount) || slideCount < 2 || slideCount > 30) return setStatus("슬라이드 장수는 2~30 사이로 입력하세요.", true);
    let completed = false;
    try {
      if (aiGenerateButton) aiGenerateButton.disabled = true;
      setProgress(3, "입력 확인 중");
      const content = await sourceContent();
      if (!content) throw new Error("프레젠테이션으로 만들 텍스트 또는 파일을 입력하세요.");
      if (content.length > 120000) throw new Error("입력 내용이 너무 깁니다. 120,000자 이하의 파일 또는 텍스트를 사용하세요.");
      if (window.location.protocol === "file:") throw new Error("AI 기능을 사용하려면 터미널에서 node server.js를 실행한 뒤 http://127.0.0.1:8765으로 접속하세요.");
      setStatus("AI가 슬라이드 구조를 만들고 있습니다…"); startAiProgress();
      const response = await fetch("/api/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ provider, model, apiKey, sourceType, content, slideCount }) });
      stopProgressTimer(); setProgress(93, "AI 응답 확인 중");
      const result = await response.json().catch(() => ({})); if (!response.ok) throw new Error(result.error || "AI 요청에 실패했습니다.");
      setProgress(98, "편집기에 적용 중"); window.LocalPptApp.applyAiPresentation(result.presentation, getIntakeStartOptions());
      setProgress(100, "슬라이드 생성 완료"); completed = true; intake.hidden = true;
    } catch (error) {
      const message = /failed to fetch|networkerror/i.test(String(error?.message || ""))
        ? "로컬 AI 서버에 연결할 수 없습니다. 터미널에서 node server.js를 실행한 뒤 http://127.0.0.1:8765으로 접속하세요."
        : error.message || "AI PPT를 만들지 못했습니다.";
      setStatus(message, true);
    }
    finally {
      if (completed) { $("#openaiApiKey").value = ""; $("#anthropicApiKey").value = ""; updateProviderChoice(); }
      if (aiGenerateButton) aiGenerateButton.disabled = false;
      resetProgress();
    }
  }

  function showStartScreen() {
    intake.hidden = false; sourceType = null; sourceInput.hidden = true; selectionHint.textContent = "입력 방식을 선택하세요.";
    document.querySelectorAll("[data-intake-action]").forEach((button) => button.classList.remove("is-selected")); setStatus();
    if (window.LocalPptApp?.getOptions) {
      const opts = window.LocalPptApp.getOptions();
      if ($("#intakeDesignSelect")) $("#intakeDesignSelect").value = opts.design || "bauhaus";
      if (opts.customPalette) setIntakePalette(opts.customPalette);
      if (opts.fixedOverlays) setIntakeFixedOverlays(opts.fixedOverlays);
      const designMeta = window.PptDesigns?.[opts.design];
      const hint = $("#intakeDesignHint");
      if (hint) hint.textContent = designMeta?.description || "";
      renderDesignThumbnail(opts.design || "bauhaus");
    }
  }

  document.querySelectorAll("[data-intake-action]").forEach((button) => button.addEventListener("click", () => {
    const action = button.dataset.intakeAction;
    if (action === "empty") {
      sourceType = null;
      sourceInput.hidden = true;
      selectionHint.textContent = "빈 슬라이드를 선택했습니다. 아래 디자인 패널에서 테마를 설정한 뒤 시작하기를 누르세요.";
      document.querySelectorAll("[data-intake-action]").forEach((b) => b.classList.toggle("is-selected", b.dataset.intakeAction === "empty"));
      scrollToStylePanel();
    } else if (action === "project") {
      $("#intakeProjectFile").click();
    } else {
      selectSource(action);
    }
  }));

  $("#startPresentationWithStyleButton")?.addEventListener("click", (event) => {
    if (sourceType === "prose" || sourceType === "outline" || sourceType === "pdf" || sourceType === "spreadsheet") {
      generate(event);
    } else {
      window.LocalPptApp.startBlank(getIntakeStartOptions());
      intake.hidden = true;
    }
  });

  $("#goHomeButton")?.addEventListener("click", showStartScreen);

  $("#intakeProjectFile").addEventListener("change", async (event) => { const file = event.target.files[0]; if (!file) return; await window.LocalPptApp.loadProjectFile(file); intake.hidden = true; });
  fileInput.addEventListener("change", () => { const file = fileInput.files[0]; fileName.textContent = file ? file.name : (sourceType === "pdf" ? "PDF 파일 선택" : "엑셀 파일 선택"); });
  [$("#openaiApiKey"), $("#anthropicApiKey")].forEach((input) => input.addEventListener("input", updateProviderChoice));
  form.addEventListener("submit", generate);
})();
