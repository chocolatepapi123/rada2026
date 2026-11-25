#!/usr/bin/env python3
"""
RADA campus-area spot seeder.

Seeds student-area hangout spots (cafes, restaurants, bars, parks, ...) into
`unclaimedspots`. institutions.csv holds campuses AND "zones" (student areas such as
Juja Town, Kahawa Sukari, Kahawa Wendani), each with its own search radius.
Places are found with Nearby Search by exact primary type, sweeping each area with
adaptive sub-circles so dense areas are not capped at 20 results.

Per run:
  1. kill switch check            (feature_switches.seeder_enabled)
  2. load institutions.csv        -> seed_anchors (idempotent)
  3. resolve names to coordinates (Places Text Search; unmatched = 'unresolved')
  4. cluster anchors              (campuses inside a bigger area share its search)
  5. seed spots around pending anchors until TIME_BUDGET_MIN is used
  6. write chain=true/false to $GITHUB_OUTPUT; the workflow re-dispatches
     itself while chain=true. Flip the switch off (or run action=stop) to end.

Images: only photos with NO detected face are kept (YuNet + Haar, either
detector rejecting is enough). A spot needs MIN_CLEAN_PHOTOS clean photos or it
is skipped (and remembered in seed_skipped so it is never re-downloaded).

Usage:  python seeder/seed.py [--enable | --stop]
"""
import argparse
import csv
import io
import math
import os
import re
import sys
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
GKEY = _env("GOOGLE_MAPS_API_KEY", "")
R2_ACCOUNT_ID = _env("R2_ACCOUNT_ID", "")
R2_KEY_ID = _env("R2_ACCESS_KEY_ID", "")
R2_SECRET = _env("R2_SECRET_ACCESS_KEY", "")
R2_BUCKET = _env("R2_BUCKET", "rada-media")
# e.g. https://pub-xxxx.r2.dev  (swap for your custom domain at launch)
R2_PUBLIC_BASE = (_env("R2_PUBLIC_BASE", "") or "").rstrip("/")

MIN_RATING = _env("MIN_RATING", 0.0, float)         # 0 = no rating filter
MIN_REVIEWS = _env("MIN_REVIEWS", 0, int)           # 0 = no review filter
GROUPS = [g.strip() for g in (_env("GROUPS", "eat,cafes,nightlife,outdoors,fun,sports") or "").split(",") if g.strip()]
MAX_DEPTH = _env("MAX_DEPTH", 3, int)               # adaptive sub-circle depth for dense areas
NEARBY_CALL_CAP = _env("NEARBY_CALL_CAP", 120, int)  # max Nearby calls per type group per anchor
MAX_PHOTOS = _env("MAX_PHOTOS", 4, int)             # kept per spot
MIN_CLEAN_PHOTOS = _env("MIN_CLEAN_PHOTOS", 2, int)  # spot skipped below this
MAX_PHOTO_CANDIDATES = _env("MAX_PHOTO_CANDIDATES", 8, int)  # downloaded per spot at most
TOTAL_SPOT_CAP = _env("TOTAL_SPOT_CAP", 5000, int)  # all seeder spots together; then the switch turns off
MAX_SPOTS_PER_ANCHOR = _env("MAX_SPOTS_PER_ANCHOR", 200, int)  # spots added per place/area
FACE_SCORE = _env("FACE_SCORE", 0.5, float)         # lower = stricter (more rejects)
TIME_BUDGET_MIN = _env("TIME_BUDGET_MIN", 45, float)
RESOLVE_PER_RUN = _env("RESOLVE_PER_RUN", 70, int)
DAILY_SEARCH_CAP = _env("DAILY_SEARCH_CAP", 3000, int)   # rolling 24h, across runs
DAILY_PHOTO_CAP = _env("DAILY_PHOTO_CAP", 3000, int)     # rolling 24h, across runs

# Greater Nairobi / Kiambu / Thika / Juja bounding box (sanity check for resolved anchors)
BBOX = (-1.50, -0.85, 36.50, 37.30)  # lat_min, lat_max, lng_min, lng_max

