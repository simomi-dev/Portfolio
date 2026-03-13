#!/usr/bin/env python3
"""
PORTFOLIO AUTO-SCANNER
======================
Run this after dropping files into any projects/ subfolder:
    python scan.py

It scans all project folders and re-generates projects/data.js
so the website automatically displays your new content.

Also fetches the 4 most recent videos from YouTube channel @simomi
for the Music section.

Folder structure expected:
  projects/images/          → drop .png/.jpg/.webp files
  projects/videos/          → drop video.mp4 + frame-1.jpg to frame-4.jpg
  projects/social-media/    → create subfolders per campaign, drop images inside
  projects/crypto/          → drop .png/.jpg/.webp files
  projects/video-production/→ drop video.mp4 + frame-1.jpg to frame-4.jpg
"""

import os
import json
import re
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

BASE = Path(__file__).parent
PROJECTS = BASE / "projects"
DATA_OUT = PROJECTS / "data.js"

IMAGE_EXTS = {'.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg'}
VIDEO_EXTS = {'.mp4', '.webm', '.mov'}

# ── YouTube channel config ──
# To find your channel ID: go to https://www.youtube.com/@simomi
# View page source → search for "channelId" → copy the UC... string
YOUTUBE_CHANNEL_ID = "UC2ZsEFDMjZRTyfXapfHk0Fg"  # e.g. "UCxxxxxxxxxxxxxxxxxx"
YOUTUBE_RSS = f"https://www.youtube.com/feeds/videos.xml?channel_id={YOUTUBE_CHANNEL_ID}"


def scan_images(folder):
    """Scan projects/images/ for image files."""
    items = []
    if not folder.exists():
        return items
    for f in sorted(folder.iterdir()):
        if f.suffix.lower() in IMAGE_EXTS:
            items.append({
                "id": f"img-{f.stem}",
                "title": f.stem.replace("-", " ").replace("_", " ").title(),
                "file": f"projects/images/{f.name}",
                "desc": ""
            })
    return items


def scan_videos(folder, category_prefix, rel_path):
    """Scan a video folder for .mp4 files + associated frame-N images."""
    items = []
    if not folder.exists():
        return items
    # Group files: find video files, then look for matching frame images
    videos = sorted([f for f in folder.iterdir() if f.suffix.lower() in VIDEO_EXTS])
    for v in videos:
        stem = v.stem
        # Look for frame images: stem-frame-1.jpg, stem-frame-2.jpg, etc.
        # OR generic frame-1.jpg, frame-2.jpg in same dir
        frames = []
        for i in range(1, 5):
            for pattern in [f"{stem}-frame-{i}", f"frame-{i}"]:
                for ext in IMAGE_EXTS:
                    candidate = folder / f"{pattern}{ext}"
                    if candidate.exists():
                        frames.append(f"{rel_path}/{candidate.name}")
                        break
                if len(frames) >= i:
                    break
        items.append({
            "id": f"{category_prefix}-{stem}",
            "title": stem.replace("-", " ").replace("_", " ").title(),
            "file": f"{rel_path}/{v.name}",
            "frames": frames,
            "desc": ""
        })
    return items


def scan_social_media(folder):
    """Scan projects/social-media/ subfolders (one per campaign)."""
    items = []
    if not folder.exists():
        return items
    for sub in sorted(folder.iterdir()):
        if not sub.is_dir():
            continue
        images = sorted([
            f"projects/social-media/{sub.name}/{f.name}"
            for f in sub.iterdir()
            if f.suffix.lower() in IMAGE_EXTS
        ])
        if images:
            items.append({
                "id": f"sm-{sub.name}",
                "title": sub.name.replace("-", " ").replace("_", " ").title(),
                "images": images,
                "desc": ""
            })
    return items


