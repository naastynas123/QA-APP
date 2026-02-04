# 🚀 QUICK START - Scale Calibration System

## The Problem You Had
❌ **"Nothing's being labelled!"**

## The Solution (What Was Built)
✅ **Scale Calibration System** - Two ways to set drawing scale

---

## 🎯 Try This Right Now

### Step 1: Upload Your Drawing
Click upload button, select a site plan file

### Step 2: Click The Preset Button  
In the analysis panel, look for:
```
⚡ Use Preset (1:500)
```
Click it.

### Step 3: Check If Labels Appear
Does your drawing have:
- Red lines on walls?
- Yellow circles with numbers?

**YES** → Scale was 1:500, you're done! 🎉
**NO** → Your drawing is different scale, do manual calibration

---

## 🔧 Manual Calibration (If Preset Didn't Work)

### Step 1: Click Calibrate Button
```
📏 Calibrate Scale (2-Click)
```

### Step 2: Crosshair Mode
Cursor becomes crosshair. The prompt says:
```
📍 Click first point on canvas...
```

### Step 3: Click Two Points
1. Click point A on your drawing
2. Click point B on same drawing (measure distance between them)

Prompt asks:
```
Distance between the two points (in metres)?
```

### Step 4: Enter Distance
Type the **real distance in metres** between the points you clicked.

Examples:
- Points 10 metres apart? Enter `10`
- Points 5 metres apart? Enter `5`
- Points 2.5 metres apart? Enter `2.5`

### Step 5: Done!
System automatically recalculates and re-detects. 
Labels should now appear! ✅

---

## 📊 What Should Happen

### After Scale Is Set:

Canvas shows:
```
[Your site plan image]
  ┌─────────────┐
  │  ━━━━━━━━━  │  ← RED LINE (detected wall)
  │    ① ② ③    │  ← YELLOW CIRCLES (test labels)
  │  ━━━━━━━━━  │
  └─────────────┘
```

Status shows:
```
✅ Scale calibrated: 1 pixel = 0.002 metres (1:500)
```

Table shows:
```
Test Location | X (m) | Y (m) | Type
1            | 5.2   | 3.1   | Retaining Wall QA
2            | 8.5   | 2.8   | Earthworks QA
3            | 3.2   | 1.9   | Drainage Records
...
```

---

## 🎮 What You Need To Know

| Question | Answer |
|----------|--------|
| Where are the buttons? | In "Scale Calibration" section on analysis page |
| Which button first? | Try ⚡ preset (1:500) first - fastest |
| What if preset doesn't work? | Use 📏 calibrate with actual measurements |
| Can I change scale later? | Yes - click button again |
| How often to calibrate? | Once per drawing upload |
| What if I don't calibrate? | System defaults to 1:500 (might be wrong) |

---

## ⚠️ Common Issues & Quick Fixes

### Issue: "Still no labels after clicking preset"
**Fix:** Your drawing isn't 1:500 scale. Use manual calibration.

### Issue: "Can't click on canvas"
**Fix:** Make sure drawing is uploaded first.

### Issue: "Don't know the distance between points"
**Fix:** Use a measuring tool or scale ruler on your drawing.

### Issue: "Wrong labels position"
**Fix:** Re-calibrate with correct measurements.

---

## 💡 Scale Reference

If you're unsure, common architectural scales are:
```
1:50   - Very detailed (small areas)
1:100  - Detailed floor plans
1:200  - Medium detail
1:500  - Site plans (most common default)
1:1000 - Large area overview
```

If your drawing is one of these, try the manual calibration!

---

## ✨ That's It!

**Two buttons. Two methods. One goal: Make labels appear.**

1. **⚡ Use Preset** → Fast (if drawing is 1:500)
2. **📏 Calibrate** → Accurate (any scale)

Pick one and labels will appear! 🎯

---

## 🆘 Something Still Wrong?

Check these in order:

1. Are RED lines visible on walls?
   - YES → Scale issue, re-calibrate
   - NO → Wall detection issue

2. Can you click the preset button?
   - YES → Good, system working
   - NO → Refresh page, try again

3. Does browser console show errors? (F12)
   - YES → Report the error
   - NO → Keep debugging

---

## 📱 Mobile Users

Buttons might stack vertically on small screens.
That's OK - they still work.

Calibration still requires clicking canvas, so desktop recommended for accuracy.

---

## 🎓 Understanding Scale

**Simple version:**
- Scale tells system how big things really are
- Without it, can't place labels correctly
- With it, labels appear at right spot ✅

**Example:**
- If 100 pixels = 5 metres (your measurement)
- Then 1 pixel = 0.05 metres
- A label at pixel 500 = 25 metres away ✓

---

## 🚀 Summary

| When | Action |
|------|--------|
| Upload drawing | Scale panel appears |
| Want quick test | Click ⚡ Use Preset |
| Need exact scale | Click 📏 Calibrate |
| Status says ✅ | Labels should be visible |
| Still no labels | Try different scale |

**Result:** Labels appear on walls when scale is correct! 🎯

---

## 📞 Getting Help

**Docs available in project folder:**
- `LABELS-NOT-APPEARING-FIX.md` - User guide
- `TROUBLESHOOTING-LABELS.md` - Diagnostic guide
- `SCALE-CALIBRATION-VISUAL-GUIDE.md` - Visual reference
- `IMPLEMENTATION-COMPLETE.md` - Full technical details

---

# **You're ready to go! Upload a drawing and click the preset button.** ✨