YUNET_URL = (
    "https://github.com/opencv/opencv_zoo/raw/main/models/"
    "face_detection_yunet/face_detection_yunet_2023mar.onnx"
)

# Exact primary types per group (Nearby Search includedPrimaryTypes). Any type Google
# rejects is detected at run time and dropped automatically.
TYPE_GROUPS = {
    "eat": ["restaurant", "african_restaurant", "indian_restaurant", "chinese_restaurant",
            "italian_restaurant", "japanese_restaurant", "seafood_restaurant", "vegetarian_restaurant",
            "brunch_restaurant", "breakfast_restaurant", "thai_restaurant", "american_restaurant",
            "middle_eastern_restaurant", "mediterranean_restaurant", "fast_food_restaurant",
            "hamburger_restaurant", "pizza_restaurant", "sandwich_shop", "steak_house",
            "barbecue_restaurant", "meal_takeaway", "food_court"],
    "cafes": ["cafe", "coffee_shop", "bakery", "tea_house", "ice_cream_shop", "dessert_shop",
              "dessert_restaurant", "confectionery"],
    "nightlife": ["bar", "pub", "wine_bar", "bar_and_grill", "night_club"],
    "outdoors": ["park", "garden", "botanical_garden", "hiking_area", "picnic_ground",
                 "national_park", "state_park"],
    "fun": ["amusement_center", "video_arcade", "bowling_alley", "amusement_park", "museum",
            "art_gallery", "cultural_center", "performing_arts_theater", "tourist_attraction"],
    "sports": ["gym", "fitness_center", "sports_complex", "stadium", "swimming_pool", "sports_club",
               "golf_course", "adventure_sports_center"],
    "stays": ["hotel", "lodging", "guest_house", "hostel", "bed_and_breakfast", "resort_hotel", "motel"],
}

SEARCH_FIELDS = ",".join(
    "places." + f
    for f in (
        "id", "displayName", "formattedAddress", "location", "types", "primaryType",
        "rating", "userRatingCount", "businessStatus", "photos", "websiteUri",
        "nationalPhoneNumber", "regularOpeningHours", "addressComponents",
    )
)

# --------------------------------------------------------------------------- categories

# Order matters: first match on primaryType wins as the main category.
_RESTAURANT_TYPES = {
    "restaurant", "african_restaurant", "indian_restaurant", "chinese_restaurant",
    "italian_restaurant", "japanese_restaurant", "seafood_restaurant",
    "vegetarian_restaurant", "brunch_restaurant", "breakfast_restaurant",
    "thai_restaurant", "american_restaurant", "middle_eastern_restaurant",
    "mediterranean_restaurant", "food_court",
}
TYPE_RULES = [
    ({"night_club"}, "Clubs & Lounges"),
    ({"bar", "pub", "wine_bar", "cocktail_bar", "bar_and_grill", "lounge_bar"}, "Bars & Chill Spots"),
    ({"ice_cream_shop", "dessert_shop", "dessert_restaurant", "confectionery", "candy_store"}, "Desserts & Ice Cream"),
    ({"cafe", "coffee_shop", "bakery", "tea_house", "cafeteria"}, "Cafes & Bakeries"),
    ({"fast_food_restaurant", "hamburger_restaurant", "pizza_restaurant", "sandwich_shop",
      "chicken_restaurant", "meal_takeaway"}, "Fast Food"),
    ({"steak_house", "barbecue_restaurant"}, "Nyama Choma & Grills"),
    ({"hotel", "lodging", "guest_house", "hostel", "bed_and_breakfast", "motel", "extended_stay_hotel"}, "Hotels & Stays"),
    ({"resort_hotel", "campground", "cottage"}, "Getaways & Resorts"),
    ({"garden", "botanical_garden"}, "Garden Hangouts"),
    ({"park", "hiking_area", "national_park", "nature_preserve", "picnic_ground", "state_park"}, "Outdoors & Nature"),
    ({"amusement_center", "video_arcade", "bowling_alley", "amusement_park"}, "Gaming & Arcades"),
    ({"museum", "art_gallery", "cultural_center", "performing_arts_theater", "art_studio"}, "Arts & Culture"),
    ({"gym", "sports_complex", "stadium", "swimming_pool", "golf_course", "sports_club", "fitness_center",
      "adventure_sports_center"}, "Sports & Adventure"),
    (_RESTAURANT_TYPES, "Restaurants"),
    ({"tourist_attraction", "event_venue", "community_center", "karaoke"}, "Hangouts & Leisure"),
]

