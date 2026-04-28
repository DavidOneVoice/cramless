const PAGE_WIDTH = 595.28; // A4 portrait width in points
const PAGE_HEIGHT = 841.89;
const MARGIN = 48;
const FONT_SIZE = 12;
const LINE_HEIGHT = 16;
const MAX_CHARS_PER_LINE = 90;
const LINES_PER_PAGE = Math.floor((PAGE_HEIGHT - MARGIN * 2) / LINE_HEIGHT);

function pdfEscape(text) {
  return String(text)
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function wrapText(text, maxChars = MAX_CHARS_PER_LINE) {
  const source = String(text || "").replace(/\s+/g, " ").trim();
  if (!source) return [""];

  const words = source.split(" ");
  const lines = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxChars) {
      current = next;
    } else if (current) {
      lines.push(current);
      current = word;
    } else {
      lines.push(word.slice(0, maxChars));
      current = word.slice(maxChars);
    }
  }

  if (current) lines.push(current);
  return lines;
}

function buildQuestionLines({ title, questions }) {
  const lines = [];

  lines.push(`Cramless Quiz Export - ${title || "Untitled set"}`);
  lines.push(`Generated: ${new Date().toLocaleString()}`);
  lines.push("");

  questions.forEach((question, idx) => {
    lines.push(`${idx + 1}. ${question.prompt || "Question"}`);

    (question.options || []).forEach((option, optIdx) => {
      const letter = String.fromCharCode(65 + optIdx);
      lines.push(`   ${letter}) ${option}`);
    });

    lines.push("");
  });

  lines.push("Answer Key");
  lines.push("----------");

  questions.forEach((question, idx) => {
    lines.push(`${idx + 1}. ${question.answer || "N/A"}`);
  });

  return lines;
}

function buildWrappedLines(lines) {
  const wrappedLines = [];

  for (const rawLine of lines) {
    wrappedLines.push(...wrapText(rawLine));
  }

  return wrappedLines;
}

function chunkIntoPages(lines) {
  const pages = [];

  for (let i = 0; i < lines.length; i += LINES_PER_PAGE) {
    pages.push(lines.slice(i, i + LINES_PER_PAGE));
  }

  return pages.length ? pages : [[""]];
}

function buildPageContent(lines) {
  const contentParts = ["BT", `/F1 ${FONT_SIZE} Tf`];
  let y = PAGE_HEIGHT - MARGIN;

  for (const line of lines) {
    contentParts.push(`1 0 0 1 ${MARGIN} ${y.toFixed(2)} Tm`);
    contentParts.push(`(${pdfEscape(line)}) Tj`);
    y -= LINE_HEIGHT;
  }

  contentParts.push("ET");
  return contentParts.join("\n");
}

function createPdfString(pageContentStreams) {
  const PAGE_TREE_ID = 2;
  const FONT_ID = 3;
  const FIRST_DYNAMIC_ID = 4;
  const pageCount = pageContentStreams.length;
  const pageObjectIds = [];
  const contentObjectIds = [];

  for (let i = 0; i < pageCount; i += 1) {
    pageObjectIds.push(FIRST_DYNAMIC_ID + i * 2);
    contentObjectIds.push(FIRST_DYNAMIC_ID + i * 2 + 1);
  }

  const kids = pageObjectIds.map((id) => `${id} 0 R`).join(" ");
  const objects = [];

  objects.push("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");
  objects.push(
    `${PAGE_TREE_ID} 0 obj\n<< /Type /Pages /Kids [${kids}] /Count ${pageCount} >>\nendobj\n`,
  );
  objects.push(
    `${FONT_ID} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n`,
  );

  pageObjectIds.forEach((pageId, i) => {
    const contentId = contentObjectIds[i];
    const contentStream = pageContentStreams[i];

    objects.push(
      `${pageId} 0 obj\n<< /Type /Page /Parent ${PAGE_TREE_ID} 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 ${FONT_ID} 0 R >> >> /Contents ${contentId} 0 R >>\nendobj\n`,
    );
    objects.push(
      `${contentId} 0 obj\n<< /Length ${contentStream.length} >>\nstream\n${contentStream}\nendstream\nendobj\n`,
    );
  });

  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  objects.forEach((obj, idx) => {
    offsets[idx + 1] = pdf.length;
    pdf += obj;
  });

  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";

  for (let i = 1; i <= objects.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }

  pdf += "trailer\n";
  pdf += `<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  pdf += "startxref\n";
  pdf += `${xrefStart}\n`;
  pdf += "%%EOF";

  return pdf;
}

export function downloadQuizQuestionsPdf({ title, questions }) {
  if (!Array.isArray(questions) || !questions.length) return;

  const lines = buildQuestionLines({ title, questions });
  const wrappedLines = buildWrappedLines(lines);
  const pages = chunkIntoPages(wrappedLines);
  const pageContents = pages.map((pageLines) => buildPageContent(pageLines));
  const pdfString = createPdfString(pageContents);
  const blob = new Blob([pdfString], { type: "application/pdf" });

  const safeTitle = String(title || "quiz")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "quiz";

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${safeTitle}-questions.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
