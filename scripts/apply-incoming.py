#!/usr/bin/env python3
"""
Unpacks every zip in incoming/ into the repo, keeping the paths inside the zip,
then deletes the zip. Used by .github/workflows/apply-incoming.yml.

Rules (so a bad zip can't break the repo):
- paths must be relative and stay inside the repo (no "..", no leading "/")
- .github/workflows/* is NOT written: GitHub does not let a bot change workflow files.
  Those are listed in the run summary so you can upload them by hand.
- .git/ and incoming/ are never written.
- a single wrapping folder named like the repo (e.g. rada2026-main/) is removed from the paths.
"""
import glob, os, sys, zipfile, posixpath

WRAPPERS = {"rada2026-main", "rada2026"}
written, skipped, workflow_files = [], [], []

zips = sorted(glob.glob("incoming/*.zip"))
if not zips:
    print("No zip files in incoming/")
    sys.exit(0)

for z in zips:
    print(f"== {z}")
    try:
        zf = zipfile.ZipFile(z)
    except zipfile.BadZipFile:
        print("   not a valid zip, left in place")
        skipped.append(f"{z} (not a valid zip)")
        continue
    with zf:
        for info in zf.infolist():
            if info.is_dir():
                continue
            name = info.filename.replace("\\", "/")
            parts = [p for p in name.split("/") if p not in ("", ".")]
            if parts and parts[0] in WRAPPERS and len(parts) > 1:
                parts = parts[1:]
            if not parts or any(p == ".." for p in parts) or name.startswith("/"):
                skipped.append(f"{name} (unsafe path)")
                continue
            if parts[0] in ("__MACOSX",) or parts[-1] in (".DS_Store",):
                continue
            rel = "/".join(parts)
            if rel.startswith(".git/") or rel.startswith("incoming/"):
                skipped.append(f"{rel} (not allowed)")
                continue
            if rel.startswith(".github/workflows/"):
                workflow_files.append(rel)
                continue
            dest = os.path.normpath(rel)
            os.makedirs(os.path.dirname(dest) or ".", exist_ok=True)
            with zf.open(info) as src, open(dest, "wb") as out:
                out.write(src.read())
            written.append(rel)
            print(f"   wrote {rel}")
    os.remove(z)

lines = [f"Applied {len(written)} file(s)"] + [f"- {w}" for w in written[:40]]
if len(written) > 40:
    lines.append(f"- ...and {len(written) - 40} more")
open("/tmp/commit_msg.txt", "w").write("Apply incoming files\n\n" + "\n".join(lines) + "\n")

summary = ["## Incoming files applied", f"**{len(written)}** file(s) written.", ""]
summary += [f"- `{w}`" for w in written]
if workflow_files:
    summary += ["", "### Upload these by hand (GitHub does not let bots change workflow files)"]
    summary += [f"- `{w}`" for w in workflow_files]
if skipped:
    summary += ["", "### Skipped"] + [f"- {s}" for s in skipped]
path = os.environ.get("GITHUB_STEP_SUMMARY")
if path:
    open(path, "a").write("\n".join(summary) + "\n")
print("\n".join(summary))