EXCLUDED_TYPES = {
    "school", "primary_school", "secondary_school", "university", "hospital", "doctor", "dentist",
    "pharmacy", "atm", "bank", "gas_station", "car_repair", "car_wash", "car_dealer",
    "real_estate_agency", "lawyer", "accounting", "insurance_agency", "funeral_home", "cemetery",
    "church", "mosque", "hindu_temple", "place_of_worship", "local_government_office", "police",
    "post_office", "courthouse", "embassy", "storage", "moving_company", "laundry",
    "convenience_store", "grocery_store", "supermarket",
}


def categorize(name, types, primary):
    """Return an ordered list of RADA categories (main first). Empty = not a fit."""
    n = (name or "").lower()
    types = set(types or [])
    cats = []

    def add(c):
        if c not in cats:
            cats.append(c)

    for tset, cat in TYPE_RULES:
        if primary in tset:
            add(cat)
            break
    if re.search(r"nyama|choma|\bgrill|bbq|barbecue|butchery", n):
        add("Nyama Choma & Grills")
    if re.search(r"rooftop|roof top|sky ?bar|skyline|\bsky\b", n):
        add("Rooftops")
    if "garden" in n:
        add("Garden Hangouts")
    for tset, cat in TYPE_RULES:
        if types & tset:
            add(cat)
    return cats


# --------------------------------------------------------------------------- small helpers

STATS = {
    "searches": 0, "photos_downloaded": 0, "photos_face": 0, "photos_other": 0,
    "spots_added": 0, "spots_skipped_photos": 0, "anchors_done": 0, "nearby_calls": 0,
}
DAY_USED = {"searches": 0, "photos": 0}
SEEDED_BASE = {"n": 0}  # spots the seeder had added before this run started
T0 = time.time()


class Fatal(Exception):
    """Stop the whole run and do not chain (bad key, quota, billing, bad config)."""


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


def caps_ok():
    return (
        DAY_USED["searches"] + STATS["searches"] < DAILY_SEARCH_CAP
        and DAY_USED["photos"] + STATS["photos_downloaded"] < DAILY_PHOTO_CAP
    )


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


# --------------------------------------------------------------------------- google places


def places_text_search(query, center=None, radius=50000.0, page_size=20, fields=SEARCH_FIELDS):
    body = {"textQuery": query, "regionCode": "KE", "pageSize": page_size}
    if center:
        body["locationBias"] = {"circle": {
            "center": {"latitude": center[0], "longitude": center[1]},
            "radius": min(float(radius), 50000.0),
        }}
    headers = {"X-Goog-Api-Key": GKEY, "X-Goog-FieldMask": fields, "Content-Type": "application/json"}
    for attempt in range(3):
        r = requests.post("https://places.googleapis.com/v1/places:searchText",
                          headers=headers, json=body, timeout=30)
        STATS["searches"] += 1
        if r.status_code == 200:
            return r.json().get("places", [])
        if r.status_code in (429, 500, 502, 503):
            time.sleep(2 ** (attempt + 1))
            continue
        if r.status_code in (400, 401, 403):
            raise Fatal(f"Places API {r.status_code}: {r.text[:300]}")
        raise RuntimeError(f"Places API {r.status_code}: {r.text[:300]}")
    raise RuntimeError("Places API failed after retries")


NEARBY_URL = "https://places.googleapis.com/v1/places:searchNearby"
INVALID_TYPES = set()
VALID_TYPES = set()


