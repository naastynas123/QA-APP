/**
 * SYSTEM ARCHITECTURE DIAGRAMS
 * Visual reference for the wall detection system
 */

# Wall Detection System - Architecture Diagrams

## 1. High-Level Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER UPLOADS PDF                          │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    /api/detect-walls                             │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │ PDFLoader    │  │ WallFilter   │  │ScaleInference│           │
│  │              │  │              │  │              │           │
│  │ • Extract    │  │ • Filter by  │  │ • Parse      │           │
│  │   geometry   │  │   stroke/len │  │   "SCALE1:X" │           │
│  │ • Detect     │  │ • Group into │  │ • Detect     │           │
│  │   strokes    │  │   polylines  │  │   dimension  │           │
│  └──────┬───────┘  └──────┬───────┘  │   lines      │           │
│         │                 │           └──────┬───────┘           │
│         └─────────────────┼──────────────────┘                   │
│                           │                                      │
│                    ▼▼▼▼▼▼▼▼▼▼▼▼                                  │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │WallBuilder   │  │Marker        │  │ScoringEngine │           │
│  │              │  │Generator     │  │              │           │
│  │ • Construct  │  │              │  │ • Score each │           │
│  │   walls      │  │ • Place marks│  │   wall 0-1   │           │
│  │ • Merge      │  │ • Chainage   │  │ • Debug info │           │
│  │   adjacent   │  │   every Nm   │  │ • Report     │           │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘           │
│         │                 │                  │                   │
│         └─────────────────┼──────────────────┘                   │
└─────────────────────────────┼──────────────────────────────────┘
                              │
                              ▼
                   ┌──────────────────────┐
                   │   JSON Response      │
                   │                      │
                   │ • wallPaths[]        │
                   │ • scaleInfo          │
                   │ • debugLog[]         │
                   └──────────────────────┘
                              │
                              ▼
                   ┌──────────────────────┐
                   │  Frontend/UI         │
                   │                      │
                   │ • Display walls      │
                   │ • Show markers       │
                   │ • Export CSV/JSON    │
                   └──────────────────────┘
```

---

## 2. PDF Processing Pipeline

```
Input PDF
    │
    ▼
┌─────────────────────────────────────────┐
│         PDFLoader::loadPDF()            │
│                                         │
│  For each page:                         │
│  ├─ Get operator list (graphics cmds)  │
│  ├─ Parse path commands                │
│  │  ├─ moveTo, lineTo → Segment        │
│  │  ├─ bezierCurveTo → ArcSegment      │
│  │  ├─ stroke/fillStroke → finalize    │
│  ├─ Extract graphics state              │
│  │  ├─ setLineWidth → strokeWidth      │
│  │  ├─ setStrokeColor → color          │
│  ├─ Extract text                        │
│  │  ├─ showText → dimension labels     │
│  └─ Identify dimension lines            │
│     ├─ Find labeled segments           │
│     ├─ Store label text & coords       │
│                                         │
│  Output: PDFGeometry {                  │
│    segments: Segment[],                 │
│    arcSegments: ArcSegment[],           │
│    dimensionLines: DimensionLine[],     │
│    textElements: Text[],                │
│    page: {width, height, pageNumber}    │
│  }                                      │
└─────────────────────────────────────────┘
```

---

## 3. Filtering & Grouping Logic

```
Raw Segments (all extracted paths)
    │
    ▼
┌─────────────────────────────────────────┐
│    WallFilter::filterSegments()         │
│                                         │
│  For each segment:                      │
│  ├─ Check strokeWidth ∈ [0.5, 50]       │
│  │  ├─ NO → Discard (too thin/thick)   │
│  ├─ Check length ∈ [10, 5000] units    │
│  │  ├─ NO → Discard (too short/long)   │
│  └─ PASS → Keep                         │
│                                         │
│  Output: Filtered[] (≈ 40% of input)   │
└─────────────────────────────────────────┘
           │
           ▼
    Filtered Segments
           │
           ▼
