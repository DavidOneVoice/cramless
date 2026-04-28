import * as pdfjsLib from "pdfjs-dist";

/**
 * Configure pdf.js worker for Vite environments.
 * Uses a local module-based worker path so bundling works correctly.
 */
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

/**
 * Extracts plain text from a PDF file.
 *
 * Steps:
 * - Convert file to ArrayBuffer.
 * - Load document with pdf.js.
 * - Iterate through each page.
 * - Extract text content from page items.
 * - Concatenate and return the full trimmed text.
 */
export async function extractTextFromPdf(file) {
  const arrayBuffer = await file.arrayBuffer();

  // Load the PDF document from raw binary data.
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  let fullText = "";

  // Loop through all pages (1-based index in pdf.js).
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();

    // Extract text fragments from page items and lightly reconstruct lines.
    // pdf.js exposes positioned fragments; joining with a plain space often
    // creates broken symbols/words for formulas and set notation.
    const textItems = content.items
      .filter((item) => "str" in item && typeof item.str === "string")
      .map((item) => ({
        str: item.str,
        x: item.transform?.[4] ?? 0,
        y: item.transform?.[5] ?? 0,
      }));

    // Group by y-position buckets so we can rebuild each visual line left→right.
    const byLine = new Map();
    for (const item of textItems) {
      const yBucket = Math.round(item.y * 2) / 2;
      if (!byLine.has(yBucket)) byLine.set(yBucket, []);
      byLine.get(yBucket).push(item);
    }

    const lineBuckets = [...byLine.keys()].sort((a, b) => b - a);
    const reconstructed = lineBuckets
      .map((bucket) =>
        byLine
          .get(bucket)
          .sort((a, b) => a.x - b.x)
          .map((item) => item.str)
          .join(" "),
      )
      .join("\n");

    const pageText = reconstructed
      .normalize("NFKC")
      // Common ligatures and symbols frequently emitted by PDFs.
      .replace(/ﬁ/g, "fi")
      .replace(/ﬂ/g, "fl")
      .replace(/\u00A0/g, " ");

    fullText += pageText + "\n";
  }

  return fullText.trim();
}