def _nearby_raw(center, radius, types, count=20):
    body = {
        "includedPrimaryTypes": types, "maxResultCount": count, "rankPreference": "POPULARITY",
        "regionCode": "KE",
        "locationRestriction": {"circle": {
            "center": {"latitude": center[0], "longitude": center[1]}, "radius": float(radius)}},
    }
    headers = {"X-Goog-Api-Key": GKEY, "X-Goog-FieldMask": SEARCH_FIELDS, "Content-Type": "application/json"}
    r = requests.post(NEARBY_URL, headers=headers, json=body, timeout=30)
    STATS["searches"] += 1
    STATS["nearby_calls"] += 1
    return r


def _prune_invalid(center, types):
    """A 400 usually means one of our type names is not a valid Places type. Find and drop it."""
    for t in types:
        if t in VALID_TYPES or t in INVALID_TYPES:
            continue
        r = _nearby_raw(center, 100, [t], count=1)
        if r.status_code == 200:
            VALID_TYPES.add(t)
        elif r.status_code == 400:
            INVALID_TYPES.add(t)
            log(f"  dropping unsupported place type: {t}")
        elif r.status_code in (401, 403):
            raise Fatal(f"Places API {r.status_code}: {r.text[:300]}")


def places_nearby(center, radius, types):
    types = [t for t in types if t not in INVALID_TYPES]
    pruned = False
    for attempt in range(4):
        if not types:
            return []
        r = _nearby_raw(center, radius, types)
        if r.status_code == 200:
            return r.json().get("places", [])
        if r.status_code in (429, 500, 502, 503):
            time.sleep(2 ** (attempt + 1))
            continue
        if r.status_code == 400 and not pruned:
            pruned = True
            _prune_invalid(center, types)
            types = [t for t in types if t not in INVALID_TYPES]
            continue
        if r.status_code in (400, 401, 403):
            raise Fatal(f"Places API {r.status_code}: {r.text[:300]}")
        raise RuntimeError(f"Places API {r.status_code}: {r.text[:300]}")
    raise RuntimeError("Places API failed after retries")


def offset_point(center, north_m, east_m):
    lat = center[0] + north_m / 111320.0
    lng = center[1] + east_m / (111320.0 * math.cos(math.radians(center[0])))
    return (lat, lng)


def sweep(center, radius, types, cands, counter, depth=0):
    """Nearby search; if the 20-result cap is hit, split into 4 overlapping sub-circles."""
    if not time_ok() or not caps_ok():
        raise StopRun()
    if counter[0] >= NEARBY_CALL_CAP:
        return
    counter[0] += 1
    places = places_nearby(center, radius, types)
    for p in places:
        cands.setdefault(p.get("id"), p)
    time.sleep(0.05)
    if len(places) >= 20 and depth < MAX_DEPTH and radius > 250:
        for sy, sx in ((0.5, 0.5), (0.5, -0.5), (-0.5, 0.5), (-0.5, -0.5)):
            sweep(offset_point(center, sy * radius, sx * radius), radius * 0.72, types, cands, counter, depth + 1)


def fetch_photo(photo_name):
    r = requests.get(f"https://places.googleapis.com/v1/{photo_name}/media",
                     params={"maxWidthPx": 1200, "key": GKEY}, timeout=40)
    STATS["photos_downloaded"] += 1
    if r.status_code in (401, 403):
        raise Fatal(f"Places photo {r.status_code}: {r.text[:200]}")
    if r.status_code != 200 or not r.content:
        return None
    return r.content


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
           "university", "institute", "centre", "center"}


def name_matches(institution, display_name, address):
    toks = [t for t in norm(institution).split() if len(t) >= 3 and t not in GENERIC]
    if not toks:
        return True
    hay = norm(f"{display_name} {address}")
    hit = sum(1 for t in toks if t in hay)
    return hit / len(toks) >= 0.5


def in_bbox(lat, lng):
    return BBOX[0] <= lat <= BBOX[1] and BBOX[2] <= lng <= BBOX[3]


