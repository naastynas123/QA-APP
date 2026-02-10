# QA-APP — Civil Engineering Wall Detection

A web application for detecting and labelling walls in civil engineering floor-plan drawings. Upload a PDF, calibrate the scale, and the system identifies brown-coloured walls using computer vision and places measurement labels automatically.

## Architecture

```
┌────────────────────┐        ┌────────────────────┐
│   Frontend (8000)  │  HTTP  │   Backend (8001)    │
│   Node.js static   │───────▶│   FastAPI + OpenCV  │
│   server           │        │                     │
│   - index.html     │        │   /detect_walls     │
│   - wall-detector  │        │   /label_walls      │
│   - app.js         │        │   /export           │
└────────────────────┘        └────────────────────┘
```

- **Frontend** — Vanilla HTML/JS served by a Node.js static file server. Renders PDFs on a canvas, supports pan/zoom, 2-click scale calibration, and colour picking for wall detection parameters.
- **Backend** — Python FastAPI service using OpenCV and scikit-image for HSV-based wall detection, label placement, and annotated image export.

## Quick Start

### Docker (recommended)

```bash
# Run the full stack
docker compose up --build

# Frontend: http://localhost:8000
# Backend:  http://localhost:8001/health
```

Or run everything in a single container:

```bash
docker build -t qa-app .
docker run -p 8000:8000 -p 8001:8001 qa-app
```

Run only the backend:

```bash
docker build -t qa-backend ./backend
docker run -p 8001:8001 qa-backend
```

### Manual

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8001

# Frontend (in a separate terminal)
npm install
node server.js
# Open http://localhost:8000
```

## How Calibration Works

1. **Upload a PDF** — The drawing is rendered to a canvas at high resolution.
2. **Set the scale** — Click two points on a known dimension (e.g., a 1-metre line) and enter the real-world distance. This establishes a metres-per-pixel ratio.
3. **Pick the wall colour** — Use the colour picker to sample a brown wall. The app derives HSV range parameters from the picked colour.
4. **Detect walls** — The frontend sends the canvas image (base64) and HSV range to `POST /detect_walls`. The backend returns wall polylines.
5. **Label walls** — Polylines and the calibrated scale are sent to `POST /label_walls`, which returns positioned labels with callout lines.
6. **Export** — `POST /export` renders the original image with wall overlays and labels baked in, returning an annotated PNG.

## API Endpoints

All endpoints are served by the FastAPI backend on port **8001**.

### `GET /health`

Health check. Returns `{ "status": "ok" }`.

### `POST /detect_walls`

Detect brown walls in an image.

| Field | Type | Description |
|-------|------|-------------|
| `image_base64` | string | Base64-encoded image (PNG/JPEG) |
| `brown_hsv_lower` | object | `{ h, s, v }` — lower HSV bound |
| `brown_hsv_upper` | object | `{ h, s, v }` — upper HSV bound |
| `tolerance` | int | Colour tolerance (optional) |
| `min_area` | int | Minimum contour area in pixels (optional) |
| `fill_holes` | bool | Fill holes in detected mask (optional) |

**Response:** `{ walls, mask_preview_base64, debug_images, wall_count }`

### `POST /label_walls`

Place labels along detected wall polylines.

| Field | Type | Description |
|-------|------|-------------|
| `walls` | array | Wall objects with polyline coordinates |
| `scale_metres_per_pixel` | float | Calibrated scale |
| `spacing_metres` | float | Label spacing in metres |
| `prefix` | string | Label text prefix (optional) |
| `min_remaining_fraction` | float | Skip label if remaining segment is too short (optional) |

**Response:** `{ labels, label_count }`

### `POST /export`

Render an annotated image with overlays baked in.

| Field | Type | Description |
|-------|------|-------------|
| `image_base64` | string | Base64-encoded source image |
| `walls` | array | Wall polylines to draw |
| `labels` | array | Labels with callout lines |
| `line_color` | array | RGB colour for wall lines |
| `label_color` | array | RGB colour for labels |
| `line_thickness` | int | Line width in pixels |
| `font_scale` | float | Font size multiplier |

**Response:** `{ annotated_image_base64 }`

## Project Structure

```
├── backend/
│   ├── main.py              # FastAPI application
│   ├── wall_detection.py    # OpenCV wall detection logic
│   ├── label_placement.py   # Label positioning algorithm
│   ├── models.py            # Pydantic request/response schemas
│   ├── requirements.txt     # Python dependencies
│   ├── Dockerfile           # Standalone backend image
│   └── tests/               # Backend tests
├── index.html               # Main entry page
├── app.js                   # Page navigation and menu logic
├── wall-detector.html       # Wall detection UI
├── wall-detector.js         # Canvas rendering, calibration, detection client
├── wall-detector.css        # Wall detector styles
├── style.css                # Global styles
├── config.js                # Supabase client configuration
├── server.js                # Node.js static file server
├── package.json             # Node.js dependencies
├── Dockerfile               # Full-stack (frontend + backend) image
├── docker-compose.yml       # Multi-service orchestration
└── test-assets/             # Sample files for testing
```

## Known Limitations

- **Brown walls only** — Detection targets brown-coloured walls via HSV filtering. Walls drawn in other colours require adjusting the colour range manually.
- **PDF rendering** — Complex PDFs with layers or transparency may not render accurately on the canvas.
- **Scale calibration** — Accuracy depends on the user clicking precise endpoints. Small errors compound over large drawings.
- **PDF pages** — Multi-page PDFs are supported via a page selector, but only one page is processed at a time.
- **No persistence** — Detection results are held in browser memory only; refreshing the page clears all state.

## Tests

### Backend

```bash
cd backend
pip install -r requirements.txt
python -m pytest tests/ -v
```

## License

Internal project — not for public distribution.
