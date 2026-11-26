#!/usr/bin/env python3
"""
RADA campus-area spot seeder (free: no Google API key, no paid scraper).

Seeds student-area hangout spots (cafes, restaurants, bars, parks, ...) into
`unclaimedspots`. institutions.csv holds campuses AND "zones" (student areas such as
Juja Town, Kahawa Sukari, Kahawa Wendani), each with its own search radius.

Data sources (all free)
  - Coordinates of each campus/zone: OpenStreetMap Nominatim.
  - Places + photo URLs: the open-source gosom/google-maps-scraper, run in Docker on the
    GitHub runner. It reads Google Maps pages directly (no API key). Google can block or
    change this at any time; the seeder stops (does not loop) when results dry up.
  - Photos are downloaded, checked for faces, converted to WebP and stored on Cloudflare R2.
  - Menus/prices come later from the existing spot-details-extract cron (uses each spot's website).

Per run:
  1. kill switch check            (feature_switches.seeder_enabled)
  2. load institutions.csv        -> seed_anchors (idempotent)
  3. resolve names to coordinates (Nominatim; unmatched = 'unresolved')
  4. cluster anchors              (campuses inside a bigger area share its search)
  5. scrape + seed spots around pending anchors until TIME_BUDGET_MIN is used
  6. write chain=true/false to $GITHUB_OUTPUT; the workflow re-dispatches itself while
     chain=true. Flip the switch off (or run action=stop) to end.

Images: only photos with NO detected face are kept (YuNet + Haar, either detector
rejecting is enough). A spot needs MIN_CLEAN_PHOTOS clean photos or it is skipped
(and remembered in seed_skipped so it is never re-downloaded).

Usage:  python seeder/seed.py [--enable | --stop]
"""
import argparse
import csv
import io
import json
import math
import os
import re
import shutil
import subprocess
import sys
import tempfile
import time
import uuid
from datetime import datetime, timedelta, timezone

import requests

# --------------------------------------------------------------------------- config


def _env(name, default=None, cast=str):
    v = os.environ.get(name)
    if v is None or v.strip() == "":
        return default
    return cast(v.strip())


SUPABASE_URL = (_env("SUPABASE_URL", "") or "").rstrip("/")
SERVICE_KEY = _env("SUPABASE_SERVICE_ROLE_KEY", "")
R2_ACCOUNT_ID = _env("R2_ACCOUNT_ID", "")
R2_KEY_ID = _env("R2_ACCESS_KEY_ID", "")
R2_SECRET = _env("R2_SECRET_ACCESS_KEY", "")
R2_BUCKET = _env("R2_BUCKET", "rada-media")
# e.g. https://pub-xxxx.r2.dev  (swap for your custom domain at launch)
R2_PUBLIC_BASE = (_env("R2_PUBLIC_BASE", "") or "").rstrip("/")

MIN_RATING = _env("MIN_RATING", 0.0, float)         # 0 = no rating filter
MIN_REVIEWS = _env("MIN_REVIEWS", 0, int)           # 0 = no review filter
GROUPS = [g.strip() for g in (_env("GROUPS", "eat,cafes,nightlife,outdoors,fun,sports") or "").split(",") if g.strip()]
GMAPS_IMAGE = _env("GMAPS_IMAGE", "gosom/google-maps-scraper:latest")
GMAPS_DEPTH = _env("GMAPS_DEPTH", 2, int)           # scroll depth per search term (more = more places, slower)
GMAPS_CONCURRENCY = _env("GMAPS_CONCURRENCY", 3, int)
GMAPS_TIMEOUT_MIN = _env("GMAPS_TIMEOUT_MIN", 25, float)
MAX_EMPTY_ANCHORS = _env("MAX_EMPTY_ANCHORS", 3, int)  # this many empty scrapes in a row = assume blocked
MAX_PHOTOS = _env("MAX_PHOTOS", 4, int)             # kept per spot
MIN_CLEAN_PHOTOS = _env("MIN_CLEAN_PHOTOS", 2, int)  # spot skipped below this
MAX_PHOTO_CANDIDATES = _env("MAX_PHOTO_CANDIDATES", 8, int)  # downloaded per spot at most
TOTAL_SPOT_CAP = _env("TOTAL_SPOT_CAP", 5000, int)  # all seeder spots together; then the switch turns off
MAX_SPOTS_PER_ANCHOR = _env("MAX_SPOTS_PER_ANCHOR", 200, int)  # spots added per place/area
FACE_SCORE = _env("FACE_SCORE", 0.5, float)         # lower = stricter (more rejects)
TIME_BUDGET_MIN = _env("TIME_BUDGET_MIN", 45, float)
RESOLVE_PER_RUN = _env("RESOLVE_PER_RUN", 200, int)
DAILY_PLACE_CAP = _env("DAILY_PLACE_CAP", 4000, int)    # places scraped, rolling 24h (keeps volume polite to Google)
DAILY_PHOTO_CAP = _env("DAILY_PHOTO_CAP", 3000, int)    # photo downloads, rolling 24h

