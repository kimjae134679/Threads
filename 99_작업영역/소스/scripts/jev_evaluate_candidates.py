import argparse, csv, json, os, shutil, subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CANDIDATES = ROOT / "data" / "candidates"
RESULTS = ROOT / "data" / "jev_results"
RESULTS.mkdir(parents=True, exist_ok=True)
SCHEMA_VERSION = 2

Q_OVERALL = "\uc774 \ud6c4\ubcf4\uc758 Threads \ucf58\ud150\uce20 \uc18c\uc7ac \uac00\uce58\ub97c \ud3c9\uac00\ud574. \ud654\uc81c\uc131, \uacf5\uac10\uacfc \ub17c\uc7c1\uc131, \uc774\uc57c\uae30 \ud765\ubbf8\ub3c4, \uc2e0\uc120\ub3c4, \ucf58\ud150\uce20 \ubc1c\uc804 \uac00\ub2a5\uc131\uc744 \uc885\ud569\ud574."
Q_TYPE = "\uc774 \ud6c4\ubcf4\uc5d0 \uac00\uc7a5 \uc801\ud569\ud55c \ucf58\ud150\uce20 \uc720\ud615\uc744 \uace8\ub77c"
Q_HOOK = "\uc774 \uc18c\uc7ac\ub294 \uccab \ud654\uba74\uc758 \uac15\ud55c \uc81c\ubaa9\uc774\ub098 \ud6c5\uc73c\ub85c \uc0ac\ub78c\ub4e4\uc774 \ub2e4\uc74c \ub0b4\uc6a9\uc744 \uacc4\uc18d \ubcf4\uac8c \ub9cc\ub4e4 \uac00\ub2a5\uc131\uc774 \ub192\uc740\uac00?"
Q_RESEARCH = "\uc774 \ud6c4\ubcf4\ub294 \uc2e4\uc81c \ucf58\ud150\uce20 \uc81c\uc791 \uc804\uc5d0 \ucd94\uac00 \uc0ac\uc2e4\ud655\uc778\uc774\ub098 \ucd9c\ucc98 \uc870\uc0ac\uac00 \ud544\uc694\ud55c\uac00?"
Q_ASSET = "\uc774 \ud6c4\ubcf4\ub97c \ucf58\ud150\uce20\ub85c \ub9cc\ub4e4 \ub54c \uc6d0\ubb38 \uc774\ubbf8\uc9c0, \uc2a4\ud06c\ub9b0\uc0f7 \ub610\ub294 \uc2e4\uc81c source asset \ud655\ubcf4\uac00 \uc5bc\ub9c8\ub098 \uc911\uc694\ud55c\uac00?"
Q_FIT = "\uc774 \ud6c4\ubcf4\ub294 Threads\uc6a9 \ucf58\ud150\uce20 \uc18c\uc7ac\ub85c \uc801\ud569\ud55c\uac00?"
Q_IMPROVE = "\uc774 \ud6c4\ubcf4\ub294 \uc2e4\uc81c \uc81c\uc791 \ud6c4\ubcf4\ub85c \uc0ac\uc6a9\ud558\uae30 \uc804\uc5d0 \ub0b4\uc6a9, \ud6c5, \uad6c\uc131, \ucd9c\ucc98, \uc790\uc0b0, \uad8c\ub9ac/\uc548\uc804 \uce21\uba74\uc5d0\uc11c \ubcf4\uc644\uc774 \ud544\uc694\ud55c\uac00?"
Q_IMPROVE_AREA = "\uc774 \ud6c4\ubcf4\uc5d0\uc11c \uac00\uc7a5 \uc6b0\uc120\uc801\uc73c\ub85c \ubcf4\uc644\ud574\uc57c \ud560 \ud55c \uac00\uc9c0 \uc601\uc5ed\uc744 \uace8\ub77c"
Q_IMPROVE_LEVEL = "\uc774 \ud6c4\ubcf4\uc758 \ubcf4\uc644 \ud544\uc694 \uc815\ub3c4\ub97c \ud3c9\uac00\ud574"
def run_jev(jev, env, args):
    cp = subprocess.run([jev, *args], env=env, capture_output=True, text=True, encoding="utf-8", timeout=180)
    if cp.returncode != 0:
        raise RuntimeError(cp.stderr.strip() or cp.stdout.strip())
    return json.loads(cp.stdout)