┌─────────────────────────────────────────┐
│    WallFilter::groupIntoPolylines()     │
│                                         │
│  For each unused segment:               │
│  ├─ Start chain                         │
│  ├─ Extend forward:                     │
│  │  ├─ Find segment within 5 units     │
│  │  ├─ Connect & mark used             │
│  │  └─ Repeat until no match           │
│  ├─ Extend backward (from start)        │
│  │  └─ Repeat                          │
│  └─ If chain ≥ 2 segments → Polyline   │
│                                         │
│  Output: Polyline[] {                   │
│    segments: Segment[],                 │
│    totalLength: number,                 │
│    strokeWidth: number                  │
│  }                                      │
└─────────────────────────────────────────┘
           │
           ▼
        Polylines
         (Wall candidates)
```

---

## 4. Scale Inference Decision Tree

```
                    Scale Detection
                          │
                    ┌─────┴─────┐
                    │           │
                    ▼           ▼
            Strategy 1:    Strategy 2:
            Annotation    Dimension
                │           │
                ▼           ▼
        ┌──────────────┐ ┌──────────────────┐
        │ Find pattern │ │ Analyze labeled  │
        │ "SCALE 1:X"  │ │ dimension lines  │
        └──────┬───────┘ └────────┬─────────┘
               │                  │
               ▼                  ▼
        ┌──────────────┐ ┌──────────────────┐
        │ X = 100?     │ │ "10.0 m" label   │
        │ → 0.1 m/unit │ │ 100 PDF units    │
        │              │ │ → 0.1 m/unit     │
        │ Confidence:  │ │                  │
        │ HIGH         │ │ Confidence:      │
        └──────┬───────┘ │ MEDIUM-HIGH      │
               │         └────────┬─────────┘
               │                  │
               └─────────┬────────┘
                         │
                    Got scale?
                    ├─ YES ──→ Use it
                    │
                    └─ NO ──→ Strategy 3: Fallback
                              │
                              ▼
                         Return null
                         Ask user to
                         set manually
```

---

## 5. WallPath Construction

```
Polyline Input (grouped segments)
    │
    ▼
┌──────────────────────────────────┐
│ WallBuilder::buildWallPaths()    │
│                                  │
│ For each polyline:               │
│ ├─ Generate unique ID (UUID)    │
│ ├─ Calculate length (PDF units)  │
│ ├─ Convert to metres:            │
│ │  lengthMetres =                │
│ │    length × metresPerUnit      │
│ └─ Create WallPath {             │
│    id, polyline, lengthMetres    │
│  }                               │
│                                  │
│ Output: WallPath[]               │
└──────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────┐
│ Optional: Merge Adjacent Walls   │
│                                  │
│ For each pair of walls:          │
│ ├─ Check if endpoints close      │
│ │  (distance < 20 units)         │
│ ├─ Check if collinear            │
│ │  (angle diff < 15°)            │
│ └─ If both true → Merge into 1   │
│                                  │
│ Output: Fewer WallPath[]         │
└──────────────────────────────────┘
         │
         ▼
    Final WallPaths
```

---

## 6. Marker Generation & Chainage

```
WallPath Input (with lengthMetres known)
    │
    ▼
┌──────────────────────────────────────┐
│ MarkerGenerator::generateMarkers()   │
│                                      │
│ totalLength = wall.lengthMetres      │
│ spacing = 5 metres (config)          │
│                                      │
│ For chainage = 0, 5, 10, 15, ...    │
│   while chainage ≤ totalLength:      │
│   ├─ distPDFUnits = chainage /       │
│   │                  metresPerUnit    │
│   ├─ InterpolatePoint(polyline,      │
│   │                  distPDFUnits)   │
│   │  → Find which segment & position │
│   └─ Create Marker {                 │
│      chainageMetres,                 │
│      position (x, y),                │
│      segmentIndex,                   │
│      distanceAlongSegment            │
│    }                                 │
│                                      │
│ Output: Marker[] @ 5m intervals      │
└──────────────────────────────────────┘

Example output (10m wall, 5m spacing):
  Marker 0: 0m  at (100, 200)
  Marker 1: 5m  at (105, 205)
  Marker 2: 10m at (110, 210)
```

---

## 7. Confidence Scoring Algorithm

```
WallPath Input
    │
    ▼
