#!/usr/bin/env python3
"""Generates server/seed/routes.json and server/seed/students.json.

Route polylines are hand-written corner waypoints (Al Ain is a street grid),
densified to ~70 m so the bus interpolates smoothly. No routing API involved.
"""
import json, math, random

random.seed(1970)

def densify(waypoints, step_m=70.0):
    out = []
    for i in range(len(waypoints) - 1):
        (alng, alat) = waypoints[i]
        (blng, blat) = waypoints[i + 1]
        kx = math.cos(math.radians((alat + blat) / 2)) * 111320.0
        ky = 110540.0
        dx = (blng - alng) * kx
        dy = (blat - alat) * ky
        dist = math.hypot(dx, dy)
        n = max(1, int(dist // step_m))
        for j in range(n):
            t = j / n
            out.append([round(alng + (blng - alng) * t, 6), round(alat + (blat - alat) * t, 6)])
    out.append([round(waypoints[-1][0], 6), round(waypoints[-1][1], 6)])
    # round the 90-degree corners a little so the line reads like a road
    smoothed = [out[0]]
    for i in range(1, len(out) - 1):
        p, c, n = out[i - 1], out[i], out[i + 1]
        smoothed.append([round((p[0] + 2 * c[0] + n[0]) / 4, 6), round((p[1] + 2 * c[1] + n[1]) / 4, 6)])
    smoothed.append(out[-1])
    return smoothed

SCHOOL = {
    "id": "school-alwathba",
    "name_en": "Al Wathba Model School",
    "name_ar": "مدرسة الوثبة النموذجية",
    "emirate": "Abu Dhabi",
    "city_en": "Al Ain",
    "city_ar": "العين",
    "lat": 24.2058,
    "lng": 55.7502,
    "logo_url": None,
}

routes = [
    {
        "id": "route-aljimi",
        "name_en": "Al Jimi Line",
        "name_ar": "خط الجيمي",
        "direction": "morning",
        "waypoints": [
            (55.7333, 24.2452), (55.7333, 24.2430), (55.7390, 24.2430), (55.7390, 24.2386),
            (55.7390, 24.2340), (55.7428, 24.2340), (55.7428, 24.2311), (55.7428, 24.2250),
            (55.7462, 24.2250), (55.7462, 24.2223), (55.7462, 24.2170), (55.7480, 24.2170),
            (55.7480, 24.2140), (55.7480, 24.2090), (55.7502, 24.2090), (55.7502, 24.2058),
        ],
        "stops": [
            ("Khalifa Park", "حديقة خليفة", 24.2452, 55.7333, 45),
            ("Al Jimi Mall", "الجيمي مول", 24.2386, 55.7390, 40),
            ("Al Jimi Park", "حديقة الجيمي", 24.2311, 55.7428, 40),
            ("Al Nyadat", "النيادات", 24.2223, 55.7462, 35),
            ("Al Muwaiji Crossing", "تقاطع المويجعي", 24.2140, 55.7480, 35),
            ("Al Wathba Model School", "مدرسة الوثبة النموذجية", 24.2058, 55.7502, 0),
        ],
    },
    {
        "id": "route-almuwaiji",
        "name_en": "Al Muwaiji Line",
        "name_ar": "خط المويجعي",
        "direction": "morning",
        "waypoints": [
            (55.7166, 24.2248), (55.7166, 24.2220), (55.7215, 24.2220), (55.7215, 24.2200),
            (55.7260, 24.2200), (55.7260, 24.2160), (55.7290, 24.2160), (55.7330, 24.2160),
            (55.7330, 24.2115), (55.7360, 24.2115), (55.7400, 24.2115), (55.7400, 24.2085),
            (55.7430, 24.2085), (55.7470, 24.2085), (55.7470, 24.2058), (55.7502, 24.2058),
        ],
        "stops": [
            ("Al Muwaiji Fort", "قلعة المويجعي", 24.2248, 55.7166, 45),
            ("Al Masoudi", "المسعودي", 24.2200, 55.7215, 40),
            ("Zayed bin Sultan Street", "شارع زايد بن سلطان", 24.2160, 55.7290, 40),
            ("Al Mutarad", "المطارد", 24.2115, 55.7360, 35),
            ("Al Sarooj", "الصاروج", 24.2085, 55.7430, 35),
            ("Al Wathba Model School", "مدرسة الوثبة النموذجية", 24.2058, 55.7502, 0),
        ],
    },
    {
        "id": "route-altowayya",
        "name_en": "Al Towayya Line",
        "name_ar": "خط الطويّة",
        "direction": "morning",
        "waypoints": [
            (55.7640, 24.1830), (55.7640, 24.1860), (55.7600, 24.1860), (55.7600, 24.1878),
            (55.7600, 24.1905), (55.7570, 24.1905), (55.7570, 24.1930), (55.7570, 24.1960),
            (55.7540, 24.1960), (55.7540, 24.1985), (55.7540, 24.2020), (55.7502, 24.2020),
            (55.7502, 24.2058),
        ],
        "stops": [
            ("Al Towayya Park", "حديقة الطويّة", 24.1830, 55.7640, 45),
            ("Al Towayya South", "الطويّة الجنوبية", 24.1878, 55.7600, 40),
            ("Al Manaseer", "المناصير", 24.1930, 55.7570, 40),
            ("Al Jahili", "الجاهلي", 24.1985, 55.7540, 35),
            ("Al Wathba Model School", "مدرسة الوثبة النموذجية", 24.2058, 55.7502, 0),
        ],
    },
]

drivers = [
    ("driver-1", "Ahmed Al Balushi", "أحمد البلوشي", "+971 50 441 2087", "AD-DRV-40182"),
    ("driver-2", "Saeed Al Mazrouei", "سعيد المزروعي", "+971 50 662 3391", "AD-DRV-40255"),
    ("driver-3", "Mohammed Al Shamsi", "محمد الشامسي", "+971 55 118 7402", "AD-DRV-40311"),
    ("driver-4", "Rashid Al Kaabi", "راشد الكعبي", "+971 56 903 5514", "AD-DRV-40477"),
    ("driver-5", "Ali Al Hosani", "علي الحوسني", "+971 52 774 1268", "AD-DRV-40526"),
    ("driver-6", "Yousef Al Dhaheri", "يوسف الظاهري", "+971 50 337 9940", "AD-DRV-40690"),
]

bus_routes = ["route-aljimi", "route-almuwaiji", "route-aljimi", "route-altowayya", "route-almuwaiji", "route-altowayya"]
buses = []
for i, rid in enumerate(bus_routes, start=1):
    buses.append({
        "id": f"bus-{i}",
        "school_id": SCHOOL["id"],
        "route_id": rid,
        "plate": f"AD 1 · {30000 + i * 1237}",
        "capacity": 32,
        "driver_id": f"driver-{i}",
        "status": "active",
    })

out_routes = []
out_stops = []
for r in routes:
    coords = densify(r["waypoints"])
    out_routes.append({
        "id": r["id"],
        "school_id": SCHOOL["id"],
        "name_en": r["name_en"],
        "name_ar": r["name_ar"],
        "direction": r["direction"],
        "polyline": {"type": "LineString", "coordinates": coords},
    })
    for seq, (en, ar, lat, lng, dwell) in enumerate(r["stops"]):
        out_stops.append({
            "id": f"{r['id']}-stop-{seq}",
            "route_id": r["id"],
            "seq": seq,
            "name_en": en,
            "name_ar": ar,
            "lat": lat,
            "lng": lng,
            "dwell_seconds": dwell,
        })

json.dump(
    {"school": SCHOOL, "routes": out_routes, "stops": out_stops, "drivers": [
        {"id": d[0], "name_en": d[1], "name_ar": d[2], "phone": d[3], "license_no": d[4], "photo_url": None} for d in drivers
    ], "buses": buses},
    open("server/seed/routes.json", "w"),
    ensure_ascii=False,
    indent=1,
)

first = [
    ("Khalid", "خالد"), ("Mariam", "مريم"), ("Sultan", "سلطان"), ("Hessa", "حصة"),
    ("Omar", "عمر"), ("Latifa", "لطيفة"), ("Saif", "سيف"), ("Noura", "نورة"),
    ("Hamdan", "حمدان"), ("Shamma", "شما"), ("Zayed", "زايد"), ("Alia", "عالية"),
    ("Majid", "ماجد"), ("Reem", "ريم"), ("Faisal", "فيصل"), ("Dana", "دانة"),
    ("Tariq", "طارق"), ("Salama", "سلامة"), ("Abdullah", "عبدالله"), ("Fatima", "فاطمة"),
    ("Hamad", "حمد"), ("Aisha", "عائشة"), ("Nasser", "ناصر"), ("Maitha", "ميثاء"),
]
last = [
    ("Alnuaimi", "النعيمي"), ("Al Dhaheri", "الظاهري"), ("Al Kaabi", "الكعبي"), ("Al Shamsi", "الشامسي"),
    ("Al Mazrouei", "المزروعي"), ("Al Ameri", "العامري"), ("Al Balushi", "البلوشي"), ("Al Hosani", "الحوسني"),
]
grades = ["Grade 4", "Grade 5", "Grade 6", "Grade 7", "Grade 8", "Grade 9"]

students = [{
    "id": "student-khalid",
    "school_id": SCHOOL["id"],
    "name_en": "Khalid Alnuaimi",
    "name_ar": "خالد النعيمي",
    "student_no": "123456",
    "grade": "Grade 6",
    "bus_id": "bus-3",
    "stop_id": "route-aljimi-stop-2",
    "guardian_phone": "+971 50 123 4560",
    "photo_url": None,
    "demo": True,
}]

stops_by_route = {}
for s in out_stops:
    stops_by_route.setdefault(s["route_id"], []).append(s)

demo_picks = {3: "bus-2", 7: "bus-4", 11: "bus-1"}
for i in range(1, 24):
    fn = first[i % len(first)]
    ln = last[i % len(last)]
    bus = demo_picks.get(i, f"bus-{(i % 6) + 1}")
    rid = next(b["route_id"] for b in buses if b["id"] == bus)
    candidates = [s for s in stops_by_route[rid] if s["seq"] < len(stops_by_route[rid]) - 1]
    stop = candidates[i % len(candidates)]
    students.append({
        "id": f"student-{i:02d}",
        "school_id": SCHOOL["id"],
        "name_en": f"{fn[0]} {ln[0]}",
        "name_ar": f"{fn[1]} {ln[1]}",
        "student_no": str(200100 + i * 7),
        "grade": grades[i % len(grades)],
        "bus_id": bus,
        "stop_id": stop["id"],
        "guardian_phone": f"+971 5{(i % 6)} {100 + i} {4000 + i * 3}",
        "photo_url": None,
        "demo": i in demo_picks,
    })

json.dump(students, open("server/seed/students.json", "w"), ensure_ascii=False, indent=1)

for r in out_routes:
    c = r["polyline"]["coordinates"]
    tot = 0.0
    for a, b in zip(c, c[1:]):
        kx = math.cos(math.radians((a[1] + b[1]) / 2)) * 111320.0
        tot += math.hypot((b[0] - a[0]) * kx, (b[1] - a[1]) * 110540.0)
    print(f"{r['id']}: {len(c)} pts, {tot/1000:.2f} km, {tot/1000/34*60:.1f} min at 34 km/h")
print("students:", len(students), "demo:", sum(1 for s in students if s['demo']))
