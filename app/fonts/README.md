# Carousel font

`CarouselSansKR-Regular.woff` and `CarouselSansKR-Black.woff` are local subsets of the Noto Sans KR font from
https://github.com/google/fonts/tree/main/ofl/notosanskr (downloaded 2026-09-18).
The original copyright notice and SIL Open Font License are in `OFL.txt`.

The two static instances preserve weights 400 and 900, Latin U+0020–024F, Hangul Jamo U+1100–11FF,
punctuation U+2000–206F, CJK punctuation/Korean compatibility Jamo U+3000–31FF,
Hangul syllables U+AC00–D7A3, and U+FF01/U+FF1F. Other characters use the system fallback.
FontTools was used to subset the original `NotoSansKR[wght].ttf`, instantiate weights 400/900,
rename the family to `Carousel Sans KR`, and encode WOFF. No remote font request is needed.

## Selectable cut-editor fonts

- `sans`: Carousel Sans KR, derived from Noto Sans KR, genuine weights 400/900.
- `gothic`: Cut Gothic, derived from Google Fonts `ofl/nanumgothic/NanumGothic-ExtraBold.ttf`, genuine weight 800.

Nanum font source: https://github.com/google/fonts/tree/main/ofl/nanumgothic . Original copyright and SIL OFL are preserved verbatim in `OFL-NanumGothic.txt`. The Nanum derivatives use the new internal family `Cut Gothic` to respect Reserved Font Names. The same Korean/Latin ranges as above were subset with FontTools and encoded as WOFF. Existing files were not renamed.

The cut editor checks authored title/opinion characters against the intersection of the bundled weights' actual cmap tables and blocks unsupported characters. It explicitly loads all bundled faces before preview/export; it does not intentionally use unverified system fonts for authored title/opinion text. Text already rasterized in a source screenshot is outside this font selector.

Commercial design use is permitted by SIL OFL; bundling/redistribution conditions are met by retaining copyright and licenses. This is a verified license basis, not a claim to guarantee all legal outcomes. Official explanation: https://openfontlicense.org/ofl-faq/ (1.1, 1.1.1, 1.4, 1.21).

The regular Nanum derivative is excluded from the repository after its upload request was rejected. The UI lists only weights actually bundled.
