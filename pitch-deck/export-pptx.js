/*
 * Codapac pitch deck → PowerPoint export
 * Uses PptxGenJS (https://github.com/gitbrent/PptxGenJS)
 *
 * Run with:  node export-pptx.js
 * Output:    codapac-pitch.pptx  (next to this script)
 */

const path = require("path");
const pptxgen = require("pptxgenjs");

const OUT_FILE = path.join(__dirname, "codapac-pitch.pptx");
const DASHBOARD_IMG = path.join(__dirname, "dashboard.png");

// ────────────────────────────────────────────────────────────────────────
// Presentation setup
// ────────────────────────────────────────────────────────────────────────
const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE"; // 13.333 × 7.5 inches (16:9)
pres.title = "Codapac Pitch";
pres.author = "Codapac";
pres.company = "Codapac";
pres.subject = "A familiar software delivery workspace for non-technical builders";

// Slide dimensions
const W = 13.333;
const H = 7.5;
const MARGIN_X = 0.9;
const CONTENT_W = W - MARGIN_X * 2;

// Brand palette (6-digit RGB only — PptxGenJS rejects alpha)
const C = {
  ink:        "101418",
  ink2:       "2A3039",
  muted:      "6B7280",
  muted2:     "9AA3AD",
  line:       "DBE3EC",
  lineStrong: "C3CEDA",
  accent:     "EA6D1E",
  accentSoft: "FFD9A8",
  accentTint: "FCEBDE",   // ~13% orange on white
  accentWash: "FDF3EB",   // ~8% orange on white
  bgTop:      "D9E6F2",
  bgMain:     "EEF4F9",
  cardWhite:  "FFFFFF",
  okGreen:    "059669",
  warnAmber:  "D97706",
  grayNo:     "9CA3AF",
  // Whites blended on dark ink background for text/secondary text
  darkText1:  "DBDCDE",   // ~85% white on ink
  darkText2:  "B9BBBE",   // ~75% white on ink
  darkText3:  "C9CACC",   // ~80% white on ink
};

// Fonts (Office-safe)
const F = {
  serif: "Georgia",
  sans:  "Calibri",
  mono:  "Consolas",
};

// ────────────────────────────────────────────────────────────────────────
// Master slide (background + faint top band)
// ────────────────────────────────────────────────────────────────────────
pres.defineSlideMaster({
  title: "MASTER",
  background: { color: C.bgMain },
  objects: [
    // Top band to echo the HTML sky-blue gradient
    { rect: { x: 0, y: 0, w: W, h: 1.1, fill: { color: C.bgTop }, line: { color: C.bgTop } } },
  ],
});

// ────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────
function addLogo(slide, { x, y, size = 0.36, wordSize = 11, showDot = true }) {
  // Orange rounded icon
  slide.addShape("roundRect", {
    x, y, w: size, h: size,
    rectRadius: 0.07,
    fill: { color: C.accent },
    line: { color: C.accent },
  });
  // Cube mark (use a filled diamond character as stand-in)
  slide.addText("◆", {
    x, y, w: size, h: size,
    fontSize: wordSize * 1.4,
    fontFace: F.sans,
    color: "FFFFFF", align: "center", valign: "middle", bold: true,
  });
  // Wordmark
  const wordX = x + size + 0.12;
  const word = [
    { text: "CODA", options: { color: C.muted, bold: false } },
    { text: "PAC",  options: { color: C.ink,   bold: true  } },
  ];
  if (showDot) word.push({ text: "  •", options: { color: C.accent, bold: true } });
  slide.addText(word, {
    x: wordX, y, w: 4, h: size,
    fontSize: wordSize,
    fontFace: F.sans,
    valign: "middle",
    charSpacing: 3,
  });
}

function addHeader(slide, pageLabel, pageNum) {
  addLogo(slide, { x: MARGIN_X, y: 0.3, size: 0.34, wordSize: 10 });
  slide.addText(`${pageLabel}     ${pageNum} / 12`, {
    x: W - MARGIN_X - 3, y: 0.3, w: 3, h: 0.34,
    fontSize: 10, fontFace: F.sans,
    color: C.muted, align: "right", valign: "middle",
    charSpacing: 2,
  });
}

function addKicker(slide, text, { x = MARGIN_X, y, w = CONTENT_W } = {}) {
  slide.addText(
    [
      { text: "●  ", options: { color: C.accent, bold: true } },
      { text: text.toUpperCase(), options: { color: C.muted, bold: true } },
    ],
    {
      x, y, w, h: 0.3,
      fontSize: 10, fontFace: F.sans,
      charSpacing: 4, valign: "top",
    }
  );
}

/**
 * A mixed serif headline: plain ink segments + italic orange emphasis.
 * segs = [{text, em?}, ...]
 */
