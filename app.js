const $ = (selector) => document.querySelector(selector);
const stage = $("#presentationStage");
const layouts = window.PptLayouts || {};
const diagrams = window.PptDiagrams || {};
const charts = window.PptCharts || {};
const designs = window.PptDesigns || {};

const MAX_HISTORY = 50;
const MIN_ITEMS = 1;
const MAX_ITEMS = 60;
const GRID_SIZE = 5;
const SNAP_DISTANCE_PX = 8;
const PROJECT_FORMAT = "local-ppt-json";
const PROJECT_VERSION = 1;
const PROJECT_PICKER_ID = "local-ppt-project";
const STRUCTURED_LAYOUT_ROLES = new Set([
  "metric-card", "step-card", "stat-card", "feature-card", "comparison-panel", "definition-card",
  "process-flow-card", "icon-info-card", "numbered-card", "concept-card",
  "notice-panel", "warning-panel", "tip-panel", "focus-panel",
  "checklist-card", "warning-summary-card", "detail-metric-card"
]);
const TABLE_LAYOUT_VARIANTS = new Set(["table", "tableStats"]);
const ITEM_COUNT_ROLE_BY_VARIANT = { pairedCheckWarnings: "checklist-card" };
const AI_TEMPLATES = new Set(["bullet", "mindmap", "object"]);
const AI_OBJECT_VARIANTS = {
  layout: new Set(["cards_1col", "cards_2col", "cards_3col", "cards_4col", "sideAccent_1col", "sideAccent_2col", "sideAccent_3col", "sideAccent_4col", "summaryLeft", "summaryRight", "summaryTop", "summaryBottom", "table", "tableStats", "image_full", "image_center", "image_left", "image_right", "image_top", "image_bottom"]),
  diagram: new Set(["process", "timeline", "pyramid", "cycle", "chain", "ribbonArrow", "funnel", "venn", "target", "connectedCircles", "quadrant", "vs"]),
  chart: new Set(["column", "line", "pie", "bar", "area"])
};
const AI_OBJECT_DEFAULT_VARIANTS = { layout: "cards", diagram: "process", chart: "column" };

let currentProjectFileHandle = null;
let currentProjectFileName = "local-ppt.txt";
let tableManagementAxis = "row";
let copiedObjects = [];
let copiedFromPageId = null;
let pasteOffsetCount = 0;
let copiedPage = null;

function defaultFixedOverlays() {
  return {
    applyToTitle: false,
    tl: { text: "", size: "13px", weight: "700" },
    tc: { text: "", size: "13px", weight: "700" },
    tr: { text: "", size: "13px", weight: "700" },
    bl: { text: "", size: "13px", weight: "700" },
    bc: { text: "", size: "13px", weight: "700" },
    br: { text: "", size: "13px", weight: "700" }
  };
}

const state = {
  design: "bauhaus",
  customPalette: null,
  fixedOverlays: defaultFixedOverlays(),
  pages: [createCoverPage()],
  currentPageIndex: 0,
  selectedIds: new Set(),
  activeTextObjectId: null,
  guides: [],
  history: []
};

function getCurrentPalette() {
  if (Array.isArray(state.customPalette) && state.customPalette.length === 3) {
    return state.customPalette;
  }
  const designMeta = designs[state.design];
  if (designMeta && Array.isArray(designMeta.defaultColors)) {
    return designMeta.defaultColors;
  }
  return ["#e11d48", "#2563eb", "#f59e0b"];
}

function applyThemePalette() {
  const [c1, c2, c3] = getCurrentPalette();
  document.body.style.setProperty("--content-accent", c1);
  document.body.style.setProperty("--content-accent-2", c2);
  document.body.style.setProperty("--content-accent-3", c3);
}

function renderFixedOverlayLayer() {
  const curPage = state.pages[state.currentPageIndex];
  if (curPage && curPage.type === "cover" && !state.fixedOverlays?.applyToTitle) {
    return;
  }
  const positions = [
    { key: "tl", className: "pos-tl" },
    { key: "tc", className: "pos-tc" },
    { key: "tr", className: "pos-tr" },
    { key: "bl", className: "pos-bl" },
    { key: "bc", className: "pos-bc" },
    { key: "br", className: "pos-br" }
  ];
  const layer = document.createElement("div");
  layer.className = "fixed-overlay-layer";
  let hasItem = false;

  const todayStr = new Date().toISOString().slice(0, 10);

  positions.forEach(({ key, className }) => {
    const cfg = state.fixedOverlays?.[key];
    if (cfg && cfg.image) {
      hasItem = true;
      const img = document.createElement("img");
      img.className = `fixed-overlay-item ${className} fixed-overlay-img`;
      img.src = cfg.image;
      layer.append(img);
    } else if (cfg && cfg.text && cfg.text.trim()) {
      hasItem = true;
      const visiblePages = state.pages.filter((p) => !p.hidden);
      const totalPageNum = visiblePages.length;
      let currentPageNum = 0;
      for (let i = 0; i <= state.currentPageIndex; i++) {
        if (!state.pages[i]?.hidden) currentPageNum++;
      }
      if (currentPageNum === 0 && totalPageNum > 0) currentPageNum = 1;
      let rawText = cfg.text.trim()
        .replace(/{page}/g, currentPageNum)
        .replace(/{total}/g, totalPageNum)
        .replace(/{date}/g, todayStr);

      const item = document.createElement("div");
      item.className = `fixed-overlay-item ${className}`;
      item.textContent = rawText;
      item.style.fontSize = cfg.size || "13px";
      item.style.fontWeight = cfg.weight || "700";
      layer.append(item);
    }
  });
  if (hasItem) {
    stage.append(layer);
  }
}

function createId(prefix = "object") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createTextObject(role, text, x, y, w, h, extra = {}) {
  return { id: createId(role), type: "text", role, text, x, y, w, h, ...extra };
}

function createCoverPage() {
  return {
    id: createId("page"),
    type: "cover",
    template: "cover",
    objectCategory: null,
    variant: null,
    objects: [
      createTextObject("cover-title", "PRESENTATION\nTITLE", 12, 27, 76, 25),
      createTextObject("cover-subtitle", "더블클릭하여 부제목을 입력하세요", 20, 59, 60, 10)
    ]
  };
}

function createContentPage() {
  const page = {
    id: createId("page"),
    type: "content",
    template: "object",
    objectCategory: "layout",
    variant: "cards",
    objects: []
  };
  buildTemplate(page, "object");
  return page;
}

function currentPage() {
  return state.pages[state.currentPageIndex];
}

function snapshot() {
  state.history.push(JSON.stringify({
    design: state.design,
    customPalette: state.customPalette,
    fixedOverlays: state.fixedOverlays,
    pages: state.pages,
    currentPageIndex: state.currentPageIndex
  }));
  if (state.history.length > MAX_HISTORY) state.history.shift();
  updateUndoButton();
}

function undo() {
  const value = state.history.pop();
  if (!value) return;
  const restored = JSON.parse(value);
  state.design = restored.design;
  state.customPalette = restored.customPalette || null;
  state.fixedOverlays = restored.fixedOverlays || defaultFixedOverlays();
  state.pages = restored.pages;
  state.currentPageIndex = restored.currentPageIndex;
  state.selectedIds.clear();
  state.guides = [];
  hideTextToolbar();
  render();
}

function updateUndoButton() {
  $("#undoButton").disabled = state.history.length === 0;
}

function getCustomUserImages(page) {
  return (page.objects || []).filter(
    (object) => object.type === "image" && object.src && !object.src.includes("data:image/svg+xml")
  );
}

function applyAspectRatioToImageObject(targetObject, src, callback) {
  if (!targetObject || !src) {
    if (callback) callback();
    return;
  }
  const img = new Image();
  img.onload = () => {
    const naturalWidth = img.naturalWidth || 800;
    const naturalHeight = img.naturalHeight || 600;
    const imageRatio = naturalWidth / naturalHeight;

    if (targetObject && typeof targetObject.w === "number" && typeof targetObject.h === "number") {
      let targetW = targetObject.w;
      let targetH = Math.round((targetObject.w * 16) / (9 * imageRatio));
      if (targetH > 85) {
        targetH = 85;
        targetW = Math.round((targetH * 9 * imageRatio) / 16);
      }
      targetObject.h = Math.max(15, targetH);
      targetObject.w = Math.max(15, targetW);
    }
    if (callback) callback();
  };
  img.onerror = () => {
    if (callback) callback();
  };
  img.src = src;
}

function buildTemplate(page, template, options = {}) {
  page.template = template;
  page.objects = getCustomUserImages(page);

  if (template === "bullet") {
    page.objects.unshift(
      createTextObject("page-title", "핵심 메시지", 8, 10, 72, 18),
      createTextObject("bullet-item", "첫 번째 핵심 내용", 12, 0, 75, 9, { item: true, bulletLevel: 1 }),
      createTextObject("bullet-item", "두 번째 핵심 내용", 12, 0, 75, 9, { item: true, bulletLevel: 1 }),
      createTextObject("bullet-item", "세 번째 핵심 내용", 12, 0, 75, 9, { item: true, bulletLevel: 1 })
    );
    layoutBulletItems(page);
  }

  if (template === "mindmap") {
    createDefaultMindmap(page);
  }

  if (template === "object") {
    page.objectCategory = options.category || page.objectCategory || "layout";
    page.variant = options.variant || (page.objectCategory === "layout" ? "cards" : page.objectCategory === "diagram" ? "process" : "column");
    buildObjectTemplate(page, 3);
  }
}

function layoutBulletItems(page) {
  const items = page.objects.filter((object) => object.role === "bullet-item");
  if (!items.length) return;
  const top = 22;
  const bottom = 92;
  const gap = items.length > 30 ? .15 : items.length > 20 ? .25 : items.length > 10 ? .5 : 1;
  const height = clamp(1.2, (bottom - top - gap * (items.length - 1)) / items.length, 10);
  items.forEach((item, index) => {
    const level = clamp(1, Number(item.bulletLevel) || 1, 5);
    item.bulletLevel = level;
    item.x = 10 + (level - 1) * 3.5;
    item.y = top + index * (height + gap);
    item.w = 80 - (level - 1) * 3.5;
    item.h = height;
  });
}

function coverItems(page) {
  return page.objects.filter((object) => object.role === "cover-item");
}

function layoutCoverItems(page) {
  coverItems(page).forEach((item, index) => {
    const level = clamp(1, Number(item.bulletLevel) || 1, 5);
    item.bulletLevel = level;
    item.x = 18 + (level - 1) * 5;
    item.y = 70 + index * 7;
    item.w = 64 - (level - 1) * 5;
    item.h = 5.5;
  });
}

function createDefaultMindmap(page) {
  const images = getCustomUserImages(page);
  const root = createTextObject("mind-root", "CENTRAL IDEA", 42, 45, 16, 14, {
    item: false, node: true, root: true, mindLevel: 1
  });
  const level2 = ["CONTEXT", "METHOD"].map((text) => createMindNode(text, root.id, 2));
  const level3 = [
    createMindNode("BACKGROUND", level2[0].id, 3),
    createMindNode("CHALLENGE", level2[0].id, 3),
    createMindNode("PROCESS", level2[1].id, 3),
    createMindNode("RESULT", level2[1].id, 3)
  ];
  const level4 = [
    createMindNode("DETAIL 1", level3[0].id, 4),
    createMindNode("DETAIL 2", level3[2].id, 4)
  ];
  page.objects = [root, ...level2, ...level3, ...level4, ...images];
  layoutMindmapTree(page);
}

function createMindNode(text, parentId, mindLevel) {
  return createTextObject("mind-node", text, 0, 0, 12, 10, {
    item: true, node: true, parentId, mindLevel
  });
}

function positionNewMindmapNode(page, parent, node) {
  const specs = {
    2: { radiusX: 23, radiusY: 19, w: 15, h: 11 },
    3: { radiusX: 33, radiusY: 27, w: 12.5, h: 9.5 },
    4: { radiusX: 41, radiusY: 34, w: 10.5, h: 8 },
    5: { radiusX: 47, radiusY: 39, w: 8.5, h: 6.5 },
    6: { radiusX: 52, radiusY: 43, w: 7.5, h: 5.5 }
  };
  const level = Math.min(6, parent.mindLevel + 1);
  const spec = specs[level] || specs[6];
  const siblings = page.objects.filter((object) => object.role === "mind-node" && object.parentId === parent.id);
  const offsets = parent.root
    ? [-Math.PI / 2, Math.PI / 2, -Math.PI / 4, Math.PI / 4, -3 * Math.PI / 4, 3 * Math.PI / 4, 0, Math.PI]
    : [0, .9, -.9, 1.8, -1.8, 2.5, -2.5, Math.PI];
  const parentAngle = Number.isFinite(parent.mindAngle) ? parent.mindAngle : 0;
  const usedAngles = siblings.map((sibling) => Number.isFinite(sibling.mindAngle) ? sibling.mindAngle : 0);
  const angularDistance = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
  const angle = offsets
    .map((offset) => parent.root ? offset : parentAngle + offset)
    .sort((a, b) => Math.min(...usedAngles.map((used) => angularDistance(b, used))) - Math.min(...usedAngles.map((used) => angularDistance(a, used))))[0];
  const centerX = 50;
  const centerY = 52;
  Object.assign(node, {
    mindLevel: level,
    mindAngle: angle,
    x: centerX + Math.cos(angle) * spec.radiusX - spec.w / 2,
    y: centerY + Math.sin(angle) * spec.radiusY - spec.h / 2,
    w: spec.w,
    h: spec.h
  });
}

function resolveNodeOverlaps(page) {
  const nodes = page.objects.filter((o) => o.root || o.role === "mind-node");
  if (nodes.length < 2) return;

  const margin = 1.8;

  for (let iter = 0; iter < 12; iter++) {
    let shifted = false;
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];

        const aLeft = a.x - margin / 2;
        const aRight = a.x + a.w + margin / 2;
        const aTop = a.y - margin / 2;
        const aBottom = a.y + a.h + margin / 2;

        const bLeft = b.x - margin / 2;
        const bRight = b.x + b.w + margin / 2;
        const bTop = b.y - margin / 2;
        const bBottom = b.y + b.h + margin / 2;

        const overlapX = Math.min(aRight, bRight) - Math.max(aLeft, bLeft);
        const overlapY = Math.min(aBottom, bBottom) - Math.max(aTop, bTop);

        if (overlapX > 0 && overlapY > 0) {
          shifted = true;
          if (overlapX < overlapY) {
            const dx = overlapX / 2;
            if (a.x < b.x) {
              if (!a.root) a.x -= dx;
              if (!b.root) b.x += dx;
            } else {
              if (!a.root) a.x += dx;
              if (!b.root) b.x -= dx;
            }
          } else {
            const dy = overlapY / 2;
            if (a.y < b.y) {
              if (!a.root) a.y -= dy;
              if (!b.root) b.y += dy;
            } else {
              if (!a.root) a.y += dy;
              if (!b.root) b.y -= dy;
            }
          }

          if (!a.root) {
            a.x = clamp(2, a.x, 98 - a.w);
            a.y = clamp(18, a.y, 90 - a.h);
          }
          if (!b.root) {
            b.x = clamp(2, b.x, 98 - b.w);
            b.y = clamp(18, b.y, 90 - b.h);
          }
        }
      }
    }
    if (!shifted) break;
  }
}

function layoutMindmapTree(page) {
  const root = page.objects.find((object) => object.root);
  if (!root) return;
  Object.assign(root, { x: 41, y: 45, w: 18, h: 13, mindLevel: 1, parentId: null, mindAngle: 0 });
  const nodes = page.objects.filter((object) => object.role === "mind-node");
  const childrenByParent = new Map();
  nodes.forEach((node) => {
    const children = childrenByParent.get(node.parentId) || [];
    children.push(node);
    childrenByParent.set(node.parentId, children);
  });

  const specs = {
    2: { radiusX: 23, radiusY: 19, w: 14, h: 10 },
    3: { radiusX: 33, radiusY: 27, w: 12, h: 8.5 },
    4: { radiusX: 41, radiusY: 34, w: 10, h: 7 },
    5: { radiusX: 47, radiusY: 39, w: 8.5, h: 6 },
    6: { radiusX: 52, radiusY: 43, w: 7.5, h: 5.5 }
  };
  const centerX = 50;
  const centerY = 52;

  const positionChildren = (parent) => {
    const children = childrenByParent.get(parent.id) || [];
    children.forEach((node, index) => {
      const level = Math.min(6, Math.max(2, node.mindLevel || (parent.mindLevel + 1)));
      const spec = specs[level] || specs[6];
      const angle = parent.root
        ? (children.length === 1 ? 0 : Math.PI * 2 * index / children.length)
        : parent.mindAngle + (index - (children.length - 1) / 2) * (level >= 4 ? .35 : level === 3 ? .65 : .5);
      node.mindLevel = level;
      node.mindAngle = angle;
      node.x = centerX + Math.cos(angle) * spec.radiusX - spec.w / 2;
      node.y = centerY + Math.sin(angle) * spec.radiusY - spec.h / 2;
      node.w = spec.w;
      node.h = spec.h;
      positionChildren(node);
    });
  };
  positionChildren(root);
  resolveNodeOverlaps(page);
}

function buildObjectTemplate(page, itemCount) {
  const userImages = getCustomUserImages(page);
  page.objects = [createTextObject("page-title", getVariantTitle(page), 7, 7, 86, 16, { textAlign: "left" })];
  const count = Math.max(MIN_ITEMS, Math.min(MAX_ITEMS, itemCount));

  if (page.objectCategory === "layout") {
    if (page.variant === "cards" || page.variant === "cards_2col") addCardLayoutWithColumns(page, count, 2);
    if (page.variant === "cards_1col") addCardLayoutWithColumns(page, count, 1);
    if (page.variant === "cards_3col") addCardLayoutWithColumns(page, count, 3);
    if (page.variant === "cards_4col") addCardLayoutWithColumns(page, count, 4);

    if (page.variant === "sideAccentGrid" || page.variant === "sideAccent_2col") addSideAccentLayoutWithColumns(page, count, 2);
    if (page.variant === "sideAccent_1col") addSideAccentLayoutWithColumns(page, count, 1);
    if (page.variant === "sideAccent_3col") addSideAccentLayoutWithColumns(page, count, 3);
    if (page.variant === "sideAccent_4col") addSideAccentLayoutWithColumns(page, count, 4);

    if (page.variant === "summaryLeft") addSummaryLeftLayout(page, count);
    if (page.variant === "summaryRight") addSummaryRightLayout(page, count);
    if (page.variant === "summaryTop") addSummaryTopLayout(page, count);
    if (page.variant === "summaryBottom") addSummaryBottomLayout(page, count);
    if (page.variant === "table") addTableLayout(page, count);
    if (page.variant === "tableStats") addTableStatsLayout(page, count);

    if (page.variant === "image_full") addImageFullLayout(page, count);
    if (page.variant === "image_center") addImageCenterLayout(page, count);
    if (page.variant === "image_left") addImageLeftLayout(page, count);
    if (page.variant === "image_right") addImageRightLayout(page, count);
    if (page.variant === "image_top") addImageTopLayout(page, count);
    if (page.variant === "image_bottom") addImageBottomLayout(page, count);

    if (page.imageDeleted) {
      page.objects = page.objects.filter((o) => o.type !== "image");
    } else if (userImages.length > 0) {
      const newImg = page.objects.find((o) => o.type === "image");
      if (newImg) {
        newImg.src = userImages[0].src;
        if (userImages[0].name) newImg.name = userImages[0].name;
      }
    }
  } else if (page.objectCategory === "diagram") {
    if (page.variant === "process") addProcessDiagram(page, count);
    if (page.variant === "timeline") addTimelineDiagram(page, count);
    if (page.variant === "pyramid") addPyramidDiagram(page, count);
    if (page.variant === "cycle") addCycleDiagram(page, count);
    if (page.variant === "chain") addChainDiagram(page, count);
    if (page.variant === "ribbonArrow") addRibbonArrowDiagram(page, count);
    if (page.variant === "funnel") addFunnelDiagram(page, count);
    if (page.variant === "venn") addVennDiagram(page, count);
    if (page.variant === "target") addTargetDiagram(page, count);
    if (page.variant === "connectedCircles") addConnectedCirclesDiagram(page, count);
    if (page.variant === "quadrant") addQuadrantDiagram(page);
    if (page.variant === "vs") addVsDiagram(page);
  } else if (page.objectCategory === "chart") {
    addChart(page, page.variant);
  }
}

const RELAYOUT_TEXT_PROPERTIES = ["text", "textColor", "fontSize", "textAlign", "color", "animOrder"];
const LAYOUT_CONTENT_EXCLUDED_ROLES = new Set(["page-title", "mind-root", "media-placeholder", "vs-label", "chart-context"]);

function copyRelayoutTextProperties(target, source) {
  RELAYOUT_TEXT_PROPERTIES.forEach((property) => {
    if (Object.hasOwn(source, property)) target[property] = source[property];
  });
}

function rebuildObjectTemplatePreservingContent(page, itemCount, removedObject = null) {
  const previousItemCount = getItemCount(page);
  const previousByRole = new Map();
  page.objects
    .filter((object) => object.type === "text")
    .forEach((object) => {
      const objects = previousByRole.get(object.role) || [];
      objects.push(object);
      previousByRole.set(object.role, objects);
    });

  if (removedObject?.type === "text") {
    const selectedRoleObjects = previousByRole.get(removedObject.role) || [];
    const removedIndex = selectedRoleObjects.findIndex((object) => object.id === removedObject.id);
    if (removedIndex >= 0) {
      previousByRole.forEach((objects) => {
        if (objects.length === previousItemCount) objects.splice(removedIndex, 1);
      });
    }
  }

  buildObjectTemplate(page, itemCount);
  const nextRoleIndexes = new Map();
  page.objects
    .filter((object) => object.type === "text")
    .forEach((object) => {
      const index = nextRoleIndexes.get(object.role) || 0;
      const previous = previousByRole.get(object.role)?.[index];
      if (previous) copyRelayoutTextProperties(object, previous);
      nextRoleIndexes.set(object.role, index + 1);
    });
}

function getLayoutContentSnapshot(page) {
  const chart = page.objects.find((object) => object.type === "chart");
  const blocks = page.objects
    .filter((object) => object.type === "text" && !object.root && !LAYOUT_CONTENT_EXCLUDED_ROLES.has(object.role) && String(object.text || "").trim())
    .map((object) => ({ ...object }));

  const table = page.objects.find((object) => object.type === "table");
  if (table) {
    blocks.push(...table.cells.map((row, index) => ({
      type: "text",
      role: "table-row",
      text: row.join(" | "),
      x: table.x,
      y: table.y + index / Math.max(table.cells.length, 1) * table.h
    })));
  }

  if (!blocks.length && Array.isArray(chart?.sourceBlocks)) {
    blocks.push(...chart.sourceBlocks.map((block) => ({ ...block })));
  }
  const chartData = chart ? getChartData(chart) : [];
  if (!blocks.length && chartData.length) {
    blocks.push(...chartData.map((item, index) => ({
      type: "text",
      role: "chart-data",
      text: `${item.label}: ${item.value}`,
      x: chart.x,
      y: chart.y + index / Math.max(chartData.length, 1) * chart.h
    })));
  }

  const titleObj = page.objects.find((object) => object.role === "page-title")
    || page.objects.find((object) => object.root || object.role === "mind-root")
    || null;

  return {
    title: titleObj,
    blocks,
    tableCells: table?.cells.map((row) => [...row]) || null,
    chartData
  };
}

function applyBulletTemplatePreservingContent(page) {
  const snapshotContent = getLayoutContentSnapshot(page);
  const images = getCustomUserImages(page);
  const titleText = snapshotContent.title?.text || "개조식 본문";

  page.template = "bullet";
  page.objectCategory = null;
  page.variant = null;

  const title = createTextObject("page-title", titleText, 7, 7, 86, 16, { textAlign: "left" });
  if (snapshotContent.title) copyRelayoutTextProperties(title, snapshotContent.title);

  const blocks = snapshotContent.blocks.length
    ? snapshotContent.blocks
    : [{ text: "첫 번째 핵심 내용" }, { text: "두 번째 핵심 내용" }];

  const isFromMindmap = page.template === "mindmap" || page.objects.some((o) => o.role === "mind-node");

  const bulletItems = blocks.map((block) => {
    let bulletLevel = 1;
    if (isFromMindmap && typeof block.mindLevel === "number") {
      bulletLevel = clamp(1, Number(block.mindLevel) - 1, 4);
    } else if (typeof block.bulletLevel === "number") {
      bulletLevel = clamp(1, Number(block.bulletLevel), 4);
    } else if (typeof block.mindLevel === "number") {
      bulletLevel = clamp(1, Number(block.mindLevel) - 1, 4);
    }

    return createTextObject("bullet-item", String(block.text || "").trim(), 12, 0, 75, 9, {
      item: true,
      bulletLevel,
      textColor: block.textColor,
      fontSize: block.fontSize,
      animOrder: block.animOrder
    });
  });

  page.objects = [title, ...bulletItems, ...images];
  layoutBulletItems(page);
}

