# Quick Start - Making Labels Appear

## Problem
You uploaded a site plan but **no labels appear** on the walls.

## Root Cause  
The system doesn't know the scale of your drawing (1:500? 1:200? 1:100?).
Without scale, it can't position labels correctly.

---

## 🚀 QUICK FIX (30 seconds)

### Step 1: Click the Quick Scale Button
In the analysis page, look for the **Scale Calibration** section:
```
🎯 Scale Calibration (REQUIRED for labels)
📏 Calibrate Scale (2-Click)    ⚡ Use Preset (1:500)
```

Click **⚡ Use Preset (1:500)**

### Step 2: Wait for Re-detection
The system will automatically re-scan the drawing with correct scale.

### Step 3: Check If Labels Appear
- **If YES**: Your drawing IS 1:500 scale! ✅
- **If NO**: Your drawing is a different scale, see "Manual Calibration" below

---

## 🎯 MANUAL CALIBRATION (if preset doesn't work)

### Step 1: Click Calibration Button
Click **📏 Calibrate Scale (2-Click)** 

You'll see:
```
📍 Click first point on canvas (position crosshair)...
```

### Step 2: Click First Point
Click on a clearly identifiable point on your drawing.

You'll see:
```
📍 Click second point on canvas...
```

### Step 3: Click Second Point  
Click on another point where you know the distance to the first point.

A popup appears:
```
Distance between the two points (in metres)?
Pixel distance: 245.6px
[Input box with "1" as default]
```

### Step 4: Enter Real Distance
Type the **actual distance in metres** between the two points you clicked.

Examples:
- If points are 5 metres apart: enter `5`
- If points are 10 metres apart: enter `10`
- If points are 2.5 metres apart: enter `2.5`

### Step 5: System Recalculates
The system calculates the scale and re-runs detection.

You'll see status update to:
```
✅ Scale calibrated: 1 pixel = 0.002 metres (1:500)
```

### Step 6: Labels Should Now Appear
If calibration was correct, walls should show with labels! ✅

---

## 🐛 What If It Still Doesn't Work?

### Check These Things:

1. **Is OpenCV.js loaded?**
   - Open browser console (F12 → Console tab)
   - Type: `window.cv` 
   - If it says "undefined", OpenCV.js isn't loaded

2. **Are walls being detected?**
   - You should see **red lines** on the walls even without calibration
   - If no red lines: detection algorithm not finding walls

3. **Are you entering distance correctly?**
   - Must be in **metres**
   - Must be positive number
   - If drawing scale is unusual, might need exact measurements

4. **Check the console logs:**
   - Open F12 → Console
   - Look for messages starting with "[autoDetectAndLabel]"
   - Should show: "Scale denominator: 500" (or whatever scale you set)

### If Wall Detection Failing
(Red lines not appearing on walls)

The drawing might have:
- Very faint/thin walls
- Noise/artifacts confusing detection
- Non-standard wall styles (curved walls, etc.)

Try:
- Upload a clearer/higher-contrast drawing
- Check the drawing is a site plan (not 3D model or perspective)

---

## 📊 What Should Happen

### After Correct Scale Set:

**Canvas shows:**
```
[Site Plan Image]
- RED LINES: Detected walls  
- YELLOW CIRCLES with BLACK NUMBERS: Labels (1, 2, 3, ...)
- Spacing: Every 5 metres along wall (or your chosen interval)
```

**Status shows:**
```
✅ Scale calibrated: 1 pixel = 0.002 metres (1:500)
```

---

## 💡 Common Scales

If unsure of your drawing scale, common ones are:
- 1:100 (large detailed drawings)
- 1:200 (medium detailed)
- 1:500 (site plans, typical default)
- 1:1000 (large area overviews)

Try each with "Use Preset" or calibrate to be sure.

---

## ✅ Implementation Summary

I've added:
- **Two button options** in the UI for scale setting
- **Automatic re-detection** when scale changes
- **Real-time status display** showing current scale
- **Integration** with existing wall detection system

Everything is connected and ready to use!

---

**Next Action**: Try the quick fix (click ⚡ Use Preset) and let me know if labels appear! 🎯