function addHeadline(slide, segs, { x = MARGIN_X, y, w = CONTENT_W, h = 1.6, fontSize = 40 } = {}) {
  const runs = segs.map(seg => ({
    text: seg.text,
    options: {
      color: seg.em ? C.accent : C.ink,
      italic: !!seg.em,
      bold: false,
      fontFace: F.serif,
    },
  }));
  slide.addText(runs, {
    x, y, w, h,
    fontSize,
    fontFace: F.serif,
    valign: "top",
    paraSpaceAfter: 0,
    lineSpacingMultiple: 1.05,
  });
}

function addBody(slide, segs, { x = MARGIN_X, y, w = CONTENT_W, h = 1.0, fontSize = 16, color = C.ink2 } = {}) {
  const runs = Array.isArray(segs) ? segs.map(s => ({
    text: s.text,
    options: {
      color: s.strong ? C.ink : (s.em ? C.accent : color),
      bold: !!s.strong,
      italic: !!s.em,
      fontFace: F.sans,
    },
  })) : [{ text: segs, options: { color, fontFace: F.sans } }];
  slide.addText(runs, {
    x, y, w, h,
    fontSize,
    fontFace: F.sans,
    valign: "top",
    lineSpacingMultiple: 1.4,
  });
}

function addCard(slide, { x, y, w, h, kicker, titleSegs, body, dark = false, padding = 0.3 }) {
  slide.addShape("roundRect", {
    x, y, w, h,
    rectRadius: 0.15,
    fill: { color: dark ? C.ink : C.cardWhite },
    line: { color: dark ? C.ink : C.line, width: 0.75 },
  });
  let cy = y + padding;
  if (kicker) {
    slide.addText(
      [
        { text: "●  ", options: { color: dark ? C.accent : C.accent } },
        { text: kicker.toUpperCase(), options: { color: dark ? C.darkText3 : C.muted, bold: true } },
      ],
      {
        x: x + padding, y: cy, w: w - padding * 2, h: 0.25,
        fontSize: 9, fontFace: F.sans, charSpacing: 4, valign: "top",
      }
    );
    cy += 0.3;
  }
  if (titleSegs) {
    const runs = titleSegs.map(s => ({
      text: s.text,
      options: {
        color: s.em ? (dark ? C.accent : C.accent) : (dark ? "FFFFFF" : C.ink),
        italic: !!s.em,
        fontFace: F.serif,
      },
    }));
    slide.addText(runs, {
      x: x + padding, y: cy, w: w - padding * 2, h: 1.1,
      fontSize: 20, fontFace: F.serif, valign: "top",
      lineSpacingMultiple: 1.1,
    });
    cy += 1.1;
  }
  if (body) {
    slide.addText(body, {
      x: x + padding, y: cy, w: w - padding * 2, h: h - (cy - y) - padding,
      fontSize: 11, fontFace: F.sans,
      color: dark ? C.darkText2 : C.muted,
      valign: "top",
      lineSpacingMultiple: 1.35,
    });
  }
}

// ────────────────────────────────────────────────────────────────────────
// Slide 01 — Cover
// ────────────────────────────────────────────────────────────────────────
(function slideCover() {
  const s = pres.addSlide({ masterName: "MASTER" });

  const cx = W / 2;
  const iconSize = 1.25;
  const iconX = cx - 2.2;
  const iconY = 2.9;

  // Big orange icon
  s.addShape("roundRect", {
    x: iconX, y: iconY, w: iconSize, h: iconSize,
    rectRadius: 0.26,
    fill: { color: C.accent },
    line: { color: C.accent },
  });
  s.addText("◆", {
    x: iconX, y: iconY, w: iconSize, h: iconSize,
    fontSize: 60, fontFace: F.sans,
    color: "FFFFFF", align: "center", valign: "middle", bold: true,
  });

  // Big wordmark
  s.addText(
    [
      { text: "CODA", options: { color: C.muted } },
      { text: "PAC",  options: { color: C.ink, bold: true } },
      { text: "  •",  options: { color: C.accent, bold: true } },
    ],
    {
      x: iconX + iconSize + 0.25, y: iconY, w: 6, h: iconSize,
      fontSize: 54, fontFace: F.sans,
      valign: "middle", charSpacing: 8,
    }
  );

  // Tagline
  s.addText(
    [
      { text: "A familiar software delivery workspace ", options: { color: C.ink, fontFace: F.sans } },
      { text: "for non-technical builders.",              options: { color: C.accent, italic: true, fontFace: F.serif } },
    ],
    {
      x: 2.0, y: 4.7, w: W - 4.0, h: 0.7,
      fontSize: 20, align: "center", valign: "top",
    }
  );
})();

