/* eslint-env node */
import express from "express";
import cors from "cors";
import "dotenv/config";
import OpenAI from "openai";
import process from "process";

console.log("Loaded key:", process.env.OPENAI_API_KEY?.slice(0, 10));

const app = express();
app.use(cors());
app.use(express.json({ limit: "4mb" }));

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.post("/api/generate-mcqs", async (req, res) => {
  try {
    const { title, sourceText, count = 10, difficulty = "mixed" } = req.body;

    if (!sourceText || sourceText.trim().length < 80) {
      return res
        .status(400)
        .json({ error: "Please provide more study material text." });
    }

    const safeCount = Math.max(5, Math.min(Number(count) || 10, 25));

    const prompt = `
You are an expert exam setter and tutor.

Create ${safeCount} high-quality multiple-choice questions (MCQs) from the study material below.

Requirements:
- Difficulty: ${difficulty} (easy/medium/hard/mixed)
- Each question must be clear, complete, and based strictly on the material.
- 4 options (A-D).
- Exactly 1 correct answer.
- Provide a short explanation for why it's correct.
- Avoid weird symbols or raw tokens like "rightleftharpoons" unless the material explicitly teaches it.
- Use natural language; no broken fragments.
- Output MUST be valid JSON ONLY in this exact structure:

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
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: prompt }],
    });

    const text = resp.choices?.[0]?.message?.content || "{}";
    const data = JSON.parse(text);

    // Convert to your app format
    const questions = (data.questions || []).map((q) => ({
      id: crypto.randomUUID(),
      prompt: q.prompt,
      options: q.options,
      answer: q.options[q.answerIndex],
      explanation: q.explanation,
    }));

    return res.json({ questions });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ error: err?.message || "Failed to generate MCQs" });
  }
});

app.listen(5050, () => {
  console.log("AI server running on http://localhost:5050");
});