function applyMindmapTemplatePreservingContent(page) {
  const snapshotContent = getLayoutContentSnapshot(page);
  const images = getCustomUserImages(page);
  const rootText = snapshotContent.title?.text || snapshotContent.blocks[0]?.text || "CENTRAL IDEA";

  page.template = "mindmap";
  page.objectCategory = "diagram";
  page.variant = "connectedCircles";

  const root = createTextObject("mind-root", rootText, 41, 45, 18, 13, {
    item: false, node: true, root: true, mindLevel: 1
  });
  if (snapshotContent.title) copyRelayoutTextProperties(root, snapshotContent.title);

  const remainingBlocks = snapshotContent.title
    ? snapshotContent.blocks
    : snapshotContent.blocks.slice(1);

  const sourceBlocks = remainingBlocks.length
    ? remainingBlocks
    : [{ text: "CONTEXT" }, { text: "METHOD" }, { text: "PROCESS" }, { text: "RESULT" }];

  const lastNodeAtLevel = { 1: root.id };

  const nodes = sourceBlocks.map((block, index) => {
    let level = 2;
    if (typeof block.bulletLevel === "number") {
      level = clamp(2, Number(block.bulletLevel) + 1, 6);
    } else if (typeof block.mindLevel === "number") {
      level = clamp(2, Number(block.mindLevel), 6);
    }

    let parentId = lastNodeAtLevel[level - 1];
    if (!parentId) {
      for (let p = level - 1; p >= 1; p--) {
        if (lastNodeAtLevel[p]) {
          parentId = lastNodeAtLevel[p];
          break;
        }
      }
    }
    if (!parentId) parentId = root.id;

    const node = createMindNode(String(block.text || "").trim() || `노드 ${index + 1}`, parentId, level);
    lastNodeAtLevel[level] = node.id;
    for (let l = level + 1; l <= 6; l++) {
      delete lastNodeAtLevel[l];
    }

    if (typeof block.animOrder === "number" && block.animOrder > 0) {
      node.animOrder = block.animOrder;
    }
    return node;
  });

  page.objects = [root, ...nodes, ...images];
  layoutMindmapTree(page);
}

function restoreSnapshotTitle(page, snapshotContent) {
  const title = page.objects.find((object) => object.role === "page-title");
  if (title && snapshotContent.title) copyRelayoutTextProperties(title, snapshotContent.title);
}

function applySnapshotBlocksToTargets(blocks, targets) {
  targets.forEach((target, index) => {
    const source = blocks[index];
    if (!source) {
      target.text = "";
      return;
    }
    copyRelayoutTextProperties(target, source);
  });
  if (blocks.length > targets.length && targets.length) {
    const overflow = blocks.slice(targets.length).map((block) => block.text).join("\n");
    targets.at(-1).text = `${targets.at(-1).text}\n${overflow}`.trim();
  }
}

function changeLayoutVariantPreservingContent(page, variant) {
  delete page.imageDeleted;
  const snapshotContent = getLayoutContentSnapshot(page);
  page.template = "object";
  page.objectCategory = "layout";
  page.variant = variant;
  const minimum = getLayoutMinimumCount(variant);
  const maximum = getLayoutMaximumCount(variant);
  let itemCount = clamp(minimum, snapshotContent.blocks.length || getLayoutDefaultCount(variant), maximum);
  buildObjectTemplate(page, itemCount);

  let targets = page.objects.filter((object) => object.type === "text" && !LAYOUT_CONTENT_EXCLUDED_ROLES.has(object.role));
  const supplementalCount = Math.max(0, targets.length - itemCount);
  const adjustedCount = clamp(minimum, Math.max(1, snapshotContent.blocks.length - supplementalCount), maximum);
  if (adjustedCount !== itemCount) {
    itemCount = adjustedCount;
    buildObjectTemplate(page, itemCount);
    targets = page.objects.filter((object) => object.type === "text" && !LAYOUT_CONTENT_EXCLUDED_ROLES.has(object.role));
  }

  restoreSnapshotTitle(page, snapshotContent);

  const table = page.objects.find((object) => object.type === "table");
  if (table) {
    table.cells = snapshotContent.tableCells || [
      ["내용"],
      ...snapshotContent.blocks.map((block) => [block.text])
    ];
    targets.forEach((target) => { target.text = ""; });
    return;
  }

  applySnapshotBlocksToTargets(snapshotContent.blocks, targets);
}

function changeDiagramVariantPreservingContent(page, variant) {
  const snapshotContent = getLayoutContentSnapshot(page);
  page.template = "object";
  page.objectCategory = "diagram";
  page.variant = variant;
  const count = clamp(
    getDiagramMinimumCount(variant),
    snapshotContent.blocks.length || getDiagramDefaultCount(variant),
    getDiagramMaximumCount(variant)
  );
  buildObjectTemplate(page, count);
  restoreSnapshotTitle(page, snapshotContent);
  const targets = page.objects.filter((object) => object.type === "text" && !LAYOUT_CONTENT_EXCLUDED_ROLES.has(object.role));
  applySnapshotBlocksToTargets(snapshotContent.blocks, targets);
}

function parseChartNumber(value) {
  const text = String(value ?? "").replaceAll(",", "").trim();
  if (!text || /^\d{1,4}[./-]\d{1,2}(?:[./-]\d{1,4})?(?:\s|$)/.test(text)) return null;
  const matches = [...text.matchAll(/-?\d+(?:\.\d+)?/g)].filter((match) => {
    const before = text[match.index - 1] || "";
    const after = text[match.index + match[0].length] || "";
    return !["/", ":"].includes(before) && !["/", ":"].includes(after);
  });
  if (!matches.length) return null;
  const match = matches.at(-1);
  const number = Number(match[0]);
  return Number.isFinite(number) ? { value: Math.max(0, number), token: match[0] } : null;
}

function chartDataFromTable(cells) {
  if (!Array.isArray(cells) || cells.length < 2) return [];
  const headers = cells[0].map((cell) => String(cell || "").trim());
  const data = [];
  cells.slice(1).forEach((row, rowIndex) => {
    const rowLabel = String(row[0] || `항목 ${rowIndex + 1}`).trim();
    row.slice(1).forEach((cell, columnOffset) => {
      const parsed = parseChartNumber(cell);
      if (!parsed || data.length >= CHART_MAX_ITEMS) return;
      const header = headers[columnOffset + 1];
      data.push({ label: normalizeAiText(header ? `${rowLabel} · ${header}` : rowLabel, 40), value: parsed.value });
    });
  });
  return data;
}

function chartDataFromBlocks(blocks) {
  const numeric = [];
  blocks.forEach((block, index) => {
    const text = String(block.text || "").trim();
    const parsed = parseChartNumber(text);
    if (!text || !parsed || numeric.length >= CHART_MAX_ITEMS) return;
    const label = normalizeAiText(text.replace(parsed.token, "").replace(/[:：·|\-]+\s*$/, "").trim(), 40) || `항목 ${index + 1}`;
    numeric.push({ label, value: parsed.value });
  });
  if (numeric.length >= CHART_MIN_ITEMS) return numeric;
  return blocks
    .filter((block) => String(block.text || "").trim())
    .slice(0, CHART_MAX_ITEMS)
    .map((block, index) => ({ label: normalizeAiText(block.text, 40) || `항목 ${index + 1}`, value: 1 }));
}

function changeChartVariantPreservingContent(page, variant) {
  const snapshotContent = getLayoutContentSnapshot(page);
  const sourceBlocks = snapshotContent.blocks.map((block) => ({
    type: "text",
    role: block.role || "chart-source",
    text: String(block.text || ""),
    x: Number(block.x) || 0,
    y: Number(block.y) || 0,
    textColor: block.textColor,
    fontSize: block.fontSize,
    textAlign: block.textAlign
  }));
  let data = snapshotContent.chartData.length >= CHART_MIN_ITEMS
    ? snapshotContent.chartData
    : chartDataFromTable(snapshotContent.tableCells);
  if (data.length < CHART_MIN_ITEMS) data = chartDataFromBlocks(sourceBlocks);

  page.template = "object";
  page.objectCategory = "chart";
  page.variant = variant;
  buildObjectTemplate(page, Math.max(data.length, CHART_MIN_ITEMS));
  restoreSnapshotTitle(page, snapshotContent);
  const chart = page.objects.find((object) => object.type === "chart");
  if (!chart) return;
  if (data.length >= CHART_MIN_ITEMS) chart.data = data.slice(0, CHART_MAX_ITEMS);
  chart.sourceBlocks = sourceBlocks;
  chart.x = 5;
  chart.y = 24;
  chart.w = 90;
  chart.h = 71;
}

function getVariantTitle(page) {
  const collection = page.objectCategory === "layout" ? layouts : page.objectCategory === "diagram" ? diagrams : charts;
  return collection[page.variant]?.name?.toUpperCase() || "OBJECT PAGE";
}

function addCardLayoutWithColumns(page, count, cols) {
  const columns = clamp(1, cols, 4);
  const rows = Math.ceil(count / columns);
  const gapX = 3;
  const gapY = 4;
  const areaW = 84;
  const areaH = 55;
  const w = (areaW - gapX * (columns - 1)) / columns;
  const h = Math.min(48, (areaH - gapY * (rows - 1)) / rows);
  const startX = 50 - areaW / 2;
  const startY = 28;

  for (let i = 0; i < count; i += 1) {
    const col = i % columns;
    const row = Math.floor(i / columns);
    page.objects.push(createTextObject(
      "card",
      `카드 ${i + 1}`,
      startX + col * (w + gapX),
      startY + row * (h + gapY),
      w,
      h,
      { item: true }
    ));
  }
}

function addSideAccentLayoutWithColumns(page, count, cols) {
  const columns = clamp(1, cols, 4);
  const rows = Math.ceil(count / columns);
  const gapX = 3;
  const gapY = 4;
  const areaW = 84;
  const areaH = 55;
  const w = (areaW - gapX * (columns - 1)) / columns;
  const h = Math.min(48, (areaH - gapY * (rows - 1)) / rows);
  const startX = 50 - areaW / 2;
  const startY = 28;

  for (let i = 0; i < count; i += 1) {
    const col = i % columns;
    const row = Math.floor(i / columns);
    page.objects.push(createTextObject(
      "side-accent-card",
      `항목 ${i + 1}\n세부 내용을 입력하세요`,
      startX + col * (w + gapX),
      startY + row * (h + gapY),
      w,
      h,
      { item: true, textAlign: "left" }
    ));
  }
}

function addTableLayout(page, count) {
  page.objects.push({
    id: createId("table"), type: "table", role: "table", x: 8, y: 25, w: 84, h: 66, item: true,
    cells: [
      ["항목", "현재", "목표"],
      ...Array.from({ length: count }, (_, index) => [`항목 ${index + 1}`, "내용", "내용"])
    ]
  });
}

function addCompareLayout(page, count) {
  const visibleCount = Math.max(2, Math.min(4, count));
  const w = 78 / visibleCount;
  for (let i = 0; i < visibleCount; i += 1) {
    page.objects.push(createTextObject("compare-card", i === 0 ? "BEFORE" : i === 1 ? "AFTER" : `OPTION ${i + 1}`, 8 + i * (w + 3), 32, w, 48, { item: true }));
  }
}

function addLayoutBanner(page, text, y = 24, h = 12) {
  page.objects.push(createTextObject("layout-banner", text, 8, y, 84, h, { textAlign: "left" }));
}

function addResponsiveCards(page, count, role, textFactory, area) {
  const columns = Math.min(count, area.columns || (count <= 4 ? count : 3));
  const rows = Math.ceil(count / columns);
  const gapX = area.gapX ?? 2;
  const gapY = area.gapY ?? 3;
  const width = (area.w - gapX * (columns - 1)) / columns;
  const height = (area.h - gapY * (rows - 1)) / rows;
  for (let index = 0; index < count; index += 1) {
    const column = index % columns;
    const row = Math.floor(index / columns);
    page.objects.push(createTextObject(
      role,
      textFactory(index),
      area.x + column * (width + gapX),
      area.y + row * (height + gapY),
      width,
      height,
      { item: true, textAlign: "left", sequence: index }
    ));
  }
}

function addTableStatsLayout(page, count) {
  page.objects.push({
    id: createId("table"), type: "table", role: "table", x: 7, y: 25, w: 58, h: 66, item: false,
    cells: [
      ["구분", "항목 A", "항목 B"],
      ["데이터 1", "내용", "내용"],
      ["데이터 2", "내용", "내용"],
      ["데이터 3", "내용", "내용"],
      ["데이터 4", "내용", "내용"]
    ]
  });
  addResponsiveCards(page, count, "stat-card", (index) => `${(index + 1) * 100}\n지표 ${index + 1}\n보조 설명`, { x: 69, y: 25, w: 24, h: 66, columns: 1, gapX: 2, gapY: 2 });
}

function addSummaryLeftLayout(page, count) {
  page.objects.push(createTextObject(
    "notice-panel",
    "요약\n핵심 결론 및 요약 메시지\n전체 내용을 압축한 설명을 입력하세요",
    6, 25, 28, 64,
    { textAlign: "left" }
  ));
  addResponsiveCards(page, count, "concept-card", (index) => `항목 ${index + 1}\n세부 내용 설명을 입력하세요`, {
    x: 37, y: 25, w: 57, h: 64, columns: count <= 3 ? 1 : 2, gapX: 2, gapY: 2
  });
}

function addSummaryRightLayout(page, count) {
  addResponsiveCards(page, count, "concept-card", (index) => `항목 ${index + 1}\n세부 내용 설명을 입력하세요`, {
    x: 6, y: 25, w: 57, h: 64, columns: count <= 3 ? 1 : 2, gapX: 2, gapY: 2
  });
  page.objects.push(createTextObject(
    "notice-panel",
    "요약\n핵심 결론 및 요약 메시지\n전체 내용을 압축한 설명을 입력하세요",
    66, 25, 28, 64,
    { textAlign: "left" }
  ));
}

function addSummaryTopLayout(page, count) {
  addLayoutBanner(page, "상단 핵심 요약 배너 문구를 입력하세요", 24, 14);
  addResponsiveCards(page, count, "metric-card", (index) => `${index + 1}00%\n지표 ${index + 1}\n간단한 설명을 입력하세요`, {
    x: 8, y: 43, w: 84, h: 46, gapX: 2, gapY: 3
  });
}

function addSummaryBottomLayout(page, count) {
  addResponsiveCards(page, count, "metric-card", (index) => `${index + 1}00%\n지표 ${index + 1}\n간단한 설명을 입력하세요`, {
    x: 8, y: 24, w: 84, h: 46, gapX: 2, gapY: 3
  });
  addLayoutBanner(page, "하단 결론 요약 배너 문구를 입력하세요", 75, 14);
}

function addCompareSummaryLayout(page) {
  page.objects.push(
    createTextObject("comparison-panel", "A\n첫 번째 비교 대상\n장점과 특징을 입력하세요", 7, 27, 41, 45, { item: true, textAlign: "left", sequence: 0 }),
    createTextObject("comparison-panel", "B\n두 번째 비교 대상\n장점과 특징을 입력하세요", 52, 27, 41, 45, { item: true, textAlign: "left", sequence: 1 })
  );
  addLayoutBanner(page, "비교 결과 또는 결론을 입력하세요", 77, 11);
}

const DEFAULT_PLACEHOLDER_IMAGE = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='800' height='450' viewBox='0 0 800 450'><rect width='100%' height='100%' fill='%23f8fafc' rx='8'/><rect x='8' y='8' width='784' height='434' fill='none' stroke='%23cbd5e1' stroke-width='4' stroke-dasharray='12,8' rx='6'/><g transform='translate(400,200)' text-anchor='middle'><circle cx='0' cy='-20' r='50' fill='%23e2e8f0'/><path d='M-25,-35 h50 a5,5 0 0 1 5,5 v30 a5,5 0 0 1 -5,5 h-50 a5,5 0 0 1 -5,-5 v-30 a5,5 0 0 1 5,-5 Z M-10,-25 a8,8 0 1 0 0,16 a8,8 0 1 0 0,-16 Z M-20,5 L-5,-10 L8,3 L18,-7 L25,5 Z' fill='%2364748b'/><text x='0' y='65' font-size='24' font-weight='800' fill='%23334155' font-family='sans-serif'>🖼️ 이미지 더블클릭 또는 파일 드래그 앤 드롭</text><text x='0' y='95' font-size='18' font-weight='600' fill='%2394a3b8' font-family='sans-serif'>클릭하여 사진 파일(PNG, JPG, WebP) 교체</text></g></svg>";

function createImageObject(x, y, w, h, src = DEFAULT_PLACEHOLDER_IMAGE, name = "메인 이미지") {
  return {
    id: createId("image"),
    type: "image",
    src: src,
    name: name,
    x: x,
    y: y,
    w: w,
    h: h
  };
}

function addImageFullLayout(page, count) {
  page.objects.push(createImageObject(0, 0, 100, 100, DEFAULT_PLACEHOLDER_IMAGE, "전체 배경 이미지"));
  page.objects.push(createTextObject(
    "notice-panel",
    "풀스크린 비주얼 이미지\n전체 화면 배경 이미지 레이아웃의 메시지를 입력하세요",
    10, 62, 80, 26,
    { textAlign: "center", bgColor: "rgba(15, 23, 42, 0.85)", textColor: "#ffffff" }
  ));
}

function addImageCenterLayout(page, count) {
  page.objects.push(createImageObject(20, 24, 60, 48, DEFAULT_PLACEHOLDER_IMAGE, "중앙 히어로 이미지"));
  addResponsiveCards(page, count, "concept-card", (index) => `포인트 ${index + 1}\n중앙 비주얼 보조 설명 항목`, {
    x: 6, y: 76, w: 88, h: 20, columns: Math.min(count, 4), gapX: 2, gapY: 2
  });
}

function addImageLeftLayout(page, count) {
  page.objects.push(createImageObject(6, 23, 42, 68, DEFAULT_PLACEHOLDER_IMAGE, "좌측 메인 이미지"));
  addResponsiveCards(page, count, "concept-card", (index) => `주요 특징 ${index + 1}\n상세 설명 및 핵심 내용을 입력하세요`, {
    x: 51, y: 23, w: 43, h: 68, columns: count <= 3 ? 1 : 2, gapX: 2, gapY: 2
  });
}

function addImageRightLayout(page, count) {
  addResponsiveCards(page, count, "concept-card", (index) => `주요 특징 ${index + 1}\n상세 설명 및 핵심 내용을 입력하세요`, {
    x: 6, y: 23, w: 43, h: 68, columns: count <= 3 ? 1 : 2, gapX: 2, gapY: 2
  });
  page.objects.push(createImageObject(52, 23, 42, 68, DEFAULT_PLACEHOLDER_IMAGE, "우측 메인 이미지"));
}

function addImageTopLayout(page, count) {
  page.objects.push(createImageObject(6, 23, 88, 38, DEFAULT_PLACEHOLDER_IMAGE, "상단 와이드 이미지"));
  addResponsiveCards(page, count, "concept-card", (index) => `항목 ${index + 1}\n하단 항목 상세 설명을 입력하세요`, {
    x: 6, y: 64, w: 88, h: 28, columns: Math.min(count, 4), gapX: 2, gapY: 2
  });
}

function addImageBottomLayout(page, count) {
  addResponsiveCards(page, count, "concept-card", (index) => `항목 ${index + 1}\n상단 핵심 요약 항목을 입력하세요`, {
    x: 6, y: 23, w: 88, h: 28, columns: Math.min(count, 4), gapX: 2, gapY: 2
  });
  page.objects.push(createImageObject(6, 55, 88, 38, DEFAULT_PLACEHOLDER_IMAGE, "하단 비주얼 이미지"));
}

function addFocusCardsLayout(page, count) {
  page.objects.push(createTextObject(
    "focus-panel",
    "핵심 메시지\n중앙 강조 내용을 입력하세요\n보조 설명을 입력하세요",
    8, 27, 84, 31,
    { textAlign: "center" }
  ));
  addResponsiveCards(page, count, "concept-card", (index) => `POINT ${index + 1}\n항목 ${index + 1}\n설명을 입력하세요`, {
    x: 8, y: 65, w: 84, h: 24, columns: 3, gapX: 2, gapY: 2
  });
}

function addPairedCheckWarningsLayout(page, count) {
  addResponsiveCards(page, count, "checklist-card", (index) => `${index + 1}분\n점검 카드 ${index + 1}\n확인 내용을 입력하세요`, {
    x: 4, y: 24, w: 92, h: 45, columns: 3, gapX: 2.5, gapY: 2.5
  });
  addResponsiveCards(page, count, "warning-summary-card", (index) => `주의 ${index + 1}\n경고 항목 ${index + 1}\n설명을 입력하세요`, {
    x: 4, y: 75, w: 92, h: 16, columns: 3, gapX: 2.5, gapY: 2
  });
}

function addProcessDiagram(page, count) {
  const w = Math.min(18, 75 / count);
  for (let i = 0; i < count; i += 1) {
    page.objects.push(createTextObject("diagram-node", `단계 ${i + 1}`, 8 + i * (84 / count), 43, w, 20, { item: true, node: true, sequence: i }));
  }
}

function addTimelineDiagram(page, count) {
  const presets = [
    ["아이디어 발상", "문제 정의 및 브레인스토밍"],
    ["검증", "프로토타입 테스트와 피드백"],
    ["개발", "기능 구현과 통합"],
    ["출시", "배포 및 사용자 도입"],
    ["최적화", "데이터 기반 개선 반복"]
  ];
  const span = 88 / count;
  const width = Math.min(17, span * .82);
  for (let i = 0; i < count; i += 1) {
    const centerX = 6 + span * (i + .5);
    const y = i % 2 === 0 ? 29 : 58;
    const [title, description] = presets[i] || [`시점 ${i + 1}`, "세부 내용을 입력하세요"];
    page.objects.push(createTextObject("timeline-node", `${title}\n${description}`, centerX - width / 2, y, width, 15, {
      item: true,
      node: true,
      sequence: i
    }));
  }
}

function addPyramidDiagram(page, count) {
  const height = Math.min(13, 58 / count);
  for (let i = 0; i < count; i += 1) {
    const w = 28 + (i * 7);
    page.objects.push(createTextObject("pyramid-level", `단계 ${i + 1}`, 50 - w / 2, 28 + i * (height + 2), w, height, { item: true, pyramidApex: i === 0 }));
  }
}

function addCycleDiagram(page, count) {
  const centerX = 50;
  const centerY = 55;
  const radiusX = 18;
  const radiusY = 27;
  for (let i = 0; i < count; i += 1) {
    const angle = (-Math.PI / 2) + (Math.PI * 2 * i / count);
    page.objects.push(createTextObject("cycle-node", `단계 ${i + 1}`, centerX + Math.cos(angle) * radiusX - 4.5, centerY + Math.sin(angle) * radiusY - 8, 9, 16, { item: true, node: true, sequence: i }));
  }
}

function addChainDiagram(page, count) {
  const span = 82 / count;
  const width = Math.min(16, span * .78);
  for (let index = 0; index < count; index += 1) {
    page.objects.push(createTextObject(
      "chain-node",
      `항목 ${index + 1}`,
      9 + span * index + (span - width) / 2,
      index % 2 === 0 ? 43 : 47,
      width,
      16,
      { item: true, node: true, sequence: index }
    ));
  }
}

function addRibbonArrowDiagram(page, count) {
  const span = 86 / count;
  const width = Math.min(22, span + 1.2);
  for (let index = 0; index < count; index += 1) {
    page.objects.push(createTextObject(
      "ribbon-step",
      `단계 ${index + 1}`,
      7 + span * index,
      40,
      width,
      24,
      { item: true, sequence: index }
    ));
  }
}

function addFunnelDiagram(page, count) {
  const height = Math.min(12, 58 / count);
  for (let index = 0; index < count; index += 1) {
    const width = 72 - index * (44 / Math.max(count - 1, 1));
    page.objects.push(createTextObject(
      "funnel-level",
      `단계 ${index + 1}`,
      50 - width / 2,
      27 + index * (height + 2),
      width,
      height,
      { item: true, sequence: index }
    ));
  }
}

function addVennDiagram(page, count) {
  const width = count === 2 ? 22 : count === 3 ? 20 : 18;
  const step = count === 2 ? 14 : count === 3 ? 11 : 9.5;
  const totalWidth = width + step * (count - 1);
  const startX = 50 - totalWidth / 2;
  for (let index = 0; index < count; index += 1) {
    page.objects.push(createTextObject(
      "venn-circle",
      `영역 ${index + 1}`,
      startX + step * index,
      37 + (index % 2) * 3,
      width,
      36,
      { item: true, sequence: index, color: ["blue", "red", "yellow", "blue"][index] }
    ));
  }
}

function addTargetDiagram(page, count) {
  const outerHeight = 56;
  const innerHeight = 18;
  for (let index = 0; index < count; index += 1) {
    const height = outerHeight - index * ((outerHeight - innerHeight) / Math.max(count - 1, 1));
    const width = height * .5625;
    page.objects.push(createTextObject(
      "target-ring",
      `목표 ${index + 1}`,
      50 - width / 2,
      55 - height / 2,
      width,
      height,
      { item: true, sequence: index, color: ["blue", "yellow", "red"][index % 3] }
    ));
  }
}