// ────────────────────────────────────────────────────────────────────────
// Slide 02 — The Problem
// ────────────────────────────────────────────────────────────────────────
(function slideProblem() {
  const s = pres.addSlide({ masterName: "MASTER" });
  addHeader(s, "The Problem", "02");

  addKicker(s, "01 — The problem", { y: 1.15 });
  addHeadline(s, [
    { text: "Non-technical people are already building. " },
    { text: "They just can't see what's happening.", em: true },
  ], { y: 1.5, h: 1.7, fontSize: 38 });
  addBody(s, [
    { text: "Founders, PMs, and domain experts already shape the product every day. But their role gets flattened into chats, documents, and waiting for someone technical to translate." },
  ], { y: 3.25, h: 0.9, fontSize: 14 });

  // Three cards
  const cardY = 4.3;
  const cardH = 2.1;
  const gap = 0.25;
  const cardW = (CONTENT_W - gap * 2) / 3;

  const cards = [
    { kicker: "Today · Chats",   title: [{ text: "All context, " }, { text: "no structure.", em: true }],
      body: "Ideas and decisions scatter across Slack threads, DMs, and AI replies. Nothing survives the week." },
    { kicker: "Today · Docs",    title: [{ text: "Easy to write, " }, { text: "hard to act on.", em: true }],
      body: "Specs and briefs pile up in Notion. They describe the work, but never actually move it forward." },
    { kicker: "Today · Waiting", title: [{ text: "Every step needs " }, { text: "a translator.", em: true }],
      body: "Progress stalls behind a developer who has to interpret, estimate, and relay every change." },
  ];

  cards.forEach((card, i) => {
    addCard(s, {
      x: MARGIN_X + i * (cardW + gap),
      y: cardY, w: cardW, h: cardH,
      kicker: card.kicker,
      titleSegs: card.title,
      body: card.body,
    });
  });

  // Closing tagline
  addBody(s, [
    { text: "Pure chat interfaces aren't enough — software work is naturally " },
    { text: "task-based, stateful, and collaborative.", strong: true },
  ], { y: 6.65, h: 0.55, fontSize: 12, color: C.muted });
})();

// ────────────────────────────────────────────────────────────────────────
// Slide 03 — The Insight
// ────────────────────────────────────────────────────────────────────────
(function slideInsight() {
  const s = pres.addSlide({ masterName: "MASTER" });
  addHeader(s, "The Insight", "03");

  addKicker(s, "02 — The insight", { y: 1.15 });
  addHeadline(s, [
    { text: "People don't need a reply. " },
    { text: "They need a workspace.", em: true },
  ], { y: 1.5, h: 1.7, fontSize: 38 });
  addBody(s, [
    { text: "Everyone who ships work is comfortable with " },
    { text: "boards, tasks, and visible workflow.", strong: true },
    { text: " Software should feel the same — not a black box." },
  ], { y: 3.25, h: 0.9, fontSize: 14 });

  // Before / after split
  const cy = 4.35;
  const ch = 2.55;
  const gap = 0.3;
  const cw = (CONTENT_W - gap) / 2;

  // Left "chat only"
  const leftX = MARGIN_X;
  s.addShape("roundRect", {
    x: leftX, y: cy, w: cw, h: ch, rectRadius: 0.18,
    fill: { color: C.cardWhite }, line: { color: C.line, width: 0.75 },
  });
  s.addText([
    { text: "●  ", options: { color: C.accent } },
    { text: "CHAT ONLY", options: { color: C.muted, bold: true } },
  ], {
    x: leftX + 0.3, y: cy + 0.25, w: cw - 0.6, h: 0.25,
    fontSize: 9, fontFace: F.sans, charSpacing: 4, valign: "top",
  });
  s.addText([
    { text: "Talk. ", options: { color: C.ink } },
    { text: "Hope.", options: { color: C.accent, italic: true } },
  ], {
    x: leftX + 0.3, y: cy + 0.55, w: cw - 0.6, h: 0.55,
    fontSize: 22, fontFace: F.serif, valign: "top",
  });
  const leftItems = [
    "✕  No persistent state between turns",
    "✕  Invisible progress",
    "✕  One operator at a time",
    "✕  No structure to follow",
  ];
  leftItems.forEach((item, i) => {
    s.addText(item, {
      x: leftX + 0.3, y: cy + 1.2 + i * 0.3, w: cw - 0.6, h: 0.28,
      fontSize: 11.5, fontFace: F.sans, color: C.ink2, valign: "top",
    });
  });

  // Right "Codapac workspace" (dark)
  const rightX = MARGIN_X + cw + gap;
  s.addShape("roundRect", {
    x: rightX, y: cy, w: cw, h: ch, rectRadius: 0.18,
    fill: { color: C.ink }, line: { color: C.ink },
  });
  s.addText([
    { text: "●  ", options: { color: C.accent } },
    { text: "CODAPAC WORKSPACE", options: { color: C.accentSoft, bold: true } },
  ], {
    x: rightX + 0.3, y: cy + 0.25, w: cw - 0.6, h: 0.25,
    fontSize: 9, fontFace: F.sans, charSpacing: 4, valign: "top",
  });
  s.addText([
    { text: "Plan. Build. ", options: { color: "FFFFFF" } },
    { text: "See it ship.", options: { color: C.accent, italic: true } },
  ], {
    x: rightX + 0.3, y: cy + 0.55, w: cw - 0.6, h: 0.55,
    fontSize: 22, fontFace: F.serif, valign: "top",
  });
  const rightItems = [
    "✓  Project state you can scan at a glance",
    "✓  Every step visible on a board",
    "✓  Shared context for the whole team",
    "✓  Familiar structure, powered by AI",
  ];
  rightItems.forEach((item, i) => {
    s.addText(item, {
      x: rightX + 0.3, y: cy + 1.2 + i * 0.3, w: cw - 0.6, h: 0.28,
      fontSize: 11.5, fontFace: F.sans, color: C.darkText1, valign: "top",
    });
  });
})();