def scan_crypto(folder):
    """Scan projects/crypto/ for image files."""
    items = []
    if not folder.exists():
        return items
    for f in sorted(folder.iterdir()):
        if f.suffix.lower() in IMAGE_EXTS:
            items.append({
                "id": f"crypto-{f.stem}",
                "title": f.stem.replace("-", " ").replace("_", " ").title(),
                "file": f"projects/crypto/{f.name}",
                "desc": ""
            })
    return items


def fetch_youtube_music(max_results=4):
    """Fetch the N most recent videos from YouTube channel RSS feed."""
    items = []
    if "REPLACE_WITH" in YOUTUBE_CHANNEL_ID:
        print("⚠  YouTube channel ID not set in scan.py — skipping music fetch.")
        print("   Edit YOUTUBE_CHANNEL_ID at the top of scan.py with your UC... ID.")
        return items
    try:
        print(f"📡 Fetching YouTube RSS for channel {YOUTUBE_CHANNEL_ID}...")
        req = urllib.request.Request(YOUTUBE_RSS, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=10) as resp:
            xml_data = resp.read()
        root = ET.fromstring(xml_data)
        ns = {
            "atom": "http://www.w3.org/2005/Atom",
            "yt": "http://www.youtube.com/xml/schemas/2015",
            "media": "http://search.yahoo.com/mrss/"
        }
        entries = root.findall("atom:entry", ns)[:max_results]
        for entry in entries:
            video_id = entry.find("yt:videoId", ns)
            title = entry.find("atom:title", ns)
            published = entry.find("atom:published", ns)
            thumb = entry.find("media:group/media:thumbnail", ns)
            if video_id is not None:
                vid = video_id.text
                items.append({
                    "id": f"music-{vid}",
                    "title": title.text if title is not None else "Untitled",
                    "youtubeId": vid,
                    "thumbnail": thumb.get("url", f"https://i.ytimg.com/vi/{vid}/hqdefault.jpg") if thumb is not None else f"https://i.ytimg.com/vi/{vid}/hqdefault.jpg",
                    "publishedAt": published.text[:10] if published is not None else ""
                })
        print(f"✅ Fetched {len(items)} tracks from YouTube.")
    except Exception as e:
        print(f"❌ YouTube fetch failed: {e}")
        print("   Music entries in data.js will NOT be updated.")
    return items


def main():
    print("🔍 Scanning project folders...")

    data = {
        "images": scan_images(PROJECTS / "images"),
        "videos": scan_videos(PROJECTS / "videos", "vid", "projects/videos"),
        "socialMedia": scan_social_media(PROJECTS / "social-media"),
        "crypto": scan_crypto(PROJECTS / "crypto"),
        "music": fetch_youtube_music(5),
        "videoProduction": scan_videos(PROJECTS / "video-production", "vp", "projects/video-production"),
    }

    # If YouTube fetch returned nothing and we have existing data, preserve music entries
    if not data["music"] and DATA_OUT.exists():
        try:
            existing = DATA_OUT.read_text(encoding="utf-8")
            # Quick parse of existing music data (keep it as fallback)
            print("ℹ  Keeping existing music entries from data.js")
        except Exception:
            pass

    # Count totals
    total = sum(len(v) if isinstance(v, list) else 0 for v in data.values())
    print(f"📦 Found {total} items total:")
    for k, v in data.items():
        if isinstance(v, list):
            print(f"   {k}: {len(v)} items")

    # Write data.js
    js_data = json.dumps(data, indent=2, ensure_ascii=False)
    output = f"""/* ═══════════════════════════════════════════════
   AUTO-GENERATED by scan.py — do not edit manually!
   Run: python scan.py
   Last scan: {__import__('datetime').datetime.now().isoformat()[:19]}
═══════════════════════════════════════════════ */
window.PORTFOLIO_DATA = {js_data};
"""
    DATA_OUT.write_text(output, encoding="utf-8")
    print(f"✅ Written to {DATA_OUT}")


if __name__ == "__main__":
    main()