# Greater Nairobi / Kiambu / Thika / Juja bounding box (sanity check for resolved anchors)
BBOX = (-1.50, -0.85, 36.50, 37.30)  # lat_min, lat_max, lng_min, lng_max

NOMINATIM_UA = "rada-seeder/1.0 (https://github.com/chocolatepapi123/rada2026)"

YUNET_URL = (
    "https://github.com/opencv/opencv_zoo/raw/main/models/"
    "face_detection_yunet/face_detection_yunet_2023mar.onnx"
)

# Google Maps search terms per group.
TERMS = {
    "eat": ["restaurant", "fast food", "nyama choma", "pizza"],
    "cafes": ["cafe", "coffee shop", "bakery", "ice cream"],
    "nightlife": ["bar", "pub", "night club", "lounge"],
    "outdoors": ["park", "garden"],
    "fun": ["arcade", "gaming zone", "bowling", "museum", "art gallery"],
    "sports": ["gym", "sports club", "swimming pool"],
    "stays": ["hotel", "hostel", "guest house"],
}

# --------------------------------------------------------------------------- categories

# First match on the place's PRIMARY Google category name wins (exact-category rule).
CATEGORY_RULES = [
    (r"night ?club|disco|karaoke|\blounge\b|hookah", "Clubs & Lounges"),
    (r"\b(bar|pub|tavern|brewery|beer|cocktail|wine|sports bar|taproom)\b", "Bars & Chill Spots"),
    (r"ice cream|gelato|frozen yogurt|dessert|candy|chocolate|donut|doughnut|waffle|crepe", "Desserts & Ice Cream"),
    (r"\bcaf[eé]\b|coffee|bakery|patisserie|tea (house|room)|cake|bagel|pastry", "Cafes & Bakeries"),
    (r"fast food|burger|pizza|sandwich|chicken|fried|takeaway|take out|hot dog|kebab|shawarma|fries|snack", "Fast Food"),
    (r"barbecue|bbq|grill|steak|nyama|butcher", "Nyama Choma & Grills"),
    (r"restaurant|eatery|diner|canteen|food court|buffet|brasserie|bistro|kitchen|dhaba", "Restaurants"),
    (r"resort|campground|camping|safari lodge|eco ?lodge", "Getaways & Resorts"),
    (r"hotel|lodge|guest ?house|hostel|motel|inn\b|bed (&|and) breakfast|apartment", "Hotels & Stays"),
    (r"garden", "Garden Hangouts"),
    (r"\bpark\b|nature|forest|trail|reserve|picnic|botanical|recreation area|lake|hiking", "Outdoors & Nature"),
    (r"arcade|amusement|bowling|video game|gaming|billiard|pool hall|escape room|go.?kart|laser|snooker", "Gaming & Arcades"),
    (r"museum|art gallery|gallery|cultural|theat(er|re)|performing arts|auditorium", "Arts & Culture"),
    (r"gym|fitness|sports|stadium|swimming|golf|yoga|football|tennis|basketball|martial|climbing|adventure|athletic|racket", "Sports & Adventure"),
    (r"tourist attraction|event venue|entertainment|recreation|community center|club\b", "Hangouts & Leisure"),
]
CATEGORY_GROUP = {
    "Restaurants": "eat", "Fast Food": "eat", "Nyama Choma & Grills": "eat",
    "Cafes & Bakeries": "cafes", "Desserts & Ice Cream": "cafes",
    "Bars & Chill Spots": "nightlife", "Clubs & Lounges": "nightlife", "Rooftops": "nightlife",
    "Outdoors & Nature": "outdoors", "Garden Hangouts": "outdoors",
    "Gaming & Arcades": "fun", "Arts & Culture": "fun", "Hangouts & Leisure": "fun",
    "Sports & Adventure": "sports", "Hotels & Stays": "stays", "Getaways & Resorts": "stays",
}
EXCLUDE_RE = re.compile(
    r"school|universit|college|institute|academy|church|mosque|temple|hospital|clinic|pharmac|chemist|"
    r"\bbank\b|\batm\b|insurance|gas station|petrol|fuel|supermarket|grocery|convenience|mini ?market|wholesale|"
    r"salon|barber|beauty|massage|car wash|car repair|car dealer|garage|real estate|lawyer|advocate|accountant|"
    r"cyber|internet|printing|stationery|book ?(shop|store)|laundry|dry clean|hardware|electronics|"
    r"cell ?phone|mobile|tailor|boutique|clothing|shoe|furniture|cemetery|funeral|police|post office|"
    r"government|embassy|office|sacco|studio apartment|\bngo\b|foundation",
    re.I,
)
_COMPILED_RULES = [(re.compile(p, re.I), c) for p, c in CATEGORY_RULES]


def categorize(name, category_name):
    """Ordered list of RADA categories (main first), from the place's primary category name."""
    cn = (category_name or "").strip()
    if not cn or EXCLUDE_RE.search(cn):
        return []
    main = next((c for rx, c in _COMPILED_RULES if rx.search(cn)), None)
    if not main:
        return []
    n = (name or "").lower()
    cats = [main]
    if re.search(r"nyama|choma", n) and main in ("Restaurants", "Fast Food", "Bars & Chill Spots"):
        cats = ["Nyama Choma & Grills"] + [c for c in cats if c != "Nyama Choma & Grills"]
    if re.search(r"rooftop|roof top|sky ?bar|skyline", n) and "Rooftops" not in cats:
        cats.append("Rooftops")
    if "garden" in n and "Garden Hangouts" not in cats:
        cats.append("Garden Hangouts")
    return cats


