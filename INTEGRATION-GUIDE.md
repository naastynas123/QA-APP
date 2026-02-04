/**
 * Integration Guide: Adding Wall Detection to Your QA App
 */

# Integration Guide: Wall Detection in QA App

## Step 1: Install Dependencies

```bash
npm install pdfjs-dist uuid

# Dev dependencies
npm install -D typescript ts-node @types/node @types/express
```

Update your `package.json` scripts:

```json
{
  "scripts": {
    "build": "tsc",
    "dev": "ts-node src/server.ts",
    "start": "node server.js"
  }
}
```

## Step 2: Add Frontend UI

Add a wall detection section to your `index.html`:

```html
<section id="wallDetectionPage" class="page hidden">
  <div class="container">
    <h2>Wall Detection & Measurement</h2>
    
    <div class="form-group">
      <label>Upload Floor Plan (PDF)</label>
      <input type="file" id="pdfFileInput" accept=".pdf" />
      <button onclick="detectWalls()">Detect Walls</button>
    </div>
    
    <div id="detectionResults" class="hidden">
      <h3>Detection Results</h3>
      <div id="scaleInfo"></div>
      <div id="wallsList"></div>
      
      <h4>Markers Export</h4>
      <button onclick="exportMarkersCSV()">Export as CSV</button>
      <button onclick="exportMarkersJSON()">Export as JSON</button>
    </div>
    
    <div id="detectionDebug">
      <details>
        <summary>Debug Log</summary>
        <pre id="debugLog"></pre>
      </details>
    </div>
  </div>
</section>
```

## Step 3: Add Client-Side JavaScript

Add to your `app.js`:

```javascript
// Wall detection state
let lastDetectionResult = null;

async function detectWalls() {
  const fileInput = document.getElementById('pdfFileInput');
  const file = fileInput.files[0];
  
  if (!file) {
    alert('Please select a PDF file');
    return;
  }
  
  try {
    const formData = new FormData();
    formData.append('file', file);
    
    // Optional: add custom config
    const config = {
      markerConfig: { spacingMetres: 5 },
      filterConfig: { minStrokeWidth: 0.5 }
    };
    formData.append('config', JSON.stringify(config));
    
    // Show loading
    document.getElementById('detectionResults').classList.add('hidden');
    document.getElementById('wallsList').innerHTML = '<p>Processing...</p>';
    
    const response = await fetch('/api/detect-walls', {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }
    
    const result = await response.json();
    lastDetectionResult = result.data;
    
    // Display results
    displayDetectionResults(result.data);
    displayDebugLog(result.debug.log);
    
  } catch (error) {
    console.error('Detection failed:', error);
    alert('Wall detection failed: ' + error.message);
  }
}

function displayDetectionResults(data) {
  const resultsDiv = document.getElementById('detectionResults');
  
  // Show scale info
  const scaleDiv = document.getElementById('scaleInfo');
  const scale = data.scaleInfo;
  scaleDiv.innerHTML = `
    <div class="scale-info">
      <p><strong>Scale:</strong> ${scale.metresPerUnit ? scale.metresPerUnit.toFixed(6) + ' m/unit' : 'Unknown (auto-detection failed)'}</p>
      <p><strong>Strategy:</strong> ${scale.strategy} (${scale.confidence} confidence)</p>
      <p><strong>Source:</strong> ${scale.sourceInfo}</p>
      
      ${!scale.metresPerUnit ? `
        <div class="manual-scale-form">
          <label>Manual Scale Override:</label>
          <input type="number" id="manualScale" placeholder="metres per unit" step="0.001" />
          <button onclick="applyManualScale()">Apply Scale</button>
        </div>
      ` : ''}
    </div>
  `;
  
  // Show walls list
  const wallsDiv = document.getElementById('wallsList');
  let wallsHTML = `<p>${data.wallPaths.length} walls detected</p><ul>`;
  
  for (const wall of data.wallPaths) {
    wallsHTML += `
      <li>
        <strong>Wall ${wall.id.substring(0, 8)}</strong>
        <ul>
          <li>Length: ${wall.lengthMetres > 0 ? wall.lengthMetres.toFixed(2) + ' m' : 'scale unknown'}</li>
          <li>Confidence: ${(wall.confidenceScore * 100).toFixed(1)}%</li>
          <li>Segments: ${wall.polyline.segmentCount}</li>
          <li>Stroke Width: ${wall.polyline.strokeWidth.toFixed(2)}</li>
          <li>Markers: ${wall.markers.length}</li>
        </ul>
      </li>
    `;
  }
  
  wallsHTML += '</ul>';
  wallsDiv.innerHTML = wallsHTML;
  
  // Show results
  resultsDiv.classList.remove('hidden');
}

function displayDebugLog(log) {
  const debugDiv = document.getElementById('debugLog');
  debugDiv.textContent = log.join('\n');
}

async function applyManualScale() {
  const manualScale = parseFloat(document.getElementById('manualScale').value);
  
  if (!manualScale || manualScale <= 0) {
    alert('Enter a valid scale value');
    return;
  }
  
  try {
    const response = await fetch('/api/set-scale', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        wallPathsJson: JSON.stringify(lastDetectionResult.wallPaths),
        metresPerUnit: manualScale
      })
    });
    
    const result = await response.json();
    lastDetectionResult.wallPaths = result.wallPaths;
    
    // Refresh display
    displayDetectionResults(lastDetectionResult);
    alert('Scale applied successfully');
    
  } catch (error) {
    alert('Scale update failed: ' + error.message);
  }
}

function exportMarkersCSV() {
  if (!lastDetectionResult) {
    alert('No detection results to export');
    return;
  }
  
  const format = 'csv';
  const url = `/api/export-markers/${format}?wallPathsJson=${encodeURIComponent(JSON.stringify(lastDetectionResult.wallPaths))}`;
  
  const a = document.createElement('a');
  a.href = url;
  a.download = 'markers.csv';
  a.click();
}

function exportMarkersJSON() {
  if (!lastDetectionResult) {
    alert('No detection results to export');
    return;
  }
  
  const format = 'json';
  const url = `/api/export-markers/${format}?wallPathsJson=${encodeURIComponent(JSON.stringify(lastDetectionResult.wallPaths))}`;
  
  const a = document.createElement('a');
  a.href = url;
  a.download = 'markers.json';
  a.click();
}
```

