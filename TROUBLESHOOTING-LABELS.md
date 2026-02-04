# Troubleshooting Guide - Labels Not Appearing

## 🔍 Diagnostic Checklist

### Step 1: Verify Scale Was Set

**In Browser Console (F12 → Console tab):**

Type and press Enter:
```javascript
window.globalScale
```

**Expected Output:**
- Should show a decimal number like `0.002` 
- If shows `null`: Scale not set, try clicking preset button

**Action if null:**
```javascript
// Manually set preset scale
window.setQuickScale()

// Then check
window.globalScale
```

---

### Step 2: Check Status Display

Look at the scale calibration panel status box.

**Correct:** ✅ Green checkmark
```
✅ Scale calibrated: 1 pixel = 0.002 metres (1:500)
```

**Wrong:** ⚠️ Red warning
```
⚠️ Scale not set - Labels will use default 1:500
```

**Action if wrong:**
- Click the preset button again
- Or use manual calibration

---

### Step 3: Verify Canvas Element Exists

**In Console:**
```javascript
document.getElementById('analysisCanvas')
```

**Expected:** Returns an element object
```
<canvas id="analysisCanvas" ...>
```

**If null/undefined:** Canvas element missing from HTML

---

### Step 4: Check Wall Detection

Look at the canvas on the page.

**Should see:** RED LINES on the buildings/walls
- These are detected walls from the wall detection algorithm
- These appear REGARDLESS of labels

**If NO RED LINES:**
- Problem is wall detection, not scale calibration
- See "Wall Detection Issues" section below

---

### Step 5: Verify Detection Was Called

**In Console, type:**
```javascript
window.detectedTestLocations
```

**Expected:** A number like `5`, `12`, `8`, etc.
- This is the count of labels placed

**If undefined or 0:**
- Detection ran but found 0 locations
- See "No Labels Found" section below

---

## 🐛 Specific Issues & Solutions

### Issue: "Scale not set" warning persists

#### Cause: Preset button not working
**Check:**
```javascript
window.setQuickScale
```
Should be a function, not undefined

**Fix:**
```javascript
// Run the function manually
window.globalScale = 1/500
document.getElementById('scaleStatus').innerHTML = 
  '✅ Scale calibrated: 1 pixel = 0.002 metres (1:500)'
window.autoDetectAndLabel(window.currentImage)
```

#### Cause: Status div not updating
**Check:**
```javascript
document.getElementById('scaleStatus').textContent
```

**Fix:**
```javascript
// Manually update status
document.getElementById('scaleStatus').innerHTML = 
  '✅ Scale calibrated: 1 pixel = 0.002 metres (1:500)'
```

---

### Issue: Red lines appear but NO yellow labels

#### Cause: Scale is wrong
**Check:**
```javascript
window.detectedTestLocations
```

**If 0 or undefined:**
- Walls detected (red lines visible)
- But labels not placed = scale problem
- Try different scale value

**Solution:**
```javascript
// Try different scale (e.g., 1:200 instead of 1:500)
window.globalScale = 1/200  // 0.005 instead of 0.002
window.autoDetectAndLabel(window.currentImage)
```

#### Cause: Labels placed off-canvas
**Check:** Zoom out browser (Ctrl/Cmd - minus)
- If labels appear: They were placed outside visible area
- Problem: Scale factor way off

**Solution:**
- Use manual calibration with precise measurements
- Or try different preset scale

---

### Issue: No red lines AND no yellow labels

#### Cause: Wall detection failing
**Check:**
```javascript
// Look for errors in console about OpenCV.js
window.cv
```

**Expected:** Returns an object with cv library functions

**If undefined:**
- OpenCV.js not loaded
- Can't do wall detection

**Solution:**
1. Refresh page (hard refresh: Ctrl+Shift+R)
2. Check internet connection
3. Check browser console for load errors

#### Cause: Drawing image not loaded correctly
**Check:**
```javascript
window.currentImage
```

Should be a data URL starting with `data:image/`

**If null or not image data:**
- Image not loaded properly
- Re-upload drawing

---

### Issue: Calibration button does nothing

#### Cause: Canvas element missing
**Check:**
```javascript
document.getElementById('analysisCanvas')
```

**Fix:** Make sure HTML has the canvas element

**Check your HTML has:**
```html
<canvas id="analysisCanvas"></canvas>
```

#### Cause: JavaScript error in handler
**Check:** Browser console for red error messages
- Look for syntax errors
- Look for "analysisCanvas is null" errors

**Fix:** Reload page and try again

---

### Issue: Can't click on canvas for calibration

#### Cause: Canvas not visible
- Check that analysis section expanded
- Check canvas has visible size (width/height > 0)

**Check:**
```javascript
document.getElementById('analysisCanvas').width
document.getElementById('analysisCanvas').height
```

Both should be > 0

**Fix:** Make sure drawing is uploaded and displayed

#### Cause: Another element on top of canvas
**Check:**
```javascript
document.elementFromPoint(100, 100)  // Returns top element at that coordinate
```

