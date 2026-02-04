# Scale Calibration - Visual Reference Guide

## 🎯 UI Layout

```
┌─────────────────────────────────────────────────────┐
│                  IMAGE ANALYSIS                     │
├─────────────────────────────────────────────────────┤
│                                                      │
│  ┌───────────────────────────────────────────────┐  │
│  │ 🎯 Scale Calibration (REQUIRED for labels)   │  │
│  │                                              │  │
│  │ Labels won't appear unless you set the      │  │
│  │ scale!                                       │  │
│  │                                              │  │
│  │ [📏 Calibrate Scale] [⚡ Use Preset]        │  │
│  │      (2-Click)          (1:500)             │  │
│  │                                              │  │
│  │ ⚠️ Scale not set - Labels will use           │  │
│  │    default 1:500                             │  │
│  └───────────────────────────────────────────────┘  │
│                                                      │
│  ┌───────────────────────────────────────────────┐  │
│  │     [Site Plan Drawing with Canvas]          │  │
│  │                                              │  │
│  │     [RED LINES + YELLOW CIRCLES]             │  │
│  │     = Detected walls + test locations        │  │
│  │                                              │  │
│  └───────────────────────────────────────────────┘  │
│                                                      │
│  Test Location Table:                               │
│  [ 1 ] [ 2 ] [ 3 ] ...                              │
│                                                      │
└─────────────────────────────────────────────────────┘
```

---

## 📊 Workflow: Option A - Quick Preset

```
┌─────────────┐
│ Step 1:     │
│ Click       │───────────────────┐
│ ⚡ Button   │                   │
└─────────────┘                   │
                                  ▼
                         ┌─────────────────┐
                         │ System Sets:    │
                         │ globalScale =   │
                         │ 1/500 (0.002)   │
                         └─────────────────┘
                                  │
                                  ▼
                         ┌─────────────────┐
                         │ Calls:          │
                         │ autoDetectAndLabel()
                         └─────────────────┘
                                  │
                                  ▼
                         ┌─────────────────┐
                         │ Detection uses  │
                         │ scale: 1:500    │
                         └─────────────────┘
                                  │
                                  ▼
                    ┌──────────────────────────┐
                    │ Canvas updates:          │
                    │ - RED walls appear       │
                    │ - YELLOW labels appear   │
                    │   (if scale is correct)  │
                    └──────────────────────────┘
                                  │
                                  ▼
                    ┌──────────────────────────┐
                    │ Status shows:            │
                    │ ✅ Scale calibrated:    │
                    │ 1 pixel = 0.002 metres  │
                    │ (1:500)                  │
                    └──────────────────────────┘
```

---

## 📏 Workflow: Option B - Manual Calibration

```
┌─────────────────┐
│ Step 1: Click   │
│ 📏 Button       │───────────┐
└─────────────────┘            │
                               ▼
                    ┌──────────────────────┐
                    │ Cursor → Crosshair   │
                    │ Status:              │
                    │ 📍 Click first point │
                    └──────────────────────┘
                               │
                    ┌─User clicks canvas─┐
                    │                    ▼
                    │         ┌──────────────────┐
                    │         │ Click recorded:  │
                    │         │ (x1, y1)         │
                    │         │ Status:          │
                    │         │ 📍 Click 2nd pt. │
                    │         └──────────────────┘
                    │
                    └─User clicks canvas─┐
                                         ▼
                            ┌──────────────────────┐
                            │ Two clicks recorded: │
                            │ (x1, y1) → (x2, y2) │
                            │ pixelDistance =      │
                            │ √[(x2-x1)² + ...]   │
                            └──────────────────────┘
                                         │
                                         ▼
                            ┌──────────────────────┐
                            │ Prompt appears:      │
                            │ "Distance in metres?"│
                            │ [Pixel dist: 245px] │
                            │ [Input: ____  ]      │
                            └──────────────────────┘
                                         │
                            ┌─User enters: "10"──┐
                            │                    ▼
                            │         ┌──────────────────┐
                            │         │ Calculate:       │
                            │         │ globalScale =    │
                            │         │ 10 / 245 = 0.041│
                            │         └──────────────────┘
                            │
                            │         ┌──────────────────┐
                            │         │ Status updates:  │
                            │         │ ✅ Scale calib.  │
                            │         │ 1px=0.041m (1:24)│
                            │         └──────────────────┘
                            │
                            │         ┌──────────────────┐
                            │         │ Re-run detection │
                            │         │ with new scale   │
                            │         └──────────────────┘
                            │
                            └─────────────┬──────────────┘
                                          ▼
                        ┌────────────────────────────┐
                        │ Canvas shows results:      │
                        │ - Detected walls (red)     │
                        │ - Labels (yellow circles)  │
                        │   at correct positions     │
                        └────────────────────────────┘
```

---

## 🔢 Scale Math Examples

### Example 1: Standard Drawing (1:500)
```
Scenario:
  User clicks point A at (100, 150)
  User clicks point B at (200, 150)
  Pixel distance = 100 pixels
  User enters: "5" metres

Calculation:
  globalScale = 5 / 100 = 0.05 metres per pixel
  Check: 1 / 0.05 = 20... wait, that's 1:20!
  
Actually:
  globalScale = 5 / 100 = 0.05 metres/pixel
  Denominator = 1 / 0.05 = 20
  So this would be 1:20 scale (not 1:500)
  
For 1:500 scale:
  If drawing is 1:500, then at that scale
  100 pixels = 0.2 metres (100 × 0.002)
  So clicking 100px apart means 0.2m apart
```

