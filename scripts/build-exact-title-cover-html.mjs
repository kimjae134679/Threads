import fs from 'node:fs/promises';
import path from 'node:path';

const [,, title, imagePath, outputPath] = process.argv;
if (!title || !imagePath || !outputPath) {
  console.error('Usage: node scripts/build-exact-title-cover-html.mjs <exact-title> <image-path> <output-html>');
  process.exit(2);
}
if (title.trim() !== title || !title.trim()) throw new Error('Title must be the exact non-empty original title without added whitespace.');
const stat = await fs.stat(imagePath);
if (!stat.isFile() || stat.size === 0) throw new Error('Cover image must be a real non-empty file.');
const ext = path.extname(imagePath).toLowerCase();
if (!['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) throw new Error('Cover image must be jpg/jpeg/png/webp.');

const esc = (s) => s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const imageUrl = new URL(`file://${path.resolve(imagePath).replaceAll('\\','/')}`).href;
const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=1080,height=1080"><title>${esc(title)}</title><style>
*{box-sizing:border-box}html,body{margin:0;width:1080px;height:1080px;overflow:hidden;background:#111;font-family:"Noto Sans KR","Malgun Gothic",sans-serif}.cover{position:relative;width:1080px;height:1080px;background:#111}.cover img{width:100%;height:100%;object-fit:cover;display:block}.shade{position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.08) 32%,rgba(0,0,0,.78) 100%)}.title{position:absolute;left:70px;right:70px;bottom:76px;color:white;font-size:68px;font-weight:800;line-height:1.16;letter-spacing:-2.4px;text-shadow:0 3px 18px rgba(0,0,0,.55);word-break:keep-all}.source{position:absolute;left:72px;top:64px;color:white;font-size:25px;font-weight:700;background:rgba(0,0,0,.52);padding:11px 17px;border-radius:999px;letter-spacing:-.4px}</style></head><body><main class="cover" data-cover-title="${esc(title)}"><img src="${esc(imageUrl)}" alt=""><div class="shade"></div><div class="source">원문 표지</div><div class="title">${esc(title)}</div></main></body></html>`;
await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, html, 'utf8');
console.log(JSON.stringify({ output: path.resolve(outputPath), title, image: path.resolve(imagePath), viewport: '1080x1080', renderedPng: false }, null, 2));
