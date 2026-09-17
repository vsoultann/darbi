/**
 * A frozen snapshot of Khalid's tracking payload, generated from the seeded database.
 *
 * It exists so Demo Mode is genuinely offline-capable: if the API cannot be reached
 * (a static host, a dead venue network, the `demo-only` build in §14) the whole
 * experience still runs from this file plus the client-side DemoEngine.
 *
 * Regenerate with: npm run seed && node scripts/snapshot-demo.mjs
 */
import type { TrackPayload } from '@shared/types';

export const FALLBACK_PAYLOAD: TrackPayload = {
  "school": {
    "id": "school-alwathba",
    "name_en": "Al Wathba Model School",
    "name_ar": "مدرسة الوثبة النموذجية",
    "emirate": "Abu Dhabi",
    "city_en": "Al Ain",
    "city_ar": "العين",
    "lat": 24.2058,
    "lng": 55.7502,
    "logo_url": null
  },
  "student": {
    "id": "student-khalid",
    "school_id": "school-alwathba",
    "name_en": "Khalid Alnuaimi",
    "name_ar": "خالد النعيمي",
    "student_no": "123456",
    "grade": "Grade 6",
    "bus_id": "bus-3",
    "stop_id": "route-aljimi-stop-2",
    "guardian_phone": "+971 50 123 4560",
    "photo_url": null,
    "is_demo": true
  },
  "bus": {
    "id": "bus-3",
    "school_id": "school-alwathba",
    "route_id": "route-aljimi",
    "plate": "AD 1 · 33711",
    "capacity": 32,
    "driver_id": "driver-3",
    "status": "active"
  },
  "driver": {
    "id": "driver-3",
    "name_en": "Mohammed Al Shamsi",
    "name_ar": "محمد الشامسي",
    "phone": "+971 55 118 7402",
    "license_no": "AD-DRV-40311",
    "photo_url": null
  },
  "route": {
    "id": "route-aljimi",
    "school_id": "school-alwathba",
    "name_en": "Al Jimi Line",
    "name_ar": "خط الجيمي",
    "polyline": {
      "type": "LineString",
      "coordinates": [
        [
          55.7333,
          24.2452
        ],
        [
          55.7333,
          24.244467
        ],
        [
          55.7333,
          24.243733
        ],
        [
          55.733478,
          24.243183
        ],
        [
          55.734012,
          24.243
        ],
        [
          55.734725,
          24.243
        ],
        [
          55.735437,
          24.243
        ],
        [
          55.73615,
          24.243
        ],
        [
          55.736863,
          24.243
        ],
        [
          55.737575,
          24.243
        ],
        [
          55.738287,
          24.243
        ],
        [
          55.738822,
          24.242817
        ],
        [
          55.739,
          24.242267
        ],
        [
          55.739,
          24.241533
        ],
        [
          55.739,
          24.2408
        ],
        [
          55.739,
          24.240067
        ],
        [
          55.739,
          24.239333
        ],
        [
          55.739,
          24.238619
        ],
        [
          55.739,
          24.237943
        ],
        [
          55.739,
          24.237286
        ],
        [
          55.739,
          24.236629
        ],
        [
          55.739,
          24.235971
        ],
        [
          55.739,
          24.235314
        ],
        [
          55.739,
          24.234657
        ],
        [
          55.73919,
          24.234164
        ],
        [
          55.73976,
          24.234
        ],
        [
          55.74052,
          24.234
        ],
        [
          55.74128,
          24.234
        ],
        [
          55.74204,
          24.234
        ],
        [
          55.74261,
          24.233819
        ],
        [
          55.7428,
          24.233275
        ],
        [
          55.7428,
          24.23255
        ],
        [
          55.7428,
          24.231825
        ],
        [
          55.7428,
          24.231112
        ],
        [
          55.7428,
          24.230422
        ],
        [
          55.7428,
          24.229744
        ],
        [
          55.7428,
          24.229067
        ],
        [
          55.7428,
          24.228389
        ],
        [
          55.7428,
          24.227711
        ],
        [
          55.7428,
          24.227033
        ],
        [
          55.7428,
          24.226356
        ],
        [
          55.7428,
          24.225678
        ],
        [
          55.743013,
          24.225169
        ],
        [
          55.74365,
          24.225
        ],
        [
          55.7445,
          24.225
        ],
        [
          55.74535,
          24.225
        ],
        [
          55.745987,
          24.224831
        ],
        [
          55.7462,
          24.224325
        ],
        [
          55.7462,
          24.22365
        ],
        [
          55.7462,
          24.222975
        ],
        [
          55.7462,
          24.222303
        ],
        [
          55.7462,
          24.221637
        ],
        [
          55.7462,
          24.220975
        ],
        [
          55.7462,
          24.220312
        ],
        [
          55.7462,
          24.21965
        ],
        [
          55.7462,
          24.218988
        ],
        [
          55.7462,
          24.218325
        ],
        [
          55.7462,
          24.217662
        ],
        [
          55.746425,
          24.217166
        ],
        [
          55.7471,
          24.217
        ],
        [
          55.747775,
          24.216812
        ],
        [
          55.748,
          24.21625
        ],
        [
          55.748,
          24.2155
        ],
        [
          55.748,
          24.21475
        ],
        [
          55.748,
          24.214009
        ],
        [
          55.748,
          24.213286
        ],
        [
          55.748,
          24.212571
        ],
        [
          55.748,
          24.211857
        ],
        [
          55.748,
          24.211143
        ],
        [
          55.748,
          24.210429
        ],
        [
          55.748,
          24.209714
        ],
        [
          55.748183,
          24.209179
        ],
        [
          55.748733,
          24.209
        ],
        [
          55.749467,
          24.209
        ],
        [
          55.750017,
          24.20884
        ],
        [
          55.7502,
          24.20836
        ],
        [
          55.7502,
          24.20772
        ],
        [
          55.7502,
          24.20708
        ],
        [
          55.7502,
          24.20644
        ],
        [
          55.7502,
          24.2058
        ]
      ]
    },
    "direction": "morning"
  },
  "stops": [
    {
      "id": "route-aljimi-stop-0",
      "route_id": "route-aljimi",
      "seq": 0,
      "name_en": "Khalifa Park",
      "name_ar": "حديقة خليفة",
      "lat": 24.2452,
      "lng": 55.7333,
      "dwell_seconds": 45
    },
    {
      "id": "route-aljimi-stop-1",
      "route_id": "route-aljimi",
      "seq": 1,
      "name_en": "Al Jimi Mall",
      "name_ar": "الجيمي مول",
      "lat": 24.2386,
      "lng": 55.739,
      "dwell_seconds": 40
    },
    {
      "id": "route-aljimi-stop-2",
      "route_id": "route-aljimi",
      "seq": 2,
      "name_en": "Al Jimi Park",
      "name_ar": "حديقة الجيمي",
      "lat": 24.2311,
      "lng": 55.7428,
      "dwell_seconds": 40
    },
    {
      "id": "route-aljimi-stop-3",
      "route_id": "route-aljimi",
      "seq": 3,
      "name_en": "Al Nyadat",
      "name_ar": "النيادات",
      "lat": 24.2223,
      "lng": 55.7462,
      "dwell_seconds": 35
    },
    {
      "id": "route-aljimi-stop-4",
      "route_id": "route-aljimi",
      "seq": 4,
      "name_en": "Al Muwaiji Crossing",
      "name_ar": "تقاطع المويجعي",
      "lat": 24.214,
      "lng": 55.748,
      "dwell_seconds": 35
    },
    {
      "id": "route-aljimi-stop-5",
      "route_id": "route-aljimi",
      "seq": 5,
      "name_en": "Al Wathba Model School",
      "name_ar": "مدرسة الوثبة النموذجية",
      "lat": 24.2058,
      "lng": 55.7502,
      "dwell_seconds": 0
    }
  ],
  "trip": {
    "tripId": "trip-bus-3",
    "busId": "bus-3",
    "routeId": "route-aljimi",
    "state": "idle",
    "progress": 0,
    "lng": 55.7333,
    "lat": 24.2452,
    "heading": 180,
    "speed_kmh": 0,
    "eta_seconds": 760,
    "delay_seconds": 0,
    "current_stop_seq": 0,
    "target_stop_seq": 5,
    "total_stops": 6,
    "distance_m": 5765,
    "updated_at": 1789622499271,
    "simulated": true
  }
} as TrackPayload;

export function fallbackPayloadFor(studentNo: string): TrackPayload | null {
  return studentNo === FALLBACK_PAYLOAD.student.student_no ? FALLBACK_PAYLOAD : null;
}