# --------------------------------------------------------------------------- small helpers

STATS = {
    "places": 0, "photos_downloaded": 0, "photos_face": 0, "photos_other": 0,
    "spots_added": 0, "spots_skipped_photos": 0, "anchors_done": 0, "scrapes": 0,
}
DAY_USED = {"places": 0, "photos": 0}
SEEDED_BASE = {"n": 0}  # spots the seeder had added before this run started
EMPTY = {"n": 0, "ids": []}  # consecutive anchors where the scraper returned nothing
T0 = time.time()


class Fatal(Exception):
    """Stop the whole run and do not chain (bad token, no credit, bad config)."""


class StopRun(Exception):
    """Time budget or daily cap reached mid-anchor; the anchor resumes next run."""


def log(*a):
    print(*a, flush=True)


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def haversine(lat1, lng1, lat2, lng2):
    r = 6371000.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = p2 - p1, math.radians(lng2 - lng1)
    h = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(h))


def norm(s):
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9 ]+", " ", (s or "").lower())).strip()


def time_ok():
    return time.time() - T0 < TIME_BUDGET_MIN * 60


def places_left():
    return DAILY_PLACE_CAP - DAY_USED["places"] - STATS["places"]


def photos_left():
    return DAILY_PHOTO_CAP - DAY_USED["photos"] - STATS["photos_downloaded"]


def caps_ok():
    return places_left() > 0 and photos_left() > 0


def total_cap_reached():
    return SEEDED_BASE["n"] + STATS["spots_added"] >= TOTAL_SPOT_CAP


def write_output(chain):
    p = os.environ.get("GITHUB_OUTPUT")
    if p:
        with open(p, "a") as f:
            f.write(f"chain={'true' if chain else 'false'}\n")
    log(f"chain={'true' if chain else 'false'}")


# --------------------------------------------------------------------------- supabase REST


def sb(method, path, json=None, prefer=None):
    h = {
        "apikey": SERVICE_KEY,
        "Authorization": f"Bearer {SERVICE_KEY}",
        "Content-Type": "application/json",
    }
    if prefer:
        h["Prefer"] = prefer
    for attempt in range(3):
        r = requests.request(method, f"{SUPABASE_URL}/rest/v1/{path}", headers=h, json=json, timeout=60)
        if r.status_code in (502, 503, 504, 429):
            time.sleep(2 * (attempt + 1))
            continue
        if r.status_code >= 300:
            raise RuntimeError(f"supabase {method} {path[:80]} -> {r.status_code}: {r.text[:300]}")
        return r.json() if r.text else None
    raise RuntimeError(f"supabase {method} {path[:80]} failed after retries")


def sb_all(path, order, page=1000):
    out, off = [], 0
    sep = "&" if "?" in path else "?"
    while True:
        rows = sb("GET", f"{path}{sep}order={order}&limit={page}&offset={off}")
        out += rows
        if len(rows) < page:
            return out
        off += page


def switch_enabled():
    rows = sb("GET", "feature_switches?key=eq.seeder_enabled&select=enabled")
    return bool(rows and rows[0].get("enabled"))


def set_switch(value):
    sb(
        "POST", "feature_switches?on_conflict=key",
        json=[{"key": "seeder_enabled", "enabled": value, "updated_at": now_iso(),
               "note": "Campus seeder: true = runs keep chaining; false = stop"}],
        prefer="resolution=merge-duplicates,return=minimal",
    )


# --------------------------------------------------------------------------- google maps scraper


def gmaps_zoom(radius_m):
    if radius_m <= 1500:
        return 15
    if radius_m <= 3000:
        return 14
    if radius_m <= 5000:
        return 13
    return 12


def parse_results(path):
    """gosom writes one JSON object per line (or a JSON array). Accept both."""
    if not os.path.exists(path):
        return []
    text = open(path, encoding="utf-8", errors="replace").read().strip()
    if not text:
        return []
    if text.startswith("["):
        try:
            return json.loads(text)
        except ValueError:
            pass
    out = []
    for line in text.splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            out.append(json.loads(line))
        except ValueError:
            continue
    return out