┌──────────────────────────────────┐
│ Scoring Components               │
├────────────────────────────────┤
│                                │
│ 1. LENGTH FACTOR               │
│    ├─ If 0.5–100m  → +0.20    │
│    ├─ If <0.5m     → -0.20    │
│    └─ If >100m     → -0.15    │
│                                │
│ 2. STROKE WIDTH FACTOR         │
│    ├─ Ideal: 0.5–2.0           │
│    ├─ Distance from ideal      │
│    └─ Penalty: ±0.15 max       │
│                                │
│ 3. CONNECTIVITY FACTOR         │
│    ├─ If ≥3 segments  → +0.15 │
│    ├─ If 1 segment   → -0.10 │
│    └─ If 2 segments  → +0.05 │
│                                │
│ 4. CONTINUITY FACTOR           │
│    ├─ Check gaps between segs  │
│    ├─ Gap >10 units → penalty  │
│    └─ Max: -0.20               │
│                                │
│ TOTAL = 0.5 (base) +           │
│         length_factor +         │
│         stroke_factor +         │
│         connectivity_factor +   │
│         continuity_factor       │
│                                │
│ Result: Clamp to [0, 1]       │
└──────────────────────────────────┘
           │
           ▼
    Confidence Score
    ├─ 0.9+  → EXCELLENT
    ├─ 0.8+  → GOOD
    ├─ 0.6+  → FAIR
    ├─ 0.4+  → POOR
    └─ <0.4  → VERY POOR
```

---

## 8. Complete Request/Response Flow

```
CLIENT
  │
  ├─ FormData: {file: PDF}
  │           {config: {...}}
  │
  ▼
POST /api/detect-walls
  │
  ▼
SERVER
  │
  ├─ Parse multipart
  ├─ Load PDF to buffer
  │
  ├─ Call detectWallsFromPDF(buffer, config)
  │  │
  │  ├─→ PDFLoader.loadPDF()
  │  ├─→ ScaleInference.inferScale()
  │  ├─→ WallFilter.filterSegments()
  │  ├─→ WallFilter.groupIntoPolylines()
  │  ├─→ WallBuilder.buildWallPaths()
  │  ├─→ WallBuilder.mergeAdjacentWalls()
  │  ├─→ MarkerGenerator.generateMarkers()
  │  ├─→ ScoringEngine.computeScores()
  │  ├─→ ScoringEngine.generateReport()
  │  │
  │  ▼ Returns: DetectionResult
  │
  ├─ Delete uploaded file
  │
  ├─ Construct JSON response:
  │  {
  │    success: true,
  │    data: {
  │      wallPaths: [{id, lengthMetres, confidence, markers, ...}],
  │      scaleInfo: {metresPerUnit, strategy, confidence},
  │      pageWidth, pageHeight,
  │      totalDimensionLinesFound
  │    },
  │    debug: {log: [...]}
  │  }
  │
  ▼
RESPONSE 200 JSON
  │
  ▼
CLIENT
  │
  ├─ Parse response
  ├─ Display walls (count, lengths, confidence)
  ├─ Show markers on map/canvas
  ├─ Enable export (CSV/JSON)
  ├─ Show debug log (optional)
  │
  └─ User can now:
     ├─ Review results
     ├─ Export for field work
     ├─ Override scale if needed
     └─ Use measurements in QA workflow
```

---

## 9. File Organization

```
/Users/ryan/Desktop/QA-app/
│
├── src/                          (TypeScript source)
│   ├── types.ts                  (Type definitions)
│   ├── pdfLoader.ts              (PDF extraction)
│   ├── wallFilter.ts             (Filtering logic)
│   ├── scaleInference.ts         (Scale detection)
│   ├── geometryUtils.ts          (Math utilities)
│   ├── wallBuilder.ts            (Wall construction)
│   ├── markerGenerator.ts        (Marker placement)
│   ├── scoringEngine.ts          (Scoring & debug)
│   ├── wallDetector.ts           (Orchestrator)
│   ├── server.ts                 (Express API)
│   └── examples.ts               (Usage examples)
│
├── dist/                         (Compiled JavaScript)
│   └── [same structure as src]
│
├── Documentation
│   ├── WALL-DETECTION-INDEX.md       (This file)
│   ├── QUICK-START.md                (5-min setup)
│   ├── INTEGRATION-GUIDE.md          (Add to QA app)
│   ├── README-WALL-DETECTION.md      (Complete reference)
│   ├── IMPLEMENTATION-SUMMARY.md     (Architecture)
│   └── IMPLEMENTATION-SUMMARY.md (Diagrams)
│
├── Configuration
│   ├── package.json               (Dependencies)
│   └── tsconfig.json              (TypeScript config)
│
└── Existing Files
    ├── app.js                    (Your QA app frontend)
    ├── server.js                 (Your current server)
    ├── index.html                (HTML UI)
    ├── style.css                 (Styling)
    └── config.js                 (Supabase config)
