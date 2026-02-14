function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function splitSentences(text) {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 40); // avoid tiny fragments
}

function pickSentenceContaining(sentences, keyword) {
  const re = new RegExp(`\\b${escapeRegExp(keyword)}\\b`, "i");
  return sentences.find((s) => re.test(s)) || null;
}

export function generateMCQs({ sourceText, keywords, count = 10 }) {
  const keys = (keywords || []).filter(
    (k) => typeof k === "string" && k.length >= 4,
  );

  const text = (sourceText || "").trim();

  if (keys.length < 4) return [];
  if (text.length < 60) return [];

  const sentences = splitSentences(text);
  if (!sentences.length) return [];

  const shuffledKeywords = shuffle(keys);
  const questions = [];

  for (const answer of shuffledKeywords) {
    if (questions.length >= count) break;

    const sentence = pickSentenceContaining(sentences, answer);
    if (!sentence) continue;

    // Limit overly long sentences
    const trimmedSentence =
      sentence.length > 180 ? sentence.slice(0, 177) + "..." : sentence;

    const blanked = trimmedSentence.replace(
      new RegExp(`\\b${escapeRegExp(answer)}\\b`, "ig"),
      "_____",
    );

    const distractors = shuffle(
      keys.filter((k) => k.toLowerCase() !== answer.toLowerCase()),
    ).slice(0, 3);

    if (distractors.length < 3) continue;

    const options = shuffle([answer, ...distractors]);

    questions.push({
      id: crypto.randomUUID(),
      prompt: `Fill in the blank:\n${blanked}`,
      options,
      answer,
      explanation: `Correct answer: "${answer}".`,
    });
  }

  return questions;
}