Should return the canvas element

---

## 🔧 Emergency Fixes

If nothing is working, try these in console:

### Force Scale
```javascript
window.globalScale = 0.002  // 1:500
window.autoDetectAndLabel(window.currentImage)
```

### Force Status Update
```javascript
document.getElementById('scaleStatus').innerHTML = 
  '✅ Manual override: 1 pixel = 0.002 metres (1:500)'
```

### Force Re-detection
```javascript
const canvas = document.getElementById('drawingCanvas')
if (canvas) {
  window.detectWallsAndAnnotate(canvas, {
    intervalMeters: 5,
    scaleDetected: 500
  })
}
```

### Check What's Set
```javascript
console.log('Global Scale:', window.globalScale)
console.log('Current Image:', window.currentImage ? 'SET' : 'NOT SET')
console.log('Canvas:', document.getElementById('analysisCanvas'))
console.log('Labels Placed:', window.detectedTestLocations)
```

---

## 📋 Diagnosis Decision Tree

```
START: Labels not appearing
│
├─ Can I set scale?
│  ├─ NO → Check console for errors, reload page
│  └─ YES → Continue
│
├─ Status shows scale is set?
│  ├─ NO → Click preset button again, check status updates
│  └─ YES → Continue
│
├─ Are red walls visible?
│  ├─ NO → Wall detection problem
│  │       ├─ Check OpenCV.js loaded (window.cv)
│  │       ├─ Check image uploaded correctly
│  │       └─ Try different image (clearer/higher contrast)
│  │
│  └─ YES → Continue
│
├─ Scale seems wrong?
│  ├─ YES → Use manual calibration
│  │       ├─ Click "Calibrate Scale"
│  │       ├─ Click 2 precise points
│  │       ├─ Enter known distance (metres)
│  │       └─ Labels should appear
│  │
│  └─ NO → Continue
│
└─ Check interval setting
   ├─ Default 5 metres
   ├─ If wall < 5m long, 0 labels placed
   └─ Try smaller interval (e.g., 2 metres)
```

---

## 🧪 Test Cases

### Test 1: Basic Functionality
```
1. Upload any drawing
2. Click "Use Preset (1:500)"
3. Check status shows green ✅
4. Does canvas update? YES = good
```

### Test 2: Scale Sensitivity
```
1. Upload drawing
2. Set scale to 1:500
3. Note if labels appear
4. Set scale to 1:200 (much different)
5. Note if labels move/change
6. If labels move = scale working correctly
```

### Test 3: Manual Calibration
```
1. Upload drawing
2. Click "Calibrate Scale"
3. Click two clearly visible points (far apart)
4. Measure actual distance in metres
5. Enter distance
6. Labels appear = calibration worked
```

---

## 📊 Success Indicators

When everything is working correctly, you should see:

### Console Output
```
[autoDetectAndLabel] Starting with interval: 5 meters
[autoDetectAndLabel] Using calibrated scale: 1:500
[autoDetectAndLabel] Scale denominator: 500
[detectWallsAndAnnotate] Scale: 500 Interval: 5
Detected XX line segments before merging
Detected Y walls
Total labels placed: Z
```

### Visual Output
- Status box shows green checkmark
- Red lines visible on buildings
- Yellow circles with numbers on walls
- Table shows detected locations

### Browser Values
```javascript
window.globalScale         // → 0.002 (or other decimal)
window.currentImage        // → starts with "data:image/"
window.detectedTestLocations  // → number > 0
document.getElementById('analysisCanvas')  // → element object
```

---

## 🆘 Last Resort

If still not working after all diagnostics:

1. **Take a screenshot** of the problem
2. **Open browser console** (F12 → Console)
3. **Copy entire console output**
4. **Note:** 
   - Drawing scale (if you know it)
   - Button clicked
   - Expected vs actual behavior
5. **Report** with screenshot + console logs

This helps debug the exact issue.

---

## 💡 Common Misconceptions

❌ **"Labels should appear without setting scale"**
- ✅ Correct: Scale MUST be set for correct label positioning

❌ **"Default 1:500 works for all drawings"**
- ✅ Correct: Default only correct if drawing IS 1:500

❌ **"Red walls + yellow labels should always appear together"**
- ✅ Correct: Red walls = detection worked, labels depend on scale

❌ **"Calibration should be pixel-perfect"**
- ✅ Correct: Approximate clicks OK, distance must be accurate

❌ **"Once calibrated, scale doesn't change"**
- ✅ Correct: Each upload needs scale set again (or reuse same scale)

---

## 📞 Summary

**Follow this order:**
1. Check `window.globalScale` is set (not null)
2. Check status box is green ✅
3. Check red lines appear (walls detected)
4. Check yellow labels appear
5. If not, try different scale (manual calibration)
6. If STILL not, check wall detection (see Step 4)

**90% of issues:** Scale not set correctly. Try manual calibration with known measurements.

**Good luck! 🎯**
