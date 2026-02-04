# Brown Wall Filtering & User Measurements

## New Features Added

### 1. Brown Wall Color Filtering
The system can now detect and filter walls based on their color. Brown walls can be prioritized for testing.

**How it works:**
- A checkbox has been added: "Only detect brown walls (test candidates)"
- When enabled, the wall detection algorithm will filter the detected walls to show only those that contain brown-colored pixels
- Brown color detection looks for pixels where: R > 140, G < 110, B < 90

**To use:**
1. Upload your floor plan (PDF or image)
2. In the "Upload Drawing / Site Plan" section, check the box: "Only detect brown walls (test candidates)"
3. The system will automatically re-detect walls and show only the brown ones
4. Uncheck the box to see all detected walls

### 2. Per-Wall Measurement Input
Users can now specify the actual measured length of each wall in metres.

**How it works:**
- After uploading a floor plan, a new section appears: "Wall Measurements (metres)"
- For each detected wall (up to 20 walls), you can enter the actual measured length in metres
- When you click "Apply measurements to walls", the system uses your measurements instead of auto-calculated estimates
- Markers are then placed based on the testing interval (default 5m) multiplied by your wall measurements

**To use:**
1. Upload your floor plan
2. In the "Wall Measurements (metres)" section, enter the length for each brown wall you measured
3. Click "Apply measurements to walls"
4. The markers will be repositioned based on your measurements

### 3. Complete Wall Detection Workflow

**Step 1: Upload Floor Plan**
- Click the upload box to select a PDF or image file
- The system automatically detects walls and places numbered markers

**Step 2: Filter Brown Walls (Optional)**
- Check "Only detect brown walls (test candidates)"
- This filters the display to show only brown-colored walls that need testing

**Step 3: Enter Wall Measurements**
- For each wall you plan to test, enter its actual length in metres
- These measurements should come from your site survey

**Step 4: Apply Measurements**
- Click "Apply measurements to walls"
- The system will recalculate marker positions based on:
  - Your wall length measurements (in metres)
  - The testing interval (default: 5 metres between tests)

**Step 5: Review & Record**
- Check the numbered markers on the canvas
- They now represent actual test locations based on your measurements
- Use these locations for your on-site testing

## Technical Details

### Brown Wall Detection Algorithm
```javascript
isBrownWall(x1, y1, x2, y2, imageData) {
    // Samples multiple points along the wall line
    // Checks if 30% or more pixels are brown-colored
    // Brown: R>140, G<110, B<90, and R>G and R>B
}
```

### User Measurement Storage
- Measurements are stored in `window.userWallMeasurements` object
- Format: `{1: 25.5, 2: 18.3, 3: 22.1}` (wall number → metres)
- Persists during the current session

### Marker Calculation
When applying measurements:
1. Wall length = User-specified measurement (metres)
2. Number of labels = ceil(wallLength / testInterval)
3. Labels placed evenly along the wall
4. Label count incremented sequentially (1, 2, 3, ...)

## Example Workflow

**Scenario:** Floor plan shows 3 brown walls

1. **Upload** → Detects walls, places initial markers
2. **Filter** → Check "Brown walls" → Shows only 3 walls  
3. **Measure** → Enter:
   - Wall 1: 25.5 metres
   - Wall 2: 18.3 metres  
   - Wall 3: 22.0 metres
4. **Apply** → Click "Apply measurements"
5. **Result** → 
   - Wall 1 (25.5m ÷ 5m interval) → 5 markers
   - Wall 2 (18.3m ÷ 5m interval) → 4 markers
   - Wall 3 (22.0m ÷ 5m interval) → 5 markers
   - Total: 14 numbered test locations

## Browser Compatibility

The features require:
- Modern browser with Canvas API support
- OpenCV.js library (pre-loaded)
- PDF.js library (auto-loaded from CDN for PDF support)

## Tips for Accurate Results

1. **Brown Wall Identification**
   - Ensure brown walls are clearly marked in the floor plan
   - Avoid other brown elements that shouldn't be detected
   - Use a consistent brown color throughout the plan

2. **Measurement Entry**
   - Enter measurements in metres with one decimal place accuracy
   - Round to nearest 0.1 metre for consistency
   - Double-check measurements before applying

3. **Testing Interval**
   - Default is 5 metres between tests
   - Adjust in "How often is testing needed?" field
   - Can use decimal values (e.g., 5.5 metres)

4. **Multiple Files**
   - Upload one floor plan at a time
   - Each upload clears previous measurements
   - Multiple files in one upload use the first file for analysis