## Step 4: Add Styling

Add to your `style.css`:

```css
#wallDetectionPage {
  padding: 20px;
}

.scale-info {
  background: #f0f0f0;
  padding: 15px;
  border-radius: 5px;
  margin-bottom: 20px;
}

.scale-info p {
  margin: 8px 0;
}

.manual-scale-form {
  margin-top: 15px;
  padding-top: 15px;
  border-top: 1px solid #ddd;
}

.manual-scale-form label {
  display: block;
  margin-bottom: 8px;
  font-weight: bold;
}

.manual-scale-form input {
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 3px;
  width: 200px;
}

.manual-scale-form button {
  margin-left: 10px;
  padding: 8px 16px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 3px;
  cursor: pointer;
}

#wallsList ul {
  list-style: none;
  padding-left: 0;
}

#wallsList li {
  background: #f9f9f9;
  padding: 10px;
  margin: 8px 0;
  border-left: 4px solid #007bff;
}

#wallsList ul ul {
  margin-left: 20px;
  font-size: 0.9em;
}

#detectionDebug {
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid #ddd;
}

#debugLog {
  background: #1e1e1e;
  color: #d4d4d4;
  padding: 15px;
  border-radius: 5px;
  overflow-x: auto;
  font-family: 'Monaco', 'Courier New', monospace;
  font-size: 12px;
  max-height: 400px;
}
```

## Step 5: Wire Up Navigation

Add menu item to your existing navigation:

```javascript
// In your menu generation code
const menuItems = [
  { id: 'landingPage', label: 'Home' },
  { id: 'wallDetectionPage', label: 'Wall Detection' },
  { id: 'recordsPage', label: 'Records' },
  // ... other items
];
```

## Step 6: Update Server

Modify your `server.js` to serve the new API:

```javascript
// At the end of your server.js, before server.listen()

// Wall detection API (requires Express - see src/server.ts for full implementation)
app.post('/api/detect-walls', upload.single('file'), async (req, res) => {
  // ... implementation from src/server.ts
});

app.post('/api/set-scale', express.json(), (req, res) => {
  // ... implementation from src/server.ts
});

app.get('/api/export-markers/:format', (req, res) => {
  // ... implementation from src/server.ts
});
```

Or use the TypeScript version:

```bash
npm run build
# Then run compiled JS or use ts-node in development
```

## Usage Example in Your QA App

1. User navigates to "Wall Detection" page
2. Uploads a floor plan PDF
3. System automatically detects walls and infers scale
4. If scale detection fails, user can manually enter it
5. System displays:
   - Number of walls found
   - Length of each wall in metres
   - Confidence scores
   - Chainaged markers at 5m intervals
6. User can export markers to CSV for field measurements

## Data Flow

```
PDF Upload
    ↓
PDFLoader.extractGeometry()
    ↓
WallFilter.filterSegments()
    ↓
WallFilter.groupIntoPolylines()
    ↓
ScaleInference.inferScale()
    ↓
WallBuilder.buildWallPaths()
    ↓
MarkerGenerator.generateMarkers()
    ↓
ScoringEngine.computeScores()
    ↓
DetectionResult (JSON API response)
    ↓
Frontend displays and allows export
```

## Troubleshooting Integration

### "Cannot find module 'pdfjs-dist'"
```bash
npm install pdfjs-dist
```

### API endpoint not found
- Make sure Express is imported and multer middleware is configured
- Check that routes are defined before 404 handler

### PDF processing is slow
- Large PDFs with thousands of vectors may take 1-2 seconds
- Consider processing in background worker
- Add progress reporting for long operations

### Scale not detected
- Ensure PDF contains dimension lines with labels
- Add explicit "SCALE 1:100" text to drawing
- Use manual scale override in UI

## Next Steps

1. Add visualization of detected walls on canvas
2. Implement multi-page PDF support
3. Add manual wall editing (draw/correct)
4. Export to CAD or GIS formats
5. Integrate with measurement recording workflow
6. Add batch processing for multiple PDFs

---

For full code examples, see `src/examples.ts` and `src/server.ts`.