function addConnectedCirclesDiagram(page, count) {
  const center = createTextObject("connected-circle", "중심", 45.5, 44, 9, 16, { item: true, node: true, sequence: 0, rootNode: true });
  page.objects.push(center);
  const satelliteCount = Math.max(0, count - 1);
  for (let index = 0; index < satelliteCount; index += 1) {
    const angle = -Math.PI / 2 + Math.PI * 2 * index / satelliteCount;
    page.objects.push(createTextObject(
      "connected-circle",
      `항목 ${index + 2}`,
      50 + Math.cos(angle) * 18 - 4,
      52 + Math.sin(angle) * 27 - 7,
      8,
      14,
      { item: true, node: true, sequence: index + 1 }
    ));
  }
}

function addQuadrantDiagram(page) {
  const labels = ["영역 1", "영역 2", "영역 3", "영역 4"];
  labels.forEach((label, index) => {
    const column = index % 2;
    const row = Math.floor(index / 2);
    page.objects.push(createTextObject(
      "quadrant-item",
      label,
      15 + column * 36,
      28 + row * 29,
      34,
      27,
      { item: true, sequence: index }
    ));
  });
}

function addVsDiagram(page) {
  page.objects.push(
    createTextObject("vs-node", "A", 20, 34, 22, 39, { item: true, sequence: 0, color: "blue" }),
    createTextObject("vs-label", "VS", 45, 45, 10, 16, { item: false }),
    createTextObject("vs-node", "B", 58, 34, 22, 39, { item: true, sequence: 1, color: "red" })
  );
}

const CHART_DEFAULT_DATA = {
  column: [["1분기", 42], ["2분기", 68], ["3분기", 55], ["4분기", 82], ["5분기", 64]],
  line: [["1월", 28], ["2월", 44], ["3월", 39], ["4월", 72], ["5월", 66], ["6월", 88]],
  pie: [["제품 A", 38], ["제품 B", 27], ["제품 C", 21], ["기타", 14]],
  bar: [["항목 A", 78], ["항목 B", 62], ["항목 C", 49], ["항목 D", 35], ["항목 E", 24]],
  area: [["1월", 22], ["2월", 36], ["3월", 31], ["4월", 58], ["5월", 74], ["6월", 69]]
};
const CHART_MIN_ITEMS = 2;
const CHART_MAX_ITEMS = 8;

function addChart(page, variant) {
  const source = CHART_DEFAULT_DATA[variant] || CHART_DEFAULT_DATA.column;
  page.objects.push({
    id: createId("chart"),
    type: "chart",
    role: `chart-${variant}`,
    chartType: variant,
    data: source.map(([label, value]) => ({ label, value })),
    x: 5,
    y: 24,
    w: 90,
    h: 71,
    item: false
  });
}

function getChartData(object) {
  const fallback = CHART_DEFAULT_DATA[object.chartType] || CHART_DEFAULT_DATA.column;
  const source = Array.isArray(object.data) && object.data.length ? object.data : fallback.map(([label, value]) => ({ label, value }));
  return source.map((item, index) => ({
    label: String(item?.label || `항목 ${index + 1}`),
    value: Math.max(0, Number(item?.value) || 0)
  }));
}

function createNextChartDataItem(object) {
  const data = getChartData(object);
  const number = data.length + 1;
  const label = ["line", "area"].includes(object.chartType)
    ? `${number}월`
    : object.chartType === "column"
      ? `${number}분기`
      : `항목 ${number}`;
  const average = Math.round(data.reduce((sum, item) => sum + item.value, 0) / Math.max(data.length, 1));
  return { label, value: average };
}

function getItemCount(page) {
  if (page.type === "cover") return coverItems(page).length;
  if (page.template === "bullet") return page.objects.filter((object) => object.role === "bullet-item").length;
  if (page.template === "mindmap") return page.objects.filter((object) => object.role === "mind-node").length;
  if (page.template === "object") {
    if (page.objectCategory === "chart") {
      const chart = page.objects.find((object) => object.type === "chart");
      return chart ? getChartData(chart).length : 0;
    }
    const table = TABLE_LAYOUT_VARIANTS.has(page.variant) ? page.objects.find((object) => object.type === "table") : null;
    if (table) return table.cells.length - 1;
    const countRole = ITEM_COUNT_ROLE_BY_VARIANT[page.variant];
    if (countRole) return page.objects.filter((object) => object.role === countRole).length;
    return page.objects.filter((object) => object.item && object.type !== "image").length;
  }
  return 0;
}

function getLayoutDefaultCount(variant) {
  return {
    cards_1col: 2, cards_2col: 4, cards_3col: 3, cards_4col: 4,
    sideAccent_1col: 2, sideAccent_2col: 4, sideAccent_3col: 3, sideAccent_4col: 4,
    summaryLeft: 3, summaryRight: 3, summaryTop: 4, summaryBottom: 4,
    table: 3,
    tableStats: 3
  }[variant] || 3;
}

function getLayoutMinimumCount(variant) {
  return variant === "compare" ? 2 : 1;
}

function getLayoutMaximumCount(variant) {
  if (variant === "compare") return 4;
  if (["bannerMetrics", "metricsBottomBanner", "tableStats"].includes(variant)) return 6;
  if (variant === "processNotices" || variant === "sideAccentGrid") return 10;
  if (variant === "focusCards" || variant === "pairedCheckWarnings") return 6;
  return MAX_ITEMS;
}

function getDiagramDefaultCount(variant) {
  return {
    process: 4,
    timeline: 5,
    pyramid: 4,
    cycle: 4,
    chain: 4,
    ribbonArrow: 4,
    funnel: 4,
    venn: 3,
    target: 4,
    connectedCircles: 5,
    quadrant: 4,
    vs: 2
  }[variant] || 4;
}

function getDiagramMinimumCount(variant) {
  if (variant === "vs") return 2;
  if (variant === "quadrant") return 4;
  if (["cycle", "connectedCircles"].includes(variant)) return 3;
  return 2;
}

function getDiagramMaximumCount(variant) {
  return {
    process: 8,
    timeline: 7,
    pyramid: 6,
    cycle: 8,
    chain: 8,
    ribbonArrow: 6,
    funnel: 6,
    venn: 4,
    target: 6,
    connectedCircles: 48,
    quadrant: 4,
    vs: 2
  }[variant] || MAX_ITEMS;
}

function getSelectedActionObject(page) {
  if (page.template === "object" && page.objectCategory === "chart") {
    return page.objects.find((object) => object.type === "chart") || null;
  }
  if (page.template === "object" && page.objectCategory === "layout" && TABLE_LAYOUT_VARIANTS.has(page.variant)) {
    return page.objects.find((object) => object.type === "table") || null;
  }
  if (state.selectedIds.size === 0) return null;
  const selected = page.objects.find((object) => state.selectedIds.has(object.id));
  if (!selected) return null;
  if (page.type === "cover") return selected.role === "cover-item" ? selected : null;
  if (page.template === "mindmap") return selected.root || selected.role === "mind-node" ? selected : null;
  return selected;
}

function canAddItem(page, selected) {
  if (page.type === "cover") return getItemCount(page) < MAX_ITEMS;
  if (!selected && page.template !== "object" && page.template !== "bullet" && page.template !== "mindmap") return false;
  if (selected?.type === "chart") return getChartData(selected).length < CHART_MAX_ITEMS;
  if (selected?.type === "table") {
    const columnCount = selected.cells[0]?.length || 0;
    return tableManagementAxis === "column" ? columnCount < 20 : selected.cells.length - 1 < 30;
  }
  if ((page.template === "object" || page.objectCategory) && page.objectCategory === "layout" && getItemCount(page) >= getLayoutMaximumCount(page.variant)) return false;
  if ((page.template === "object" || page.objectCategory) && page.objectCategory === "diagram" && page.variant !== "connectedCircles" && getItemCount(page) >= getDiagramMaximumCount(page.variant)) return false;
  if (getItemCount(page) >= MAX_ITEMS) return false;
  if (page.template === "mindmap") {
    if (selected && selected.mindLevel >= 6) return false;
    return getItemCount(page) < MAX_ITEMS;
  }
  return true;
}

function canRemoveItem(page, selected) {
  if (state.selectedIds.size > 0) {
    if (page.template === "mindmap" && selected && selected.root) return false;
    return true;
  }
  if (!selected) return false;
  if (page.type === "cover") return true;
  if (selected.type === "chart") return getChartData(selected).length > CHART_MIN_ITEMS;
  if (selected.type === "table") {
    const columnCount = selected.cells[0]?.length || 0;
    return tableManagementAxis === "column" ? columnCount > 2 : selected.cells.length > 2;
  }
  if (page.template === "mindmap") return !selected.root;
  return true;
}

function addItem() {
  const page = currentPage();
  if (page.type !== "cover" && (page.type !== "content" || !page.template)) return;
  const count = getItemCount(page);
  const selected = getSelectedActionObject(page);
  if (!canAddItem(page, selected)) return;
  snapshot();

  if (page.type === "cover") {
    const item = createTextObject("cover-item", `추가 항목 ${count + 1}`, 18, 0, 64, 5.5, { item: true, bulletLevel: 1 });
    page.objects.push(item);
    layoutCoverItems(page);
    state.selectedIds = new Set([item.id]);
  } else if (page.template === "bullet") {
    const item = createTextObject("bullet-item", `새 핵심 내용 ${count + 1}`, 12, 0, 75, 9, { item: true, bulletLevel: selected.bulletLevel || 1 });
    page.objects.splice(page.objects.indexOf(selected) + 1, 0, item);
    layoutBulletItems(page);
    state.selectedIds = new Set([item.id]);
  } else if (page.template === "mindmap") {
    const childCount = page.objects.filter((object) => object.parentId === selected.id).length;
    const item = createMindNode(`하위 항목 ${childCount + 1}`, selected.id, selected.mindLevel + 1);
    positionNewMindmapNode(page, selected, item);
    page.objects.push(item);
    state.selectedIds = new Set([item.id]);
  } else if (selected.type === "chart") {
    selected.data = getChartData(selected);
    selected.data.push(createNextChartDataItem(selected));
  } else if (selected.type === "table") {
    if (tableManagementAxis === "column") {
      selected.cells.forEach((row, index) => row.push(index === 0 ? `열 ${row.length + 1}` : "내용"));
    } else {
      selected.cells.push(selected.cells[0].map((_, index) => index === 0 ? `항목 ${selected.cells.length}` : "내용"));
    }
  } else {
    rebuildObjectTemplatePreservingContent(page, count + 1);
    state.selectedIds.clear();
  }
  hideTextToolbar();
  render();
}

function deleteSelectedObjects() {
  const page = currentPage();
  if (state.selectedIds.size === 0) return false;

  const selectedObjects = page.objects.filter((obj) => state.selectedIds.has(obj.id));
  if (!selectedObjects.length) return false;

  const deletable = selectedObjects.filter((obj) => !obj.root);
  if (!deletable.length) return false;

  const objectsWithImageSrc = deletable.filter((obj) => obj.imageSrc);
  if (objectsWithImageSrc.length > 0) {
    snapshot();
    objectsWithImageSrc.forEach((obj) => {
      delete obj.imageSrc;
    });
    state.selectedIds.clear();
    state.guides = [];
    hideTextToolbar();
    render();
    return true;
  }

  snapshot();

  if (page.template === "bullet") {
    page.objects = page.objects.filter((object) => !state.selectedIds.has(object.id));
    layoutBulletItems(page);
  } else if (page.template === "mindmap") {
    const deletedIds = new Set(state.selectedIds);
    let foundChild = true;
    while (foundChild) {
      foundChild = false;
      page.objects.forEach((object) => {
        if (object.parentId && deletedIds.has(object.parentId) && !deletedIds.has(object.id)) {
          deletedIds.add(object.id);
          foundChild = true;
        }
      });
    }
    page.objects = page.objects.filter((object) => !deletedIds.has(object.id));
  } else if (page.template === "object" || page.objectCategory === "layout") {
    const imageObjects = deletable.filter((o) => o.type === "image");
    if (imageObjects.length > 0) {
      page.imageDeleted = true;
    }

    const cardDeletable = deletable.filter((o) => o.role !== "page-title" && o.type !== "image");
    const removeCount = cardDeletable.length;
    const count = getItemCount(page);
    const newCount = Math.max(1, count - removeCount);

    page.objects = page.objects.filter((object) => !state.selectedIds.has(object.id));
    if (page.template === "object" && removeCount > 0) {
      rebuildObjectTemplatePreservingContent(page, newCount, cardDeletable[0]);
    }
  } else {
    page.objects = page.objects.filter((object) => !state.selectedIds.has(object.id));
  }

  state.selectedIds.clear();
  state.guides = [];
  hideTextToolbar();
  render();
  return true;
}

function bringToFrontSelectedObjects() {
  const page = currentPage();
  if (!state.selectedIds.size) return false;

  const selectedObjects = [];
  const remainingObjects = [];
  page.objects.forEach((obj) => {
    if (state.selectedIds.has(obj.id)) selectedObjects.push(obj);
    else remainingObjects.push(obj);
  });
  if (!selectedObjects.length) return false;

  snapshot();
  page.objects = [...remainingObjects, ...selectedObjects];
  renderStage();
  return true;
}

function bringForwardSelectedObjects() {
  const page = currentPage();
  if (!state.selectedIds.size) return false;

  let moved = false;
  for (let i = page.objects.length - 2; i >= 0; i--) {
    if (state.selectedIds.has(page.objects[i].id) && !state.selectedIds.has(page.objects[i + 1].id)) {
      if (!moved) { snapshot(); moved = true; }
      const temp = page.objects[i];
      page.objects[i] = page.objects[i + 1];
      page.objects[i + 1] = temp;
    }
  }
  if (moved) renderStage();
  return moved;
}

function sendBackwardSelectedObjects() {
  const page = currentPage();
  if (!state.selectedIds.size) return false;

  let moved = false;
  for (let i = 1; i < page.objects.length; i++) {
    if (state.selectedIds.has(page.objects[i].id) && !state.selectedIds.has(page.objects[i - 1].id)) {
      if (!moved) { snapshot(); moved = true; }
      const temp = page.objects[i];
      page.objects[i] = page.objects[i - 1];
      page.objects[i - 1] = temp;
    }
  }
  if (moved) renderStage();
  return moved;
}

function sendToBackSelectedObjects() {
  const page = currentPage();
  if (!state.selectedIds.size) return false;

  const selectedObjects = [];
  const remainingObjects = [];
  page.objects.forEach((obj) => {
    if (state.selectedIds.has(obj.id)) selectedObjects.push(obj);
    else remainingObjects.push(obj);
  });
  if (!selectedObjects.length) return false;

  snapshot();
  page.objects = [...selectedObjects, ...remainingObjects];
  renderStage();
  return true;
}

function removeItem() {
  const page = currentPage();
  const count = getItemCount(page);
  const selected = getSelectedActionObject(page);
  if ((page.type !== "cover" && page.type !== "content") || !canRemoveItem(page, selected)) return;

  const targetIds = new Set(state.selectedIds);
  if (selected && selected.id) targetIds.add(selected.id);
  if (targetIds.size === 0) return;

  snapshot();

  if (page.type === "cover") {
    page.objects = page.objects.filter((object) => !targetIds.has(object.id));
    layoutCoverItems(page);
    state.selectedIds.clear();
  } else if (page.template === "bullet") {
    page.objects = page.objects.filter((object) => !targetIds.has(object.id));
    layoutBulletItems(page);
    state.selectedIds.clear();
  } else if (page.template === "mindmap") {
    const deletedIds = new Set(targetIds);
    let foundChild = true;
    while (foundChild) {
      foundChild = false;
      page.objects.forEach((object) => {
        if (object.parentId && deletedIds.has(object.parentId) && !deletedIds.has(object.id)) {
          deletedIds.add(object.id);
          foundChild = true;
        }
      });
    }
    page.objects = page.objects.filter((object) => !deletedIds.has(object.id));
    state.selectedIds.clear();
  } else if (selected && selected.type === "chart") {
    selected.data = getChartData(selected);
    selected.data.pop();
  } else if (selected && selected.type === "table") {
    if (tableManagementAxis === "column") selected.cells.forEach((row) => row.pop());
    else selected.cells.pop();
  } else {
    const selectedObjects = page.objects.filter((object) => targetIds.has(object.id));
    const removeCount = selectedObjects.length || 1;
    const newCount = Math.max(1, count - removeCount);

    page.objects = page.objects.filter((object) => !targetIds.has(object.id));
    if (page.template === "object") {
      rebuildObjectTemplatePreservingContent(page, newCount, selectedObjects[0] || selected);
    }
    state.selectedIds.clear();
  }
  hideTextToolbar();
  render();
}

function getObjectHierarchyLevel(obj) {
  if (typeof obj.mindLevel === "number") return `mind-${obj.mindLevel}`;
  if (typeof obj.bulletLevel === "number") return `bullet-${obj.bulletLevel}`;
  if (obj.role) return `role-${obj.role}`;
  return "default";
}

function areSelectedObjectsSameLevel(mergeableCards) {
  if (mergeableCards.length < 2) return false;
  const firstLevel = getObjectHierarchyLevel(mergeableCards[0]);
  return mergeableCards.every((obj) => getObjectHierarchyLevel(obj) === firstLevel);
}

function mergeSelectedCards() {
  const page = currentPage();
  if (page.type !== "content") return false;

  const selectedObjects = page.objects.filter((obj) => state.selectedIds.has(obj.id));
  const mergeableCards = selectedObjects.filter((obj) => obj.type === "text" || obj.item || obj.role);

  if (mergeableCards.length < 2 || !areSelectedObjectsSameLevel(mergeableCards)) return false;

  const minX = Math.min(...mergeableCards.map((obj) => Number(obj.x)));
  const minY = Math.min(...mergeableCards.map((obj) => Number(obj.y)));
  const maxX = Math.max(...mergeableCards.map((obj) => Number(obj.x) + Number(obj.w)));
  const maxY = Math.max(...mergeableCards.map((obj) => Number(obj.y) + Number(obj.h)));

  const width = Math.max(10, maxX - minX);
  const height = Math.max(10, maxY - minY);

  const combinedText = mergeableCards
    .map((obj) => (obj.text || "").trim())
    .filter(Boolean)
    .join("\n\n");

  const baseObj = mergeableCards[0];
  snapshot();

  const mergedCard = {
    id: createId("card"),
    type: "text",
    role: baseObj.role || "card",
    text: combinedText,
    x: minX,
    y: minY,
    w: width,
    h: height,
    item: true
  };

  const cardWithImage = mergeableCards.find((obj) => obj.imageSrc);
  if (cardWithImage) {
    mergedCard.imageSrc = cardWithImage.imageSrc;
  }

  const mergedIds = new Set(mergeableCards.map((obj) => obj.id));
  page.objects = page.objects.filter((obj) => !mergedIds.has(obj.id));
  page.objects.push(mergedCard);

  state.selectedIds = new Set([mergedCard.id]);
  state.guides = [];
  hideTextToolbar();
  render();
  return true;
}

function changeSelectedBulletHierarchy(direction) {
  const page = currentPage();
  const selected = getSelectedActionObject(page);
  if (!(page.template === "bullet" || page.type === "cover") || !selected) return false;
  const items = page.type === "cover" ? coverItems(page) : page.objects.filter((object) => object.role === "bullet-item");
  const index = items.indexOf(selected);
  const currentLevel = clamp(1, Number(selected.bulletLevel) || 1, 4);
  if (direction > 0) {
    if (index === 0) return false;
    const previousLevel = clamp(1, Number(items[index - 1].bulletLevel) || 1, 4);
    if (currentLevel >= Math.min(4, previousLevel + 1)) return false;
    snapshot();
    selected.bulletLevel = currentLevel + 1;
  } else {
    if (currentLevel === 1) return false;
    snapshot();
    selected.bulletLevel = currentLevel - 1;
  }
  if (page.type === "cover") layoutCoverItems(page);
  else layoutBulletItems(page);
  render();
  return true;
}

function render() {
  if (state.activeTextObjectId && !currentPage().objects.some((object) => object.id === state.activeTextObjectId)) hideTextToolbar();
  document.body.dataset.design = state.design;
  applyThemePalette();
  renderControls();
  renderPages();
  renderStage();
  updateUndoButton();
}