// ────────────────────────────────────────────────────────────────────────
// Slide 04 — The Solution
// ────────────────────────────────────────────────────────────────────────
(function slideSolution() {
  const s = pres.addSlide({ masterName: "MASTER" });
  addHeader(s, "The Solution", "04");

  addKicker(s, "03 — The solution", { y: 1.15 });
  addHeadline(s, [
    { text: "One workspace for " },
    { text: "the whole delivery flow.", em: true },
  ], { y: 1.5, h: 1.4, fontSize: 42 });
  addBody(s, [
    { text: "Chat, planning, execution, QA, and deployment — in one familiar environment that feels like a real product workspace." },
  ], { y: 3.15, h: 0.75, fontSize: 14 });

  // 2×3 feature grid
  const features = [
    ["Project chat",       "Shared conversation with the AI squad, scoped to one project."],
    ["Kanban board",       "Plan, Build, QA, Shipped — the lanes every team already knows."],
    ["Task planning",      "Every request becomes reviewable tasks, not an invisible prompt."],
    ["Execution tracking", "Live status as agents pick up, work, and hand off each task."],
    ["QA status",          "Tests, checks, and previews surfaced beside the work, not hidden."],
    ["Deploy visibility",  "Preview URLs and releases shown in-project, one click to open."],
  ];
  const cols = 3, rows = 2;
  const gap = 0.2;
  const cw = (CONTENT_W - gap * (cols - 1)) / cols;
  const ch = 1.35;
  const startY = 4.15;

  features.forEach((f, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = MARGIN_X + col * (cw + gap);
    const y = startY + row * (ch + gap);
    s.addShape("roundRect", {
      x, y, w: cw, h: ch, rectRadius: 0.14,
      fill: { color: C.cardWhite }, line: { color: C.line, width: 0.75 },
    });
    // Accent icon square
    s.addShape("roundRect", {
      x: x + 0.25, y: y + 0.25, w: 0.36, h: 0.36, rectRadius: 0.08,
      fill: { color: C.accentTint }, line: { color: C.accentTint },
    });
    s.addText("◆", {
      x: x + 0.25, y: y + 0.25, w: 0.36, h: 0.36,
      fontSize: 14, fontFace: F.sans,
      color: C.accent, align: "center", valign: "middle", bold: true,
    });
    s.addText(f[0], {
      x: x + 0.75, y: y + 0.23, w: cw - 1.0, h: 0.4,
      fontSize: 14, fontFace: F.serif, color: C.ink, valign: "middle",
    });
    s.addText(f[1], {
      x: x + 0.25, y: y + 0.75, w: cw - 0.5, h: 0.55,
      fontSize: 10.5, fontFace: F.sans, color: C.muted, valign: "top",
      lineSpacingMultiple: 1.3,
    });
  });
})();

// ────────────────────────────────────────────────────────────────────────
// Slide 05 — Why this matters
// ────────────────────────────────────────────────────────────────────────
(function slideWhy() {
  const s = pres.addSlide({ masterName: "MASTER" });
  addHeader(s, "Why It Matters", "05");

  addKicker(s, "04 — Why this matters", { y: 1.15 });
  addHeadline(s, [
    { text: "Visibility. Control. " },
    { text: "Trust.", em: true },
  ], { y: 1.5, h: 1.4, fontSize: 46 });
  addBody(s, [
    { text: "The value isn't only what the AI produces — it's what the humans around it can see, steer, and believe in." },
  ], { y: 3.15, h: 0.75, fontSize: 14 });

  const cards = [
    { kicker: "Control",    title: [{ text: "Non-technical stakeholders " }, { text: "drive, not wait.", em: true }],
      body: "Shape scope, approve tasks, and redirect work without booking a sync with a developer.", dark: false },
    { kicker: "Visibility", title: [{ text: "Every stage is " }, { text: "observable, not implied.", em: true }],
      body: "Plans, progress, QA, and deploys live on one board — nothing hides in a developer's head.", dark: true },
    { kicker: "Trust",      title: [{ text: "Progress is " }, { text: "shown, not promised.", em: true }],
      body: "Structured delivery replaces \"almost done\" with a status anyone on the team can verify.", dark: false },
  ];

  const gap = 0.25;
  const cw = (CONTENT_W - gap * 2) / 3;
  const ch = 2.75;
  const cy = 4.15;
  cards.forEach((c, i) => {
    addCard(s, {
      x: MARGIN_X + i * (cw + gap), y: cy, w: cw, h: ch,
      kicker: c.kicker, titleSegs: c.title, body: c.body, dark: c.dark, padding: 0.32,
    });
  });
})();