def resolve_pending(limit):
    rows = sb("GET", f"seed_anchors?resolve_status=eq.pending&select=*&order=institution.asc&limit={limit}")
    ok = bad = 0
    for r in rows:
        if not caps_ok():
            break
        place_hint = r.get("area") or r.get("county") or ""
        q = f"{r['institution']} {place_hint} Kenya".replace("  ", " ")
        places = places_text_search(
            q, center=(-1.2000, 36.8500), radius=50000.0, page_size=5,
            fields="places.id,places.displayName,places.location,places.formattedAddress,places.types",
        )
        zone = r.get("kind") == "zone"
        area_types = {"locality", "sublocality", "sublocality_level_1", "neighborhood",
                      "administrative_area_level_3", "political"}
        pick, fallback = None, None
        for p in places:
            loc = p.get("location") or {}
            lat, lng = loc.get("latitude"), loc.get("longitude")
            dn = (p.get("displayName") or {}).get("text", "")
            if lat is None or lng is None or not in_bbox(lat, lng):
                continue
            if not name_matches(r["institution"], dn, p.get("formattedAddress", "")):
                continue
            cand = (p, lat, lng, dn)
            if zone and not (set(p.get("types") or []) & area_types):
                fallback = fallback or cand  # a business inside the area still gives a usable center
                continue
            pick = cand
            break
        pick = pick or fallback
        if pick:
            p, lat, lng, dn = pick
            patch = {"lat": lat, "lng": lng, "place_id": p.get("id"), "resolved_name": dn,
                     "resolve_status": "resolved", "updated_at": now_iso()}
            ok += 1
        else:
            top = ((places[0].get("displayName") or {}).get("text") if places else None) or "no result"
            patch = {"resolve_status": "unresolved", "seed_status": "done",
                     "note": f"no confident match (top result: {top})", "updated_at": now_iso()}
            bad += 1
        sb("PATCH", f"seed_anchors?id=eq.{r['id']}", json=patch, prefer="return=minimal")
        time.sleep(0.1)
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


def neighborhood_of(p, fallback):
    for comp in p.get("addressComponents") or []:
        if set(comp.get("types") or []) & {"sublocality_level_1", "sublocality", "neighborhood"}:
            return comp.get("longText") or fallback
    return fallback


def evaluate(p, a, ex):
    pid = p.get("id")
    if not pid or pid in ex["pids"] or pid in ex["skipped"]:
        return None
    if p.get("businessStatus", "OPERATIONAL") != "OPERATIONAL":
        return None
    loc = p.get("location") or {}
    lat, lng = loc.get("latitude"), loc.get("longitude")
    if lat is None or lng is None or haversine(a["lat"], a["lng"], lat, lng) > float(a.get("radius_m") or 1500):
        return None
    rating, n = p.get("rating") or 0.0, p.get("userRatingCount") or 0
    if rating < MIN_RATING or n < MIN_REVIEWS:
        return None
    primary = p.get("primaryType")
    if not primary:
        return None
    if set(p.get("types") or []) & EXCLUDED_TYPES:
        return None
    name = (p.get("displayName") or {}).get("text") or ""
    if not name:
        return None
    cats = categorize(name, {primary}, primary)  # exact match on the place's primary type
    if not cats:
        return None
    nk = norm(name)
    for k, la, ln in ex["names"]:
        if k == nk and haversine(la, ln, lat, lng) < 150:
            return None
    if len(p.get("photos") or []) < MIN_CLEAN_PHOTOS:
        return None
    return {"place": p, "pid": pid, "name": name, "lat": lat, "lng": lng, "cats": cats,
            "score": len(p.get("photos") or []) + rating}


def r2_client():
    import boto3

    return boto3.client(
        "s3", endpoint_url=f"https://{R2_ACCOUNT_ID}.r2.cloudflarestorage.com",
        aws_access_key_id=R2_KEY_ID, aws_secret_access_key=R2_SECRET, region_name="auto",
    )