def result_is_current(path):
    if not path.exists():
        return False
    try:
        obj = json.loads(path.read_text(encoding="utf-8"))
        return obj.get("schema_version") == SCHEMA_VERSION
    except Exception:
        return False

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=20)
    ap.add_argument("--all", action="store_true")
    ap.add_argument("--force", action="store_true")
    args = ap.parse_args()

    jev = shutil.which("jev") or r"C:\Users\user\.local\bin\jev.exe"
    env = os.environ.copy()
    env["PYTHONUTF8"] = "1"
    files = sorted(
        [p for p in CANDIDATES.glob("*.md") if p.name.lower() != "readme.md"],
        key=lambda p: p.name,
    )
    if not args.force:
        files = [p for p in files if not result_is_current(RESULTS / f"{p.stem}.jev.json")]
    if not args.all:
        files = files[:args.limit]

    rows = []
    print(f"Jev evaluation v{SCHEMA_VERSION}: {len(files)} candidate(s)", flush=True)

    for i, path in enumerate(files, 1):
        print(f"[{i}/{len(files)}] {path.name}", flush=True)
        state = "@" + str(path)
        try:
            r1 = run_jev(jev, env, ["score","-q",Q_OVERALL,"-s",state,"-l","\ubc84\ub9bc","-l","\ubcf4\ub958","-l","\uc4f8\ub9cc\ud568","-l","\uc6b0\uc120 \uc81c\uc791"])
            r2 = run_jev(jev, env, ["choice","-q",Q_OVERALL,"-s",state,"-o","discard=\ubc84\ub9bc","-o","hold=\ubcf4\ub958","-o","usable=\uc4f8\ub9cc\ud568","-o","priority=\uc6b0\uc120 \uc81c\uc791"])
            r3 = run_jev(jev, env, ["choice","-q",Q_TYPE,"-s",state,"-o","issue=\ud654\uc81c/\uc774\uc288","-o","humor=\uc6c3\uae34 \uc774\uc57c\uae30/\uc370","-o","info=\uc815\ubcf4/\ud301","-o","empathy=\uacf5\uac10/\ub17c\uc7c1","-o","skip=\ubd80\uc801\ud569"])
            r4 = run_jev(jev, env, ["noul","-q",Q_HOOK,"-s",state])
            r5 = run_jev(jev, env, ["noul","-q",Q_RESEARCH,"-s",state])
            r6 = run_jev(jev, env, ["score","-q",Q_ASSET,"-s",state,"-l","\ub0ae\uc74c","-l","\ubcf4\ud1b5","-l","\ub192\uc74c"])
            r7 = run_jev(jev, env, ["noul","-q",Q_FIT,"-s",state])
            r8 = run_jev(jev, env, ["noul","-q",Q_IMPROVE,"-s",state])
            r9 = run_jev(jev, env, ["choice","-q",Q_IMPROVE_AREA,"-s",state,
                "-o","none=\ubcf4\uc644 \ubd88\ud544\uc694",
                "-o","source=\ucd9c\ucc98/\uc0ac\uc2e4\ud655\uc778",
                "-o","hook=\uc81c\ubaa9/\ud6c5",
                "-o","story=\ub0b4\uc6a9/\uad6c\uc131",
                "-o","asset=\uc774\ubbf8\uc9c0/\uc2a4\ud06c\ub9b0\uc0f7/\uc790\uc0b0",
                "-o","safety=\uad8c\ub9ac/\uac1c\uc778\uc815\ubcf4/\uc548\uc804"])
            r10 = run_jev(jev, env, ["score","-q",Q_IMPROVE_LEVEL,"-s",state,
                "-l","\ub0ae\uc74c","-l","\ubcf4\ud1b5","-l","\ub192\uc74c"])

            results = {
                "overall_score": r1["answers"]["answer"],
                "final_status": r2["answers"]["answer"],
                "content_type": r3["answers"]["answer"],
                "hook_strength": r4["answers"]["answer"],
                "needs_research": r5["answers"]["answer"],
                "asset_importance": r6["answers"]["answer"],
                "threads_fit": r7["answers"]["answer"],
                "needs_improvement": r8["answers"]["answer"],
                "improvement_area": r9["answers"]["answer"],
                "improvement_level": r10["answers"]["answer"],
            }
            usage = {"input_tokens": 0, "output_tokens": 0}
            for r in (r1,r2,r3,r4,r5,r6,r7,r8,r9,r10):
                usage["input_tokens"] += r.get("usage",{}).get("input_tokens",0)
                usage["output_tokens"] += r.get("usage",{}).get("output_tokens",0)

            bundle = {
                "schema_version": SCHEMA_VERSION,
                "file": path.name,
                "model": r1.get("model"),
                "answers": results,
                "usage_total": usage,
            }
            out = RESULTS / f"{path.stem}.jev.json"
            out.write_text(json.dumps(bundle, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

            rows.append({
                "file": path.name,
                "overall_score": results["overall_score"]["score"],
                "overall_confidence": results["overall_score"].get("confidence"),
                "final_status": results["final_status"]["choice"],
                "final_confidence": results["final_status"].get("confidence"),
                "content_type": results["content_type"]["choice"],
                "type_confidence": results["content_type"].get("confidence"),
                "hook_strength": results["hook_strength"]["noul"],
                "threads_fit": results["threads_fit"]["noul"],
                "needs_research": results["needs_research"]["noul"],
                "asset_importance": results["asset_importance"]["score"],
                "needs_improvement": results["needs_improvement"]["noul"],
                "improvement_area": results["improvement_area"]["choice"],
                "improvement_confidence": results["improvement_area"].get("confidence"),
                "improvement_level": results["improvement_level"]["score"],
            })
            print("  saved", out.name, flush=True)
        except Exception as e:
            print(f"FAILED: {path.name}: {e}", flush=True)

    if rows:
        cols = list(rows[0].keys())
        with (RESULTS / "latest.csv").open("w", newline="", encoding="utf-8-sig") as f:
            w = csv.DictWriter(f, fieldnames=cols)
            w.writeheader()
            w.writerows(rows)

    print("Done.", flush=True)

if __name__ == "__main__":
    main()
