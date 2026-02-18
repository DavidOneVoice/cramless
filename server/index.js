/* eslint-env node */
import express from "express";
import cors from "cors";
import "dotenv/config";
import OpenAI from "openai";
import process from "process";
import crypto from "crypto";

console.log("Loaded key:", process.env.OPENAI_API_KEY?.slice(0, 10));

const app = express();
app.use(cors());
app.use(express.json({ limit: "4mb" }));
app.use((req, res, next) => {
  console.log("INCOMING:", req.method, req.url);
  next();
});

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/** -------- Similarity helpers (hard anti-repeat) -------- */
function tokenize(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3);
}

function jaccard(a, b) {
  const A = new Set(tokenize(a));
  const B = new Set(tokenize(b));
  if (!A.size || !B.size) return 0;

  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;

  const union = A.size + B.size - inter;
  return union ? inter / union : 0;
}

function isTooSimilar(prompt, list, threshold) {
  return list.some((old) => jaccard(prompt, old) >= threshold);
}

/** Pick diverse prompts from a pool */
function selectDiverseQuestions(pool, avoidList, finalCount) {
  const selected = [];
  const chosenPrompts = [];

  for (const q of pool) {
    if (selected.length >= finalCount) break;

    // Stronger avoid filtering (blocks paraphrases too)
    if (avoidList.length && isTooSimilar(q.prompt, avoidList, 0.45)) continue;

    // Also avoid duplicates inside same quiz
    if (chosenPrompts.length && isTooSimilar(q.prompt, chosenPrompts, 0.55))
      continue;

    selected.push(q);
    chosenPrompts.push(q.prompt);
  }

  return selected;
}

/** -------- Routes -------- */
app.post("/api/generate-mcqs", async (req, res) => {
  try {
    const {
      title,
      sourceText,
      count = 10,
      difficulty = "mixed",
      avoid = [],
      nonce,
    } = req.body;

    if (!sourceText || sourceText.trim().length < 80) {
      return res
        .status(400)
        .json({ error: "Please provide more study material text." });
    }

    const safeCount = Math.max(5, Math.min(Number(count) || 10, 25));

    // IMPORTANT: pool bigger than final count
    const poolCount = Math.min(40, safeCount * 4);

    const safeAvoid = Array.isArray(avoid)
      ? avoid
          .filter((x) => typeof x === "string" && x.trim().length > 0)
          .slice(0, 40)
      : [];

    console.log("MCQ request:", {
      title,
      count: safeCount,
      poolCount,
      avoidCount: safeAvoid.length,
      avoidSample: safeAvoid[0]?.slice(0, 80),
    });

    const baseNonce =
      typeof nonce === "string" && nonce.trim().length > 0
        ? nonce.trim()
        : crypto.randomUUID();

    let finalQuestions = [];

    // Retry up to 3 attempts (more realistic)
    for (let attempt = 0; attempt < 3; attempt++) {
      const attemptNonce = attempt === 0 ? baseNonce : crypto.randomUUID();

      const prompt = `
You are an expert exam setter and tutor.

Create ${poolCount} high-quality multiple-choice questions (MCQs) from the study material below.

VERY IMPORTANT:
- Generate a wide variety of questions. Do not repeat the same "obvious" ones.
- Avoid reusing or paraphrasing these previous question prompts:
${safeAvoid.length ? `- ${safeAvoid.join("\n- ")}` : "- (none)"}

Requirements:
- Difficulty: ${difficulty} (easy/medium/hard/mixed)
- Each question must be clear, complete, and based strictly on the material.
- 4 options (A-D).
- Exactly 1 correct answer.
- Provide a short explanation for why it's correct.
- Use natural language. No broken fragments.
- Avoid repeating the same question style. Mix:
  - definitions
  - conceptual understanding
  - application/scenario
  - misconception checks
  - calculations (if relevant)

Variation nonce: ${attemptNonce}

Output MUST be valid JSON ONLY in this exact structure:

{
  "questions": [
    {
      "prompt": "string",
      "options": ["A text", "B text", "C text", "D text"],
      "answerIndex": 0,
      "explanation": "string"
    }
  ]
}

Title: ${title || "Untitled"}
Study Material:
${sourceText}
`;

      const resp = await client.chat.completions.create({
        model: "gpt-4.1-mini",
        temperature: 1.0,
        presence_penalty: 0.9,
        frequency_penalty: 0.5,
        response_format: { type: "json_object" },
        messages: [{ role: "user", content: prompt }],
      });

      const rawText = resp.choices?.[0]?.message?.content || "{}";

      let data;
      try {
        data = JSON.parse(rawText);
      } catch {
        continue; // retry
      }

      const rawQs = Array.isArray(data.questions) ? data.questions : [];

      const pool = rawQs
        .map((q) => {
          const opts = Array.isArray(q.options) ? q.options : [];
          const idx = Number.isInteger(q.answerIndex) ? q.answerIndex : -1;

          if (!q?.prompt || typeof q.prompt !== "string") return null;
          if (opts.length !== 4) return null;
          if (idx < 0 || idx > 3) return null;

          return {
            id: crypto.randomUUID(),
            prompt: q.prompt.trim(),
            options: opts.map((x) => String(x || "").trim()),
            answer: opts[idx],
            explanation: typeof q.explanation === "string" ? q.explanation : "",
          };
        })
        .filter(Boolean);

      if (!pool.length) continue;

      // Select diverse set from pool
      const selected = selectDiverseQuestions(pool, safeAvoid, safeCount);

      if (selected.length >= Math.min(5, safeCount)) {
        finalQuestions = selected;
        break;
      }
    }

    if (!finalQuestions.length) {
      return res.status(500).json({
        error:
          "Could not generate fresh questions (too similar to previous). Try again or upload more material.",
      });
    }

    return res.json({ questions: finalQuestions });
  } catch (err) {
    console.error(err);
    return res.status(err?.status || 500).json({
      error: err?.error?.message || err?.message || "Failed to generate MCQs",
    });
  }
});

app.post("/api/summarize", async (req, res) => {
  try {
    const { title, sourceText } = req.body;

    if (!sourceText || sourceText.length < 50) {
      return res
        .status(400)
        .json({ error: "Not enough material to summarize." });
    }

    const prompt = `
You are an expert academic tutor.

Summarize the following study material clearly and intelligently.

Return:
1. A concise overview paragraph.
2. Key concepts in bullet points.
3. Important definitions (if applicable).
4. Exam tips / likely test focus areas.

Material Title: ${title}

Material:
${sourceText}
`;

    const response = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      temperature: 0.4,
      messages: [{ role: "user", content: prompt }],
    });

    const summary = response.choices?.[0]?.message?.content || "";
    res.json({ summary });
  } catch (err) {
    console.error(err);
    res.status(err?.status || 500).json({
      error:
        err?.error?.message || err?.message || "Failed to generate summary",
    });
  }
});

app.listen(5050, () => {
  console.log("AI server running on http://localhost:5050");
});