def add_spot(c, a, ex, s3):
    p, pid = c["place"], c["pid"]
    kept = []
    for ph in (p.get("photos") or [])[:MAX_PHOTO_CANDIDATES]:
        if len(kept) >= MAX_PHOTOS or not caps_ok():
            break
        raw = fetch_photo(ph["name"])
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
            "address": p.get("formattedAddress"), "latitude": c["lat"], "longitude": c["lng"],
            "gallery_pos": i, "is_thumbnail": i == 0, "size_bytes": len(data), "status": "keep",
        })
    hours = (p.get("regularOpeningHours") or {}).get("weekdayDescriptions") or []
    row = {
        "id": sid, "name": c["name"], "category": c["cats"][0], "extra_categories": c["cats"][1:3],
        "address": p.get("formattedAddress"), "latitude": c["lat"], "longitude": c["lng"],
        "thumbnail": urls[0], "gallery": urls, "phone": p.get("nationalPhoneNumber"),
        "website": p.get("websiteUri"), "rating": p.get("rating") or 0,
        "reviews_count": p.get("userRatingCount") or 0, "is_claimed": False, "status": "unclaimed",
        "opening_hours": hours, "social_links": {},
        "neighborhood": neighborhood_of(p, a.get("area") or a.get("county") or "Nairobi"),
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
    """Returns (spots_added, finished). finished=False means time/caps ran out mid-way."""
    cands, total_calls = {}, 0
    center, radius = (a["lat"], a["lng"]), float(a.get("radius_m") or 1500)
    try:
        for g in GROUPS:
            if g in TYPE_GROUPS:
                counter = [0]  # per-group budget so one dense group cannot starve the others
                sweep(center, radius, TYPE_GROUPS[g], cands, counter)
                total_calls += counter[0]
    except StopRun:
        return 0, False
    ranked = [e for e in (evaluate(p, a, ex) for p in cands.values()) if e]
    ranked.sort(key=lambda e: e["score"], reverse=True)
    ranked = interleave_by_category(ranked)
    log(f"  radius {int(radius)} m: {total_calls} nearby calls, {len(cands)} places, {len(ranked)} new candidates")
    added = 0
    for c in ranked:
        if added >= MAX_SPOTS_PER_ANCHOR or total_cap_reached():
            break
        if not time_ok() or not caps_ok():
            return added, False
        if add_spot(c, a, ex, s3):
            added += 1
    return added, True


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
        "GOOGLE_MAPS_API_KEY": GKEY, "R2_ACCOUNT_ID": R2_ACCOUNT_ID, "R2_ACCESS_KEY_ID": R2_KEY_ID,
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
    try:
        since = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()
        for r in sb("GET", f"seed_runs?started_at=gte.{since}&select=searches,photos_downloaded"):
            DAY_USED["searches"] += r.get("searches") or 0
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
                added, finished = seed_anchor(a, ex, s3)
            except Fatal:
                raise
            except Exception as e:  # noqa: BLE001
                sb("PATCH", f"seed_anchors?id=eq.{a['id']}",
                   json={"seed_status": "failed", "note": str(e)[:300], "updated_at": now_iso()},
                   prefer="return=minimal")
                log(f"  FAILED: {e}")
                continue
            total = (a.get("spots_added") or 0) + added
            sb("PATCH", f"seed_anchors?id=eq.{a['id']}",
               json={"seed_status": "done" if finished else "pending", "spots_added": total,
                     "updated_at": now_iso()}, prefer="return=minimal")
            if finished:
                STATS["anchors_done"] += 1
            log(f"  +{added} spots ({'done' if finished else 'paused, will resume'})")

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

    sb("PATCH", f"seed_runs?id=eq.{run['id']}", json={
        "finished_at": now_iso(), "anchors_done": STATS["anchors_done"], "spots_added": STATS["spots_added"],
        "searches": STATS["searches"], "photos_downloaded": STATS["photos_downloaded"],
        "photos_face_rejected": STATS["photos_face"], "photos_other_rejected": STATS["photos_other"],
        "note": note[:300],
    }, prefer="return=minimal")
    log("run summary:", STATS, note)
    write_output(chain)
    return code


if __name__ == "__main__":
    sys.exit(main())