def gmaps_scrape(queries, lat, lng, radius_m):
    """Run gosom/google-maps-scraper in Docker for these search terms around a point."""
    work = tempfile.mkdtemp(prefix="gmaps_")
    try:
        with open(os.path.join(work, "queries.txt"), "w", encoding="utf-8") as f:
            f.write("\n".join(queries) + "\n")
        cmd = [
            "docker", "run", "--rm", "--shm-size=1g", "-v", f"{work}:/work", GMAPS_IMAGE,
            "-input", "/work/queries.txt", "-results", "/work/results.json", "-json",
            "-depth", str(GMAPS_DEPTH), "-c", str(GMAPS_CONCURRENCY), "-lang", "en",
            "-geo", f"{lat},{lng}", "-zoom", str(gmaps_zoom(radius_m)), "-radius", str(int(radius_m)),
            "-exit-on-inactivity", "3m",
        ]
        STATS["scrapes"] += 1
        try:
            r = subprocess.run(cmd, capture_output=True, text=True, timeout=GMAPS_TIMEOUT_MIN * 60)
        except FileNotFoundError:
            raise Fatal("docker is not available on this runner")
        except subprocess.TimeoutExpired:
            raise RuntimeError(f"scraper exceeded {GMAPS_TIMEOUT_MIN} min")
        items = parse_results(os.path.join(work, "results.json"))
        if r.returncode != 0 and not items:
            tail = "\n".join((r.stderr or r.stdout or "").strip().splitlines()[-12:])
            if "Unable to find image" in tail or "pull access denied" in tail or "invalid reference" in tail:
                raise Fatal("could not pull the scraper image: " + tail[-300:])
            raise RuntimeError(f"scraper exit {r.returncode}: {tail[-300:]}")
        return items
    finally:
        shutil.rmtree(work, ignore_errors=True)


def normalize(raw):
    """gosom place record -> the field names the rest of the seeder uses."""
    gps = raw.get("gps_coordinates") or {}
    lat = raw.get("latitude", gps.get("latitude"))
    lng = raw.get("longitude", gps.get("longitude"))
    imgs = []
    for im in raw.get("images") or []:
        u = im.get("image") if isinstance(im, dict) else im
        if isinstance(u, str) and u.startswith("http") and u not in imgs:
            imgs.append(u)
    th = raw.get("thumbnail")
    if isinstance(th, str) and th.startswith("http") and th not in imgs:
        imgs.append(th)
    hours = []
    oh = raw.get("open_hours") or {}
    if isinstance(oh, dict):
        for day, v in oh.items():
            hours.append({"day": day, "hours": ", ".join(v) if isinstance(v, list) else str(v)})
    status = str(raw.get("status") or "").lower()
    ca = raw.get("complete_address") or {}
    pid = raw.get("place_id") or (f"cid:{raw['cid']}" if raw.get("cid") else None) or raw.get("data_id")

    def num(v):
        try:
            return float(v)
        except (TypeError, ValueError):
            return None

    return {
        "placeId": pid, "title": raw.get("title"),
        "location": {"lat": num(lat), "lng": num(lng)},
        "categoryName": raw.get("category"),
        "totalScore": num(raw.get("review_rating")), "reviewsCount": int(num(raw.get("review_count")) or 0),
        "imageUrls": imgs, "address": raw.get("address"), "openingHours": hours,
        "phone": raw.get("phone"), "website": raw.get("website"),
        "neighborhood": (ca.get("borough") or None) if isinstance(ca, dict) else None,
        "permanentlyClosed": "permanent" in status, "temporarilyClosed": "temporar" in status,
    }


def scrape_area(a):
    terms = [t for g in GROUPS for t in TERMS.get(g, [])]
    if not terms:
        raise Fatal("GROUPS has no known groups")
    raw = gmaps_scrape(terms, a["lat"], a["lng"], float(a.get("radius_m") or 1500))
    items = [normalize(r) for r in raw if isinstance(r, dict)]
    STATS["places"] += len(items)
    return items


# --------------------------------------------------------------------------- face-free images

_FACE = {}


def _face_models():
    if _FACE:
        return _FACE
    import cv2  # lazy: only the real run needs OpenCV

    path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "models", "face_detection_yunet_2023mar.onnx")
    if not os.path.exists(path):
        os.makedirs(os.path.dirname(path), exist_ok=True)
        r = requests.get(YUNET_URL, timeout=60)
        r.raise_for_status()
        if len(r.content) < 100_000:
            raise Fatal("YuNet model download looks wrong; refusing to seed without a face detector")
        with open(path, "wb") as f:
            f.write(r.content)
    try:
        yunet = cv2.FaceDetectorYN.create(path, "", (320, 320), FACE_SCORE, 0.3, 5000)
    except Exception as e:  # noqa: BLE001
        raise Fatal(f"YuNet failed to load: {e}")
    haar = [cv2.CascadeClassifier(cv2.data.haarcascades + f)
            for f in ("haarcascade_frontalface_default.xml", "haarcascade_profileface.xml")]
    if any(c.empty() for c in haar):
        raise Fatal("Haar cascades missing from OpenCV install")
    _FACE.update({"yunet": yunet, "haar": haar})
    return _FACE


def has_face(pil_img):
    import cv2
    import numpy as np

    m = _face_models()
    bgr = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)
    h, w = bgr.shape[:2]
    m["yunet"].setInputSize((w, h))
    _, faces = m["yunet"].detect(bgr)
    if faces is not None and len(faces) > 0:
        return True
    gray = cv2.equalizeHist(cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY))
    for c in m["haar"]:
        if len(c.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=6, minSize=(28, 28))) > 0:
            return True
    return False