// ────────────────────────────────────────────────────────────────────────
// Slide 06 — How it works
// ────────────────────────────────────────────────────────────────────────
(function slideHow() {
  const s = pres.addSlide({ masterName: "MASTER" });
  addHeader(s, "How It Works", "06");

  addKicker(s, "05 — How it works", { y: 1.15 });
  addHeadline(s, [
    { text: "Prompt in. " },
    { text: "Product out.", em: true },
  ], { y: 1.5, h: 1.4, fontSize: 48 });
  addBody(s, "Six familiar steps. No ceremony. No sprint-planning theatre.", { y: 3.15, h: 0.5, fontSize: 14 });

  const steps = [
    ["01", "Create a project",        "Name it. Pick a repo or start fresh."],
    ["02", "Describe what you want",  "Plain English. No templates, no jargon."],
    ["03", "Review generated tasks",  "Approve, edit, or reorder on the board."],
    ["04", "Follow execution",        "Watch agents move tasks through the lanes."],
    ["05", "See QA results",          "Checks, tests, and reviews — inline."],
    ["06", "Open the preview",        "A live deployed URL, ready to share."],
  ];
  const gap = 0.16;
  const cw = (CONTENT_W - gap * 5) / 6;
  const ch = 2.0;
  const cy = 4.0;

  steps.forEach((st, i) => {
    const x = MARGIN_X + i * (cw + gap);
    s.addShape("roundRect", {
      x, y: cy, w: cw, h: ch, rectRadius: 0.12,
      fill: { color: C.cardWhite }, line: { color: C.line, width: 0.75 },
    });
    s.addText(st[0], {
      x: x + 0.22, y: cy + 0.25, w: cw - 0.44, h: 0.26,
      fontSize: 9, fontFace: F.mono, color: C.muted, charSpacing: 4,
    });
    s.addText(st[1], {
      x: x + 0.22, y: cy + 0.55, w: cw - 0.44, h: 0.7,
      fontSize: 13, fontFace: F.serif, color: C.ink, valign: "top",
      lineSpacingMultiple: 1.1,
    });
    s.addText(st[2], {
      x: x + 0.22, y: cy + 1.25, w: cw - 0.44, h: 0.7,
      fontSize: 9.5, fontFace: F.sans, color: C.muted, valign: "top",
      lineSpacingMultiple: 1.3,
    });
  });

  addBody(s, [
    { text: "The important part: you're not just reading a chat reply. You're " },
    { text: "watching a real project move.", strong: true },
  ], { y: 6.25, h: 0.5, fontSize: 12, color: C.muted });
})();

// ────────────────────────────────────────────────────────────────────────
// Slide 07 — Key features
// ────────────────────────────────────────────────────────────────────────
(function slideFeatures() {
  const s = pres.addSlide({ masterName: "MASTER" });
  addHeader(s, "Key Features", "07");

  addKicker(s, "06 — Key features", { y: 1.15 });
  addHeadline(s, [
    { text: "Software delivery, " },
    { text: "made familiar.", em: true },
  ], { y: 1.5, h: 1.4, fontSize: 44 });
  addBody(s, "Every feature borrows a pattern users already know — and puts an AI squad behind it.",
    { y: 3.15, h: 0.7, fontSize: 14 });

  const features = [
    ["Familiar dashboard",   "Project list, boards, tasks — the shapes teams already use."],
    ["Task-based flow",      "Work lives as tasks you can scan, not messages you reread."],
    ["Visible transitions",  "See a task move: Plan → Build → QA → Shipped, in real time."],
    ["One workspace",        "Planning, build, QA, and deploy — one surface, one truth."],
    ["Inline preview",       "Deployed URL surfaced in-project — no copy-paste hunts."],
  ];
  const gap = 0.2;
  const cw = (CONTENT_W - gap * 4) / 5;
  const ch = 2.4;
  const cy = 4.1;

  features.forEach((f, i) => {
    const x = MARGIN_X + i * (cw + gap);
    s.addShape("roundRect", {
      x, y: cy, w: cw, h: ch, rectRadius: 0.14,
      fill: { color: C.cardWhite }, line: { color: C.line, width: 0.75 },
    });
    s.addShape("roundRect", {
      x: x + 0.25, y: cy + 0.28, w: 0.4, h: 0.4, rectRadius: 0.08,
      fill: { color: C.accentTint }, line: { color: C.accentTint },
    });
    s.addText("◆", {
      x: x + 0.25, y: cy + 0.28, w: 0.4, h: 0.4,
      fontSize: 15, fontFace: F.sans,
      color: C.accent, align: "center", valign: "middle", bold: true,
    });
    s.addText(f[0], {
      x: x + 0.25, y: cy + 0.85, w: cw - 0.5, h: 0.6,
      fontSize: 14, fontFace: F.serif, color: C.ink, valign: "top",
      lineSpacingMultiple: 1.1,
    });
    s.addText(f[1], {
      x: x + 0.25, y: cy + 1.45, w: cw - 0.5, h: 0.85,
      fontSize: 10.5, fontFace: F.sans, color: C.muted, valign: "top",
      lineSpacingMultiple: 1.35,
    });
  });
})();

