from pathlib import Path
import shutil

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "data" / "candidates"
OUT = ROOT / "data" / "candidate_batches"
BATCH_SIZE = 100

files = sorted(
    [p for p in SRC.glob("*.md") if p.name.lower() != "readme.md"],
    key=lambda p: p.name,
)

if OUT.exists():
    shutil.rmtree(OUT)
OUT.mkdir(parents=True, exist_ok=True)

batch_paths = []
for batch_index, start in enumerate(range(0, len(files), BATCH_SIZE), 1):
    chunk = files[start:start + BATCH_SIZE]
    end = start + len(chunk)
    out = OUT / f"candidates_{start+1:04d}-{end:04d}.md"
    lines = [
        f"# Candidate Batch {batch_index:03d}",
        "",
        f"- Range: {start+1}-{end}",
        f"- Count: {len(chunk)}",
        "- Source: data/candidates/",
        "- Each section below preserves the source candidate markdown.",
        "",
    ]
    for offset, path in enumerate(chunk, start + 1):
        rel = path.relative_to(ROOT).as_posix()
        body = path.read_text(encoding="utf-8").rstrip()
        lines.extend([
            "---",
            "",
            f"## [{offset:04d}] {path.name}",
            "",
            f"Source file: {rel}",
            "",
            body,
            "",
        ])
    out.write_text("\n".join(lines).rstrip() + "\n", encoding="utf-8")
    batch_paths.append(out)

index = [
    "# Candidate Batches",
    "",
    f"- Total candidates: {len(files)}",
    f"- Batch size: {BATCH_SIZE}",
    f"- Batch files: {len(batch_paths)}",
    "",
    "These files are generated from data/candidates/ for easier bulk review.",
    "The individual candidate markdown files remain the source of truth.",
    "",
]
for p in batch_paths:
    index.append(f"- {p.name}")
(OUT / "README.md").write_text("\n".join(index) + "\n", encoding="utf-8")

print(f"Created {len(batch_paths)} batch files for {len(files)} candidates.")
for p in batch_paths:
    print(p)