def process_image(raw):
    """bytes -> (webp_bytes, None) or (None, stats_key_for_reject)."""
    from PIL import Image

    try:
        im = Image.open(io.BytesIO(raw))
        im.load()
        im = im.convert("RGB")
    except Exception:  # noqa: BLE001
        return None, "photos_other"
    w, h = im.size
    if min(w, h) < 500:
        return None, "photos_other"
    scale = 1200.0 / max(w, h)
    if scale < 1:
        im = im.resize((round(w * scale), round(h * scale)), Image.LANCZOS)
    if has_face(im):
        return None, "photos_face"
    buf = io.BytesIO()
    im.save(buf, "WEBP", quality=78, method=4)
    data = buf.getvalue()
    if len(data) > 350_000:
        buf = io.BytesIO()
        im.save(buf, "WEBP", quality=62, method=4)
        data = buf.getvalue()
    return data, None


def image_url_1200(url):
    """Google photo URLs end in =w1920-h1080-k-no style size flags; ask for 1200 wide."""
    if "googleusercontent.com" in url or "ggpht.com" in url:
        base = re.sub(r"=[^=/]*$", "", url)
        return base + "=w1200"
    return url


def fetch_image(url):
    STATS["photos_downloaded"] += 1
    try:
        r = requests.get(image_url_1200(url), timeout=40)
    except requests.RequestException:
        return None
    if r.status_code != 200 or not r.content:
        return None
    return r.content


# --------------------------------------------------------------------------- queue steps


def default_radius(kind, typ):
    if kind == "zone":
        return 2200
    return 2500 if typ.lower() in ("university", "university college") else 1500


def load_institutions():
    path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "institutions.csv")
    with open(path, encoding="utf-8", newline="") as f:
        rows = [r for r in csv.DictReader(f) if (r.get("institution") or "").strip()]
    payload = []
    for r in rows:
        kind = (r.get("kind") or "institution").strip() or "institution"
        typ = (r.get("type") or "").strip()
        radius = int(float(r["radius_m"])) if (r.get("radius_m") or "").strip() else default_radius(kind, typ)
        payload.append({
            "institution": r["institution"].strip(),
            "area": (r.get("area") or "").strip(),
            "county": (r.get("county") or "").strip(),
            "inst_type": typ, "kind": kind, "radius_m": radius,
        })
    sb("POST", "seed_anchors?on_conflict=institution,area", json=payload,
       prefer="resolution=ignore-duplicates,return=minimal")
    log(f"institutions.csv: {len(payload)} rows synced")


def reset_stale():
    cutoff = (datetime.now(timezone.utc) - timedelta(hours=2)).isoformat()
    sb("PATCH", f"seed_anchors?seed_status=eq.running&updated_at=lt.{cutoff}",
       json={"seed_status": "pending", "updated_at": now_iso()}, prefer="return=minimal")


GENERIC = {"campus", "kenya", "nairobi", "the", "and", "of", "for", "in", "at", "college",
           "university", "institute", "centre", "center", "town"}


def name_matches(institution, display_name, address):
    toks = [t for t in norm(institution).split() if len(t) >= 3 and t not in GENERIC]
    if not toks:
        return True
    hay = norm(f"{display_name} {address}")
    hit = sum(1 for t in toks if t in hay)
    return hit / len(toks) >= 0.5


def in_bbox(lat, lng):
    return BBOX[0] <= lat <= BBOX[1] and BBOX[2] <= lng <= BBOX[3]


def nominatim_search(q):
    r = requests.get(
        "https://nominatim.openstreetmap.org/search",
        params={"q": q, "format": "jsonv2", "limit": 5, "countrycodes": "ke",
                "viewbox": f"{BBOX[2]},{BBOX[1]},{BBOX[3]},{BBOX[0]}", "bounded": 1},
        headers={"User-Agent": NOMINATIM_UA}, timeout=30,
    )
    time.sleep(1.1)  # Nominatim policy: max 1 request per second
    if r.status_code == 429:
        time.sleep(30)
        return []
    if r.status_code != 200:
        return []
    return r.json()


def resolve_pending(limit):
    rows = sb("GET", f"seed_anchors?resolve_status=eq.pending&select=*&order=institution.asc&limit={limit}")
    ok = bad = 0
    for r in rows:
        place_hint = r.get("area") or r.get("county") or ""
        results = nominatim_search(f"{r['institution']}, {place_hint}, Kenya".replace(" ,", ","))
        if not results and place_hint:
            results = nominatim_search(f"{r['institution']}, Kenya")
        pick = None
        for p in results:
            try:
                lat, lng = float(p["lat"]), float(p["lon"])
            except (KeyError, ValueError):
                continue
            if not in_bbox(lat, lng):
                continue
            if name_matches(r["institution"], p.get("display_name", ""), ""):
                pick = (p, lat, lng)
                break
        if pick:
            p, lat, lng = pick
            patch = {"lat": lat, "lng": lng, "place_id": f"osm:{p.get('osm_type', '')}{p.get('osm_id', '')}",
                     "resolved_name": (p.get("display_name") or "")[:200],
                     "resolve_status": "resolved", "updated_at": now_iso()}
            ok += 1
        else:
            top = (results[0].get("display_name") if results else None) or "no result"
            patch = {"resolve_status": "unresolved", "seed_status": "done",
                     "note": f"no confident match (top result: {top[:120]})", "updated_at": now_iso()}
            bad += 1
        sb("PATCH", f"seed_anchors?id=eq.{r['id']}", json=patch, prefer="return=minimal")
    log(f"resolve: {ok} resolved, {bad} unresolved")


