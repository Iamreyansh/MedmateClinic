#!/usr/bin/env python3
"""Download the JS chunks referenced by every route and extract the API endpoints they call."""
import re
import urllib.request
import os

BASE = "https://medmate-doctor-clinic.netlify.app"
COOKIE = "mmd_session=eyJzIjoic3RfNTI4NmU0OWM2MGI1NDE2NWI4ZjkiLCJlIjowLCJleHAiOjE3OTU0OTA5NTQ3Nzd9.VO5KKJ9xOYjIfpb_w4Pm-tVTbMfLcjq1d38761WUWdQ"
CACHE = "/tmp/mm/chunks"
os.makedirs(CACHE, exist_ok=True)

ROUTES = [
    "/dashboard", "/kiosk", "/nurse", "/queue", "/inbox", "/desk", "/billing",
    "/lab", "/teleconsult", "/schedule", "/reports", "/patients", "/templates",
    "/doctors", "/staff", "/messages", "/locations", "/subscription", "/settings",
    "/start", "/login", "/book?clinic=medmate-clinic-indiranagar",
    "/legal/terms", "/legal/dpa", "/legal/declaration",
]


def get(url):
    req = urllib.request.Request(url, headers={"Cookie": COOKIE, "User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=45) as r:
        return r.read().decode("utf-8", "replace")


seen = {}
api_calls = {}
for route in ROUTES:
    try:
        html = get(BASE + route)
    except Exception as e:  # noqa: BLE001
        print("ERR", route, e)
        continue
    srcs = set(re.findall(r'src="(/_next/static/chunks/[^"]+\.js)"', html))
    for s in srcs:
        name = s.rsplit("/", 1)[-1]
        path = os.path.join(CACHE, name)
        if name not in seen:
            try:
                seen[name] = get(BASE + s)
                with open(path, "w") as f:
                    f.write(seen[name])
            except Exception as e:  # noqa: BLE001
                print("ERR chunk", name, e)
                seen[name] = ""
    # route -> chunks
    print(route, len(srcs), "chunks")

# now mine api calls per chunk
for name, code in seen.items():
    if not code:
        continue
    hits = set()
    for m in re.finditer(r'api\(\s*[`"\']([^`"\'$]{2,60})[`"\']', code):
        hits.add(m.group(1))
    if hits:
        api_calls[name] = sorted(hits)

for name, hits in sorted(api_calls.items()):
    print("\n==", name)
    for h in hits:
        print("   ", h)