function renderControls() {
  const page = currentPage();
  const isCover = page.type === "cover";
  const designSelect = $("#designSelect");
  if (designSelect) {
    designSelect.value = state.design;
    designSelect.disabled = !isCover;
  }
  const designHint = $("#designHint");
  if (designHint) {
    designHint.textContent = isCover ? (designs[state.design]?.description || designs[state.design] || "") : "디자인 및 테마 설정은 시작 화면 모달에서 지정됩니다.";
  }
  const designSec01 = $("#designSection01");
  if (designSec01) designSec01.hidden = !isCover;
  const paletteSec = $("#paletteSection");
  if (paletteSec) paletteSec.hidden = !isCover;
  const overlaySec = $("#fixedOverlaySection");
  if (overlaySec) overlaySec.hidden = !isCover;

  if (isCover) {
    const palette = getCurrentPalette();
    [1, 2, 3].forEach((index) => {
      const hex = palette[index - 1];
      const picker = $(`#colorPicker${index}`);
      const hexInput = $(`#colorHex${index}`);
      const swatch = $(`#colorSwatch${index}`);
      if (picker) picker.value = hex;
      if (hexInput && document.activeElement !== hexInput) hexInput.value = hex;
      if (swatch) swatch.style.background = hex;
    });

    ["tl", "tc", "tr", "bl", "bc", "br"].forEach((pos) => {
      const cfg = state.fixedOverlays?.[pos] || { text: "", size: "13px", weight: "700" };
      const textInput = $(`#overlayText_${pos}`);
      const sizeSelect = $(`#overlaySize_${pos}`);
      const weightSelect = $(`#overlayWeight_${pos}`);
      if (textInput && document.activeElement !== textInput) textInput.value = cfg.text || "";
      if (sizeSelect) sizeSelect.value = cfg.size || "13px";
      if (weightSelect) weightSelect.value = cfg.weight || "700";
    });
  }

  $("#templateSection").hidden = isCover;
  $("#itemSection").hidden = false;
  const currentBadge = $("#templateCurrentBadge");
  if (currentBadge) {
    let tName = "개조식";
    if (page.template === "bullet") tName = "개조식";
    else if (page.template === "mindmap") tName = "마인드맵";
    else if (page.template === "object") {
      if (page.objectCategory === "layout") tName = layouts[page.variant]?.name || "레이아웃";
      else if (page.objectCategory === "diagram") tName = diagrams[page.variant]?.name || "다이어그램";
      else if (page.objectCategory === "chart") tName = charts[page.variant]?.name || "차트";
    }
    currentBadge.innerHTML = `현재 템플릿: <strong>${tName}</strong>`;
  }

  document.querySelectorAll("[data-template-id]").forEach((button) => {
    const selected = page.template === button.dataset.templateId;
    button.classList.toggle("is-selected", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
  document.querySelectorAll("[data-layout-variant]").forEach((button) => {
    const selected = page.template === "object" && page.objectCategory === "layout" && button.dataset.layoutVariant === page.variant;
    button.classList.toggle("is-selected", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
  document.querySelectorAll("[data-diagram-variant]").forEach((button) => {
    const selected = page.template === "object" && page.objectCategory === "diagram" && button.dataset.diagramVariant === page.variant;
    button.classList.toggle("is-selected", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
  document.querySelectorAll("[data-chart-variant]").forEach((button) => {
    const selected = page.template === "object" && page.objectCategory === "chart" && button.dataset.chartVariant === page.variant;
    button.classList.toggle("is-selected", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
  const itemCount = getItemCount(page);
  const selected = getSelectedActionObject(page);
  const selectedTable = selected?.type === "table" ? selected : null;
  const selectedChart = selected?.type === "chart" ? selected : null;
  const isChart = page.objectCategory === "chart";

  const cardImgInsertBtn = $("#cardImageInsertButton");
  const cardImgRemoveBtn = $("#cardImageRemoveButton");
  const mergeCardsBtn = $("#mergeCardsButton");

  if (mergeCardsBtn) {
    const selectedObjects = page.objects.filter((obj) => state.selectedIds.has(obj.id));
    const mergeableCards = selectedObjects.filter((obj) => obj.type === "text" || obj.item || obj.role);
    mergeCardsBtn.disabled = mergeableCards.length < 2 || !areSelectedObjectsSameLevel(mergeableCards);
  }

  if (cardImgInsertBtn && cardImgRemoveBtn) {
    const isObjectSelected = Boolean(selected && selected.type !== "image" && selected.type !== "table" && selected.type !== "chart");
    cardImgInsertBtn.disabled = !isObjectSelected;
    cardImgInsertBtn.textContent = selected?.imageSrc ? "📷 카드 이미지 수정" : "📷 카드 이미지 삽입";
    cardImgRemoveBtn.hidden = !selected?.imageSrc;
  }
  $("#tableAxisLabel").hidden = !selectedTable;
  $("#tableAxisSelect").value = tableManagementAxis;
  $("#addItemButton").disabled = (!isCover && !page.template) || !canAddItem(page, selected);
  $("#removeItemButton").disabled = (!isCover && !page.template) || !canRemoveItem(page, selected);
  $("#addItemButton").textContent = selectedChart ? "+ 데이터" : selectedTable ? `+ ${tableManagementAxis === "column" ? "열" : "행"}` : "+ 항목";
  $("#removeItemButton").textContent = selectedChart ? "− 데이터" : selectedTable ? `− ${tableManagementAxis === "column" ? "열" : "행"}` : "− 항목";
  $("#itemHint").textContent = isCover
    ? selected ? `현재 ${selected.bulletLevel || 1}단계 선택 · Tab: 하위 위계 · Shift+Tab: 상위 위계` : "표지에 필요한 항목을 추가할 수 있습니다. 항목 선택 후 Tab/Shift+Tab으로 위계를 조정하세요."
    : page.template === "mindmap"
      ? selected ? `현재 ${selected.mindLevel}단계 선택 · +는 하위 항목 추가, −는 선택 가지 삭제` : `현재 항목 ${itemCount}개 · 추가하거나 삭제할 개체를 먼저 선택하세요.`
      : page.template === "bullet"
        ? selected ? `현재 ${selected.bulletLevel || 1}단계 선택 · Tab: 하위 위계 · Shift+Tab: 상위 위계` : `현재 항목 ${itemCount}개 · 항목을 선택한 뒤 Tab 또는 Shift+Tab으로 위계를 조정하세요.`
        : isChart ? `데이터 ${itemCount}개 · 2~8개까지 추가·삭제하고 숫자를 수정할 수 있습니다.`
        : selectedTable ? `테이블 ${tableManagementAxis === "column" ? "열" : "행"}을 관리합니다. 위 선택에서 대상을 바꿀 수 있습니다.`
        : page.template ? `현재 항목 ${itemCount}개 · 추가하거나 삭제할 항목 개체를 먼저 선택하세요.` : "본문 템플릿을 먼저 선택하세요.";
  const animBtn = $("#toggleAnimModeButton");
  if (animBtn) {
    animBtn.classList.toggle("is-active", isAnimMode);
    animBtn.textContent = isAnimMode ? "애니메이션 모드 종료 (A / Esc)" : "애니메이션 지정 (단축키 A)";
  }

  const selectedObjects = page.objects.filter((obj) => state.selectedIds.has(obj.id));
  if (selectedObjects.length === 1) {
    const el = stage?.querySelector(`[data-object-id="${selectedObjects[0].id}"]`);
    showTextToolbar(selectedObjects[0], el);
  } else if (selectedObjects.length === 0) {
    hideTextToolbar();
  }
}

let draggedPageIndex = null;
let justDropped = false;

function reorderPages(fromIndex, targetIndex) {
  if (fromIndex === null || fromIndex === undefined || isNaN(fromIndex)) return;
  if (targetIndex === null || targetIndex === undefined || isNaN(targetIndex)) return;
  if (fromIndex === targetIndex) return;

  snapshot();
  const activePage = state.pages[state.currentPageIndex];
  const [movedPage] = state.pages.splice(fromIndex, 1);

  state.pages.splice(targetIndex, 0, movedPage);

  const newActiveIndex = state.pages.indexOf(activePage);
  if (newActiveIndex !== -1) {
    state.currentPageIndex = newActiveIndex;
  }
  state.selectedIds.clear();
  state.guides = [];
  hideTextToolbar();
  render();
}

function renderPages() {
  const list = $("#pageList");
  list.innerHTML = "";
  state.pages.forEach((page, index) => {
    const itemEl = document.createElement("div");
    itemEl.className = `page-item ${index === state.currentPageIndex ? "is-current" : ""} ${page.type === "cover" ? "cover" : ""} ${page.hidden ? "is-hidden" : ""}`;
    itemEl.setAttribute("role", "button");
    itemEl.setAttribute("tabindex", "0");
    itemEl.setAttribute("draggable", "true");
    itemEl.dataset.pageIndex = index;
    const hideIcon = page.hidden ? "🙈" : "👁";
    const hideTitle = page.hidden ? "페이지 숨김 해제" : "페이지 숨기기 (발표 시 건너뜀)";
    itemEl.innerHTML = `PAGE ${String(index + 1).padStart(2, "0")}<span class="page-hide-btn" title="${hideTitle}">${hideIcon}</span>${page.type === "content" ? '<span class="page-delete" title="페이지 삭제">×</span>' : ""}`;

    itemEl.addEventListener("click", (event) => {
      if (justDropped) {
        justDropped = false;
        return;
      }
      if (event.target.classList.contains("page-hide-btn")) {
        snapshot();
        page.hidden = !page.hidden;
        render();
      } else if (event.target.classList.contains("page-delete")) {
        snapshot();
        state.pages.splice(index, 1);
        state.currentPageIndex = Math.min(state.currentPageIndex, state.pages.length - 1);
        state.selectedIds.clear();
        state.guides = [];
        hideTextToolbar();
        render();
      } else {
        state.currentPageIndex = index;
        state.selectedIds.clear();
        state.guides = [];
        hideTextToolbar();
        render();
      }
    });

    itemEl.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        state.currentPageIndex = index;
        state.selectedIds.clear();
        state.guides = [];
        hideTextToolbar();
        render();
      }
    });

    // Mouse Pointer Drag Fallback (Direct DOM Dragging)
    itemEl.addEventListener("mousedown", (startEvent) => {
      if (startEvent.target.classList.contains("page-delete") || startEvent.target.classList.contains("page-hide-btn")) return;
      if (startEvent.button !== 0) return;

      const startX = startEvent.clientX;
      const startY = startEvent.clientY;
      let hasDragged = false;

      const onMouseMove = (moveEvent) => {
        const dx = Math.abs(moveEvent.clientX - startX);
        const dy = Math.abs(moveEvent.clientY - startY);

        if (!hasDragged && (dx > 4 || dy > 4)) {
          hasDragged = true;
          draggedPageIndex = index;
          itemEl.classList.add("is-dragging");
        }

        if (hasDragged) {
          const elemBelow = document.elementFromPoint(moveEvent.clientX, moveEvent.clientY);
          const targetItem = elemBelow?.closest(".page-item");

          list.querySelectorAll(".page-item").forEach((item) => {
            item.classList.remove("drag-over-before", "drag-over-after");
          });

          if (targetItem && targetItem !== itemEl) {
            const targetIdx = parseInt(targetItem.dataset.pageIndex, 10);
            if (!isNaN(targetIdx)) {
              if (index < targetIdx) {
                targetItem.classList.add("drag-over-after");
              } else {
                targetItem.classList.add("drag-over-before");
              }
            }
          }
        }
      };

      const onMouseUp = (upEvent) => {
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);

        if (hasDragged) {
          justDropped = true;
          itemEl.classList.remove("is-dragging");

          const elemBelow = document.elementFromPoint(upEvent.clientX, upEvent.clientY);
          const targetItem = elemBelow?.closest(".page-item");

          list.querySelectorAll(".page-item").forEach((item) => {
            item.classList.remove("drag-over-before", "drag-over-after", "is-dragging");
          });

          if (targetItem) {
            const targetIdx = parseInt(targetItem.dataset.pageIndex, 10);
            if (!isNaN(targetIdx) && targetIdx !== index) {
              reorderPages(index, targetIdx);
            }
          }

          setTimeout(() => {
            draggedPageIndex = null;
          }, 50);
        }
      };

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    });

    // Native HTML5 Drag & Drop handlers
    itemEl.addEventListener("dragstart", (event) => {
      if (event.target.classList.contains("page-delete") || event.target.classList.contains("page-hide-btn")) {
        event.preventDefault();
        return;
      }
      draggedPageIndex = index;
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", String(index));
      requestAnimationFrame(() => {
        itemEl.classList.add("is-dragging");
      });
    });

    itemEl.addEventListener("dragover", (event) => {
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";

      let fromIndex = draggedPageIndex;
      if (fromIndex === null || fromIndex === undefined) {
        const data = event.dataTransfer.getData("text/plain");
        fromIndex = data !== "" ? parseInt(data, 10) : null;
      }

      list.querySelectorAll(".page-item").forEach((item) => {
        item.classList.remove("drag-over-before", "drag-over-after");
      });

      if (fromIndex !== null && !isNaN(fromIndex) && fromIndex !== index) {
        if (fromIndex < index) {
          itemEl.classList.add("drag-over-after");
        } else {
          itemEl.classList.add("drag-over-before");
        }
      }
    });

    itemEl.addEventListener("dragenter", (event) => {
      event.preventDefault();
    });

    itemEl.addEventListener("dragleave", (event) => {
      if (event.relatedTarget && itemEl.contains(event.relatedTarget)) return;
      itemEl.classList.remove("drag-over-before", "drag-over-after");
    });

    itemEl.addEventListener("drop", (event) => {
      event.preventDefault();
      event.stopPropagation();
      justDropped = true;

      list.querySelectorAll(".page-item").forEach((item) => {
        item.classList.remove("drag-over-before", "drag-over-after", "is-dragging");
      });

      let fromIndex = draggedPageIndex;
      if (fromIndex === null || fromIndex === undefined) {
        const data = event.dataTransfer.getData("text/plain");
        fromIndex = data !== "" ? parseInt(data, 10) : null;
      }
      draggedPageIndex = null;

      reorderPages(fromIndex, index);
    });

    itemEl.addEventListener("dragend", () => {
      draggedPageIndex = null;
      list.querySelectorAll(".page-item").forEach((item) => {
        item.classList.remove("drag-over-before", "drag-over-after", "is-dragging");
      });
    });

    list.append(itemEl);
  });

  if (!list.dataset.hasDragListeners) {
    list.dataset.hasDragListeners = "true";

    list.addEventListener("dragover", (event) => {
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
    });

    list.addEventListener("drop", (event) => {
      if (event.target !== list) return;
      event.preventDefault();
      justDropped = true;

      list.querySelectorAll(".page-item").forEach((item) => {
        item.classList.remove("drag-over-before", "drag-over-after", "is-dragging");
      });

      let fromIndex = draggedPageIndex;
      if (fromIndex === null || fromIndex === undefined) {
        const data = event.dataTransfer.getData("text/plain");
        fromIndex = data !== "" ? parseInt(data, 10) : null;
      }
      draggedPageIndex = null;

      const buttons = Array.from(list.querySelectorAll(".page-item"));
      if (buttons.length === 0) return;

      let targetIndex = buttons.length - 1;
      for (let i = 0; i < buttons.length; i++) {
        const rect = buttons[i].getBoundingClientRect();
        const midX = rect.left + rect.width / 2;
        if (event.clientX < midX) {
          targetIndex = i;
          break;
        }
      }

      reorderPages(fromIndex, targetIndex);
    });
  }
}

function renderStage() {
  setupStageFileDrop();
  stage.innerHTML = "";
  const page = currentPage();
  if (page.type === "content" && !page.template) {
    stage.innerHTML = '<div class="empty-page"><strong>본문 템플릿을<br>선택하세요.</strong><p>왼쪽 패널에서 시작합니다.</p></div>';
    return;
  }

  renderAlignmentGuides();
  renderConnections(page);
  page.objects.forEach((object) => stage.append(createObjectElement(object)));
  renderFixedOverlayLayer();
  stage.classList.toggle("is-anim-mode", isAnimMode);
  const animBanner = $("#animModeBanner");
  if (animBanner) animBanner.hidden = !isAnimMode;
  if (document.fullscreenElement === stage) {
    updateFullscreenAnimState();
  }
  requestAnimationFrame(fitAllText);
}

let activeTimerInterval = null;

function formatTimeMMSS(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function getScaledTimerFontSize(fontScale, text = "") {
  const scale = typeof fontScale === "number" ? fontScale : 1.0;
  const isTimeUp = text === "Time's up!";
  const baseCqw = isTimeUp ? 10 : 18;
  const baseCqh = isTimeUp ? 28 : 50;

  if (scale === 1.0) {
    return `clamp(14px, min(${baseCqh}cqh, ${baseCqw}cqw), 180px)`;
  }
  return `calc(clamp(14px, min(${baseCqh}cqh, ${baseCqw}cqw), 180px) * ${scale.toFixed(2)})`;
}

function getLuminance(hex) {
  if (!hex || typeof hex !== "string") return 128;
  const h = hex.replace("#", "");
  let r = 0, g = 0, b = 0;
  if (h.length === 3) {
    r = parseInt(h[0] + h[0], 16);
    g = parseInt(h[1] + h[1], 16);
    b = parseInt(h[2] + h[2], 16);
  } else if (h.length === 6) {
    r = parseInt(h.substring(0, 2), 16);
    g = parseInt(h.substring(2, 4), 16);
    b = parseInt(h.substring(4, 6), 16);
  }
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function blendWithBlack(hex, blackRatio = 0.88) {
  const h = (hex || "#000000").replace("#", "");
  let r = 0, g = 0, b = 0;
  if (h.length === 3) {
    r = parseInt(h[0] + h[0], 16);
    g = parseInt(h[1] + h[1], 16);
    b = parseInt(h[2] + h[2], 16);
  } else if (h.length === 6) {
    r = parseInt(h.substring(0, 2), 16);
    g = parseInt(h.substring(2, 4), 16);
    b = parseInt(h.substring(4, 6), 16);
  }
  const colorRatio = 1 - blackRatio;
  const nr = Math.round(r * colorRatio);
  const ng = Math.round(g * colorRatio);
  const nb = Math.round(b * colorRatio);
  return `#${nr.toString(16).padStart(2, "0")}${ng.toString(16).padStart(2, "0")}${nb.toString(16).padStart(2, "0")}`;
}

function getThemeDefaultTimerColors() {
  return { bgColor: "#ffffff", textColor: "#000000" };
}

function createTimerElement(object) {
  const themeTimerDefaults = getThemeDefaultTimerColors();
  const effectiveBgColor = object.isCustomBgColor && object.bgColor ? object.bgColor : themeTimerDefaults.bgColor;
  const effectiveTextColor = object.isCustomTextColor && object.textColor ? object.textColor : themeTimerDefaults.textColor;

  const container = document.createElement("div");
  container.className = "timer-object-card";
  container.style.backgroundColor = effectiveBgColor;
  container.style.color = "#0f172a";

  const isLoop = (object.mode !== "stopwatch");
  const repeatCount = Math.max(1, Number(object.repeatCount) || 1);
  const currentRepeat = Math.max(1, Number(object.currentRepeat) || 1);

  // Top Header: Mode select, Repeat count input, Preset buttons
  const header = document.createElement("div");
  header.className = "timer-card-header";
  header.addEventListener("pointerdown", (e) => e.stopPropagation());

  const leftControls = document.createElement("div");
  leftControls.style.display = "flex";
  leftControls.style.alignItems = "center";
  leftControls.style.gap = "6px";

  const modeSelect = document.createElement("select");
  modeSelect.ariaLabel = "타이머 모드 선택";
  const optLoop = document.createElement("option");
  optLoop.value = "loop";
  optLoop.textContent = "⏱️ Loop 타이머";
  const optStopwatch = document.createElement("option");
  optStopwatch.value = "stopwatch";
  optStopwatch.textContent = "⏱️ 스탑워치";
  modeSelect.append(optLoop, optStopwatch);
  modeSelect.value = object.mode || "loop";

  modeSelect.addEventListener("change", (e) => {
    e.stopPropagation();
    snapshot();
    object.mode = e.target.value;
    object.isRunning = false;
    object.inRest = false;
    if (object.mode === "loop") {
      object.remainingSeconds = object.duration || 300;
      object.currentRepeat = 1;
    } else {
      object.elapsedSeconds = 0;
    }
    renderStage();
  });
  leftControls.append(modeSelect);

  const repeatWrap = document.createElement("label");
  repeatWrap.className = "timer-repeat-wrap";
  repeatWrap.style.fontSize = "11px";
  repeatWrap.style.fontWeight = "800";
  repeatWrap.style.display = isLoop ? "inline-flex" : "none";
  repeatWrap.style.alignItems = "center";
  repeatWrap.style.gap = "3px";
  repeatWrap.style.color = "#334155";
  repeatWrap.textContent = "반복: ";

  const repeatInput = document.createElement("input");
  repeatInput.type = "number";
  repeatInput.min = "1";
  repeatInput.max = "99";
  repeatInput.value = repeatCount;
  repeatInput.style.width = "36px";
  repeatInput.ariaLabel = "반복 횟수 입력";

  repeatInput.addEventListener("change", (e) => {
    e.stopPropagation();
    snapshot();
    const val = Math.max(1, Number(e.target.value) || 1);
    object.repeatCount = val;
    object.currentRepeat = 1;
    renderStage();
  });

  const repeatSuffix = document.createElement("span");
  repeatSuffix.textContent = `회 (${currentRepeat}/${repeatCount})`;
  repeatSuffix.className = "timer-repeat-badge";

  repeatWrap.append(repeatInput, repeatSuffix);
  leftControls.append(repeatWrap);

  const restWrap = document.createElement("label");
  restWrap.className = "timer-rest-wrap";
  restWrap.style.fontSize = "11px";
  restWrap.style.fontWeight = "800";
  restWrap.style.display = isLoop ? "inline-flex" : "none";
  restWrap.style.alignItems = "center";
  restWrap.style.gap = "3px";
  restWrap.style.color = "#334155";
  restWrap.textContent = "쉬는 시간: ";

  const restInput = document.createElement("input");
  restInput.type = "number";
  restInput.min = "0";
  restInput.max = "999";
  restInput.value = typeof object.restSeconds === "number" ? object.restSeconds : 1;
  restInput.style.width = "36px";
  restInput.ariaLabel = "쉬는 시간 입력 (초)";

  restInput.addEventListener("change", (e) => {
    e.stopPropagation();
    snapshot();
    const val = Math.max(0, Number(e.target.value) || 0);
    object.restSeconds = val;
    renderStage();
  });

  const restSuffix = document.createElement("span");
  restSuffix.textContent = "초";
  restWrap.append(restInput, restSuffix);

  leftControls.append(restWrap);
  header.append(leftControls);

  // Preset Buttons Bar
  const presetBar = document.createElement("div");
  presetBar.className = "timer-preset-bar";

  const presets = [
    { label: "1분", sec: 60 },
    { label: "3분", sec: 180 },
    { label: "5분", sec: 300 },
    { label: "10분", sec: 600 },
    { label: "15분", sec: 900 },
    { label: "20분", sec: 1200 },
    { label: "30분", sec: 1800 }
  ];

  presets.forEach((p) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "timer-card-preset-btn";
    btn.textContent = p.label;
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      snapshot();
      object.duration = p.sec;
      object.remainingSeconds = p.sec;
      object.currentRepeat = 1;
      object.inRest = false;
      object.isRunning = false;
      renderStage();
    });
    presetBar.append(btn);
  });
  header.append(presetBar);
  container.append(header);

  // Digital Clock Display (80% container height)
  const display = document.createElement("div");
  display.className = "timer-digital-display";
  display.style.color = effectiveTextColor;

  if (isLoop && (object.inRest || (object.remainingSeconds !== undefined && object.remainingSeconds <= 0))) {
    display.textContent = "Time's up!";
  } else {
    let displaySeconds = 0;
    if (isLoop) {
      displaySeconds = typeof object.remainingSeconds === "number" ? object.remainingSeconds : (object.duration || 300);
    } else {
      displaySeconds = typeof object.elapsedSeconds === "number" ? object.elapsedSeconds : 0;
    }
    display.textContent = formatTimeMMSS(displaySeconds);
  }

  const fontScale = typeof object.timerFontSizeScale === "number" ? object.timerFontSizeScale : 1.0;
  display.style.fontSize = getScaledTimerFontSize(fontScale, display.textContent);
  container.append(display);

  // Bottom Footer Controls
  const ctrls = document.createElement("div");
  ctrls.className = "timer-card-controls";
  ctrls.addEventListener("pointerdown", (e) => e.stopPropagation());

  const toggleBtn = document.createElement("button");
  toggleBtn.type = "button";
  toggleBtn.className = "timer-ctrl-btn timer-toggle-btn";
  toggleBtn.textContent = object.isRunning ? "⏸ 일시정지" : "▶ 시작";
  toggleBtn.style.background = object.isRunning ? "#ef4444" : "#22c55e";
  toggleBtn.style.color = "#ffffff";

  toggleBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleTimerRunning(object);
  });

  const resetBtn = document.createElement("button");
  resetBtn.type = "button";
  resetBtn.className = "timer-ctrl-btn timer-reset-btn";
  resetBtn.textContent = "🔄 리셋";
  resetBtn.style.background = "#f1f5f9";
  resetBtn.style.color = "#0f172a";
  resetBtn.style.border = "1px solid #cbd5e1";

  resetBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    resetTimerObject(object);
  });

  ctrls.append(toggleBtn, resetBtn);
  container.append(ctrls);

  if (object.isRunning) {
    ensureTimerTicker();
  }

  return container;
}

function ensureTimerTicker() {
  if (activeTimerInterval) return;
  activeTimerInterval = setInterval(() => {
    let stateChanged = false;
    state.pages.forEach((page) => {
      if (!page.objects) return;
      page.objects.forEach((obj) => {
        if (obj.type === "timer" && obj.isRunning) {
          stateChanged = true;
          if (obj.mode === "stopwatch") {
            obj.elapsedSeconds = (obj.elapsedSeconds || 0) + 1;
          } else {
            const restTime = typeof obj.restSeconds === "number" ? obj.restSeconds : 1;
            const repeatCount = Math.max(1, Number(obj.repeatCount) || 1);
            const currentRepeat = Math.max(1, Number(obj.currentRepeat) || 1);

            if (obj.inRest) {
              obj.restRemainingSeconds = (typeof obj.restRemainingSeconds === "number" ? obj.restRemainingSeconds : restTime) - 1;
              if (obj.restRemainingSeconds <= 0) {
                obj.inRest = false;
                if (currentRepeat < repeatCount) {
                  obj.currentRepeat = currentRepeat + 1;
                  obj.remainingSeconds = obj.duration || 300;
                } else {
                  obj.remainingSeconds = 0;
                  obj.isRunning = false;
                }
              }
            } else {
              if (typeof obj.remainingSeconds !== "number") obj.remainingSeconds = obj.duration || 300;
              obj.remainingSeconds -= 1;
              if (obj.remainingSeconds <= 0) {
                playTimerFinishBeep();
                if (restTime > 0) {
                  obj.inRest = true;
                  obj.restRemainingSeconds = restTime;
                  obj.remainingSeconds = 0;
                } else {
                  if (currentRepeat < repeatCount) {
                    obj.currentRepeat = currentRepeat + 1;
                    obj.remainingSeconds = obj.duration || 300;
                  } else {
                    obj.remainingSeconds = 0;
                    obj.isRunning = false;
                  }
                }
              }
            }
          }
        }
      });
    });

    if (stateChanged) {
      updateRunningTimerDisplays();
    }
  }, 1000);
}

function updateRunningTimerDisplays() {
  const themeTimerDefaults = getThemeDefaultTimerColors();
  state.pages.forEach((page) => {
    if (!page.objects) return;
    page.objects.forEach((obj) => {
      if (obj.type === "timer") {
        const elements = document.querySelectorAll(`[data-object-id="${obj.id}"]`);
        elements.forEach((el) => {
          const displayEl = el.querySelector(".timer-digital-display");
          const toggleBtn = el.querySelector(".timer-toggle-btn");
          const repeatBadge = el.querySelector(".timer-repeat-badge");

          const isLoop = (obj.mode !== "stopwatch");
          const effectiveBgColor = obj.isCustomBgColor && obj.bgColor ? obj.bgColor : themeTimerDefaults.bgColor;
          const effectiveTextColor = obj.isCustomTextColor && obj.textColor ? obj.textColor : themeTimerDefaults.textColor;

          el.style.backgroundColor = effectiveBgColor;

          if (displayEl) {
            if (isLoop && (obj.inRest || (obj.remainingSeconds !== undefined && obj.remainingSeconds <= 0))) {
              displayEl.textContent = "Time's up!";
            } else {
              const displaySecs = isLoop ? (obj.remainingSeconds ?? obj.duration ?? 300) : (obj.elapsedSeconds ?? 0);
              displayEl.textContent = formatTimeMMSS(displaySecs);
            }

            displayEl.style.color = effectiveTextColor;

            const fontScale = typeof obj.timerFontSizeScale === "number" ? obj.timerFontSizeScale : 1.0;
            displayEl.style.fontSize = getScaledTimerFontSize(fontScale, displayEl.textContent);
          }

          if (toggleBtn) {
            toggleBtn.textContent = obj.isRunning ? "⏸ 일시정지" : "▶ 시작";
            toggleBtn.style.background = obj.isRunning ? "#ef4444" : "#22c55e";
          }
          if (repeatBadge) {
            repeatBadge.textContent = `회 (${obj.currentRepeat || 1}/${obj.repeatCount || 1})`;
          }
        });
      }
    });
  });
}

function toggleTimerRunning(object) {
  object.isRunning = !object.isRunning;
  if (object.isRunning) {
    if (object.mode !== "stopwatch" && (object.remainingSeconds === undefined || (object.remainingSeconds <= 0 && !object.inRest))) {
      object.remainingSeconds = object.duration || 300;
      object.currentRepeat = 1;
      object.inRest = false;
    }
    ensureTimerTicker();
  }
  updateRunningTimerDisplays();
}

function resetTimerObject(object) {
  object.isRunning = false;
  object.inRest = false;
  object.restRemainingSeconds = 0;
  object.remainingSeconds = object.duration || 300;
  object.elapsedSeconds = 0;
  object.currentRepeat = 1;
  updateRunningTimerDisplays();
}

function playTimerFinishBeep() {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.6);
  } catch (e) {}
}

function addTimerObject() {
  const page = currentPage();
  if (page.type !== "content" && page.type !== "cover") return;
  snapshot();

  const newTimer = {
    id: createId("timer"),
    type: "timer",
    mode: "loop",
    duration: 300,
    repeatCount: 1,
    currentRepeat: 1,
    restSeconds: 1,
    inRest: false,
    restRemainingSeconds: 0,
    remainingSeconds: 300,
    elapsedSeconds: 0,
    isRunning: false,
    x: 35,
    y: 35,
    w: 30,
    h: 22,
    borderColor: "#3b82f6",
    borderWidth: 2
  };
  page.objects.push(newTimer);
  state.selectedIds.clear();
  state.selectedIds.add(newTimer.id);
  render();
}

function openImagePickerForObject(targetObject) {
  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = "image/*";
  fileInput.addEventListener("change", (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      snapshot();
      targetObject.src = String(reader.result);
      targetObject.name = file.name;
      applyAspectRatioToImageObject(targetObject, targetObject.src, () => {
        render();
      });
    });
    reader.readAsDataURL(file);
  });
  fileInput.click();
}

