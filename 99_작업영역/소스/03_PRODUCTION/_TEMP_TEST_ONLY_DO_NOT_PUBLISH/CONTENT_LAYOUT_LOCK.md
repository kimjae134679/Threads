# CONTENT LAYOUT LOCK — TEMP TEST ONLY

This file overrides any earlier TEMP visual-output interpretation.

## Intended output
1. Slide 1 = cover only.
   - One short hook/title derived from verified content.
   - Very large title, high position, thin outline.
   - No list, no summary table, no dashboard UI.
2. Slide 2+ = source body itself in original order.
   - Do NOT summarize, paraphrase, categorize, rewrite, or turn it into bullet/list UI.
   - Preserve original wording, spelling, punctuation, paragraph order, and scene/media order.
   - Only page splitting, line wrapping, font sizing, margins, and safe crop/layout adjustments are allowed.
3. If the source contains verified visual media, preserve that real source media in original order.
   - No generated-image fallback.
   - No blur.
   - Exclude platform UI/chrome only.
4. If exact body/media bytes are not available in a form permitted for verbatim reuse, mark BLOCKED_SOURCE_BODY_OR_MEDIA.
   - Never fill missing content with a summary or invented replacement.
5. TEMP outputs remain temporaryTestOnly=true and publicationAllowed=false.
   - They never upgrade real candidate C/A/P state.
   - Publishing remains owned by 04_REVIEW_PUBLISH after human rights/privacy/safety review.

## Rejected prototypes
- TEMP_TEST_ONLY_actual-output-v1 = REJECTED. Internal list/dashboard style.
- TEMP_TEST_ONLY_actual-output-v2 = REJECTED. Rewritten/summary carousel; violates slide-2+ verbatim-body rule.

The next valid prototype must follow the structure above.
