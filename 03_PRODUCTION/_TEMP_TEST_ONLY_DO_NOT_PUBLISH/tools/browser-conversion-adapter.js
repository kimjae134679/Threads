// TEMP_TEST_ONLY_DO_NOT_PUBLISH
// In-memory adapter only: no fetch, persistence, upload, publish, or third-party body storage.
import { splitNatural, TEMP_TEST_ONLY, PUBLICATION_ALLOWED } from './natural-boundary-splitter.js';

export function buildBrowserConversionModel({ sourceText, title = '', sourceType = 'text' } = {}) {
  if (!TEMP_TEST_ONLY || PUBLICATION_ALLOWED) throw new Error('TEMP safety invariant failed');
  const slides = splitNatural(sourceText);
  return {
    temporaryTestOnly: true,
    publicationAllowed: false,
    persistence: 'memory-only',
    title,
    sourceType,
    cover: sourceType === 'text'
      ? { mode: 'text-only', generatedImage: false, blur: false, titlePosition: 'upper', outline: 'thin' }
      : { mode: 'verified-source-media-required', generatedImage: false, blur: false },
    slides: slides.map((text, index) => ({ index: index + 2, text })),
    sourceMediaOrderPolicy: 'preserve-verified-order',
  };
}

export function restoreBrowserConversionModel(serialized) {
  const model = typeof serialized === 'string' ? JSON.parse(serialized) : serialized;
  if (!model?.temporaryTestOnly || model?.publicationAllowed !== false) {
    throw new Error('Refusing non-test or publishable model');
  }
  return model;
}