function setupStageFileDrop() {
  const stageEl = $("#presentationStage");
  if (!stageEl || stageEl.dataset.hasFileDrop) return;
  stageEl.dataset.hasFileDrop = "true";

  stageEl.addEventListener("dragover", (event) => {
    if (event.dataTransfer?.types && Array.from(event.dataTransfer.types).includes("Files")) {
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
      stageEl.classList.add("stage-drag-over");
    }
  });

  stageEl.addEventListener("dragleave", (event) => {
    if (event.relatedTarget && stageEl.contains(event.relatedTarget)) return;
    stageEl.classList.remove("stage-drag-over");
  });

  stageEl.addEventListener("drop", (event) => {
    const files = Array.from(event.dataTransfer?.files || []).filter((f) => f.type.startsWith("image/"));
    if (!files.length) {
      stageEl.classList.remove("stage-drag-over");
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    stageEl.classList.remove("stage-drag-over");

    const targetPage = currentPage();
    if (targetPage.type !== "content") return;

    const targetObjEl = event.target.closest("[data-object-id]");
    const targetObj = targetObjEl ? targetPage.objects.find((o) => o.id === targetObjEl.dataset.objectId) : null;

    if (targetObj && targetObj.type === "image") {
      const reader = new FileReader();
      reader.addEventListener("load", () => {
        snapshot();
        targetObj.src = String(reader.result);
        targetObj.name = files[0].name;
        applyAspectRatioToImageObject(targetObj, targetObj.src, () => {
          render();
        });
      });
      reader.readAsDataURL(files[0]);
    } else if (targetObj && targetObj.type !== "table" && targetObj.type !== "chart") {
      const reader = new FileReader();
      reader.addEventListener("load", () => {
        snapshot();
        targetObj.imageSrc = String(reader.result);
        render();
      });
      reader.readAsDataURL(files[0]);
    } else {
      snapshot();
      let completed = 0;
      files.forEach((file, index) => {
        const reader = new FileReader();
        reader.addEventListener("load", () => {
          const placement = getNewImagePlacement(targetPage, index);
          const newObj = {
            id: createId("image"),
            type: "image",
            role: "image",
            src: String(reader.result),
            name: file.name,
            ...placement
          };
          targetPage.objects.push(newObj);
          applyAspectRatioToImageObject(newObj, newObj.src, () => {
            completed += 1;
            if (completed === files.length) {
              render();
            }
          });
        });
        reader.readAsDataURL(file);
      });
    }
  });
}

function renderAlignmentGuides() {
  state.guides.forEach((guide) => {
    const element = document.createElement("div");
    element.className = `alignment-guide ${guide.axis === "x" ? "vertical" : "horizontal"}`;
    if (guide.axis === "x") element.style.left = `${guide.position}%`;
    else element.style.top = `${guide.position}%`;
    stage.append(element);
  });
}

function createObjectElement(object) {
  const element = document.createElement("div");
  element.className = `canvas-object ${getObjectClass(object)} ${state.selectedIds.has(object.id) ? "is-selected" : ""}`;
  element.dataset.objectId = object.id;
  applyObjectBox(element, object);

  if (object.shapeType || object.role === "shape-box") {
    const shapeType = object.shapeType || "rectangle";
    const shapeSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    shapeSvg.setAttribute("viewBox", "0 0 100 100");
    shapeSvg.setAttribute("preserveAspectRatio", "none");
    shapeSvg.classList.add("shape-vector-svg");

    const color = object.bgColor || (shapeType === "circle" ? "#ef4444" : shapeType === "triangle" ? "#10b981" : shapeType === "star" ? "#f59e0b" : "#2563eb");
    let strokeColor = object.borderColor || "#0f172a";
    let strokeWidth = (object.borderWidth !== undefined && object.borderWidth !== null) ? Number(object.borderWidth) : 2;

    if (strokeWidth === 0 || object.borderStyle === "none") {
      strokeColor = "none";
      strokeWidth = 0;
    }

    const dashMap = { dashed: "8 4", dotted: "3 3" };
    const strokeDash = object.borderStyle && dashMap[object.borderStyle] ? `stroke-dasharray="${dashMap[object.borderStyle]}"` : "";

    if (shapeType === "circle") {
      shapeSvg.innerHTML = `<circle cx="50" cy="50" r="46" fill="${color}" stroke="${strokeColor}" stroke-width="${strokeWidth}" ${strokeDash}/>`;
    } else if (shapeType === "triangle") {
      shapeSvg.innerHTML = `<polygon points="50,4 96,96 4,96" fill="${color}" stroke="${strokeColor}" stroke-width="${strokeWidth}" stroke-linejoin="round" ${strokeDash}/>`;
    } else if (shapeType === "star") {
      shapeSvg.innerHTML = `<polygon points="50,4 63,35 96,35 70,56 80,94 50,71 20,94 30,56 4,35 37,35" fill="${color}" stroke="${strokeColor}" stroke-width="${strokeWidth}" stroke-linejoin="round" ${strokeDash}/>`;
    } else {
      shapeSvg.innerHTML = `<rect x="3" y="3" width="94" height="94" rx="8" fill="${color}" stroke="${strokeColor}" stroke-width="${strokeWidth}" ${strokeDash}/>`;
    }
    element.append(shapeSvg);
  }

  if (typeof object.animOrder === "number" && object.animOrder > 0) {
    const badge = document.createElement("span");
    badge.className = "anim-badge";
    badge.textContent = `A${object.animOrder}`;
    element.append(badge);
  }

  if (object.type === "image") {
    const image = new Image();
    image.className = "object-image";
    image.src = object.src;
    image.alt = object.name || "첨부 이미지";
    element.append(image);

    applyImageObjectStyle(image, object, element);

    element.addEventListener("dblclick", (event) => {
      event.preventDefault();
      event.stopPropagation();
      openImagePickerForObject(object);
    });
  } else if (object.type === "table") {
    element.append(createTableElement(object));
  } else if (object.type === "chart") {
    element.append(createChartElement(object));
  } else if (object.type === "timer") {
    element.append(createTimerElement(object));
    element.addEventListener("dblclick", (event) => {
      event.preventDefault();
      event.stopPropagation();
      showTextToolbar(object, element);
    });
  } else if (object.type === "scale") {
    const track = document.createElement("span");
    track.className = "scale-track-core";
    element.append(track);
  } else {
    if (object.imageSrc) {
      const imgBox = document.createElement("div");
      imgBox.className = "card-image-box";
      const img = new Image();
      img.className = "card-embedded-image";
      img.src = object.imageSrc;
      imgBox.append(img);
      element.append(imgBox);
      element.classList.add("has-embedded-image");
    }

    const text = document.createElement("div");
    text.className = `canvas-text ${object.role}`;
    if (STRUCTURED_LAYOUT_ROLES.has(object.role)) {
      const [value, heading, ...description] = object.text.split("\n");
      text.dataset.fitText = object.text;
      if (value !== undefined && value !== "") {
        const valueElement = document.createElement("strong");
        valueElement.className = "structured-card-value";
        valueElement.textContent = value;
        text.append(valueElement);
      }
      if (heading && heading.trim()) {
        const headingElement = document.createElement("span");
        headingElement.className = "structured-card-heading";
        headingElement.textContent = heading;
        text.append(headingElement);
      }
      const descText = description.join("\n").trim();
      if (descText) {
        const descriptionElement = document.createElement("span");
        descriptionElement.className = "structured-card-description";
        descriptionElement.textContent = descText;
        text.append(descriptionElement);
      }
    } else if (["timeline-node", "side-accent-card"].includes(object.role)) {
      const [title, ...description] = object.text.split("\n");
      text.dataset.fitText = object.text;
      if (title !== undefined && title !== "") {
        const titleElement = document.createElement("strong");
        titleElement.className = object.role === "timeline-node" ? "timeline-title" : "side-accent-title";
        titleElement.textContent = title;
        text.append(titleElement);
      }
      const descText = description.join("\n").trim();
      if (descText) {
        const descriptionElement = document.createElement("span");
        descriptionElement.className = object.role === "timeline-node" ? "timeline-description" : "side-accent-description";
        descriptionElement.textContent = descText;
        text.append(descriptionElement);
      }
    } else {
      text.textContent = object.text;
    }
    applyTextObjectStyle(text, object, element);
    element.append(text);
    element.addEventListener("dblclick", (event) => beginTextEdit(event, object, element, text));
  }

  const handle = document.createElement("span");
  handle.className = "resize-handle";
  handle.addEventListener("pointerdown", (event) => beginResize(event, object));
  element.append(handle);
  element.addEventListener("pointerdown", (event) => {
    if (isAnimMode) {
      event.preventDefault();
      event.stopPropagation();
      handleAnimModeClick(event, object);
      return;
    }
    beginDrag(event, object);
  });
  return element;
}

function getTextAlign(object) {
  if (object.textAlign) return object.textAlign;
  if (object.role === "bullet-item") return "left";
  return "center";
}

function applyTextObjectStyle(text, object, wrapper) {
  const align = getTextAlign(object);
  const flexAlign = { left: "flex-start", center: "center", right: "flex-end" }[align] || "center";

  text.style.setProperty("text-align", align, "important");

  if (["bullet-item", "cover-item"].includes(object.role)) {
    text.style.setProperty("align-items", flexAlign, "important");
    text.style.setProperty("justify-content", "flex-start", "important");
  } else {
    text.style.setProperty("display", "flex", "important");
    text.style.setProperty("align-items", "center", "important");
    text.style.setProperty("justify-content", flexAlign, "important");
  }

  text.querySelectorAll("strong, span, p, h1, h2, h3, div").forEach((child) => {
    child.style.setProperty("text-align", align, "important");
  });
  if (object.textColor) {
    text.style.setProperty("color", object.textColor, "important");
    text.querySelectorAll("strong, span, p, h1, h2, h3, div").forEach((child) => {
      child.style.setProperty("color", object.textColor, "important");
    });
  } else {
    text.style.removeProperty("color");
    text.querySelectorAll("strong, span, p, h1, h2, h3, div").forEach((child) => {
      child.style.removeProperty("color");
    });
  }

  if (["bullet-item", "cover-item"].includes(object.role)) {
    const level = clamp(1, Number(object.bulletLevel) || 1, 4);
    text.style.setProperty("--hierarchy-scale", [1, .88, .76, .66][level - 1]);
  } else {
    text.style.removeProperty("--hierarchy-scale");
  }
  if (object.fontSize) {
    text.style.setProperty("--object-font-size", `${object.fontSize}px`);
    wrapper.dataset.manualFontSize = "true";
  } else {
    delete wrapper.dataset.manualFontSize;
  }

  if (object.shapeType || object.role === "shape-box") {
    wrapper.style.border = "none";
    wrapper.style.removeProperty("background");
    wrapper.style.removeProperty("background-color");
    wrapper.style.background = "transparent";
    wrapper.style.backgroundColor = "transparent";
    text.style.background = "transparent";
    text.style.backgroundColor = "transparent";
    return;
  }

  if (Number(object.borderWidth) === 0 || object.borderStyle === "none" || object.borderWidth === undefined || object.borderWidth === null) {
    wrapper.style.border = "none";
  } else if (Number(object.borderWidth) > 0 && object.borderStyle && object.borderStyle !== "none") {
    const width = Number(object.borderWidth);
    const style = object.borderStyle;
    const color = object.borderColor || "#0f172a";
    wrapper.style.border = `${width}px ${style} ${color}`;
    wrapper.style.boxSizing = "border-box";
  } else {
    wrapper.style.border = "";
  }

  if (object.bgColor) {
    wrapper.style.setProperty("background", object.bgColor, "important");
    wrapper.style.setProperty("background-color", object.bgColor, "important");
    text.style.background = "transparent";
    text.style.backgroundColor = "transparent";
  } else {
    wrapper.style.removeProperty("background");
    wrapper.style.removeProperty("background-color");
    wrapper.style.background = "";
    wrapper.style.backgroundColor = "";
    text.style.background = "";
    text.style.backgroundColor = "";
  }
}

function applyImageObjectStyle(image, object, wrapper) {
  const width = (object.borderWidth !== undefined && object.borderWidth !== null) ? Number(object.borderWidth) : 0;
  const style = object.borderStyle || (width > 0 ? "solid" : "none");
  const color = object.borderColor || "#0f172a";

  if (width === 0 || style === "none") {
    wrapper.style.setProperty("border", "none", "important");
    wrapper.style.setProperty("box-shadow", "none", "important");
    image.style.setProperty("border", "none", "important");
    image.style.setProperty("outline", "none", "important");
    image.style.setProperty("box-shadow", "none", "important");
  } else if (width > 0 && style && style !== "none") {
    wrapper.style.setProperty("border", "none", "important");
    wrapper.style.setProperty("box-shadow", "none", "important");
    image.style.setProperty("border", `${width}px ${style} ${color}`, "important");
    image.style.setProperty("box-sizing", "border-box", "important");
  } else {
    wrapper.style.setProperty("border", "none", "important");
    image.style.setProperty("border", "none", "important");
  }
}

function getObjectClass(object) {
  const classes = [object.role || ""];
  if (STRUCTURED_LAYOUT_ROLES.has(object.role)) classes.push("structured-layout-card");
  if (object.node) classes.push("node");
  if (object.color) classes.push(object.color);
  if (object.mindLevel) classes.push(`mind-level-${object.mindLevel}`);
  if (object.pyramidApex) classes.push("pyramid-apex");
  if (object.rootNode) classes.push("root-node");
  return classes.join(" ");
}

function applyObjectBox(element, object) {
  element.style.left = `${object.x}%`;
  element.style.top = `${object.y}%`;
  element.style.width = `${object.w}%`;
  element.style.height = `${object.h}%`;
}

function createTableElement(object) {
  const table = document.createElement("table");
  table.className = "table-object";
  object.cells.forEach((row, rowIndex) => {
    const tr = document.createElement("tr");
    row.forEach((value, columnIndex) => {
      const cell = document.createElement(rowIndex === 0 ? "th" : "td");
      cell.textContent = value;
      cell.addEventListener("click", () => {
        state.selectedIds = new Set([object.id]);
        renderControls();
      });
      cell.addEventListener("dblclick", (event) => beginCellEdit(event, object, rowIndex, columnIndex, cell));
      tr.append(cell);
    });
    table.append(tr);
  });
  return table;
}

function createChartElement(object) {
  object.data = getChartData(object);
  const chart = document.createElement("div");
  chart.className = `chart-object chart-object-${object.chartType}`;
  const graphic = document.createElement("div");
  graphic.className = "chart-graphic";
  renderChartGraphic(graphic, object);

  const editor = document.createElement("div");
  editor.className = "chart-data-editor";
  object.data.forEach((item, index) => {
    const label = document.createElement("label");
    label.className = "chart-data-field";
    const name = document.createElement("span");
    name.textContent = item.label;
    const input = document.createElement("input");
    input.type = "number";
    input.min = "0";
    input.max = "1000000";
    input.step = "1";
    input.value = String(item.value);
    input.setAttribute("aria-label", `${item.label} 값`);
    let snapshotted = false;
    input.addEventListener("pointerdown", (event) => event.stopPropagation());
    input.addEventListener("click", (event) => event.stopPropagation());
    input.addEventListener("input", () => {
      if (!snapshotted) {
        snapshot();
        snapshotted = true;
      }
      object.data[index].value = Math.max(0, Math.min(1000000, Number(input.value) || 0));
      renderChartGraphic(graphic, object);
    });
    input.addEventListener("blur", () => {
      input.value = String(object.data[index].value);
      snapshotted = false;
    });
    label.append(name, input);
    editor.append(label);
  });
  chart.append(graphic, editor);
  return chart;
}

function renderChartGraphic(container, object) {
  container.innerHTML = "";
  const data = getChartData(object);
  if (["line", "area"].includes(object.chartType)) renderLineChart(container, data, object.chartType === "area");
  else if (object.chartType === "pie") renderPieChart(container, data);
  else if (object.chartType === "bar") renderHorizontalBarChart(container, data);
  else renderColumnChart(container, data);
}

function renderColumnChart(container, data) {
  const max = Math.max(...data.map((item) => item.value), 1);
  const plot = document.createElement("div");
  plot.className = "column-chart-plot";
  data.forEach((item) => {
    const column = document.createElement("div");
    column.className = "column-chart-item";
    const value = document.createElement("strong");
    value.textContent = item.value.toLocaleString();
    const track = document.createElement("div");
    track.className = "column-chart-track";
    const bar = document.createElement("span");
    bar.style.height = `${item.value / max * 100}%`;
    track.append(bar);
    const label = document.createElement("small");
    label.textContent = item.label;
    column.append(value, track, label);
    plot.append(column);
  });
  container.append(plot);
}

function renderHorizontalBarChart(container, data) {
  const max = Math.max(...data.map((item) => item.value), 1);
  const plot = document.createElement("div");
  plot.className = "bar-chart-plot";
  data.forEach((item) => {
    const row = document.createElement("div");
    row.className = "bar-chart-row";
    const label = document.createElement("span");
    label.textContent = item.label;
    const track = document.createElement("div");
    track.className = "bar-chart-track";
    const bar = document.createElement("i");
    bar.style.width = `${item.value / max * 100}%`;
    const value = document.createElement("strong");
    value.textContent = item.value.toLocaleString();
    track.append(bar, value);
    row.append(label, track);
    plot.append(row);
  });
  container.append(plot);
}

function createSvgElement(name, attributes = {}) {
  const element = document.createElementNS("http://www.w3.org/2000/svg", name);
  Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, String(value)));
  return element;
}

function renderLineChart(container, data, filled) {
  const svg = createSvgElement("svg", { viewBox: "0 0 100 64", preserveAspectRatio: "none", "aria-hidden": "true" });
  svg.classList.add("line-chart-svg");
  const max = Math.max(...data.map((item) => item.value), 1);
  [12, 25, 38, 51].forEach((y) => svg.append(createSvgElement("line", { x1: 7, y1: y, x2: 95, y2: y, class: "chart-grid-line" })));
  const points = data.map((item, index) => ({
    x: data.length === 1 ? 50 : 8 + index * 86 / (data.length - 1),
    y: 51 - item.value / max * 39,
    item
  }));
  if (filled) {
    const polygon = createSvgElement("polygon", { points: `8,51 ${points.map((point) => `${point.x},${point.y}`).join(" ")} 94,51`, class: "chart-area-fill" });
    svg.append(polygon);
  }
  svg.append(createSvgElement("polyline", { points: points.map((point) => `${point.x},${point.y}`).join(" "), class: "chart-series-line" }));
  points.forEach((point) => {
    svg.append(createSvgElement("circle", { cx: point.x, cy: point.y, r: 1.8, class: "chart-point" }));
    const value = createSvgElement("text", { x: point.x, y: Math.max(7, point.y - 3), class: "chart-svg-value", "text-anchor": "middle" });
    value.textContent = point.item.value.toLocaleString();
    const label = createSvgElement("text", { x: point.x, y: 60, class: "chart-svg-label", "text-anchor": "middle" });
    label.textContent = point.item.label;
    svg.append(value, label);
  });
  container.append(svg);
}

function renderPieChart(container, data) {
  const colors = ["#2b74ff", "#ef7f7a", "#f0c843", "#6f9f7b", "#8d72c7", "#56a9a6"];
  const total = Math.max(data.reduce((sum, item) => sum + item.value, 0), 1);
  let cursor = 0;
  const slices = data.map((item, index) => {
    const start = cursor;
    cursor += item.value / total * 360;
    return `${colors[index % colors.length]} ${start}deg ${cursor}deg`;
  });
  const layout = document.createElement("div");
  layout.className = "pie-chart-layout";
  const pie = document.createElement("div");
  pie.className = "pie-chart-disc";
  pie.style.background = `conic-gradient(${slices.join(",")})`;
  const center = document.createElement("strong");
  center.textContent = total.toLocaleString();
  pie.append(center);
  const legend = document.createElement("div");
  legend.className = "pie-chart-legend";
  data.forEach((item, index) => {
    const row = document.createElement("div");
    const swatch = document.createElement("i");
    swatch.style.background = colors[index % colors.length];
    const label = document.createElement("span");
    label.textContent = item.label;
    const value = document.createElement("strong");
    value.textContent = `${Math.round(item.value / total * 100)}%`;
    row.append(swatch, label, value);
    legend.append(row);
  });
  layout.append(pie, legend);
  container.append(layout);
}

function beginTextEdit(event, object, wrapper, text) {
  if (document.fullscreenElement) return;
  event.preventDefault();
  event.stopPropagation();
  snapshot();
  state.activeTextObjectId = object.id;
  state.selectedIds.clear();
  state.selectedIds.add(object.id);
  renderControls();
  showTextToolbar(object, text);
  wrapper.classList.add("is-editing");
  if (["timeline-node", "side-accent-card"].includes(object.role) || STRUCTURED_LAYOUT_ROLES.has(object.role)) text.textContent = object.text;
  text.contentEditable = "true";
  text.focus();
  const range = document.createRange();
  range.selectNodeContents(text);
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);

  const finish = () => {
    object.text = text.innerText.trim() || (object.role === "shape-box" ? "" : "텍스트");
    text.contentEditable = "false";
    wrapper.classList.remove("is-editing");
    renderStage();
  };
  text.addEventListener("blur", finish, { once: true });
  text.addEventListener("keydown", (keyEvent) => {
    if (keyEvent.key === "Escape") text.blur();
    if (keyEvent.key === "Enter" && keyEvent.altKey) {
      keyEvent.preventDefault();
      keyEvent.stopPropagation();
      insertEditableLineBreak(text);
      return;
    }
    if (keyEvent.key === "Enter" && !keyEvent.shiftKey) {
      keyEvent.preventDefault();
      text.blur();
    }
  });
}

function insertEditableLineBreak(editable) {
  if (document.execCommand?.("insertLineBreak", false)) return;
  const selection = window.getSelection();
  if (!selection?.rangeCount) return;
  const range = selection.getRangeAt(0);
  if (!editable.contains(range.commonAncestorContainer)) return;
  range.deleteContents();
  const lineBreak = document.createElement("br");
  range.insertNode(lineBreak);
  range.setStartAfter(lineBreak);
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
}

function showTextToolbar(object, textElement) {
  if (!object) return;
  const toolbar = $("#textToolbar");
  if (!toolbar) return;
  toolbar.hidden = false;
  state.activeTextObjectId = object.id;

  const isTimer = object.type === "timer";
  if ($("#borderToolbarGroup")) $("#borderToolbarGroup").hidden = isTimer;
  if ($("#alignToolbarGroup")) $("#alignToolbarGroup").hidden = isTimer;
  if ($("#textSizeGroup")) $("#textSizeGroup").hidden = isTimer;

  try {
    const themeDefaults = getThemeDefaultTimerColors();
    if ($("#textColorInput")) {
      const textColor = object.type === "timer" && (!object.isCustomTextColor || !object.textColor)
        ? themeDefaults.textColor
        : (object.textColor || (textElement ? getComputedStyle(textElement).color : "#ffffff") || "#ffffff");
      $("#textColorInput").value = normalizeColor(textColor);
    }
    if ($("#bgColorInput")) {
      const bgColor = object.type === "timer" && (!object.isCustomBgColor || !object.bgColor)
        ? themeDefaults.bgColor
        : (object.bgColor || (textElement ? getComputedStyle(textElement.parentElement || textElement).backgroundColor : "#ffffff") || "#ffffff");
      $("#bgColorInput").value = normalizeColor(bgColor);
    }
    if ($("#borderColorInput")) {
      $("#borderColorInput").value = normalizeColor(object.borderColor || "#0f172a");
    }
    if ($("#borderWidthInput")) {
      $("#borderWidthInput").value = object.borderWidth !== undefined ? object.borderWidth : 0;
    }
    if ($("#borderStyleSelect")) {
      $("#borderStyleSelect").value = object.borderStyle || (object.borderWidth ? "solid" : "none");
    }
    if ($("#textSizeInput")) {
      $("#textSizeInput").value = Math.round(object.fontSize || (textElement ? Number.parseFloat(getComputedStyle(textElement).fontSize) : 28) || 28);
    }
    toolbar.querySelectorAll("[data-text-align]").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.textAlign === getTextAlign(object));
    });

    const palette = getCurrentPalette();
    toolbar.querySelectorAll(".theme-color-btn").forEach((btn) => {
      const idx = Number(btn.dataset.colorIndex) || 0;
      const color = palette[idx] || "#2563eb";
      btn.style.backgroundColor = color;
      btn.dataset.colorHex = color;
      const targetName = { text: "글자색", bg: "배경색", border: "테두리색" }[btn.dataset.target] || "색상";
      btn.title = `${targetName} 테마 ${idx + 1}순위 색상 (${color}) 적용`;
    });
  } catch (e) {}
}