// ────────────────────────────────────────────────────────────────────────
// Slide 08 — Differentiation (versus table)
// ────────────────────────────────────────────────────────────────────────
(function slideDifferent() {
  const s = pres.addSlide({ masterName: "MASTER" });
  addHeader(s, "Differentiation", "08");

  addKicker(s, "07 — What makes Codapac different", { y: 1.15 });
  addHeadline(s, [
    { text: "Not a chatbot. Not a board. " },
    { text: "A delivery workspace.", em: true },
  ], { y: 1.5, h: 1.7, fontSize: 36 });
  addBody(s, "Existing tools each solve one slice. Codapac is the first that assembles all of them for non-technical builders.",
    { y: 3.3, h: 0.6, fontSize: 13 });

  // Versus table
  const tableY = 4.0;
  const tableH = 2.8;
  const cols = [0.28, 0.18, 0.18, 0.18, 0.18]; // fractions
  const colX = [];
  let acc = 0;
  cols.forEach(frac => { colX.push(acc); acc += frac * CONTENT_W; });
  const colW = cols.map(f => f * CONTENT_W);

  const rows = [
    ["",                              "AI chatbot",       "Project board",   "Code generator",  "Codapac"],
    ["Task-based workflow",           "○ Chat-only",      "● Manual",        "○ None",          "● Generated & reviewable"],
    ["Visible execution",             "○",                "◐ Status only",   "○",               "● Live agent lanes"],
    ["QA & preview inline",           "○",                "○",               "◐ External",      "● Built-in"],
    ["Built for non-technical users", "◐",                "●",               "○",               "●"],
  ];
  const rowH = tableH / rows.length;

  // Container
  s.addShape("roundRect", {
    x: MARGIN_X, y: tableY, w: CONTENT_W, h: tableH, rectRadius: 0.15,
    fill: { color: C.cardWhite }, line: { color: C.line, width: 0.75 },
  });

  // Header row (Codapac column highlighted dark)
  s.addShape("rect", {
    x: MARGIN_X + colX[4], y: tableY, w: colW[4], h: rowH,
    fill: { color: C.ink }, line: { color: C.ink },
  });

  rows.forEach((row, ri) => {
    const ry = tableY + ri * rowH;
    const isHeader = ri === 0;
    const isCodaCol = ri > 0;

    row.forEach((cell, ci) => {
      const cx = MARGIN_X + colX[ci];
      const cw = colW[ci];
      const isCodaCell = ci === 4;

      // Highlight Codapac column cells (body rows) with orange tint
      if (!isHeader && isCodaCell) {
        s.addShape("rect", {
          x: cx, y: ry, w: cw, h: rowH,
          fill: { color: C.accentWash }, line: { color: C.accentWash },
        });
      }

      // Text
      let text = cell;
      let color = isHeader ? (isCodaCell ? "FFFFFF" : C.muted) : (ci === 0 ? C.ink : C.ink2);
      let fontSize = isHeader ? 10 : 11.5;
      let charSpacing = isHeader ? 4 : 0;
      let bold = isHeader;
      const fontFace = F.sans;
      const italic = false;

      // Colorize symbols in body cells
      if (!isHeader && ci > 0) {
        const first = text.slice(0, 1);
        const rest = text.slice(1);
        let symColor = C.grayNo;
        if (first === "●") symColor = C.okGreen;
        if (first === "◐") symColor = C.warnAmber;
        if (first === "○") symColor = C.grayNo;
        s.addText([
          { text: first + " ", options: { color: symColor, bold: true } },
          { text: rest, options: { color: isCodaCell ? C.ink : C.ink2, bold: isCodaCell } },
        ], {
          x: cx + 0.18, y: ry, w: cw - 0.36, h: rowH,
          fontSize, fontFace, valign: "middle",
        });
      } else {
        s.addText(text.toString(), {
          x: cx + 0.2, y: ry, w: cw - 0.4, h: rowH,
          fontSize, fontFace, color, bold, italic, charSpacing,
          valign: "middle",
        });
      }

      // Bottom border (thin line) except last row
      if (ri < rows.length - 1) {
        s.addShape("line", {
          x: cx, y: ry + rowH, w: cw, h: 0,
          line: { color: C.line, width: 0.5 },
        });
      }
      // Right border between columns
      if (ci < row.length - 1) {
        s.addShape("line", {
          x: cx + cw, y: ry, w: 0, h: rowH,
          line: { color: C.line, width: 0.5 },
        });
      }
    });
  });
})();