### Example 2: Large Site Plan (1:1000)
```
Scenario:
  User clicks point A
  User clicks point B
  Pixel distance = 100 pixels
  User enters: "10" metres (actual distance)

Calculation:
  globalScale = 10 / 100 = 0.1 metres/pixel
  Denominator = 1 / 0.1 = 10
  Result: This is 1:10 scale
  
Status shows:
  ✅ Scale calibrated: 1 pixel = 0.1 metres (1:10)
```

### Example 3: Detailed Plan (1:100)
```
Scenario:
  User clicks point A
  User clicks point B  
  Pixel distance = 50 pixels
  User enters: "2" metres

Calculation:
  globalScale = 2 / 50 = 0.04 metres/pixel
  Denominator = 1 / 0.04 = 25
  Result: This is 1:25 scale
  
But they said 1:100... so maybe:
  - Wrong measurement
  - Didn't click far enough apart
  - Need better calibration points
```

---

## 🎨 Status Display States

### Initial State (No Scale Set)
```
┌──────────────────────────────────────────┐
│ ⚠️ Scale not set - Labels will use       │
│    default 1:500                         │
└──────────────────────────────────────────┘
```
Color: Red warning box
Buttons: Both enabled

### Calibration In Progress
```
┌──────────────────────────────────────────┐
│ 📍 Click first point on canvas           │
│    (position crosshair)...               │
└──────────────────────────────────────────┘
```
Color: Yellow info box
Canvas: Crosshair cursor

### Scale Set Successfully
```
┌──────────────────────────────────────────┐
│ ✅ Scale calibrated: 1 pixel =           │
│    0.002 metres (1:500)                  │
└──────────────────────────────────────────┘
```
Color: Green success box
Buttons: Can recalibrate if needed

---

## 💾 Global Variables (in window scope)

```javascript
window.globalScale          // metres per pixel (e.g., 0.002)
window.calibrationMode      // true/false - are we in calibration?
window.calibrationClicks[]  // array of click coordinates
window.currentImage         // data URL of uploaded image
window.detectedTestLocations // number of labels placed
```

---

## 🧪 Testing Scenarios

### Scenario 1: Happy Path (1:500 correct)
```
1. Upload 1:500 site plan
2. Click "⚡ Use Preset (1:500)"
3. Labels appear ✅
4. End result: System working correctly
```

### Scenario 2: Wrong Preset
```
1. Upload 1:200 site plan
2. Click "⚡ Use Preset (1:500)"
3. Labels DON'T appear (or appear in wrong location)
4. User realizes preset was wrong
5. Click "📏 Calibrate Scale"
6. Click two known points
7. Enter correct distance
8. Labels appear in correct position ✅
```

### Scenario 3: No Wall Detection
```
1. Upload drawing
2. Set scale (any method)
3. No RED lines appear on canvas
4. Problem: Wall detection algorithm failing
5. Not scale issue - detection issue
6. Check console logs for errors
```

---

## 📱 Mobile/Small Screen Considerations

```
On smaller screens, buttons might wrap:

╔─────────────────────────────────────┐
║ 🎯 Scale Calibration               │
║ [📏 Calibrate Scale (2-Click)]     │
║ [⚡ Use Preset (1:500)]            │
║ ┌─────────────────────────────────┐│
║ │ ✅ Scale calibrated: 1 pixel... ││
║ └─────────────────────────────────┘│
╚─────────────────────────────────────┘
```

Buttons flex-wrap to next line if needed.

---

## 🔗 Code Flow Diagram

```
User clicks "Use Preset"
        │
        ▼
window.setQuickScale()
        │
        ├─→ globalScale = 1/500 (0.002)
        ├─→ Update scaleStatus div
        └─→ Call autoDetectAndLabel(currentImage)
                │
                ▼
        autoDetectAndLabel checks:
                │
        ┌───────┴───────┐
        │               │
   Is globalScale    Fallback:
   already set?    detectScaleFromImage()
   │               │
   YES             (e.g., OCR-based)
   │               │
   └───────┬───────┘
           │
        Calculate scale denominator
           │
           ▼
   detectWallsAndAnnotate(canvas, {
     scaleDetected: denominator,
     intervalMeters: 5,
     dimensions: [...]
   })
           │
           ├─→ Line detection (Hough)
           ├─→ Wall clustering
           ├─→ Filter horizontal/vertical
           ├─→ Sort by position (chronological)
           └─→ Place labels using scale
                │
                ▼
           Canvas updated:
           - RED walls
           - YELLOW labels
           - Label count stored
```

---

## ✨ Key Insights

1. **Scale is critical**: Without it, all measurements wrong
2. **Two methods offer flexibility**: Quick preset OR precise calibration
3. **Automatic re-detection**: User sees results immediately after setting scale
4. **Visual feedback**: Status always shows current scale state
5. **Fallback logic**: If user doesn't set scale, system tries OCR detection

---

This visual reference should help you understand exactly what's happening at each step! 🎯