function hideTextToolbar() {
  state.activeTextObjectId = null;
  const toolbar = $("#textToolbar");
  if (toolbar) toolbar.hidden = true;
}

function normalizeColor(value) {
  if (!value) return "#ffffff";
  if (value.startsWith("#")) return value;
  const channels = value.match(/\d+/g)?.slice(0, 3).map(Number);
  if (!channels || channels.length < 3) return "#151515";
  return `#${channels.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}

function updateActiveTextStyle(property, value) {
  const page = currentPage();
  const selectedObjects = page.objects.filter((item) => state.selectedIds.has(item.id));
  if (!selectedObjects.length) return;
  snapshot();
  selectedObjects.forEach((target) => {
    target[property] = value;
    if (property === "textColor") target.isCustomTextColor = true;
    if (property === "bgColor") target.isCustomBgColor = true;
  });
  renderStage();
  if (selectedObjects.length === 1 && selectedObjects[0].type !== "timer") {
    const el = stage.querySelector(`[data-object-id="${selectedObjects[0].id}"]`);
    showTextToolbar(selectedObjects[0], el);
  }
}

function beginCellEdit(event, object, rowIndex, columnIndex, cell) {
  if (document.fullscreenElement) return;
  event.preventDefault();
  event.stopPropagation();
  snapshot();
  cell.contentEditable = "true";
  cell.focus();
  const finish = () => {
    object.cells[rowIndex][columnIndex] = cell.innerText.trim() || "내용";
    cell.contentEditable = "false";
  };
  cell.addEventListener("blur", finish, { once: true });
  cell.addEventListener("keydown", (keyEvent) => {
    if (keyEvent.key === "Enter" && keyEvent.altKey) {
      keyEvent.preventDefault();
      keyEvent.stopPropagation();
      insertEditableLineBreak(cell);
      return;
    }
    if (keyEvent.key === "Enter") {
      keyEvent.preventDefault();
      cell.blur();
    }
  });
}

function beginDrag(event, object) {
  if (event.button !== 0 || event.target.classList.contains("resize-handle") || isTextInputTarget(event.target) || document.fullscreenElement) return;
  event.preventDefault();
  stage.focus({ preventScroll: true });
  hideTextToolbar();

  if (event.ctrlKey || event.metaKey) {
    if (state.selectedIds.has(object.id)) state.selectedIds.delete(object.id);
    else state.selectedIds.add(object.id);
    updateSelectionClasses();
    renderControls();
    return;
  }

  if (!state.selectedIds.has(object.id)) {
    state.selectedIds.clear();
    state.selectedIds.add(object.id);
  }
  updateSelectionClasses();
  renderControls();
  const start = getStagePoint(event);
  const selected = currentPage().objects.filter((item) => state.selectedIds.has(item.id));
  const origins = selected.map((item) => ({ item, x: item.x, y: item.y }));
  const bounds = getObjectBounds(selected);
  const targets = getSnapTargets(state.selectedIds);
  const thresholdX = SNAP_DISTANCE_PX / stage.clientWidth * 100;
  const thresholdY = SNAP_DISTANCE_PX / stage.clientHeight * 100;
  let dragStarted = false;

  const move = (moveEvent) => {
    const point = getStagePoint(moveEvent);
    const distanceX = (point.x - start.x) / 100 * stage.clientWidth;
    const distanceY = (point.y - start.y) / 100 * stage.clientHeight;
    if (!dragStarted) {
      if (Math.hypot(distanceX, distanceY) < 3) return;
      snapshot();
      dragStarted = true;
    }
    const rawDx = clamp(-bounds.left, point.x - start.x, 100 - bounds.right);
    const rawDy = clamp(-bounds.top, point.y - start.y, 100 - bounds.bottom);
    const horizontalSnap = findSnap(
      [bounds.left + rawDx, bounds.centerX + rawDx, bounds.right + rawDx], targets.x, thresholdX
    );
    const verticalSnap = findSnap(
      [bounds.top + rawDy, bounds.centerY + rawDy, bounds.bottom + rawDy], targets.y, thresholdY
    );
    const dx = clamp(-bounds.left, rawDx + (horizontalSnap?.correction || 0), 100 - bounds.right);
    const dy = clamp(-bounds.top, rawDy + (verticalSnap?.correction || 0), 100 - bounds.bottom);
    state.guides = [
      ...(horizontalSnap ? [{ axis: "x", position: horizontalSnap.target }] : []),
      ...(verticalSnap ? [{ axis: "y", position: verticalSnap.target }] : [])
    ];
    origins.forEach(({ item, x, y }) => {
      item.x = x + dx;
      item.y = y + dy;
    });
    renderStage();
  };
  const end = () => {
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", end);
    if (dragStarted) {
      state.guides = [];
      renderStage();
    }
  };
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", end);
}

function updateSelectionClasses() {
  stage.querySelectorAll(".canvas-object").forEach((element) => {
    element.classList.toggle("is-selected", state.selectedIds.has(element.dataset.objectId));
  });
}

function beginResize(event, object) {
  if (document.fullscreenElement) return;
  event.preventDefault();
  event.stopPropagation();
  stage.focus({ preventScroll: true });
  hideTextToolbar();
  snapshot();
  const start = getStagePoint(event);
  const startWidth = object.w;
  const startHeight = object.h;
  const targets = getSnapTargets(new Set([object.id]));
  const thresholdX = SNAP_DISTANCE_PX / stage.clientWidth * 100;
  const thresholdY = SNAP_DISTANCE_PX / stage.clientHeight * 100;

  const move = (moveEvent) => {
    const point = getStagePoint(moveEvent);
    const rawRight = object.x + clamp(5, startWidth + point.x - start.x, 100 - object.x);
    const rawBottom = object.y + clamp(4, startHeight + point.y - start.y, 100 - object.y);
    const horizontalSnap = findSnap([rawRight], targets.x, thresholdX);
    const verticalSnap = findSnap([rawBottom], targets.y, thresholdY);
    const right = clamp(object.x + 5, rawRight + (horizontalSnap?.correction || 0), 100);
    const bottom = clamp(object.y + 4, rawBottom + (verticalSnap?.correction || 0), 100);
    object.w = right - object.x;
    object.h = bottom - object.y;
    state.guides = [
      ...(horizontalSnap ? [{ axis: "x", position: horizontalSnap.target }] : []),
      ...(verticalSnap ? [{ axis: "y", position: verticalSnap.target }] : [])
    ];
    renderStage();
  };
  const end = () => {
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", end);
    state.guides = [];
    renderStage();
  };
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", end);
}

function getObjectBounds(objects) {
  const left = Math.min(...objects.map((item) => item.x));
  const top = Math.min(...objects.map((item) => item.y));
  const right = Math.max(...objects.map((item) => item.x + item.w));
  const bottom = Math.max(...objects.map((item) => item.y + item.h));
  return { left, top, right, bottom, centerX: (left + right) / 2, centerY: (top + bottom) / 2 };
}

function getSnapTargets(excludedIds) {
  const x = new Set();
  const y = new Set();
  for (let position = 0; position <= 100; position += GRID_SIZE) {
    x.add(position);
    y.add(position);
  }
  currentPage().objects.filter((item) => !excludedIds.has(item.id)).forEach((item) => {
    x.add(item.x);
    x.add(item.x + item.w / 2);
    x.add(item.x + item.w);
    y.add(item.y);
    y.add(item.y + item.h / 2);
    y.add(item.y + item.h);
  });
  return { x: [...x], y: [...y] };
}

function findSnap(movingPoints, targets, threshold) {
  let best = null;
  movingPoints.forEach((point) => {
    targets.forEach((target) => {
      const correction = target - point;
      if (Math.abs(correction) <= threshold && (!best || Math.abs(correction) < Math.abs(best.correction))) {
        best = { correction, target };
      }
    });
  });
  return best;
}

function renderConnections(page) {
  if (page.template === "mindmap") {
    const root = page.objects.find((object) => object.root);
    page.objects.filter((object) => object.role === "mind-node").forEach((node) => {
      let parent = page.objects.find((object) => object.id === node.parentId);
      if (!parent && node.mindLevel === 2) {
        parent = root;
      }
      if (parent) {
        drawConnection(parent, node, stage);
      }
    });
    return;
  }

  const variant = page.variant;
  if (variant === "timeline") {
    renderTimelinePath(page, stage);
  }

  if (["process", "cycle", "chain", "ribbonArrow"].includes(variant)) {
    const nodes = page.objects.filter((object) => object.item || object.node || object.role === "diagram-node" || object.role === "chain-node" || object.role === "cycle-node" || object.role === "ribbon-step").sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));
    nodes.forEach((node, index) => {
      const next = nodes[index + 1] || (variant === "cycle" ? nodes[0] : null);
      if (next) drawConnection(node, next, stage);
    });
  }

  if (variant === "connectedCircles") {
    const nodes = page.objects.filter((object) => object.role === "connected-circle" || (object.node && !object.role)).sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));
    const center = nodes[0];
    if (center) {
      nodes.slice(1).forEach((node) => drawConnection(center, node, stage));
    }
  }
}

function renderTimelinePath(page, targetContainer = $("#pageCanvas") || stage) {
  const nodes = page.objects.filter((object) => object.role === "timeline-node" || object.node).sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));
  if (!nodes.length) return;
  const namespace = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(namespace, "svg");
  svg.classList.add("timeline-path");
  svg.setAttribute("viewBox", "0 0 100 100");
  svg.setAttribute("preserveAspectRatio", "none");
  svg.setAttribute("aria-hidden", "true");

  const definitions = document.createElementNS(namespace, "defs");
  const marker = document.createElementNS(namespace, "marker");
  marker.setAttribute("id", "timeline-arrow");
  marker.setAttribute("viewBox", "0 0 10 10");
  marker.setAttribute("refX", "8");
  marker.setAttribute("refY", "5");
  marker.setAttribute("markerWidth", "7");
  marker.setAttribute("markerHeight", "7");
  marker.setAttribute("orient", "auto-start-reverse");
  const arrow = document.createElementNS(namespace, "path");
  arrow.setAttribute("d", "M 1 1 L 9 5 L 1 9");
  arrow.setAttribute("class", "timeline-arrow-head");
  marker.append(arrow);
  definitions.append(marker);
  svg.append(definitions);

  const centers = nodes.map((node) => node.x + node.w / 2);
  const baseline = 52;
  nodes.forEach((node, index) => {
    const previousCenter = centers[index - 1];
    const nextCenter = centers[index + 1];
    const startX = index === 0 ? Math.max(3, centers[index] - (nextCenter ? (nextCenter - centers[index]) / 2 : 8)) : (previousCenter + centers[index]) / 2;
    const endX = index === nodes.length - 1 ? Math.min(97, centers[index] + (previousCenter ? (centers[index] - previousCenter) / 2 : 8)) : (centers[index] + nextCenter) / 2;
    const apex = index % 2 === 0 ? node.y - 3 : node.y + node.h + 3;
    const controlY = 2 * apex - baseline;
    const path = document.createElementNS(namespace, "path");
    path.setAttribute("d", `M ${startX} ${baseline} Q ${centers[index]} ${controlY} ${endX} ${baseline}`);
    path.setAttribute("class", "timeline-curve");
    path.setAttribute("marker-end", "url(#timeline-arrow)");
    if (typeof node.animOrder === "number" && node.animOrder > 0) {
      path.dataset.animOrder = node.animOrder;
    }
    svg.append(path);
  });

  const startDot = document.createElementNS(namespace, "circle");
  const firstGap = centers[1] ? (centers[1] - centers[0]) / 2 : 8;
  startDot.setAttribute("cx", `${Math.max(3, centers[0] - firstGap)}`);
  startDot.setAttribute("cy", `${baseline}`);
  startDot.setAttribute("r", "1");
  startDot.setAttribute("class", "timeline-start-dot");
  svg.append(startDot);
  targetContainer.append(svg);
}

function drawConnection(from, to, targetContainer = stage) {
  if (!from || !to) return;
  const container = targetContainer || stage;
  const containerWidth = container.clientWidth || 1600;
  const containerHeight = container.clientHeight || 900;

  const fromX = Number(from.x) + Number(from.w) / 2;
  const fromY = Number(from.y) + Number(from.h) / 2;
  const toX = Number(to.x) + Number(to.w) / 2;
  const toY = Number(to.y) + Number(to.h) / 2;

  const dx = (toX - fromX) / 100 * containerWidth;
  const dy = (toY - fromY) / 100 * containerHeight;
  const length = Math.hypot(dx, dy) / containerWidth * 100;
  const angle = Math.atan2(dy, dx) * 180 / Math.PI;

  const line = document.createElement("div");
  line.className = "connection";
  line.style.left = `${fromX}%`;
  line.style.top = `${fromY}%`;
  line.style.width = `${length}%`;
  line.style.transform = `rotate(${angle}deg)`;
  line.style.backgroundColor = "var(--content-accent, #2563eb)";
  line.style.height = "3px";
  line.style.zIndex = "1";

  const animOrder = typeof to.animOrder === "number" && to.animOrder > 0
    ? to.animOrder
    : (typeof from.animOrder === "number" && from.animOrder > 0 ? from.animOrder : null);
  if (typeof animOrder === "number" && animOrder > 0) {
    line.dataset.animOrder = animOrder;
  }

  container.append(line);
}

function fitAllText() {
  const mindTexts = new Set(stage.querySelectorAll(".mind-root .canvas-text, .mind-node .canvas-text"));
  const bulletTexts = new Set(stage.querySelectorAll(".bullet-item .canvas-text, .cover-item .canvas-text"));
  const grouped = new Map();
  stage.querySelectorAll(".canvas-text").forEach((text) => {
    if (mindTexts.has(text) || bulletTexts.has(text)) return;
    const object = getTextObjectForElement(text);
    if (!object) return;
    const key = getTextStageKey(object);
    const texts = grouped.get(key) || [];
    texts.push(text);
    grouped.set(key, texts);
  });
  grouped.forEach((texts) => fitTextGroupToCommonSize(texts, 8, getTextGroupMaximum(texts, 112)));
  fitBulletTextByLevel(bulletTexts);
  fitMindmapTextByLevel(mindTexts);
  fitTablesToCommonSize([...stage.querySelectorAll(".table-object")]);
}

function getTextObjectForElement(text) {
  const objectId = text.closest(".canvas-object")?.dataset.objectId;
  return currentPage().objects.find((object) => object.id === objectId && object.type === "text") || null;
}

function getTextStageKey(object) {
  if (object.mindLevel) return `mind:${clamp(1, Number(object.mindLevel) || 1, 4)}`;
  if (["bullet-item", "cover-item"].includes(object.role)) {
    return `${object.role}:level:${clamp(1, Number(object.bulletLevel) || 1, 4)}`;
  }
  return `${object.role || "text"}:${object.rootNode ? "root" : "item"}`;
}

function getTextGroupMaximum(texts, fallback) {
  const manualSizes = texts
    .map((text) => getTextObjectForElement(text)?.fontSize)
    .filter((size) => Number.isFinite(Number(size)) && Number(size) > 0)
    .map(Number);
  return manualSizes.length ? Math.min(fallback, ...manualSizes) : fallback;
}

function fitBulletTextByLevel(bulletTexts) {
  const grouped = new Map();
  bulletTexts.forEach((text) => {
    const wrapper = text.closest(".canvas-object");
    const object = currentPage().objects.find((item) => item.id === wrapper?.dataset.objectId);
    if (!object) return;
    const key = `${object.role}:${clamp(1, Number(object.bulletLevel) || 1, 4)}`;
    const texts = grouped.get(key) || [];
    texts.push(text);
    grouped.set(key, texts);
  });
  grouped.forEach((texts) => fitTextGroupToCommonSize(texts, 8, getTextGroupMaximum(texts, 72)));
}

function fitTextGroupToCommonSize(texts, minimum, maximum) {
  if (!texts.length) return;
  let low = minimum;
  let high = maximum;
  for (let attempt = 0; attempt < 9; attempt += 1) {
    const size = (low + high) / 2;
    texts.forEach((text) => text.style.setProperty("--object-font-size", `${size}px`));
    const fits = texts.every((text) => text.scrollWidth <= text.clientWidth + 1 && text.scrollHeight <= text.clientHeight + 1);
    if (fits) low = size;
    else high = size;
  }
  texts.forEach((text) => text.style.setProperty("--object-font-size", `${low}px`));
}

function fitMindmapTextByLevel(mindTexts) {
  if (!mindTexts.size) return;
  const levelRatios = { 1: 1.65, 2: 1.32, 3: 1.08, 4: .88 };
  const grouped = { 1: [], 2: [], 3: [], 4: [] };
  mindTexts.forEach((text) => {
    const wrapper = text.closest(".canvas-object");
    const levelClass = [...wrapper.classList].find((name) => name.startsWith("mind-level-"));
    const level = Number(levelClass?.replace("mind-level-", ""));
    if (grouped[level]) grouped[level].push(text);
  });

  const stageScale = stage.clientWidth / 1200;
  let baseSize = 32 * stageScale;
  Object.entries(grouped).forEach(([level, texts]) => {
    if (!texts.length) return;
    const available = Math.min(...texts.map(getTextFitSize));
    baseSize = Math.min(baseSize, available / levelRatios[level]);
    const manualMaximum = getTextGroupMaximum(texts, Number.POSITIVE_INFINITY);
    if (Number.isFinite(manualMaximum)) baseSize = Math.min(baseSize, manualMaximum / levelRatios[level]);
  });
  baseSize = Math.max(8 * stageScale, baseSize);
  Object.entries(grouped).forEach(([level, texts]) => {
    if (!texts.length) return;
    const manualMaximum = getTextGroupMaximum(texts, Number.POSITIVE_INFINITY);
    if (Number.isFinite(manualMaximum)) baseSize = Math.min(baseSize, manualMaximum / levelRatios[level]);
  });
  Object.entries(grouped).forEach(([level, texts]) => {
    const size = baseSize * levelRatios[level];
    texts.forEach((text) => text.style.setProperty("--object-font-size", `${size}px`));
  });
}

function fitTablesToCommonSize(tables) {
  if (!tables.length) return;
  let low = 8;
  let high = 30;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const size = (low + high) / 2;
    tables.forEach((table) => table.style.setProperty("--table-font-size", `${size}px`));
    const fits = tables.every((table) => {
      const cells = [...table.querySelectorAll("th,td")];
      return table.scrollWidth <= table.clientWidth + 1
        && table.scrollHeight <= table.clientHeight + 1
        && cells.every((cell) => cell.scrollWidth <= cell.clientWidth + 1 && cell.scrollHeight <= cell.clientHeight + 1);
    });
    if (fits) low = size;
    else high = size;
  }
  tables.forEach((table) => table.style.setProperty("--table-font-size", `${low}px`));
}

function getTextFitSize(text) {
  const rect = text.getBoundingClientRect();
  const lines = (text.dataset.fitText || text.textContent || "").split("\n");
  const longest = Math.max(...lines.map((line) => line.length), 1);
  return Math.max(1, Math.min((rect.width - 12) / longest * 1.55, (rect.height - 10) / (lines.length * 1.15)));
}

function getStagePoint(event) {
  const rect = stage.getBoundingClientRect();
  return { x: (event.clientX - rect.left) / rect.width * 100, y: (event.clientY - rect.top) / rect.height * 100 };
}

function clamp(min, value, max) {
  return Math.max(min, Math.min(max, value));
}

function populateVariantSelects() {
  const textGrid = $("#catGrid_text");
  const cardGrid = $("#catGrid_card");
  const compareGrid = $("#catGrid_compare");
  const diagramGrid = $("#catGrid_diagram");
  const chartGrid = $("#catGrid_chart");

  if (!textGrid) return;

  textGrid.innerHTML = `
    <button class="layout-variant-button" type="button" data-template-id="bullet" aria-pressed="false" aria-label="개조식">
      <span class="layout-thumbnail"><span></span><span></span><span></span></span>
      <span class="layout-variant-name">개조식</span>
    </button>
    <button class="layout-variant-button" type="button" data-template-id="mindmap" aria-pressed="false" aria-label="마인드맵">
      <span class="diagram-thumbnail connected-thumb"><span></span><span></span><span></span></span>
      <span class="layout-variant-name">마인드맵</span>
    </button>
  `;

  cardGrid.innerHTML = [
    ["cards_1col", "sideAccent_1col"],
    ["cards_2col", "sideAccent_2col"],
    ["cards_3col", "sideAccent_3col"],
    ["cards_4col", "sideAccent_4col"]
  ].flat().map((key) => `
    <button class="layout-variant-button" type="button" data-layout-variant="${key}" aria-pressed="false" aria-label="${layouts[key].name}">
      ${getLayoutThumbnailMarkup(key)}
      <span class="layout-variant-name">${layouts[key].name}</span>
    </button>
  `).join("");

  compareGrid.innerHTML = ["summaryLeft", "summaryRight", "summaryTop", "summaryBottom"].map((key) => `
    <button class="layout-variant-button" type="button" data-layout-variant="${key}" aria-pressed="false" aria-label="${layouts[key].name}">
      ${getLayoutThumbnailMarkup(key)}
      <span class="layout-variant-name">${layouts[key].name}</span>
    </button>
  `).join("");

  diagramGrid.innerHTML = Object.entries(diagrams).map(([value, item]) => `
    <button class="layout-variant-button" type="button" data-diagram-variant="${value}" aria-pressed="false" aria-label="${item.name}">
      ${getDiagramThumbnailMarkup(value)}
      <span class="layout-variant-name">${item.name}</span>
    </button>
  `).join("");

  chartGrid.innerHTML = [
    ...["table", "tableStats"].map((key) => `
      <button class="layout-variant-button" type="button" data-layout-variant="${key}" aria-pressed="false" aria-label="${layouts[key].name}">
        ${getLayoutThumbnailMarkup(key)}
        <span class="layout-variant-name">${layouts[key].name}</span>
      </button>
    `),
    ...Object.entries(charts).map(([value, item]) => `
      <button class="layout-variant-button" type="button" data-chart-variant="${value}" aria-pressed="false" aria-label="${item.name}">
        ${getChartThumbnailMarkup(value)}
        <span class="layout-variant-name">${item.name}</span>
      </button>
    `)
  ].join("");

  const imageGrid = $("#catGrid_image");
  if (imageGrid) {
    imageGrid.innerHTML = ["image_full", "image_center", "image_left", "image_right", "image_top", "image_bottom"].map((key) => `
      <button class="layout-variant-button" type="button" data-layout-variant="${key}" aria-pressed="false" aria-label="${layouts[key]?.name || key}">
        ${getLayoutThumbnailMarkup(key)}
        <span class="layout-variant-name">${layouts[key]?.name || key}</span>
      </button>
    `).join("");
  }
}

function getLayoutThumbnailMarkup(variant) {
  // 1. Basic Card Grids (기본 카드 1~4열)
  if (variant === "cards_1col") return '<span class="layout-thumbnail card-thumb-box"><span class="thumb-card-single"><i></i><i></i></span></span>';
  if (variant === "cards_2col") return '<span class="layout-thumbnail card-thumb-box"><span class="thumb-card-grid col-2"><span class="t-card"></span><span class="t-card"></span></span></span>';
  if (variant === "cards_3col") return '<span class="layout-thumbnail card-thumb-box"><span class="thumb-card-grid col-3"><span class="t-card"></span><span class="t-card"></span><span class="t-card"></span></span></span>';
  if (variant === "cards_4col") return '<span class="layout-thumbnail card-thumb-box"><span class="thumb-card-grid col-4"><span class="t-card"></span><span class="t-card"></span><span class="t-card"></span><span class="t-card"></span></span></span>';

  // 2. Side Accent Card Grids (측면 강조 카드 1~4열)
  if (variant === "sideAccent_1col") return '<span class="layout-thumbnail card-thumb-box"><span class="thumb-card-single side-accent"><i></i><i></i></span></span>';
  if (variant === "sideAccent_2col") return '<span class="layout-thumbnail card-thumb-box"><span class="thumb-card-grid col-2 side-accent"><span class="t-card"></span><span class="t-card"></span></span></span>';
  if (variant === "sideAccent_3col") return '<span class="layout-thumbnail card-thumb-box"><span class="thumb-card-grid col-3 side-accent"><span class="t-card"></span><span class="t-card"></span><span class="t-card"></span></span></span>';
  if (variant === "sideAccent_4col") return '<span class="layout-thumbnail card-thumb-box"><span class="thumb-card-grid col-4 side-accent"><span class="t-card"></span><span class="t-card"></span><span class="t-card"></span><span class="t-card"></span></span></span>';

  // 3. Summary & Highlight Layouts (요약 및 강조 4종)
  if (variant === "summaryLeft") return '<span class="layout-thumbnail summary-thumb-left"><span class="t-dark-panel">요약</span><span class="t-card-cols"><span class="t-card"></span><span class="t-card"></span></span></span>';
  if (variant === "summaryRight") return '<span class="layout-thumbnail summary-thumb-right"><span class="t-card-cols"><span class="t-card"></span><span class="t-card"></span></span><span class="t-dark-panel">요약</span></span>';
  if (variant === "summaryTop") return '<span class="layout-thumbnail summary-thumb-top"><span class="t-dark-banner">요약 배너</span><span class="t-card-cols"><span class="t-card"></span><span class="t-card"></span><span class="t-card"></span></span></span>';
  if (variant === "summaryBottom") return '<span class="layout-thumbnail summary-thumb-bottom"><span class="t-card-cols"><span class="t-card"></span><span class="t-card"></span><span class="t-card"></span></span><span class="t-dark-banner">요약 배너</span></span>';

  // 4. Image Layouts (이미지 레이아웃 6종)
  if (variant === "image_full") return '<span class="layout-thumbnail img-thumb-full"><span class="t-overlay"></span></span>';
  if (variant === "image_center") return '<span class="layout-thumbnail img-thumb-center"><span class="t-line"></span><span class="t-img-hero"></span><span class="t-line"></span></span>';
  if (variant === "image_left") return '<span class="layout-thumbnail img-thumb-left"><span class="t-img-box"></span><span class="t-text-cols"><span class="t-card"></span><span class="t-card"></span></span></span>';
  if (variant === "image_right") return '<span class="layout-thumbnail img-thumb-right"><span class="t-text-cols"><span class="t-card"></span><span class="t-card"></span></span><span class="t-img-box"></span></span>';
  if (variant === "image_top") return '<span class="layout-thumbnail img-thumb-top"><span class="t-img-banner"></span><span class="t-text-row"><span class="t-card"></span><span class="t-card"></span></span></span>';
  if (variant === "image_bottom") return '<span class="layout-thumbnail img-thumb-bottom"><span class="t-text-row"><span class="t-card"></span><span class="t-card"></span></span><span class="t-img-banner"></span></span>';

  if (variant === "table") return '<span class="layout-thumbnail card-thumb-box"><span class="thumb-card-grid col-3"><span class="t-card"></span><span class="t-card"></span><span class="t-card"></span></span></span>';
  if (variant === "tableStats") return '<span class="layout-thumbnail summary-thumb-right"><span class="t-card-cols"><span class="t-card"></span><span class="t-card"></span></span><span class="t-dark-panel">지표</span></span>';

  return '<span class="layout-thumbnail card-thumb-box"><span class="thumb-card-single"><i></i></span></span>';
}

function getDiagramThumbnailMarkup(variant) {
  const node = '<span></span>';
  const previews = {
    process: `<span class="diagram-thumbnail process-thumb">${node.repeat(4)}</span>`,
    timeline: `<span class="diagram-thumbnail timeline-thumb">${node.repeat(5)}</span>`,
    pyramid: `<span class="diagram-thumbnail pyramid-thumb">${node.repeat(4)}</span>`,
    cycle: `<span class="diagram-thumbnail cycle-thumb">${node.repeat(4)}</span>`,
    chain: `<span class="diagram-thumbnail chain-thumb">${node.repeat(4)}</span>`,
    ribbonArrow: `<span class="diagram-thumbnail ribbon-thumb">${node.repeat(4)}</span>`,
    funnel: `<span class="diagram-thumbnail funnel-thumb">${node.repeat(4)}</span>`,
    venn: `<span class="diagram-thumbnail venn-thumb">${node.repeat(3)}</span>`,
    target: `<span class="diagram-thumbnail target-thumb">${node.repeat(4)}</span>`,
    connectedCircles: `<span class="diagram-thumbnail connected-thumb">${node.repeat(5)}</span>`,
    quadrant: `<span class="diagram-thumbnail quadrant-thumb">${node.repeat(4)}</span>`,
    vs: `<span class="diagram-thumbnail vs-thumb">${node}<b>VS</b>${node}</span>`
  };
  return previews[variant] || `<span class="diagram-thumbnail">${node}</span>`;
}

function getChartThumbnailMarkup(variant) {
  const bars = '<i></i><i></i><i></i><i></i><i></i>';
  const previews = {
    column: `<span class="chart-thumbnail chart-thumb-column">${bars}</span>`,
    line: '<span class="chart-thumbnail chart-thumb-line"><svg viewBox="0 0 100 50" aria-hidden="true"><polyline points="5,39 27,25 48,30 70,11 95,18"></polyline></svg></span>',
    pie: '<span class="chart-thumbnail chart-thumb-pie"><i></i></span>',
    bar: `<span class="chart-thumbnail chart-thumb-bar">${bars}</span>`,
    area: '<span class="chart-thumbnail chart-thumb-area"><svg viewBox="0 0 100 50" aria-hidden="true"><polygon points="5,43 5,35 27,25 48,30 70,11 95,18 95,43"></polygon><polyline points="5,35 27,25 48,30 70,11 95,18"></polyline></svg></span>'
  };
  return previews[variant] || previews.column;
}

function serializeProject() {
  return JSON.stringify({
    format: PROJECT_FORMAT,
    version: PROJECT_VERSION,
    savedAt: new Date().toISOString(),
    presentation: {
      design: state.design,
      customPalette: state.customPalette,
      fixedOverlays: state.fixedOverlays,
      pages: state.pages,
      currentPageIndex: state.currentPageIndex
    }
  }, null, 2);
}

function parseProject(text) {
  const parsed = JSON.parse(text);
  if (parsed?.format !== PROJECT_FORMAT || parsed?.version !== PROJECT_VERSION) {
    throw new Error("Local ppt 저장 파일 형식이 아닙니다.");
  }
  const presentation = parsed.presentation;
  if (!presentation || !Array.isArray(presentation.pages) || !presentation.pages.length) {
    throw new Error("페이지 데이터가 없습니다.");
  }
  presentation.pages.forEach((page, pageIndex) => {
    if (!page || !Array.isArray(page.objects)) throw new Error(`PAGE ${pageIndex + 1}의 개체 데이터가 올바르지 않습니다.`);
    page.objects.forEach((object) => {
      if (!object?.id || !object.type || ![object.x, object.y, object.w, object.h].every(Number.isFinite)) {
        throw new Error(`PAGE ${pageIndex + 1}에 잘못된 개체가 있습니다.`);
      }
    });
  });
  return {
    design: designs[presentation.design] ? presentation.design : "bauhaus",
    customPalette: Array.isArray(presentation.customPalette) && presentation.customPalette.length === 3 ? presentation.customPalette : null,
    fixedOverlays: presentation.fixedOverlays ? { ...defaultFixedOverlays(), ...presentation.fixedOverlays } : defaultFixedOverlays(),
    pages: JSON.parse(JSON.stringify(presentation.pages)),
    currentPageIndex: clamp(0, Number(presentation.currentPageIndex) || 0, presentation.pages.length - 1)
  };
}

async function loadProjectFile(file, handle = null) {
  try {
    const loaded = parseProject(await file.text());
    state.design = loaded.design;
    state.customPalette = loaded.customPalette;
    state.fixedOverlays = loaded.fixedOverlays ? { ...defaultFixedOverlays(), ...loaded.fixedOverlays } : defaultFixedOverlays();
    state.pages = loaded.pages;
    state.currentPageIndex = loaded.currentPageIndex;
    state.history = [];
    state.selectedIds.clear();
    state.guides = [];
    hideTextToolbar();
    currentProjectFileHandle = handle;
    currentProjectFileName = file.name || "local-ppt.txt";
    document.title = `Local PPT 2 — ${currentProjectFileName}`;
    if (window.LocalPptAiIntake?.syncOptionsUI) {
      window.LocalPptAiIntake.syncOptionsUI();
    }
    render();
  } catch (error) {
    window.alert(`파일을 불러올 수 없습니다.\n${error.message}`);
  }
}

async function writeProjectToHandle(handle) {
  const writable = await handle.createWritable();
  await writable.write(serializeProject());
  await writable.close();
  currentProjectFileHandle = handle;
  currentProjectFileName = handle.name || currentProjectFileName;
  document.title = `Local PPT 2 — ${currentProjectFileName}`;
}

function downloadProject(filename = currentProjectFileName) {
  const blob = new Blob([serializeProject()], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename.endsWith(".txt") ? filename : `${filename}.txt`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
  currentProjectFileName = anchor.download;
  document.title = `Local PPT 2 — ${currentProjectFileName}`;
}

function suggestedProjectName() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");
  return `local-ppt_${year}-${month}-${day}_${hours}-${minutes}-${seconds}.txt`;
}

function getNewImagePlacement(page, index) {
  if (page.template === "object" && page.objectCategory === "layout") {
    if (page.variant === "stepsMedia") return { x: 8 + index, y: 58 + index, w: 84 - index * 2, h: 27 - index * 2 };
    if (page.variant === "mediaFeatures") return { x: 7 + index, y: 25 + index, w: 21, h: 61 - index * 2 };
  }
  return { x: 62 + (index % 3) * 5, y: 55 + (index % 3) * 5, w: 25, h: 28 };
}

async function saveProjectAs() {
  try {
    if (window.showSaveFilePicker) {
      const handle = await window.showSaveFilePicker({
        id: PROJECT_PICKER_ID,
        suggestedName: suggestedProjectName(),
        types: [{ description: "Local ppt JSON 텍스트", accept: { "text/plain": [".txt"] } }]
      });
      await writeProjectToHandle(handle);
      return true;
    } else {
      downloadProject(suggestedProjectName());
      return true;
    }
  } catch (error) {
    if (error.name === "AbortError") return false;
    if (["SecurityError", "NotSupportedError"].includes(error.name)) {
      downloadProject(suggestedProjectName());
      return true;
    } else {
      window.alert(`파일을 저장할 수 없습니다.\n${error.message}`);
      return false;
    }
  }
}

async function saveCurrentProject() {
  const btn = $("#saveProjectButton");
  const originalText = btn ? btn.textContent : "txt에 저장";

  if (btn) {
    btn.classList.add("is-saving");
    btn.textContent = "💾 저장 중...";
  }

  try {
    let saved = false;
    if (currentProjectFileHandle) {
      await writeProjectToHandle(currentProjectFileHandle);
      saved = true;
    } else {
      saved = await saveProjectAs();
    }

    if (saved) {
      triggerSaveSuccessEvent(currentProjectFileName);
    } else if (btn) {
      btn.classList.remove("is-saving");
      btn.textContent = originalText;
    }
  } catch (error) {
    if (btn) {
      btn.classList.remove("is-saving");
      btn.textContent = originalText;
    }
    if (error.name !== "AbortError") window.alert(`파일을 저장할 수 없습니다.\n${error.message}`);
  }
}

function triggerSaveSuccessEvent(filename = currentProjectFileName) {
  const btn = $("#saveProjectButton");
  if (btn) {
    btn.classList.remove("is-saving");
    btn.classList.add("is-saved", "save-success-pulse");
    btn.textContent = "✅ 저장 완료!";
    setTimeout(() => {
      btn.classList.remove("is-saved", "save-success-pulse");
      btn.textContent = "txt에 저장";
    }, 1800);
  }

  showSaveToast(`💾 저장 완료! 파일이 성공적으로 저장되었습니다. (${filename})`);
}

function showSaveToast(message) {
  let toast = document.querySelector(".save-toast-notification");
  if (toast) toast.remove();

  toast = document.createElement("div");
  toast.className = "save-toast-notification";
  toast.innerHTML = `<span>${message}</span>`;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("is-hiding");
    setTimeout(() => toast.remove(), 300);
  }, 2200);
}

$("#loadProjectButton").addEventListener("click", async () => {
  if (window.showOpenFilePicker) {
    try {
      const [handle] = await window.showOpenFilePicker({
        id: PROJECT_PICKER_ID,
        multiple: false,
        types: [{ description: "Local ppt JSON 텍스트", accept: { "text/plain": [".txt", ".json"] } }]
      });
      await loadProjectFile(await handle.getFile(), handle);
    } catch (error) {
      if (error.name === "AbortError") return;
      if (["SecurityError", "NotSupportedError"].includes(error.name)) {
        $("#projectFileInput").value = "";
        $("#projectFileInput").click();
      } else {
        window.alert(`파일을 불러올 수 없습니다.\n${error.message}`);
      }
    }
  } else {
    $("#projectFileInput").value = "";
    $("#projectFileInput").click();
  }
});

$("#projectFileInput").addEventListener("change", (event) => {
  const [file] = event.target.files;
  if (file) loadProjectFile(file);
});

$("#saveProjectButton")?.addEventListener("click", saveCurrentProject);

$("#designSelect")?.addEventListener("change", (event) => {
  if (currentPage()?.type !== "cover") return;
  snapshot();
  state.design = event.target.value;
  state.customPalette = null;
  render();
});

$("#resetPaletteButton")?.addEventListener("click", () => {
  snapshot();
  state.customPalette = null;
  render();
});

[1, 2, 3].forEach((index) => {
  const picker = $(`#colorPicker${index}`);
  const hexInput = $(`#colorHex${index}`);

  picker?.addEventListener("input", (event) => {
    const current = [...getCurrentPalette()];
    current[index - 1] = event.target.value;
    state.customPalette = current;
    render();
  });
  picker?.addEventListener("change", () => snapshot());

  hexInput?.addEventListener("input", (event) => {
    let hex = event.target.value.trim();
    if (!hex.startsWith("#")) hex = "#" + hex;
    if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
      const current = [...getCurrentPalette()];
      current[index - 1] = hex;
      state.customPalette = current;
      render();
    }
  });
  hexInput?.addEventListener("change", (event) => {
    let hex = event.target.value.trim();
    if (!hex.startsWith("#")) hex = "#" + hex;
    if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
      snapshot();
      const current = [...getCurrentPalette()];
      current[index - 1] = hex;
      state.customPalette = current;
      render();
    } else {
      event.target.value = getCurrentPalette()[index - 1];
    }
  });
});