// ────────────────────────────────────────────────────────────────────────
// Slide 09 — Technical approach (dashboard image)
// ────────────────────────────────────────────────────────────────────────
(function slideTech() {
  const s = pres.addSlide({ masterName: "MASTER" });
  addHeader(s, "Technical Approach", "09");

  addKicker(s, "08 — Technical approach", { y: 1.15 });
  addHeadline(s, [
    { text: "Orchestration " },
    { text: "over inference.", em: true },
  ], { y: 1.5, h: 1.1, fontSize: 42 });
  addBody(s, "The hard problem isn't picking a model — it's coordinating state, context, and tool use across a living project.",
    { y: 2.75, h: 0.7, fontSize: 13 });

  // Dashboard image
  // Image dimensions: ~1024 × 395 from the original file. Use sizing="contain" to fit.
  const imgW = CONTENT_W - 0.4;
  const imgH = 3.6;
  const imgX = MARGIN_X + 0.2;
  const imgY = 3.55;

  // Card frame behind image
  s.addShape("roundRect", {
    x: imgX - 0.08, y: imgY - 0.08, w: imgW + 0.16, h: imgH + 0.16,
    rectRadius: 0.18,
    fill: { color: C.cardWhite }, line: { color: C.line, width: 0.75 },
  });

  s.addImage({
    path: DASHBOARD_IMG,
    x: imgX, y: imgY, w: imgW, h: imgH,
    sizing: { type: "contain", w: imgW, h: imgH },
  });
})();

// ────────────────────────────────────────────────────────────────────────
// Slide 10 — Demo (prompt → outputs)
// ────────────────────────────────────────────────────────────────────────
(function slideDemo() {
  const s = pres.addSlide({ masterName: "MASTER" });
  addHeader(s, "Demo", "10");

  addKicker(s, "09 — Demo", { y: 1.15 });
  addHeadline(s, [
    { text: "From a sentence, " },
    { text: "to a shipped preview.", em: true },
  ], { y: 1.5, h: 1.4, fontSize: 42 });

  // Prompt card (dark)
  const promptW = 8.5;
  const promptX = (W - promptW) / 2;
  const promptY = 3.15;
  const promptH = 1.25;
  s.addShape("roundRect", {
    x: promptX, y: promptY, w: promptW, h: promptH, rectRadius: 0.2,
    fill: { color: C.ink }, line: { color: C.ink },
  });
  s.addText([
    { text: "●  ", options: { color: C.accent } },
    { text: "PROMPT", options: { color: C.accentSoft, bold: true } },
  ], {
    x: promptX + 0.35, y: promptY + 0.2, w: promptW - 0.7, h: 0.3,
    fontSize: 10, fontFace: F.sans, charSpacing: 4, valign: "top",
  });
  s.addText("\u201CMake the hero feel more startup and add pricing.\u201D", {
    x: promptX + 0.35, y: promptY + 0.55, w: promptW - 0.7, h: 0.65,
    fontSize: 18, fontFace: F.serif, color: "FFFFFF", italic: false, valign: "top",
  });

  // Arrow
  s.addText("\u2193", {
    x: W / 2 - 0.3, y: promptY + promptH + 0.08, w: 0.6, h: 0.4,
    fontSize: 22, fontFace: F.serif, color: C.muted2, align: "center", valign: "middle",
  });

  // 5 stages
  const stages = [
    { label: "Project",      hint: "Workspace spun up from one sentence.",    live: false },
    { label: "Plan",         hint: "Tasks drafted, scoped, ready to review.", live: false },
    { label: "Build",        hint: "Agents execute, state visible on board.", live: false },
    { label: "QA",           hint: "Checks run, mobile + copy verified.",     live: false },
    { label: "Live preview", hint: "codapac.app/project/acme-landing",        live: true  },
  ];
  const gap = 0.2;
  const cw = (CONTENT_W - gap * 4) / 5;
  const ch = 1.6;
  const cy = promptY + promptH + 0.65;

  stages.forEach((st, i) => {
    const x = MARGIN_X + i * (cw + gap);
    s.addShape("roundRect", {
      x, y: cy, w: cw, h: ch, rectRadius: 0.14,
      fill: { color: st.live ? C.ink : C.cardWhite },
      line: { color: st.live ? C.ink : C.line, width: 0.75 },
    });
    if (st.live) {
      // Green pulse dot
      s.addShape("ellipse", {
        x: x + cw - 0.4, y: cy + 0.2, w: 0.14, h: 0.14,
        fill: { color: "22C55E" }, line: { color: "22C55E" },
      });
    }
    s.addText(st.label, {
      x: x + 0.2, y: cy + 0.22, w: cw - 0.4, h: 0.42,
      fontSize: 14, fontFace: F.serif,
      color: st.live ? "FFFFFF" : C.ink, valign: "top",
    });
    s.addText(st.hint, {
      x: x + 0.2, y: cy + 0.7, w: cw - 0.4, h: ch - 0.9,
      fontSize: 10, fontFace: F.sans,
      color: st.live ? C.darkText2 : C.muted, valign: "top",
      lineSpacingMultiple: 1.35,
    });
  });

  // Sub caption
  s.addText([
    { text: "Watch a single prompt become a project, a task board, execution, QA, and a live URL \u2014 ", options: { color: C.muted, fontFace: F.sans } },
    { text: "the workspace is the story, not the chat.", options: { color: C.ink, fontFace: F.serif, italic: true } },
  ], {
    x: MARGIN_X + 1.5, y: cy + ch + 0.3, w: CONTENT_W - 3, h: 0.6,
    fontSize: 12, align: "center", valign: "top",
  });
})();