```

---

## 10. Module Dependency Graph

```
wallDetector.ts (MAIN)
  │
  ├─→ pdfLoader.ts
  │   └─→ types.ts
  │
  ├─→ wallFilter.ts
  │   ├─→ types.ts
  │   └─→ geometryUtils.ts
  │       └─→ types.ts
  │
  ├─→ scaleInference.ts
  │   └─→ types.ts
  │
  ├─→ wallBuilder.ts
  │   ├─→ types.ts
  │   ├─→ geometryUtils.ts
  │   └─→ uuid (external)
  │
  ├─→ markerGenerator.ts
  │   ├─→ types.ts
  │   └─→ geometryUtils.ts
  │
  └─→ scoringEngine.ts
      └─→ types.ts

server.ts (EXPRESS API)
  │
  ├─→ wallDetector.ts [all deps above]
  ├─→ markerGenerator.ts
  ├─→ express (external)
  ├─→ multer (external)
  └─→ fs, path (Node.js)
```

---

## 11. Error Handling Flow

```
User Upload
    │
    ▼
┌─────────────────────────────┐
│ Validate input              │
│ ├─ File exists?            │
│ ├─ Is PDF?                 │
│ └─ < 50MB?                 │
└──────────┬──────────────────┘
           │
      ┌─NO─┴─YES┐
      │        │
      ▼        ▼
   Error    Continue
      │
      │    ┌─────────────────────────┐
      │    │ Extract & Process PDF   │
      │    ├─ PDFLoader fails       │
      │    │ → Return error msg     │
      │    ├─ No geometry found    │
      │    │ → Return error msg     │
      │    └─────┬───────────────────┘
      │          │
      └──────┬───┘
             │
      ┌──NO──┴──YES┐
      │            │
      ▼            ▼
   Error      Analysis
      │            │
      │       ┌────┴─────────┐
      │       │              │
      │       ▼              ▼
      │   Success      Partial Success
      │       │         (some walls found)
      │       │              │
      │       └──────┬───────┘
      │              │
      ▼              ▼
   400/500 JSON      200 JSON
   Error Response    Result + Debug
```

---

## 12. Configuration Decision Tree

```
                   Start Analysis
                        │
                    ┌───┴───┐
                    │       │
              Loose   Strict
             Survey  Survey
                │       │
                ▼       ▼
        LOW THRESHOLDS  HIGH THRESHOLDS
        
        minStrokeWidth: 0.2    minStrokeWidth: 1.0
        minLength: 5           minLength: 30
        spacing: 10m           spacing: 2.5m
        
        ──────────────────────────
        
        ↓ More walls detected   ↓ Fewer false positives
        ↓ More noise            ↓ May miss small walls
        ↓ Lower confidence      ↓ Higher confidence
        ↓ Field ready quick     ↓ High precision needed
        
        Use when:              Use when:
        • Quick survey         • Precise measurements
        • Many small walls     • Quality control
        • Noisy PDF            • Regulatory compliance
```

---

This architecture provides a **scalable, maintainable, and transparent** system for PDF wall detection. Each module has a single responsibility, making it easy to test, debug, and enhance.

**Key Design Principles:**
- ✓ **Modular**: Each component independent
- ✓ **Testable**: Pure functions with clear contracts
- ✓ **Configurable**: Heuristics tuned via config objects
- ✓ **Transparent**: Detailed debug logs for troubleshooting
- ✓ **Extensible**: Easy to add new filtering rules or strategies
