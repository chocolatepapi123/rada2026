"""Long-running face checker used by scripts/lib/faces.mjs.

Reads one image path per line on stdin, prints one JSON line per image on stdout:
  {"faces": N}                      N = faces at least MIN_FRAC of the image width
  {"faces": -1, "error": "..."}     could not decode / detect (caller treats as "reject")

Usage: python3 face_check.py <yunet.onnx> <score_threshold> <min_face_width_fraction>
"""
import json
import sys

import cv2

model, score_thr, min_frac = sys.argv[1], float(sys.argv[2]), float(sys.argv[3])
detector = cv2.FaceDetectorYN.create(model, "", (320, 320), score_thr, 0.3, 5000)

for line in sys.stdin:
    path = line.strip()
    if not path:
        continue
    try:
        img = cv2.imread(path)
        if img is None:
            raise ValueError("cannot decode image")
        h, w = img.shape[:2]
        longest = max(h, w)
        if longest > 1280:  # shrink big photos, keeps detection fast
            s = 1280 / longest
            img = cv2.resize(img, (int(w * s), int(h * s)))
        elif longest < 640:  # grow tiny photos so small faces are still found
            s = 960 / longest
            img = cv2.resize(img, (int(w * s), int(h * s)))
        h, w = img.shape[:2]
        detector.setInputSize((w, h))
        _, faces = detector.detect(img)
        n = 0
        if faces is not None:
            for f in faces:
                if f[2] / w >= min_frac:  # f[2] = face box width
                    n += 1
        print(json.dumps({"faces": n}), flush=True)
    except Exception as e:  # fail closed: caller drops the photo
        print(json.dumps({"faces": -1, "error": str(e)}), flush=True)