def plan_clusters(centers, pending):
    """centers: [(lat,lng,label,radius_m)] already being covered. pending: [{id,lat,lng,institution,radius_m}],
    biggest first. An anchor is covered if it sits well inside a center's circle (within 40% of its
    radius) or its whole circle fits inside. Returns [(anchor_id, covered_by_label)]."""
    centers = list(centers)
    covered = []
    for a in pending:
        ar = a.get("radius_m") or 1500
        hit = None
        for c in centers:
            d = haversine(c[0], c[1], a["lat"], a["lng"])
            if d <= 0.4 * c[3] or d + ar <= c[3]:
                hit = c
                break
        if hit:
            covered.append((a["id"], hit[2]))
        else:
            centers.append((a["lat"], a["lng"], a["institution"], ar))
    return covered


def cluster():
    done = sb("GET", "seed_anchors?resolve_status=eq.resolved&seed_status=in.(done,running)"
                     "&spots_added=gt.0&select=lat,lng,institution,radius_m")
    centers = [(d["lat"], d["lng"], d["institution"], d.get("radius_m") or 1500)
               for d in done if d.get("lat") is not None]
    pending = sb("GET", "seed_anchors?resolve_status=eq.resolved&seed_status=eq.pending"
                        "&spots_added=eq.0&select=id,lat,lng,institution,radius_m"
                        "&order=radius_m.desc,institution.asc")
    covered = plan_clusters(centers, pending)
    for aid, label in covered:
        sb("PATCH", f"seed_anchors?id=eq.{aid}",
           json={"seed_status": "done", "note": f"covered by {label}", "updated_at": now_iso()},
           prefer="return=minimal")
    log(f"cluster: {len(covered)} anchors merged into larger nearby areas")


# --------------------------------------------------------------------------- seeding


def load_existing():
    spots = sb_all("unclaimedspots?select=google_place_id,name,latitude,longitude", "id.asc")
    skipped = sb_all("seed_skipped?select=place_id", "place_id.asc")
    ex = {
        "pids": {s["google_place_id"] for s in spots if s.get("google_place_id")},
        "names": [(norm(s["name"]), s["latitude"], s["longitude"]) for s in spots
                  if s.get("latitude") is not None and s.get("longitude") is not None],
        "skipped": {s["place_id"] for s in skipped},
    }
    log(f"existing: {len(spots)} spots, {len(ex['skipped'])} skipped place ids")
    return ex


def hours_list(item):
    out = []
    for h in item.get("openingHours") or []:
        if isinstance(h, dict) and h.get("day"):
            out.append(f"{h['day']}: {h.get('hours', '')}".strip())
    return out


def evaluate(item, a, ex):
    """Normalized scraped place -> candidate dict, or None if it does not qualify."""
    pid = item.get("placeId")
    if not pid or pid in ex["pids"] or pid in ex["skipped"]:
        return None
    if item.get("permanentlyClosed") or item.get("temporarilyClosed"):
        return None
    loc = item.get("location") or {}
    lat, lng = loc.get("lat"), loc.get("lng")
    if lat is None or lng is None:
        return None
    # a little slack: the scraper's search circle is approximate
    if haversine(a["lat"], a["lng"], lat, lng) > float(a.get("radius_m") or 1500) * 1.1:
        return None
    rating = item.get("totalScore") or 0.0
    reviews = item.get("reviewsCount") or 0
    if rating < MIN_RATING or reviews < MIN_REVIEWS:
        return None
    name = (item.get("title") or "").strip()
    if not name:
        return None
    cats = categorize(name, item.get("categoryName"))
    if not cats or CATEGORY_GROUP.get(cats[0]) not in GROUPS:
        return None
    nk = norm(name)
    for k, la, ln in ex["names"]:
        if k == nk and haversine(la, ln, lat, lng) < 150:
            return None
    imgs = [u for u in (item.get("imageUrls") or []) if isinstance(u, str) and u.startswith("http")]
    if len(imgs) < MIN_CLEAN_PHOTOS:
        return None
    return {"item": item, "pid": pid, "name": name, "lat": lat, "lng": lng, "cats": cats,
            "images": imgs, "score": len(imgs) + rating}


def r2_client():
    import boto3

    return boto3.client(
        "s3", endpoint_url=f"https://{R2_ACCOUNT_ID}.r2.cloudflarestorage.com",
        aws_access_key_id=R2_KEY_ID, aws_secret_access_key=R2_SECRET, region_name="auto",
    )


