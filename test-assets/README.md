# Test Assets

Place test files in this directory for manual or automated testing of the wall detection pipeline.

## Recommended files

| File | Purpose |
|------|---------|
| `sample-floorplan.pdf` | A civil engineering floor-plan PDF with brown-coloured walls |
| `sample-floorplan.png` | Pre-rendered PNG of the above for direct API testing |
| `expected-walls.json` | Expected `/detect_walls` response for the sample image |

## Usage

### Test the backend API directly

```bash
# Encode an image and send it to the detection endpoint
BASE64=$(base64 -w0 sample-floorplan.png)
curl -s -X POST http://localhost:8001/detect_walls \
  -H "Content-Type: application/json" \
  -d "{\"image_base64\": \"$BASE64\"}" | python3 -m json.tool
```

### Health check

```bash
curl http://localhost:8001/health
```

> **Note:** Do not commit large binary files to the repository.
> Use Git LFS or download scripts for assets larger than 1 MB.