// ────────────────────────────────────────────────────────────────────────
// Slide 11 — Impact / Who this unlocks
// ────────────────────────────────────────────────────────────────────────
(function slideImpact() {
  const s = pres.addSlide({ masterName: "MASTER" });
  addHeader(s, "Impact", "11");

  addKicker(s, "10 — Who this unlocks", { y: 1.15 });
  addHeadline(s, [
    { text: "For everyone who's been " },
    { text: "locked out of shipping.", em: true },
  ], { y: 1.5, h: 1.5, fontSize: 40 });
  addBody(s, "Codapac lowers the friction of joining and driving software projects — wherever ideas start, but developers haven't yet.",
    { y: 3.15, h: 0.7, fontSize: 13 });

  const personas = [
    ["Founders",            "Move from pitch to prototype without hiring first."],
    ["PMs",                 "Turn specs into shipped increments, not status updates."],
    ["Students",            "Go from idea to demo without getting stuck on setup."],
    ["Hackathon teams",     "Ship polished projects in 48 hours, not 48% complete."],
    ["Non-tech teammates",  "Contribute to real code without waiting for a translator."],
  ];
  const gap = 0.2;
  const cw = (CONTENT_W - gap * 4) / 5;
  const ch = 2.5;
  const cy = 4.1;

  personas.forEach((p, i) => {
    const x = MARGIN_X + i * (cw + gap);
    s.addShape("roundRect", {
      x, y: cy, w: cw, h: ch, rectRadius: 0.14,
      fill: { color: C.cardWhite }, line: { color: C.line, width: 0.75 },
    });
    s.addShape("roundRect", {
      x: x + 0.25, y: cy + 0.28, w: 0.44, h: 0.44, rectRadius: 0.1,
      fill: { color: C.accentTint }, line: { color: C.accentTint },
    });
    s.addText("●", {
      x: x + 0.25, y: cy + 0.28, w: 0.44, h: 0.44,
      fontSize: 16, fontFace: F.sans,
      color: C.accent, align: "center", valign: "middle", bold: true,
    });
    s.addText(p[0], {
      x: x + 0.25, y: cy + 0.9, w: cw - 0.5, h: 0.5,
      fontSize: 16, fontFace: F.serif, color: C.ink, valign: "top",
    });
    s.addText(p[1], {
      x: x + 0.25, y: cy + 1.45, w: cw - 0.5, h: 0.95,
      fontSize: 10.5, fontFace: F.sans, color: C.muted, valign: "top",
      lineSpacingMultiple: 1.35,
    });
  });
})();

// ────────────────────────────────────────────────────────────────────────
// Slide 12 — Closing
// ────────────────────────────────────────────────────────────────────────
(function slideClosing() {
  const s = pres.addSlide({ masterName: "MASTER" });
  addHeader(s, "Thank you", "12");

  addKicker(s, "● The takeaway", { y: 1.2 });
  addHeadline(s, [
    { text: "A familiar workspace, " },
    { text: "not a black-box conversation.", em: true },
  ], { y: 1.6, h: 1.7, w: CONTENT_W, fontSize: 42 });
  addBody(s, "Codapac gives non-technical people a real environment to participate in software — with structured visibility and control, not just AI output.",
    { y: 3.45, h: 0.9, fontSize: 14 });

  // Rule divider
  s.addShape("line", {
    x: W / 2 - 0.35, y: 4.85, w: 0.7, h: 0,
    line: { color: C.lineStrong, width: 0.75 },
  });

  // Big italic Thank you.
  s.addText([
    { text: "Thank you",  options: { color: C.ink,    italic: true, fontFace: F.serif } },
    { text: ".",          options: { color: C.accent, italic: true, fontFace: F.serif } },
  ], {
    x: 1, y: 5.1, w: W - 2, h: 1.2,
    fontSize: 66, align: "center", valign: "middle",
  });

  // Signature
  s.addText([
    { text: "\u2014  ", options: { color: C.accent, fontFace: F.serif } },
    { text: "For the people who shape products, ", options: { color: C.muted, fontFace: F.sans } },
    { text: "but don't write code.",               options: { color: C.ink,   fontFace: F.serif, italic: true } },
  ], {
    x: W / 2 - 3.5, y: 6.35, w: 7, h: 0.4,
    fontSize: 12, align: "center", valign: "top",
  });
})();

// ────────────────────────────────────────────────────────────────────────
// Write file
// ────────────────────────────────────────────────────────────────────────
pres
  .writeFile({ fileName: OUT_FILE })
  .then(fileName => {
    console.log(`\u2713 Exported pitch deck to: ${fileName}`);
  })
  .catch(err => {
    console.error("Error writing PPTX:", err);
    process.exit(1);
  });