def add_spot(c, a, ex, s3):
    p, pid = c["item"], c["pid"]
    kept = []
    for u in c["images"][:MAX_PHOTO_CANDIDATES]:
        if len(kept) >= MAX_PHOTOS or photos_left() <= 0:
            break
        raw = fetch_image(u)
        if not raw:
            STATS["photos_other"] += 1
            continue
        data, reject = process_image(raw)
        if data is None:
            STATS[reject] += 1
            continue
        kept.append(data)
    if len(kept) < MIN_CLEAN_PHOTOS:
        STATS["spots_skipped_photos"] += 1
        ex["skipped"].add(pid)
        sb("POST", "seed_skipped?on_conflict=place_id",
           json=[{"place_id": pid, "reason": f"only {len(kept)} face-free photos"}],
           prefer="resolution=ignore-duplicates,return=minimal")
        return False

    sid = str(uuid.uuid4())
    urls, manifest = [], []
    for i, data in enumerate(kept):
        key = f"spots/{sid}/{i + 1}.webp"
        s3.put_object(Bucket=R2_BUCKET, Key=key, Body=data, ContentType="image/webp",
                      CacheControl="public, max-age=31536000, immutable")
        urls.append(f"{R2_PUBLIC_BASE}/{key}")
        manifest.append({
            "path": key, "spot_id": sid, "google_place_id": pid, "name": c["name"],
            "address": p.get("address"), "latitude": c["lat"], "longitude": c["lng"],
            "gallery_pos": i, "is_thumbnail": i == 0, "size_bytes": len(data), "status": "keep",
        })
    row = {
        "id": sid, "name": c["name"], "category": c["cats"][0], "extra_categories": c["cats"][1:3],
        "address": p.get("address"), "latitude": c["lat"], "longitude": c["lng"],
        "thumbnail": urls[0], "gallery": urls, "phone": p.get("phone") or p.get("phoneUnformatted"),
        "website": p.get("website"), "rating": p.get("totalScore") or 0,
        "reviews_count": p.get("reviewsCount") or 0, "is_claimed": False, "status": "unclaimed",
        "opening_hours": hours_list(p), "social_links": {},
        "neighborhood": p.get("neighborhood") or a.get("area") or a.get("county") or "Nairobi",
        "google_place_id": pid, "photos_mirrored_at": now_iso(),
        "photos_mirror_note": f"campus-seeder:{a['institution']}",
    }
    sb("POST", "unclaimedspots", json=row, prefer="return=minimal")
    try:
        sb("POST", "photo_manifest", json=manifest, prefer="return=minimal")
    except Exception as e:  # noqa: BLE001
        log(f"WARN manifest insert failed for {sid}: {e}")
    ex["pids"].add(pid)
    ex["names"].append((norm(c["name"]), c["lat"], c["lng"]))
    STATS["spots_added"] += 1
    return True


def interleave_by_category(ranked):
    """Best-first inside each category, then round-robin across categories, so the
    per-place cap keeps a mix (cafes, bars, parks...) instead of 200 restaurants."""
    buckets = {}
    for e in ranked:
        buckets.setdefault(e["cats"][0], []).append(e)
    out = []
    while buckets:
        for cat in list(buckets):
            out.append(buckets[cat].pop(0))
            if not buckets[cat]:
                del buckets[cat]
    return out


def seed_anchor(a, ex, s3):
    """Returns (spots_added, finished, scraped). finished=False means time/caps ran out mid-way."""
    if places_left() < 200 or not time_ok():
        return 0, False, 0
    items = scrape_area(a)
    ranked = [e for e in (evaluate(i, a, ex) for i in items) if e]
    ranked.sort(key=lambda e: e["score"], reverse=True)
    ranked = interleave_by_category(ranked)
    log(f"  radius {int(a.get('radius_m') or 0)} m: scraped {len(items)} places, {len(ranked)} new candidates")
    added = 0
    for c in ranked:
        if added >= MAX_SPOTS_PER_ANCHOR or total_cap_reached():
            break
        if not time_ok() or photos_left() <= 0:
            return added, False, len(items)
        if add_spot(c, a, ex, s3):
            added += 1
    return added, True, len(items)


def pending_work():
    rows = sb("GET", "seed_anchors?seed_status=eq.pending&resolve_status=in.(pending,resolved)&select=id&limit=1")
    return bool(rows)


