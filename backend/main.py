"""FastAPI application for civil engineering wall detection.

Endpoints
---------
- ``POST /detect_walls``  – detect brown walls in an uploaded image
- ``POST /label_walls``   – place deterministic labels along wall polylines
- ``POST /export``        – render annotated image with overlays
- ``GET  /health``        – health check
"""

from __future__ import annotations

import base64
from typing import Annotated

import cv2
import numpy as np
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from label_placement import place_labels
from models import (
    DetectWallsRequest,
    DetectWallsResponse,
    ExportRequest,
    ExportResponse,
    HealthResponse,
    LabelWallsRequest,
    LabelWallsResponse,
)
from wall_detection import detect_walls

app = FastAPI(
    title="Wall Detection API",
    description="Civil engineering wall detection & labelling backend",
    version="1.0.0",
)

# CORS – allow all origins for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@app.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    """Return service health status."""
    return HealthResponse()


@app.post("/detect_walls", response_model=DetectWallsResponse)
async def detect_walls_endpoint(req: DetectWallsRequest) -> DetectWallsResponse:
    """Detect walls in an uploaded image.

    Accepts a base64-encoded image and HSV colour-range parameters.  Returns
    detected wall polylines, a mask preview, and optional debug images.
    """
    try:
        image_bytes = base64.b64decode(req.image_base64)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Invalid base64 image: {exc}")

    lower = (req.brown_hsv_lower.h, req.brown_hsv_lower.s, req.brown_hsv_lower.v)
    upper = (req.brown_hsv_upper.h, req.brown_hsv_upper.s, req.brown_hsv_upper.v)

    try:
        walls, mask_b64, debug = detect_walls(
            image_bytes=image_bytes,
            brown_hsv_lower=lower,
            brown_hsv_upper=upper,
            tolerance=req.tolerance,
            min_area=req.min_area,
            fill_holes=req.fill_holes,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    return DetectWallsResponse(
        walls=walls,
        mask_preview_base64=mask_b64,
        debug_images=debug,
        wall_count=len(walls),
    )


@app.post("/label_walls", response_model=LabelWallsResponse)
async def label_walls_endpoint(req: LabelWallsRequest) -> LabelWallsResponse:
    """Place labels along detected wall polylines."""
    try:
        labels = place_labels(
            walls=req.walls,
            scale_metres_per_pixel=req.scale_metres_per_pixel,
            spacing_metres=req.spacing_metres,
            prefix=req.prefix,
            min_remaining_fraction=req.min_remaining_fraction,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    return LabelWallsResponse(labels=labels, label_count=len(labels))


@app.post("/export", response_model=ExportResponse)
async def export_endpoint(req: ExportRequest) -> ExportResponse:
    """Render an annotated image with wall overlays and labels baked in."""
    try:
        image_bytes = base64.b64decode(req.image_base64)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Invalid base64 image: {exc}")

    arr = np.frombuffer(image_bytes, dtype=np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img is None:
        raise HTTPException(status_code=400, detail="Failed to decode image")

    line_color = tuple(req.line_color[:3])
    label_color = tuple(req.label_color[:3])

    # Draw wall polylines
    for wall in req.walls:
        pts = [(int(round(p.x)), int(round(p.y))) for p in wall.polyline]
        for i in range(1, len(pts)):
            cv2.line(img, pts[i - 1], pts[i], line_color, req.line_thickness)

    # Draw labels + callout lines
    for label in req.labels:
        start = (int(round(label.callout.start.x)), int(round(label.callout.start.y)))
        end = (int(round(label.callout.end.x)), int(round(label.callout.end.y)))
        cv2.line(img, start, end, label_color, 1)
        cv2.putText(
            img,
            label.text,
            end,
            cv2.FONT_HERSHEY_SIMPLEX,
            req.font_scale,
            label_color,
            1,
            cv2.LINE_AA,
        )

    _, buf = cv2.imencode(".png", img)
    b64 = base64.b64encode(buf.tobytes()).decode("ascii")
    return ExportResponse(annotated_image_base64=b64)
