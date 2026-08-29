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
  const generateButtonLabel = "✨ AI로 슬라이드 만들기";
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

  const overlayImages = {
    intake: { tl: "", tc: "", tr: "", bl: "", bc: "", br: "" },
    modal: { tl: "", tc: "", tr: "", bl: "", bc: "", br: "" }
  };

  function getIntakeFixedOverlays() {
    const overlays = {
      applyToTitle: $("#intakeOverlayApplyToTitle")?.checked || $("#modalOverlayApplyToTitle")?.checked || false
    };
    ["tl", "tc", "tr", "bl", "bc", "br"].forEach((pos) => {
      const img = overlayImages.intake[pos] || overlayImages.modal[pos] || "";
      overlays[pos] = {
        text: $(`#intakeOverlayText_${pos}`)?.value || $(`#modalOverlayText_${pos}`)?.value || "",
        image: img,
        size: $(`#intakeOverlaySize_${pos}`)?.value || $(`#modalOverlaySize_${pos}`)?.value || "13px",
        weight: $(`#intakeOverlayWeight_${pos}`)?.value || $(`#modalOverlayWeight_${pos}`)?.value || "700"
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

    ["intake", "modal"].forEach((prefix) => {
      ["tl", "tc", "tr", "bl", "bc", "br"].forEach((pos) => {
        const cfg = overlays[pos] || { text: "", image: "", size: "13px", weight: "700" };
        const textInput = $(`#${prefix}OverlayText_${pos}`);
        const sizeSelect = $(`#${prefix}OverlaySize_${pos}`);
        const weightSelect = $(`#${prefix}OverlayWeight_${pos}`);
        const prevBox = $(`#${prefix}OverlayImgPrev_${pos}`);
        const imgTag = $(`#${prefix}OverlayImg_${pos}`);

        if (textInput) textInput.value = cfg.text || "";
        if (sizeSelect) sizeSelect.value = cfg.size || "13px";
        if (weightSelect) weightSelect.value = cfg.weight || "700";

        if (cfg.image) {
          overlayImages[prefix][pos] = cfg.image;
          if (imgTag) imgTag.src = cfg.image;
          if (prevBox) { prevBox.hidden = false; prevBox.style.display = "flex"; }
          if (textInput) { textInput.hidden = true; textInput.style.display = "none"; }
        } else {
          overlayImages[prefix][pos] = "";
          if (prevBox) { prevBox.hidden = true; prevBox.style.display = "none"; }
          if (textInput) { textInput.hidden = false; textInput.style.display = "block"; }
        }
      });
    });
  }

  document.addEventListener("change", (e) => {
    if (e.target && e.target.classList.contains("overlay-preset-select")) {
      const prefix = e.target.dataset.prefix;
      const pos = e.target.dataset.pos;
      const val = e.target.value;
      const textInput = $(`#${prefix}OverlayText_${pos}`);
      const fileInput = $(`#${prefix}OverlayFile_${pos}`);
      const prevBox = $(`#${prefix}OverlayImgPrev_${pos}`);

      if (val === "add_image") {
        if (fileInput) fileInput.click();
      } else if (val === "") {
        if (textInput) { textInput.value = ""; textInput.hidden = false; textInput.style.display = "block"; }
        if (prevBox) { prevBox.hidden = true; prevBox.style.display = "none"; }
        overlayImages[prefix][pos] = "";
      } else {
        if (textInput) { textInput.value = val; textInput.hidden = false; textInput.style.display = "block"; }
        if (prevBox) { prevBox.hidden = true; prevBox.style.display = "none"; }
        overlayImages[prefix][pos] = "";
      }
    } else if (e.target && e.target.classList.contains("overlay-file-input")) {
      const file = e.target.files?.[0];
      const match = e.target.id.match(/(intake|modal)OverlayFile_(tl|tc|tr|bl|bc|br)/);
      if (file && match) {
        const prefix = match[1];
        const pos = match[2];
        const reader = new FileReader();
        reader.onload = (ev) => {
          const dataUrl = ev.target.result;
          overlayImages[prefix][pos] = dataUrl;
          const imgTag = $(`#${prefix}OverlayImg_${pos}`);
          const prevBox = $(`#${prefix}OverlayImgPrev_${pos}`);
          const textInput = $(`#${prefix}OverlayText_${pos}`);
          if (imgTag) imgTag.src = dataUrl;
          if (prevBox) { prevBox.hidden = false; prevBox.style.display = "flex"; }
          if (textInput) { textInput.value = ""; textInput.hidden = true; textInput.style.display = "none"; }
        };
        reader.readAsDataURL(file);
      }
    }
  });

  document.addEventListener("click", (e) => {
    const removeBtn = e.target.closest(".remove-overlay-img-btn");
    if (removeBtn) {
      const prefix = removeBtn.dataset.prefix;
      const pos = removeBtn.dataset.pos;
      overlayImages[prefix][pos] = "";
      const prevBox = $(`#${prefix}OverlayImgPrev_${pos}`);
      const textInput = $(`#${prefix}OverlayText_${pos}`);
      const select = $(`select.overlay-preset-select[data-prefix="${prefix}"][data-pos="${pos}"]`);
      if (prevBox) { prevBox.hidden = true; prevBox.style.display = "none"; }
      if (textInput) { textInput.value = ""; textInput.hidden = false; textInput.style.display = "block"; }
      if (select) select.value = "";
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
  let pendingAiPresentation = null;

  const reviewModal = $("#aiReviewModal");
  const reviewSlideList = $("#aiReviewSlideList");

  function openAiReviewModal(presentation) {
    if (!reviewModal || !presentation || !Array.isArray(presentation.slides)) return;
    pendingAiPresentation = presentation;
    renderAiReviewSlides();
    reviewModal.hidden = false;
  }

  function closeAiReviewModal() {
    if (reviewModal) reviewModal.hidden = true;
  }

  function getSelectedTemplateVariantKey(slide) {
    if (slide.template === "bullet") return "bullet";
    if (slide.template === "mindmap") return "mindmap";
    return slide.variant || "cards_2col";
  }

  function setSlideTemplateVariant(slide, variantKey) {
    if (variantKey === "bullet") {
      slide.template = "bullet";
      slide.category = null;
      slide.variant = null;
    } else if (variantKey === "mindmap") {
      slide.template = "mindmap";
      slide.category = null;
      slide.variant = null;
    } else if (["cards_1col", "cards_2col", "cards_3col", "cards_4col", "sideAccent_1col", "sideAccent_2col", "sideAccent_3col", "sideAccent_4col", "summaryLeft", "summaryRight", "summaryTop", "summaryBottom", "table", "tableStats"].includes(variantKey)) {
      slide.template = "object";
      slide.category = "layout";
      slide.variant = variantKey;
    } else if (["process", "timeline", "pyramid", "cycle", "chain", "ribbonArrow", "funnel", "venn", "target", "connectedCircles", "quadrant", "vs"].includes(variantKey)) {
      slide.template = "object";
      slide.category = "diagram";
      slide.variant = variantKey;
    } else if (["column", "bar", "line", "area", "pie"].includes(variantKey)) {
      slide.template = "object";
      slide.category = "chart";
      slide.variant = variantKey;
    }
  }

  function renderAiReviewSlides() {
    if (!reviewSlideList || !pendingAiPresentation) return;
    const slides = pendingAiPresentation.slides;

    reviewSlideList.innerHTML = slides.map((slide, index) => {
      const currentKey = getSelectedTemplateVariantKey(slide);
      const itemsText = Array.isArray(slide.items) && slide.items.length ? slide.items.join(" · ") : "상세 내용";

      return `
        <div class="review-slide-item-card" data-slide-index="${index}" style="padding: 14px; border: 2px solid var(--ink); border-radius: 8px; background: #ffffff; box-shadow: 3px 3px 0 var(--ink); display: flex; flex-direction: column; gap: 10px;">
          <div class="review-slide-header" style="display: flex; align-items: center; justify-content: space-between; gap: 10px;">
            <span class="review-slide-badge" style="display: inline-flex; align-items: center; padding: 4px 10px; background: var(--blue, #2563eb); color: #ffffff; font-weight: 900; font-size: 12px; border-radius: 4px;">슬라이드 ${String(index + 1).padStart(2, "0")}</span>
            <div style="display: flex; align-items: center; gap: 8px;">
              <label style="font-size: 12.5px; font-weight: 850;">반영 템플릿:</label>
              <select class="review-template-select" data-slide-index="${index}" style="padding: 6px 10px; border: 2px solid var(--ink); border-radius: 6px; font-weight: 800; font-size: 13px;">
                <optgroup label="📁 텍스트 & 구조화">
                  <option value="bullet" ${currentKey === 'bullet' ? 'selected' : ''}>개조식 (bullet)</option>
                  <option value="mindmap" ${currentKey === 'mindmap' ? 'selected' : ''}>마인드맵 (mindmap)</option>
                </optgroup>
                <optgroup label="📁 카드 & 레이아웃">
                  <option value="cards_1col" ${currentKey === 'cards_1col' ? 'selected' : ''}>기본 카드 1열 그리드</option>
                  <option value="cards_2col" ${currentKey === 'cards_2col' ? 'selected' : ''}>기본 카드 2열 그리드</option>
                  <option value="cards_3col" ${currentKey === 'cards_3col' ? 'selected' : ''}>기본 카드 3열 그리드</option>
                  <option value="cards_4col" ${currentKey === 'cards_4col' ? 'selected' : ''}>기본 카드 4열 그리드</option>
                  <option value="sideAccent_1col" ${currentKey === 'sideAccent_1col' ? 'selected' : ''}>측면 강조 카드 1열 그리드</option>
                  <option value="sideAccent_2col" ${currentKey === 'sideAccent_2col' ? 'selected' : ''}>측면 강조 카드 2열 그리드</option>
                  <option value="sideAccent_3col" ${currentKey === 'sideAccent_3col' ? 'selected' : ''}>측면 강조 카드 3열 그리드</option>
                  <option value="sideAccent_4col" ${currentKey === 'sideAccent_4col' ? 'selected' : ''}>측면 강조 카드 4열 그리드</option>
                </optgroup>
                <optgroup label="📁 요약 및 강조">
                  <option value="summaryLeft" ${currentKey === 'summaryLeft' ? 'selected' : ''}>왼쪽 요약</option>
                  <option value="summaryRight" ${currentKey === 'summaryRight' ? 'selected' : ''}>오른쪽 요약</option>
                  <option value="summaryTop" ${currentKey === 'summaryTop' ? 'selected' : ''}>위쪽 요약</option>
                  <option value="summaryBottom" ${currentKey === 'summaryBottom' ? 'selected' : ''}>아래쪽 요약</option>
                </optgroup>
                <optgroup label="📁 프로세스 & 비주얼">
                  <option value="process" ${currentKey === 'process' ? 'selected' : ''}>프로세스 흐름</option>
                  <option value="timeline" ${currentKey === 'timeline' ? 'selected' : ''}>타임라인</option>
                  <option value="pyramid" ${currentKey === 'pyramid' ? 'selected' : ''}>피라미드</option>
                  <option value="cycle" ${currentKey === 'cycle' ? 'selected' : ''}>순환 흐름</option>
                  <option value="chain" ${currentKey === 'chain' ? 'selected' : ''}>사슬 연쇄</option>
                  <option value="ribbonArrow" ${currentKey === 'ribbonArrow' ? 'selected' : ''}>리본 화살표</option>
                  <option value="funnel" ${currentKey === 'funnel' ? 'selected' : ''}>깔때기</option>
                  <option value="venn" ${currentKey === 'venn' ? 'selected' : ''}>벤 다이어그램</option>
                  <option value="target" ${currentKey === 'target' ? 'selected' : ''}>과녁 목표</option>
                  <option value="connectedCircles" ${currentKey === 'connectedCircles' ? 'selected' : ''}>연결된 위성</option>
                  <option value="quadrant" ${currentKey === 'quadrant' ? 'selected' : ''}>2x2 사분면</option>
                  <option value="vs" ${currentKey === 'vs' ? 'selected' : ''}>VS 대조</option>
                </optgroup>
                <optgroup label="📁 데이터 차트 & 테이블">
                  <option value="table" ${currentKey === 'table' ? 'selected' : ''}>기본 데이터 테이블</option>
                  <option value="tableStats" ${currentKey === 'tableStats' ? 'selected' : ''}>테이블 & 요약 지표</option>
                  <option value="column" ${currentKey === 'column' ? 'selected' : ''}>세로 막대 차트</option>
                  <option value="bar" ${currentKey === 'bar' ? 'selected' : ''}>가로 막대 차트</option>
                  <option value="line" ${currentKey === 'line' ? 'selected' : ''}>꺾은선 차트</option>
                  <option value="area" ${currentKey === 'area' ? 'selected' : ''}>영역 차트</option>
                  <option value="pie" ${currentKey === 'pie' ? 'selected' : ''}>원형 차트</option>
                </optgroup>
              </select>
            </div>
          </div>
          <div style="display: flex; flex-direction: column; gap: 6px;">
            <input type="text" class="review-slide-title-input" data-slide-index="${index}" value="${slide.title || '핵심 주제'}" placeholder="슬라이드 제목" style="padding: 8px 10px; border: 1.5px solid var(--ink); border-radius: 6px; font-weight: 850; font-size: 14px; width: 100%;">
            <div class="review-slide-items-preview" style="font-size: 12px; color: #334155; background: #f8fafc; padding: 8px 10px; border-radius: 6px; border: 1px solid #cbd5e1; line-height: 1.4;">
              <strong>미리보기:</strong> ${itemsText}
            </div>
          </div>
        </div>
      `;
    }).join("");

    reviewSlideList.querySelectorAll(".review-template-select").forEach((select) => {
      select.addEventListener("change", (event) => {
        const idx = Number(event.target.dataset.slideIndex);
        if (slides[idx]) {
          setSlideTemplateVariant(slides[idx], event.target.value);
        }
      });
    });

    reviewSlideList.querySelectorAll(".review-slide-title-input").forEach((input) => {
      input.addEventListener("input", (event) => {
        const idx = Number(event.target.dataset.slideIndex);
        if (slides[idx]) {
          slides[idx].title = event.target.value;
        }
      });
    });
  }

  $("#confirmAiReviewButton")?.addEventListener("click", () => {
    if (pendingAiPresentation) {
      window.LocalPptApp.applyAiPresentation(pendingAiPresentation, getIntakeStartOptions());
      closeAiReviewModal();
      openStyleModal();
    }
  });

  $("#cancelAiReviewButton")?.addEventListener("click", () => {
    closeAiReviewModal();
    if (intake) intake.hidden = false;
  });

  $("#closeAiReviewModalButton")?.addEventListener("click", () => {
    closeAiReviewModal();
    if (intake) intake.hidden = false;
  });

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
      setProgress(98, "생성 완료 준비 중");
      pendingAiPresentation = result.presentation;
      setProgress(100, "슬라이드 분석 완료!");
      completed = true;
      openAiReviewModal(pendingAiPresentation);
      intake.hidden = true;
    } catch (error) {
      pendingAiPresentation = null;
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
    pendingAiPresentation = null;
    intake.hidden = false;
    selectSource("prose");
    setStatus();
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
    pendingAiPresentation = null;
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

  $("#startPresentationWithStyleButton")?.addEventListener("click", async (event) => {
    if (pendingAiPresentation) {
      openAiReviewModal(pendingAiPresentation);
      intake.hidden = true;
    } else if (sourceType === "prose" || sourceType === "outline" || sourceType === "pdf" || sourceType === "spreadsheet") {
      await generate(event);
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

  // Initialize intake screen with default prose selection visible
  selectSource("prose");
})();