# --------------------------------------------------------------------------- main


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--enable", action="store_true", help="turn the kill switch on, then run")
    ap.add_argument("--stop", action="store_true", help="turn the kill switch off and exit")
    args = ap.parse_args()

    missing = [k for k, v in {
        "SUPABASE_URL": SUPABASE_URL, "SUPABASE_SERVICE_ROLE_KEY": SERVICE_KEY,
        "R2_ACCOUNT_ID": R2_ACCOUNT_ID, "R2_ACCESS_KEY_ID": R2_KEY_ID,
        "R2_SECRET_ACCESS_KEY": R2_SECRET, "R2_PUBLIC_BASE": R2_PUBLIC_BASE,
    }.items() if not v]
    if missing:
        log("Missing env: " + ", ".join(missing))
        write_output(False)
        return 1

    if args.stop:
        set_switch(False)
        log("seeder_enabled = false")
        write_output(False)
        return 0
    if args.enable:
        set_switch(True)
    if not switch_enabled():
        log("seeder_enabled is false; nothing to do")
        write_output(False)
        return 0

    run = sb("POST", "seed_runs", json=[{}], prefer="return=representation")[0]
    note = ""
    code = 0
    chain = False
    try:
        since = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()
        for r in sb("GET", f"seed_runs?started_at=gte.{since}&select=searches,photos_downloaded"):
            DAY_USED["places"] += r.get("searches") or 0   # column `searches` stores places scraped
            DAY_USED["photos"] += r.get("photos_downloaded") or 0

        SEEDED_BASE["n"] = sum(r.get("spots_added") or 0 for r in
                               sb("GET", "seed_anchors?select=spots_added&limit=1000"))
        log(f"seeded so far: {SEEDED_BASE['n']} / {TOTAL_SPOT_CAP}")
        if total_cap_reached():
            set_switch(False)
            raise Fatal(f"total spot cap {TOTAL_SPOT_CAP} already reached; raise TOTAL_SPOT_CAP to continue")
        load_institutions()
        reset_stale()
        _face_models()  # fail fast, before spending any money
        resolve_pending(RESOLVE_PER_RUN)
        cluster()
        ex = load_existing()
        s3 = r2_client()

        while time_ok() and caps_ok() and switch_enabled() and not total_cap_reached():
            rows = sb("GET", "seed_anchors?resolve_status=eq.resolved&seed_status=eq.pending"
                             "&select=*&order=kind.asc,radius_m.desc,institution.asc&limit=1")
            if not rows:
                break
            a = rows[0]
            log(f"anchor [{a.get('kind')}]: {a['institution']} ({a.get('area') or a.get('county')})")
            sb("PATCH", f"seed_anchors?id=eq.{a['id']}",
               json={"seed_status": "running", "updated_at": now_iso()}, prefer="return=minimal")
            try:
                added, finished, scraped = seed_anchor(a, ex, s3)
            except Fatal:
                raise
            except Exception as e:  # noqa: BLE001
                sb("PATCH", f"seed_anchors?id=eq.{a['id']}",
                   json={"seed_status": "failed", "note": str(e)[:300], "updated_at": now_iso()},
                   prefer="return=minimal")
                log(f"  FAILED: {e}")
                continue
            if finished and scraped == 0:
                EMPTY["n"] += 1
                EMPTY["ids"].append(a["id"])
                sb("PATCH", f"seed_anchors?id=eq.{a['id']}",
                   json={"seed_status": "failed", "note": "scraper returned no places (blocked or nothing there)",
                         "updated_at": now_iso()}, prefer="return=minimal")
                log("  scraper returned nothing")
                if EMPTY["n"] >= MAX_EMPTY_ANCHORS:
                    for aid in EMPTY["ids"]:  # put them back so a later run retries them
                        sb("PATCH", f"seed_anchors?id=eq.{aid}",
                           json={"seed_status": "pending", "note": "retry: scraper was blocked",
                                 "updated_at": now_iso()}, prefer="return=minimal")
                    raise Fatal(f"scraper returned nothing {EMPTY['n']} anchors in a row; Google is probably "
                                "blocking this runner. Stopping instead of looping; the cron will try again "
                                "later, or run the workflow again.")
                time.sleep(20)
                continue
            if scraped:
                EMPTY["n"] = 0
                EMPTY["ids"] = []
            total = (a.get("spots_added") or 0) + added
            sb("PATCH", f"seed_anchors?id=eq.{a['id']}",
               json={"seed_status": "done" if finished else "pending", "spots_added": total,
                     "updated_at": now_iso()}, prefer="return=minimal")
            if finished:
                STATS["anchors_done"] += 1
            log(f"  +{added} spots ({'done' if finished else 'paused, will resume'})")
            if not finished and not caps_ok():
                break
            time.sleep(10)  # be gentle with Google between areas

        more = pending_work()
        if total_cap_reached():
            set_switch(False)
            note = f"total spot cap {TOTAL_SPOT_CAP} reached; switch turned off"
            more = False
        elif not more:
            set_switch(False)
            note = "queue empty; switch turned off"
        chain = more and switch_enabled() and caps_ok()
        if more and not caps_ok():
            note = "daily cap reached; cron will resume after the 24h window moves"
    except Fatal as e:
        note, chain, code = f"FATAL: {e}", False, 1
        log(note)
    except Exception as e:  # noqa: BLE001
        note, chain, code = f"ERROR: {e}", False, 1
        log(note)

    try:
        sb("PATCH", f"seed_runs?id=eq.{run['id']}", json={
            "finished_at": now_iso(), "anchors_done": STATS["anchors_done"], "spots_added": STATS["spots_added"],
            "searches": STATS["places"], "photos_downloaded": STATS["photos_downloaded"],
            "photos_face_rejected": STATS["photos_face"], "photos_other_rejected": STATS["photos_other"],
            "note": note[:300],
        }, prefer="return=minimal")
    except Exception as e:  # noqa: BLE001
        log(f"WARN could not write run log: {e}")
    log("run summary:", STATS, note)
    write_output(chain)
    return code


if __name__ == "__main__":
    sys.exit(main())