["tl", "tc", "tr", "bl", "bc", "br"].forEach((pos) => {
  const textInput = $(`#overlayText_${pos}`);
  const sizeSelect = $(`#overlaySize_${pos}`);
  const weightSelect = $(`#overlayWeight_${pos}`);

  textInput?.addEventListener("input", (event) => {
    if (!state.fixedOverlays[pos]) state.fixedOverlays[pos] = { text: "", size: "13px", weight: "700" };
    state.fixedOverlays[pos].text = event.target.value;
    renderStage();
  });
  textInput?.addEventListener("change", () => snapshot());

  sizeSelect?.addEventListener("change", (event) => {
    if (!state.fixedOverlays[pos]) state.fixedOverlays[pos] = { text: "", size: "13px", weight: "700" };
    snapshot();
    state.fixedOverlays[pos].size = event.target.value;
    render();
  });

  weightSelect?.addEventListener("change", (event) => {
    if (!state.fixedOverlays[pos]) state.fixedOverlays[pos] = { text: "", size: "13px", weight: "700" };
    snapshot();
    state.fixedOverlays[pos].weight = event.target.value;
    render();
  });
});

$("#unifiedTemplateContainer")?.addEventListener("click", (event) => {
  const btnText = event.target.closest("[data-template-id]");
  const btnLayout = event.target.closest("[data-layout-variant]");
  const btnDiagram = event.target.closest("[data-diagram-variant]");
  const btnChart = event.target.closest("[data-chart-variant]");

  const page = currentPage();
  if (page.type !== "content") return;

  if (btnText) {
    snapshot();
    const templateId = btnText.dataset.templateId;
    if (templateId === "bullet") {
      applyBulletTemplatePreservingContent(page);
    } else if (templateId === "mindmap") {
      applyMindmapTemplatePreservingContent(page);
    } else {
      buildTemplate(page, templateId);
    }
    state.selectedIds.clear();
    hideTextToolbar();
    render();
    return;
  }
  if (btnLayout) {
    snapshot();
    changeLayoutVariantPreservingContent(page, btnLayout.dataset.layoutVariant);
    state.selectedIds.clear();
    hideTextToolbar();
    render();
    return;
  }
  if (btnDiagram) {
    snapshot();
    changeDiagramVariantPreservingContent(page, btnDiagram.dataset.diagramVariant);
    state.selectedIds.clear();
    hideTextToolbar();
    render();
    return;
  }
  if (btnChart) {
    snapshot();
    changeChartVariantPreservingContent(page, btnChart.dataset.chartVariant);
    state.selectedIds.clear();
    hideTextToolbar();
    render();
    return;
  }
});

const categoryToggles = [
  { toggle: "#catToggle_text", grid: "#catGrid_text" },
  { toggle: "#catToggle_card", grid: "#catGrid_card" },
  { toggle: "#catToggle_compare", grid: "#catGrid_compare" },
  { toggle: "#catToggle_diagram", grid: "#catGrid_diagram" },
  { toggle: "#catToggle_chart", grid: "#catGrid_chart" },
  { toggle: "#catToggle_image", grid: "#catGrid_image" }
];

categoryToggles.forEach(({ toggle, grid }) => {
  $(toggle)?.addEventListener("click", () => {
    categoryToggles.forEach(({ toggle: t, grid: g }) => {
      const isTarget = t === toggle;
      const toggleEl = $(t);
      const gridEl = $(g);
      if (toggleEl && gridEl) {
        const expand = isTarget ? gridEl.hidden : false;
        gridEl.hidden = !expand;
        toggleEl.setAttribute("aria-expanded", String(expand));
      }
    });
  });
});


$("#addPageButton").addEventListener("click", () => {
  snapshot();
  state.pages.push(createContentPage());
  state.currentPageIndex = state.pages.length - 1;
  state.selectedIds.clear();
  hideTextToolbar();
  render();
});

$("#addItemButton").addEventListener("click", addItem);
$("#removeItemButton").addEventListener("click", removeItem);
$("#bringToFrontBtn")?.addEventListener("click", bringToFrontSelectedObjects);
$("#bringForwardBtn")?.addEventListener("click", bringForwardSelectedObjects);
$("#sendBackwardBtn")?.addEventListener("click", sendBackwardSelectedObjects);
$("#sendToBackBtn")?.addEventListener("click", sendToBackSelectedObjects);
$("#addTimerObjectButton")?.addEventListener("click", addTimerObject);

$("#timerModeSelect")?.addEventListener("change", (event) => {
  const page = currentPage();
  const selectedTimer = page.objects.find((o) => state.selectedIds.has(o.id) && o.type === "timer");
  if (!selectedTimer) return;
  snapshot();
  selectedTimer.mode = event.target.value;
  selectedTimer.isRunning = false;
  if (selectedTimer.mode === "loop") {
    selectedTimer.remainingSeconds = selectedTimer.duration || 300;
    selectedTimer.currentRepeat = 1;
  } else {
    selectedTimer.elapsedSeconds = 0;
  }
  if ($("#timerRepeatLabel")) $("#timerRepeatLabel").hidden = (selectedTimer.mode === "stopwatch");
  renderStage();
});

$("#timerRepeatInput")?.addEventListener("change", (event) => {
  const page = currentPage();
  const selectedTimer = page.objects.find((o) => state.selectedIds.has(o.id) && o.type === "timer");
  if (!selectedTimer) return;
  snapshot();
  const val = Math.max(1, Number(event.target.value) || 1);
  selectedTimer.repeatCount = val;
  selectedTimer.currentRepeat = 1;
  renderStage();
});

document.querySelectorAll(".timer-preset-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const sec = Number(btn.dataset.sec) || 300;
    const page = currentPage();
    const selectedTimer = page.objects.find((o) => state.selectedIds.has(o.id) && o.type === "timer");
    if (!selectedTimer) return;
    snapshot();
    selectedTimer.duration = sec;
    selectedTimer.remainingSeconds = sec;
    selectedTimer.currentRepeat = 1;
    selectedTimer.isRunning = false;
    renderStage();
  });
});
$("#tableAxisSelect").addEventListener("change", (event) => {
  tableManagementAxis = event.target.value;
  renderControls();
});
$("#undoButton").addEventListener("click", undo);

$("#textColorInput")?.addEventListener("change", (event) => updateActiveTextStyle("textColor", event.target.value));
$("#textColorInput")?.addEventListener("input", (event) => updateActiveTextStyle("textColor", event.target.value));

$("#bgColorInput")?.addEventListener("change", (event) => updateActiveTextStyle("bgColor", event.target.value));
$("#bgColorInput")?.addEventListener("input", (event) => updateActiveTextStyle("bgColor", event.target.value));

$("#borderColorInput")?.addEventListener("change", (event) => updateActiveTextStyle("borderColor", event.target.value));
$("#borderColorInput")?.addEventListener("input", (event) => updateActiveTextStyle("borderColor", event.target.value));
$("#borderWidthInput")?.addEventListener("change", (event) => {
  const val = Number(event.target.value) || 0;
  updateActiveTextStyle("borderWidth", val);
  const page = currentPage();
  const obj = page.objects.find((item) => item.id === state.activeTextObjectId);
  if (obj && val > 0 && (!obj.borderStyle || obj.borderStyle === "none")) {
    updateActiveTextStyle("borderStyle", "solid");
  }
});
$("#borderWidthInput")?.addEventListener("input", (event) => {
  const val = Number(event.target.value) || 0;
  updateActiveTextStyle("borderWidth", val);
  const page = currentPage();
  const obj = page.objects.find((item) => item.id === state.activeTextObjectId);
  if (obj && val > 0 && (!obj.borderStyle || obj.borderStyle === "none")) {
    updateActiveTextStyle("borderStyle", "solid");
  }
});
$("#borderStyleSelect")?.addEventListener("change", (event) => {
  updateActiveTextStyle("borderStyle", event.target.value);
  const page = currentPage();
  const obj = page.objects.find((item) => item.id === state.activeTextObjectId);
  if (obj && event.target.value !== "none" && (!obj.borderWidth || Number(obj.borderWidth) === 0)) {
    updateActiveTextStyle("borderWidth", 2);
  }
});

function isTextInputTarget(target) {
  const tagName = target?.tagName;
  return Boolean(target?.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(tagName));
}

function navigateFullscreenPage(direction) {
  let nextIndex = state.currentPageIndex;
  while (true) {
    nextIndex += direction;
    if (nextIndex < 0 || nextIndex >= state.pages.length) return false;
    if (!state.pages[nextIndex]?.hidden) break;
  }
  state.currentPageIndex = nextIndex;
  state.selectedIds.clear();
  state.guides = [];
  hideTextToolbar();
  render();
  return true;
}
document.querySelectorAll(".theme-color-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const color = btn.dataset.colorHex || getCurrentPalette()[Number(btn.dataset.colorIndex) || 0];
    if (!color) return;
    const page = currentPage();
    const target = btn.dataset.target || "bg";

    if (target === "text") {
      updateActiveTextStyle("textColor", color);
      if ($("#textColorInput")) $("#textColorInput").value = normalizeColor(color);
    } else if (target === "border") {
      updateActiveTextStyle("borderColor", color);
      if ($("#borderColorInput")) $("#borderColorInput").value = normalizeColor(color);
      const pageObj = page.objects.find((item) => item.id === state.activeTextObjectId);
      if (pageObj && (!pageObj.borderWidth || Number(pageObj.borderWidth) === 0)) {
        updateActiveTextStyle("borderWidth", 2);
        if ($("#borderWidthInput")) $("#borderWidthInput").value = 2;
        updateActiveTextStyle("borderStyle", "solid");
        if ($("#borderStyleSelect")) $("#borderStyleSelect").value = "solid";
      }
    } else {
      const selectedObjects = page.objects.filter((item) => state.selectedIds.has(item.id));
      if (!selectedObjects.length) return;
      snapshot();
      selectedObjects.forEach((item) => { item.bgColor = color; });
      if ($("#bgColorInput")) $("#bgColorInput").value = normalizeColor(color);
      renderStage();
    }
  });
});
function commitTextSizeInput(input) {
  const parsed = Number(input.value);
  if (!Number.isFinite(parsed)) {
    const object = currentPage().objects.find((item) => item.id === state.activeTextObjectId && item.type === "text");
    input.value = Math.round(object?.fontSize || 28);
    return;
  }
  const size = clamp(8, Math.round(parsed), 160);
  input.value = size;
  updateActiveTextStyle("fontSize", size);
}

$("#textSizeInput").addEventListener("keydown", (event) => {
  if (event.key !== "Enter") return;
  event.preventDefault();
  commitTextSizeInput(event.currentTarget);
  event.currentTarget.select();
});
$("#textSizeInput").addEventListener("blur", (event) => {
  commitTextSizeInput(event.currentTarget);
});
document.querySelectorAll("[data-text-align]").forEach((button) => {
  button.addEventListener("click", () => updateActiveTextStyle("textAlign", button.dataset.textAlign));
});
$("#autoTextSizeButton").addEventListener("click", () => updateActiveTextStyle("fontSize", null));
$("#closeTextToolbarButton").addEventListener("click", hideTextToolbar);

