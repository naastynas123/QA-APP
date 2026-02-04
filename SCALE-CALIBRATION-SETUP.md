# Scale Calibration Setup - Complete Implementation

## What Was Done

I've implemented a complete scale calibration system to fix the "nothing being labelled" issue. The system now has:

### 1. **Two Scale Calibration Options in UI**
Added to `index.html` in the Scale Calibration panel:
- **"Calibrate Scale (2-Click)"**: Manual two-point calibration
- **"Use Preset (1:500)"**: Quick fallback for standard drawings

### 2. **JavaScript Handler Functions** (app.js)
- `window.startScaleCalibration()`: Enables crosshair mode for clicking two points
- `window.setQuickScale()`: Sets scale to 1:500 instantly

### 3. **Automatic Re-detection**
When scale is set, the system automatically:
1. Stores the scale globally as `window.globalScale`
2. Re-runs `autoDetectAndLabel()` with the new scale
3. Updates status display to show current scale

### 4. **Integration with Existing Detection**
Updated `autoDetectAndLabel()` to:
- Check if user has calibrated scale first
- Fall back to image detection if not
- Pass correct scale to wall detection algorithm

## How to Use

### Option 1: Quick 1:500 Scale (Fastest)
1. Upload your site plan
2. Click **"⚡ Use Preset (1:500)"** button
3. If your drawing IS 1:500 scale, labels should appear on walls

### Option 2: Manual Calibration (Most Accurate)
1. Upload your site plan
2. Click **"📏 Calibrate Scale (2-Click)"** button
3. Cursor changes to crosshair
4. **Click** on the canvas at first known point
5. **Click** at second known point (measure distance between them)
6. **Enter** the real-world distance in metres
7. System calculates scale and re-runs detection automatically

## Why This Fixes the Problem

**Root Cause**: Labels require scale to convert pixel positions to metres. Without correct scale:
- Wall detection finds lines correctly
- But label positioning calculation is wrong
- Labels appear at wrong locations (or not visible)

**Solution**: Scale calibration ensures:
- Correct pixel-to-metre conversion
- Labels placed at accurate metre intervals
- System uses calibrated scale for all subsequent detections

## Technical Details

### Global Scale Variable
```javascript
window.globalScale = metres / pixelDistance
```
- Example: If 100 pixels = 0.2 metres, then globalScale = 0.002
- This gets used in `detectWallsAndAnnotate()` to scale label positions

### Scale Format Conversions
- Scale ratio (1:500) ↔ Metres per pixel (0.002)
- Status display shows both formats for clarity

### Status Display
Real-time feedback shows:
- ⚠️ Scale not set (default 1:500)
- 📍 Calibration in progress
- ✅ Scale calibrated (shows scale ratio and m/pixel)

## Troubleshooting

### Labels Still Not Appearing?
1. Check browser console (F12) for errors
2. Verify `autoDetectAndLabel()` was called
3. Try different scale values if drawing is non-standard
4. Check that OpenCV.js loaded successfully

### Calibration Not Working?
1. Make sure you click exactly on recognizable points
2. Enter distance in metres (not other units)
3. Check that analysisCanvas element exists in HTML
4. Clear browser cache if using old version

### Wrong Scale Applied?
1. Click "Calibrate Scale" again with correct measurements
2. Or try "Use Preset" and select different scale
3. System will re-run detection with new scale automatically

## Files Modified

1. **app.js**
   - Added global scale variables: `globalScale`, `calibrationMode`, `calibrationClicks`
   - Added `window.startScaleCalibration()` function
   - Added `window.setQuickScale()` function
   - Updated `autoDetectAndLabel()` to use calibrated scale

2. **index.html**
   - Added Scale Calibration panel with buttons and status display
   - Panel appears in analysis section before canvas

## Next Steps (If Labels Still Missing)

1. **Enable Debug Mode**: Check console logs
   - Look for "[autoDetectAndLabel]" messages
   - Verify "Scale denominator:" is being printed
   - Check "Detected X walls" output

2. **Test Wall Detection**: Verify walls are being found
   - Canvas should show red lines on walls
   - If no lines, detection algorithm needs tuning

3. **Verify Scale Impact**: 
   - Try different scale values
   - Scale wrong = labels misplaced
   - Correct scale = labels visible on walls

## Code Example

Here's how the scale calibration integrates:

```javascript
// User sets scale (either method)
window.globalScale = 0.002; // 1 pixel = 0.002 metres (1:500)

// autoDetectAndLabel checks this:
if (window.globalScale) {
    scaleToUse = Math.round(1 / window.globalScale); // → 500
}

// Then passes to detection:
detectWallsAndAnnotate(canvas, { 
    intervalMeters: 5,
    scaleDetected: scaleToUse  // 500 (denominator)
});

// Detection uses it to calculate correct label positions
```

## Expected Behavior After Setup

1. ✅ Upload drawing → analysis page shows
2. ✅ Click scale button → status updates
3. ✅ System re-runs detection → labels appear on walls
4. ✅ Red lines show detected walls
5. ✅ Yellow circles with numbers are labels

---

**Status**: Implementation complete and integrated. Ready to test!
