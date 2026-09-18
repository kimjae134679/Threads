// TEMP_TEST_ONLY_DO_NOT_PUBLISH
// Prototype only. Splits verified source text on semantic boundaries before length.
// It never fetches a source, invents missing text, or publishes output.

export function splitNatural(text, { targetChars = 420, maxChars = 620 } = {}) {
  const normalized = String(text || '').replace(/\r\n/g, '\n').trim();
  if (!normalized) return [];

  const paragraphs = normalized
    .split(/\n{2,}/)
    .map(v => v.trim())
    .filter(Boolean);

  const units = [];
  for (const paragraph of paragraphs) {
    if (paragraph.length <= maxChars) {
      units.push(paragraph);
      continue;
    }
    // Long paragraph: prefer sentence boundaries, then line boundaries.
    const sentences = paragraph
      .split(/(?<=[.!?。！？])\s+|\n+/)
      .map(v => v.trim())
      .filter(Boolean);
    units.push(...sentences);
  }

  const slides = [];
  let current = '';
  for (const unit of units) {
    const joined = current ? `${current}\n\n${unit}` : unit;
    if (current && joined.length > maxChars) {
      slides.push(current);
      current = unit;
      continue;
    }
    current = joined;
    if (current.length >= targetChars) {
      slides.push(current);
      current = '';
    }
  }
  if (current) slides.push(current);
  return slides;
}

export const TEMP_TEST_ONLY = true;
export const PUBLICATION_ALLOWED = false;