$("#addTextObjectButton")?.addEventListener("click", () => {
  const page = currentPage();
  if (page.type === "cover") return;
  snapshot();
  page.objects.push(createTextObject("free-text", "새 텍스트 개체", 40, 45, 24, 12, { item: false, textAlign: "center" }));
  render();
});
$("#addShapeObjectButton")?.addEventListener("click", () => {
  const page = currentPage();
  if (page.type === "cover") return;
  snapshot();
  page.objects.push(createTextObject("shape-box", "", 40, 45, 20, 18, { item: false, textAlign: "center", shapeType: "rectangle", bgColor: "#2563eb", textColor: "#ffffff" }));
  render();
});
document.querySelectorAll(".shape-select-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const shapeType = btn.dataset.shapeType || "rectangle";
    const page = currentPage();
    if (page.type === "cover") return;
    snapshot();
    const configMap = {
      rectangle: { bg: "#2563eb", text: "#ffffff" },
      circle: { bg: "#ef4444", text: "#ffffff" },
      triangle: { bg: "#10b981", text: "#ffffff" },
      star: { bg: "#f59e0b", text: "#1e293b" }
    };
    const config = configMap[shapeType] || configMap.rectangle;
    page.objects.push(createTextObject("shape-box", "", 40, 45, 20, 18, {
      item: false,
      textAlign: "center",
      shapeType,
      bgColor: config.bg,
      textColor: config.text
    }));
    render();
  });
});
$("#cardImageInsertButton")?.addEventListener("click", () => {
  $("#imageInput").click();
});
$("#cardImageRemoveButton")?.addEventListener("click", () => {
  const page = currentPage();
  const selected = getSelectedActionObject(page);
  if (selected && selected.imageSrc) {
    snapshot();
    delete selected.imageSrc;
    render();
  }
});

$("#imageInput").addEventListener("change", (event) => {
  const files = [...event.target.files];
  if (!files.length) return;
  const targetPage = currentPage();
  const selected = getSelectedActionObject(targetPage);
  if (selected && selected.type !== "image" && selected.type !== "table" && selected.type !== "chart") {
    const file = files[0];
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      snapshot();
      selected.imageSrc = String(reader.result);
      event.target.value = "";
      render();
    });
    reader.readAsDataURL(file);
    return;
  }
  snapshot();
  let completed = 0;
  files.forEach((file, index) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      const placement = getNewImagePlacement(targetPage, index);
      targetPage.objects.push({
        id: createId("image"), type: "image", role: "image", src: String(reader.result), name: file.name,
        ...placement
      });
      completed += 1;
      if (completed === files.length) {
        event.target.value = "";
        render();
      }
    });
    reader.readAsDataURL(file);
  });
});

let fullscreenAnimStep = 0;
let isAnimMode = false;

function toggleAnimMode(active) {
  isAnimMode = Boolean(active);
  if (isAnimMode) {
    state.selectedIds.clear();
    state.guides = [];
    hideTextToolbar();
  }
  render();
}

function handleAnimModeClick(event, object) {
  const page = currentPage();
  const hasOrder = typeof object.animOrder === "number" && object.animOrder > 0;
  snapshot();
  if (hasOrder) {
    const deletedOrder = object.animOrder;
    delete object.animOrder;
    page.objects.forEach((obj) => {
      if (typeof obj.animOrder === "number" && obj.animOrder > deletedOrder) {
        obj.animOrder -= 1;
      }
    });
  } else {
    if (event.ctrlKey || event.metaKey) {
      const maxOrder = getMaxAnimOrder(page);
      object.animOrder = maxOrder > 0 ? maxOrder : 1;
    } else {
      object.animOrder = getMaxAnimOrder(page) + 1;
    }
  }
  render();
}

$("#toggleAnimModeButton")?.addEventListener("click", () => {
  toggleAnimMode(!isAnimMode);
});

function getMaxAnimOrder(page = currentPage()) {
  let max = 0;
  if (!page || !Array.isArray(page.objects)) return max;
  page.objects.forEach((object) => {
    if (typeof object.animOrder === "number" && object.animOrder > max) {
      max = object.animOrder;
    }
  });
  return max;
}

function updateFullscreenAnimState() {
  const isFullscreen = document.fullscreenElement === stage;
  if (!isFullscreen) return;
  const page = currentPage();
  page.objects.forEach((object) => {
    const element = stage.querySelector(`[data-object-id="${object.id}"]`);
    if (!element) return;
    if (typeof object.animOrder === "number" && object.animOrder > 0) {
      if (object.animOrder > fullscreenAnimStep) {
        element.classList.add("fullscreen-anim-hidden");
        element.classList.remove("fullscreen-anim-visible");
      } else {
        element.classList.add("fullscreen-anim-visible");
        element.classList.remove("fullscreen-anim-hidden");
      }
    } else {
      element.classList.remove("fullscreen-anim-hidden", "fullscreen-anim-visible");
    }
  });

  stage.querySelectorAll(".connection, .timeline-curve, [data-anim-order]").forEach((element) => {
    const order = Number(element.dataset.animOrder);
    if (Number.isFinite(order) && order > 0) {
      if (order > fullscreenAnimStep) {
        element.classList.add("fullscreen-anim-hidden");
        element.classList.remove("fullscreen-anim-visible");
      } else {
        element.classList.add("fullscreen-anim-visible");
        element.classList.remove("fullscreen-anim-hidden");
      }
    }
  });
}

function navigateFullscreenNext() {
  const maxOrder = getMaxAnimOrder();
  if (fullscreenAnimStep < maxOrder) {
    fullscreenAnimStep += 1;
    updateFullscreenAnimState();
    return true;
  }
  const moved = navigateFullscreenPage(1);
  if (moved) {
    fullscreenAnimStep = 0;
    updateFullscreenAnimState();
  }
  return moved;
}

function navigateFullscreenPrev() {
  if (fullscreenAnimStep > 0) {
    fullscreenAnimStep -= 1;
    updateFullscreenAnimState();
    return true;
  }
  const moved = navigateFullscreenPage(-1);
  if (moved) {
    fullscreenAnimStep = getMaxAnimOrder();
    updateFullscreenAnimState();
  }
  return moved;
}

$("#fullscreenButton").addEventListener("click", () => {
  if (document.fullscreenElement) document.exitFullscreen();
  else stage.requestFullscreen();
});

document.addEventListener("fullscreenchange", () => {
  if (document.fullscreenElement === stage) {
    state.selectedIds.clear();
    stage.classList.add("is-fullscreen");
    document.body.classList.add("is-fullscreen");
    fullscreenAnimStep = 0;
    renderStage();
    updateFullscreenAnimState();
  } else {
    stage.classList.remove("is-fullscreen");
    document.body.classList.remove("is-fullscreen");
    fullscreenAnimStep = 0;
    stage.querySelectorAll(".fullscreen-anim-hidden, .fullscreen-anim-visible").forEach((element) => {
      element.classList.remove("fullscreen-anim-hidden", "fullscreen-anim-visible");
    });
    renderStage();
  }
});

stage.addEventListener("click", (event) => {
  if (document.fullscreenElement === stage) {
    if (event.target.closest(".timer-object-card, button, input, select, a")) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    navigateFullscreenNext();
  }
}, true);

$("#stageCopyBtn")?.addEventListener("click", () => executeCopy());
$("#stageCutBtn")?.addEventListener("click", () => {
  if (executeCopy()) {
    deleteSelectedObjects();
    showSaveToast("✂️ 개체 잘라내기 완료");
  }
});
$("#stagePasteBtn")?.addEventListener("click", () => executePaste());

function copySelectedObjects() {
  const page = currentPage();
  if (!page || !Array.isArray(page.objects)) return false;
  const selected = page.objects.filter((object) => state.selectedIds.has(object.id));
  if (!selected.length) return false;
  copiedObjects = JSON.parse(JSON.stringify(selected));
  copiedFromPageId = page.id;
  pasteOffsetCount = 0;
  copiedPage = null;
  showSaveToast(`📋 개체 ${copiedObjects.length}개 복사 완료`);
  return true;
}

function copyCurrentPage() {
  const page = currentPage();
  if (!page) return false;
  copiedPage = JSON.parse(JSON.stringify(page));
  copiedObjects = [];
  copiedFromPageId = null;
  pasteOffsetCount = 0;
  showSaveToast(`📋 현재 슬라이드 복사 완료 (페이지 ${state.currentPageIndex + 1})`);
  return true;
}

function executeCopy() {
  const selection = window.getSelection();
  const selectedText = selection ? selection.toString() : "";
  if (selectedText && selectedText.trim().length > 0 && document.activeElement?.isContentEditable) {
    return false;
  }
  if (state.selectedIds.size > 0 && copySelectedObjects()) return true;
  return copyCurrentPage();
}

function executePaste() {
  if (copiedObjects && copiedObjects.length > 0) {
    return pasteCopiedObjects();
  }
  if (copiedPage) {
    return pasteCopiedPage();
  }
  showSaveToast("⚠️ 복사된 개체나 슬라이드가 없습니다.");
  return false;
}

function clonePageWithNewIds(sourcePage) {
  if (!sourcePage) return null;
  const clone = JSON.parse(JSON.stringify(sourcePage));
  clone.id = createId("page");
  if (clone.type === "cover") clone.type = "content";
  if (!Array.isArray(clone.objects)) clone.objects = [];
  const idMap = new Map();
  clone.objects.forEach((object) => {
    const oldId = object.id || createId("object");
    const newId = createId(object.role || object.type || "object");
    idMap.set(oldId, newId);
    object.id = newId;
  });
  clone.objects.forEach((object) => {
    if (object.parentId && idMap.has(object.parentId)) {
      object.parentId = idMap.get(object.parentId);
    }
  });
  return clone;
}

function pasteCopiedPage() {
  if (!copiedPage) return false;
  const clone = clonePageWithNewIds(copiedPage);
  if (!clone) return false;
  const insertIndex = state.currentPageIndex + 1;
  snapshot();
  state.pages.splice(insertIndex, 0, clone);
  state.currentPageIndex = insertIndex;
  state.selectedIds.clear();
  state.guides = [];
  hideTextToolbar();
  render();
  showSaveToast(`📋 슬라이드 붙여넣기 완료 (새 페이지 ${insertIndex + 1})`);
  return true;
}

function pasteCopiedObjects() {
  if (!copiedObjects || !Array.isArray(copiedObjects) || !copiedObjects.length) return false;
  const page = currentPage();
  if (!page || !Array.isArray(page.objects)) return false;

  const offset = ((pasteOffsetCount % 6) + 1) * 2;
  const idMap = new Map();
  copiedObjects.forEach((object) => {
    const oldId = object.id || createId("object");
    const newId = createId(object.role || object.type || "object");
    idMap.set(oldId, newId);
  });

  const targetMindRoot = page.objects.find((object) => object.root);
  const clones = [];

  copiedObjects.forEach((source) => {
    if (!source) return;
    const clone = JSON.parse(JSON.stringify(source));
    const newId = idMap.get(source.id) || createId(source.role || source.type || "object");
    clone.id = newId;

    const srcX = Number(source.x);
    const srcY = Number(source.y);
    const srcW = Number(source.w);
    const srcH = Number(source.h);

    const safeX = isNaN(srcX) ? 10 : srcX;
    const safeY = isNaN(srcY) ? 10 : srcY;
    const safeW = isNaN(srcW) ? 30 : srcW;
    const safeH = isNaN(srcH) ? 20 : srcH;

    if (source.x !== undefined || source.y !== undefined) {
      clone.x = clamp(0, safeX + offset, Math.max(0, 100 - safeW));
      clone.y = clamp(0, safeY + offset, Math.max(0, 100 - safeH));
    }

    if (source.root) {
      clone.root = false;
      clone.role = "mind-node";
      clone.node = true;
      clone.item = true;
      clone.parentId = copiedFromPageId === page.id ? source.id : targetMindRoot?.id || null;
      clone.mindLevel = clone.parentId ? 2 : 1;
    } else if (source.parentId) {
      clone.parentId = idMap.get(source.parentId)
        || (copiedFromPageId === page.id ? source.parentId : targetMindRoot?.id || null);
      if (copiedFromPageId !== page.id && clone.parentId === targetMindRoot?.id) clone.mindLevel = 2;
    }
    clones.push(clone);
  });

  if (!clones.length) return false;

  snapshot();
  page.objects.push(...clones);
  state.selectedIds = new Set(clones.map((object) => object.id));
  state.guides = [];
  pasteOffsetCount += 1;
  hideTextToolbar();
  render();
  showSaveToast(`📋 개체 ${clones.length}개 붙여넣기 완료`);
  return true;
}

document.addEventListener("keydown", (event) => {
  const activeEl = document.activeElement;
  const targetEl = event.target;
  const inFormField = ["INPUT", "TEXTAREA", "SELECT"].includes(activeEl?.tagName) || ["INPUT", "TEXTAREA", "SELECT"].includes(targetEl?.tagName);
  const isContentEditing = Boolean(
    activeEl?.isContentEditable ||
    targetEl?.isContentEditable ||
    activeEl?.closest?.("[contenteditable='true']") ||
    targetEl?.closest?.("[contenteditable='true']") ||
    document.querySelector(".canvas-text[contenteditable='true']")
  );
  const isEditingText = inFormField || isContentEditing;
  const modifier = event.ctrlKey || event.metaKey;
  const key = event.key ? event.key.toLowerCase() : "";
  const code = event.code || "";
  const keyCode = event.keyCode;

  const isFullscreen = document.fullscreenElement === stage;
  const page = currentPage();
  let targetTimers = [];

  if (isFullscreen) {
    const pageTimers = (page?.objects || []).filter((o) => o.type === "timer");
    const runningTimers = pageTimers.filter((o) => o.isRunning);
    targetTimers = runningTimers.length ? runningTimers : pageTimers;
  } else {
    targetTimers = (page?.objects || []).filter((o) => state.selectedIds.has(o.id) && o.type === "timer");
  }

  if (targetTimers.length > 0) {
    if (event.shiftKey && ["ArrowRight", "ArrowLeft", "ArrowUp", "ArrowDown"].includes(event.key)) {
      event.preventDefault();
      event.stopPropagation();
      let delta = 0;
      if (event.key === "ArrowRight") delta = 10;
      else if (event.key === "ArrowLeft") delta = -10;
      else if (event.key === "ArrowUp") delta = 60;
      else if (event.key === "ArrowDown") delta = -60;

      if (!isFullscreen) snapshot();

      targetTimers.forEach((timer) => {
        if (timer.mode === "stopwatch") {
          timer.elapsedSeconds = Math.max(0, (timer.elapsedSeconds || 0) + delta);
        } else {
          const curRem = typeof timer.remainingSeconds === "number" ? timer.remainingSeconds : (timer.duration || 300);
          timer.remainingSeconds = Math.max(0, curRem + delta);
          timer.duration = Math.max(0, (timer.duration || 300) + delta);
        }
      });

      updateRunningTimerDisplays();
      return;
    }

    if (modifier && ["ArrowUp", "ArrowDown"].includes(event.key)) {
      event.preventDefault();
      event.stopPropagation();
      const scaleDelta = event.key === "ArrowUp" ? 0.1 : -0.1;

      if (!isFullscreen) snapshot();

      targetTimers.forEach((timer) => {
        const curScale = typeof timer.timerFontSizeScale === "number" ? timer.timerFontSizeScale : 1.0;
        timer.timerFontSizeScale = Math.max(0.3, Math.min(3.0, Math.round((curScale + scaleDelta) * 10) / 10));
      });

      updateRunningTimerDisplays();
      return;
    }
  }

  if (document.fullscreenElement === stage) {
    if (["ArrowRight", " ", "PageDown"].includes(event.key)) {
      event.preventDefault();
      navigateFullscreenNext();
      return;
    }
    if (["ArrowLeft", "PageUp"].includes(event.key)) {
      event.preventDefault();
      navigateFullscreenPrev();
      return;
    }
  }

  const isAnimKey = (keyCode === 65 || code === "KeyA" || key === "a" || key === "ㅁ") && !modifier && !isEditingText;
  if (isAnimKey) {
    event.preventDefault();
    if (event.shiftKey) {
      snapshot();
      currentPage().objects.forEach((object) => delete object.animOrder);
      render();
      return;
    }
    toggleAnimMode(!isAnimMode);
    return;
  }

  const isMergeKey = (keyCode === 77 || code === "KeyM" || key === "m" || key === "ㅡ") && !modifier && !isEditingText;
  if (isMergeKey) {
    if (mergeSelectedCards()) {
      event.preventDefault();
      return;
    }
  }

  const isDeleteKey = ["Delete", "Del", "Backspace"].includes(event.key) || ["delete", "del", "backspace"].includes(key) || keyCode === 46 || keyCode === 8;
  if (isDeleteKey && !isEditingText) {
    if (deleteSelectedObjects()) {
      event.preventDefault();
      return;
    }
  }

  if (event.key === "Escape" || keyCode === 27) {
    if (isAnimMode) {
      toggleAnimMode(false);
      return;
    }
    state.selectedIds.clear();
    state.guides = [];
    hideTextToolbar();
    renderStage();
    return;
  }

  if (modifier && (event.key === "]" || event.key === "}") && !isEditingText) {
    event.preventDefault();
    if (event.shiftKey) bringToFrontSelectedObjects();
    else bringForwardSelectedObjects();
    return;
  }
  if (modifier && (event.key === "[" || event.key === "{") && !isEditingText) {
    event.preventDefault();
    if (event.shiftKey) sendToBackSelectedObjects();
    else sendBackwardSelectedObjects();
    return;
  }

  const isCopyKey = modifier && (keyCode === 67 || code === "KeyC" || key === "c" || key === "ㅊ");
  const isPasteKey = modifier && (keyCode === 86 || code === "KeyV" || key === "v" || key === "ㅍ");
  const isCutKey = modifier && (keyCode === 88 || code === "KeyX" || key === "x" || key === "ㅌ");
  const isUndoKey = modifier && (keyCode === 90 || code === "KeyZ" || key === "z" || key === "ㅋ");

  if (isCopyKey && !isEditingText) {
    event.preventDefault();
    event.stopPropagation();
    executeCopy();
    return;
  }
  if (isPasteKey && !isEditingText) {
    event.preventDefault();
    event.stopPropagation();
    executePaste();
    return;
  }
  if (isCutKey && !isEditingText) {
    event.preventDefault();
    if (executeCopy()) {
      deleteSelectedObjects();
      showSaveToast("✂️ 개체 잘라내기 완료");
    }
    return;
  }
  if (isUndoKey && !isEditingText) {
    event.preventDefault();
    undo();
    return;
  }
  if (event.key === "Tab" && !isEditingText) {
    if (changeSelectedBulletHierarchy(event.shiftKey ? -1 : 1)) {
      event.preventDefault();
      return;
    }
  }
  const isFullscreenKey = (keyCode === 70 || code === "KeyF" || key === "f" || key === "ㄹ") && !isEditingText;
  if (isFullscreenKey) {
    event.preventDefault();
    $("#fullscreenButton").click();
  }
  if (event.key === "Escape") {
    state.selectedIds.clear();
    state.guides = [];
    hideTextToolbar();
    renderStage();
  }
});

window.addEventListener("resize", () => requestAnimationFrame(fitAllText));
populateVariantSelects();
render();

function normalizeAiText(value, maxLength = 220) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function getAiItems(slide) {
  const source = Array.isArray(slide?.items)
    ? slide.items
    : Array.isArray(slide?.bullets)
      ? slide.bullets
      : [];
  return source
    .map((item) => normalizeAiText(item))
    .filter(Boolean)
    .slice(0, MAX_ITEMS);
}

function getAiChartData(slide) {
  if (!Array.isArray(slide?.chartData)) return [];
  return slide.chartData
    .map((item, index) => ({
      label: normalizeAiText(item?.label || `항목 ${index + 1}`, 40),
      value: Number(item?.value)
    }))
    .filter((item) => item.label && Number.isFinite(item.value) && item.value >= 0)
    .slice(0, CHART_MAX_ITEMS);
}

function getAiTableData(slide) {
  if (!Array.isArray(slide?.tableData)) return [];
  return slide.tableData
    .filter(Array.isArray)
    .slice(0, 9)
    .map((row) => row.slice(0, 6).map((cell) => normalizeAiText(cell, 80)))
    .filter((row) => row.some(Boolean));
}

function createAiBulletPage(slide, suppliedItems) {
  const page = createContentPage();
  const items = suppliedItems || getAiItems(slide);
  buildTemplate(page, "bullet");
  const title = page.objects.find((object) => object.role === "page-title");
  if (title) title.text = normalizeAiText(slide?.title, 100) || "핵심 내용";
  page.objects = page.objects.filter((object) => object.role !== "bullet-item");
  const bulletItems = (items.length ? items : ["내용을 입력하세요."]).map((text) => (
    createTextObject("bullet-item", text, 12, 0, 75, 9, { item: true, bulletLevel: 1 })
  ));
  page.objects.push(...bulletItems);
  layoutBulletItems(page);
  return page;
}

function createAiMindmapPage(slide) {
  const page = createContentPage();
  const root = createTextObject(
    "mind-root",
    normalizeAiText(slide?.title, 70) || "핵심 주제",
    42,
    45,
    16,
    14,
    { item: false, node: true, root: true, mindLevel: 1 }
  );
  const items = getAiItems(slide);
  const branches = (items.length ? items : ["핵심 내용"])
    .slice(0, 8)
    .map((text) => createMindNode(text, root.id, 2));
  page.template = "mindmap";
  page.objectCategory = "diagram";
  page.variant = "connectedCircles";
  page.objects = [root, ...branches];
  layoutMindmapTree(page);
  return page;
}

function createAiObjectPage(slide) {
  const requestedCategory = normalizeAiText(slide?.category, 20).toLowerCase();
  const category = Object.hasOwn(AI_OBJECT_VARIANTS, requestedCategory) ? requestedCategory : "layout";
  const requestedVariant = normalizeAiText(slide?.variant, 40);
  const variant = AI_OBJECT_VARIANTS[category].has(requestedVariant)
    ? requestedVariant
    : AI_OBJECT_DEFAULT_VARIANTS[category];
  const items = getAiItems(slide);
  const chartData = getAiChartData(slide);
  const tableData = getAiTableData(slide);

  // 숫자가 없는 응답으로 기본 예시 차트를 노출하지 않는다.
  if (category === "chart" && chartData.length < CHART_MIN_ITEMS) {
    return createAiBulletPage(slide, items);
  }

  const page = createContentPage();
  page.template = "object";
  page.objectCategory = category;
  page.variant = variant;
  const requestedCount = category === "chart"
    ? chartData.length
    : tableData.length > 1
      ? tableData.length - 1
      : items.length || 3;
  buildObjectTemplate(page, requestedCount);

  const title = page.objects.find((object) => object.role === "page-title");
  if (title) title.text = normalizeAiText(slide?.title, 100) || "핵심 내용";

  if (category === "chart") {
    const chart = page.objects.find((object) => object.type === "chart");
    if (chart) {
      chart.data = chartData;
      chart.x = 5;
      chart.y = 16;
      chart.w = 90;
      chart.h = 79;
    }
  }

  const table = page.objects.find((object) => object.type === "table");
  if (table && tableData.length >= 2) table.cells = tableData;

  const textTargets = page.objects.filter((object) => (
    object.type === "text"
    && object.role !== "page-title"
    && object.role !== "vs-label"
    && object.role !== "media-placeholder"
  ));
  textTargets.forEach((target, index) => {
    target.text = items[index] || "";
  });
  return page;
}

function createAiContentPage(slide) {
  const requestedTemplate = normalizeAiText(slide?.template, 20).toLowerCase();
  const template = AI_TEMPLATES.has(requestedTemplate) ? requestedTemplate : "bullet";
  if (template === "mindmap") return createAiMindmapPage(slide);
  if (template === "object") return createAiObjectPage(slide);
  return createAiBulletPage(slide);
}

window.LocalPptApp = {
  startBlank(options = {}) {
    state.design = options.design || "bauhaus";
    state.customPalette = options.customPalette || null;
    state.fixedOverlays = options.fixedOverlays || defaultFixedOverlays();
    state.pages = [createCoverPage()];
    state.currentPageIndex = 0;
    state.selectedIds.clear();
    state.guides = [];
    state.history = [];
    hideTextToolbar();
    render();
  },
  loadProjectFile,
  applyAiPresentation(presentation, options = {}) {
    const title = String(presentation?.title || "AI PRESENTATION").trim().slice(0, 90) || "AI PRESENTATION";
    const slides = Array.isArray(presentation?.slides) ? presentation.slides.slice(0, 30) : [];
    if (!slides.length) throw new Error("AI 응답에 만들 슬라이드가 없습니다.");
    state.design = options.design || "bauhaus";
    state.customPalette = options.customPalette || null;
    state.fixedOverlays = options.fixedOverlays || defaultFixedOverlays();
    const cover = createCoverPage();
    cover.objects.find((object) => object.role === "cover-title").text = title;
    cover.objects.find((object) => object.role === "cover-subtitle").text = String(presentation?.subtitle || "AI가 생성한 프레젠테이션 초안").trim().slice(0, 160);
    state.pages = [cover, ...slides.map(createAiContentPage)];
    state.currentPageIndex = 0;
    state.selectedIds.clear();
    state.guides = [];
    state.history = [];
    currentProjectFileHandle = null;
    currentProjectFileName = "local-ppt.txt";
    document.title = "Local PPT 2";
    hideTextToolbar();
    render();
  },
  getOptions() {
    return {
      design: state.design,
      customPalette: getCurrentPalette(),
      fixedOverlays: state.fixedOverlays
    };
  },
  updateOptions(options = {}) {
    snapshot();
    if (options.design) state.design = options.design;
    if (options.customPalette) state.customPalette = options.customPalette;
    if (options.fixedOverlays) state.fixedOverlays = options.fixedOverlays;
    render();
  }
};
