#!/usr/bin/env python3
"""Fetch every route of the MedMate Doctor MVP with the session cookie and dump page text."""
import re
import sys
import urllib.request
from html.parser import HTMLParser

BASE = "https://medmate-doctor-clinic.netlify.app"
COOKIE = "mmd_session=eyJzIjoic3RfNTI4NmU0OWM2MGI1NDE2NWI4ZjkiLCJlIjowLCJleHAiOjE3OTU0OTA5NTQ3Nzd9.VO5KKJ9xOYjIfpb_w4Pm-tVTbMfLcjq1d38761WUWdQ"

ROUTES = [
    "/dashboard", "/kiosk", "/nurse", "/queue", "/inbox", "/desk", "/billing",
    "/lab", "/teleconsult", "/schedule", "/reports", "/patients", "/templates",
    "/doctors", "/staff", "/messages", "/locations", "/subscription", "/settings",
    "/enquiry", "/checkin", "/book?clinic=medmate-clinic-indiranagar",
    "/appt", "/t", "/intake", "/legal", "/start", "/login",
]


class Text(HTMLParser):
    def __init__(self):
        super().__init__()
        self.parts = []
        self.skip = 0
        self.in_script = 0

    def handle_starttag(self, tag, attrs):
        if tag in ("script", "style"):
            self.skip += 1
        if tag in ("p", "div", "section", "li", "h1", "h2", "h3", "h4", "button", "a", "td", "th", "tr", "br", "label"):
            self.parts.append("\n")

    def handle_endtag(self, tag):
        if tag in ("script", "style") and self.skip:
            self.skip -= 1
        if tag in ("p", "div", "section", "li", "h1", "h2", "h3", "h4", "button", "a", "td", "th", "tr", "label"):
            self.parts.append("\n")

    def handle_data(self, data):
        if not self.skip:
            self.parts.append(data)


def fetch(route):
    req = urllib.request.Request(BASE + route, headers={"Cookie": COOKIE, "User-Agent": "Mozilla/5.0"})
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            return r.status, r.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        return e.code, ""
    except Exception as e:  # noqa: BLE001
        return 0, str(e)


def to_text(html):
    p = Text()
    p.feed(html)
    txt = "".join(p.parts)
    txt = re.sub(r"[ \t]+", " ", txt)
    txt = re.sub(r"\n\s*\n+", "\n", txt)
    return txt.strip()


if __name__ == "__main__":
    for route in ROUTES:
        status, html = fetch(route)
        text = to_text(html)
        name = (route.split("?")[0].strip("/") or "root").replace("/", "_")
        if "?" in route:
            name += "_query"
        out = f"/tmp/mm/txt/{name}.txt"
        with open(out, "w") as f:
            f.write(f"ROUTE {route}  STATUS {status}  BYTES {len(html)}\n\n")
            f.write(text)
        print(f"{route:55s} status={status} html={len(html):7d} text={len(text):6d}")
