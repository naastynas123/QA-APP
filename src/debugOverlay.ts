/**
 * Debug Overlay and Visualization
 * Renders detected segments, walls, labels, and metrics on canvas
 */

import { Point, Segment, Polyline } from './types';

export interface DebugVisualizationConfig {
  showRawSegments: boolean;
  showMergedSegments: boolean;
  showWallClusters: boolean;
  showCenterlines: boolean;
  showLabels: boolean;
  showMetrics: boolean;
  rawSegmentColor: string;
  mergedSegmentColor: string;
  wallColor: string;
  centerlineColor: string;
  labelColor: string;
  metricsColor: string;
}

export const DEFAULT_DEBUG_CONFIG: DebugVisualizationConfig = {
  showRawSegments: true,
  showMergedSegments: true,
  showWallClusters: true,
  showCenterlines: true,
  showLabels: true,
  showMetrics: true,
  rawSegmentColor: 'rgba(200, 200, 200, 0.5)',
  mergedSegmentColor: 'rgba(100, 100, 255, 0.7)',
  wallColor: 'rgba(50, 200, 50, 0.8)',
  centerlineColor: 'rgba(255, 100, 50, 1)',
  labelColor: 'rgba(0, 0, 0, 1)',
  metricsColor: 'rgba(0, 0, 0, 0.8)',
};

export interface WallVisualization {
  id: string;
  centerline: Point[];
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
  labels: Array<{ id: string; position: Point; chainage: number; angle: number }>;
}

export class DebugOverlay {
  private config: DebugVisualizationConfig;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor(canvas: HTMLCanvasElement, config: Partial<DebugVisualizationConfig> = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.config = { ...DEFAULT_DEBUG_CONFIG, ...config };
  }

  /**
   * Render complete debug visualization
   */
  render(
    rawSegments: Segment[] = [],
    mergedSegments: Segment[] = [],
    walls: WallVisualization[] = [],
    metrics: any = null
  ): void {
    // Clear canvas (keep original image)
    // Note: In production, you'd overlay on top of the original image

    if (this.config.showRawSegments) {
      this.renderSegments(rawSegments, this.config.rawSegmentColor, 1);
    }

    if (this.config.showMergedSegments) {
      this.renderSegments(mergedSegments, this.config.mergedSegmentColor, 2);
    }

    if (this.config.showWallClusters) {
      this.renderWallBounds(walls, this.config.wallColor);
    }

    if (this.config.showCenterlines) {
      this.renderCenterlines(walls, this.config.centerlineColor);
    }

    if (this.config.showLabels) {
      this.renderLabels(walls, this.config.labelColor);
    }

    if (this.config.showMetrics && metrics) {
      this.renderMetrics(metrics, this.config.metricsColor);
    }
  }

  /**
   * Render line segments
   */
  private renderSegments(segments: Segment[], color: string, lineWidth: number): void {
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = lineWidth;

    for (const seg of segments) {
      this.ctx.beginPath();
      this.ctx.moveTo(seg.start.x, seg.start.y);
      this.ctx.lineTo(seg.end.x, seg.end.y);
      this.ctx.stroke();
    }
  }

  /**
   * Render wall bounding boxes
   */
  private renderWallBounds(
    walls: WallVisualization[],
    color: string,
    alpha: number = 0.2
  ): void {
    const [r, g, b] = this.parseRGBA(color);

    for (const wall of walls) {
      const { bounds } = wall;
      const width = bounds.maxX - bounds.minX;
      const height = bounds.maxY - bounds.minY;

      this.ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
      this.ctx.fillRect(bounds.minX, bounds.minY, width, height);

      // Border
      this.ctx.strokeStyle = color;
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(bounds.minX, bounds.minY, width, height);

      // Wall ID
      this.ctx.fillStyle = 'black';
      this.ctx.font = 'bold 12px Arial';
      this.ctx.fillText(wall.id, bounds.minX + 5, bounds.minY + 15);
    }
  }

  /**
   * Render wall centerlines
   */
  private renderCenterlines(walls: WallVisualization[], color: string): void {
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 3;

    for (const wall of walls) {
      this.ctx.beginPath();
      this.ctx.moveTo(wall.centerline[0].x, wall.centerline[0].y);

      for (let i = 1; i < wall.centerline.length; i++) {
        this.ctx.lineTo(wall.centerline[i].x, wall.centerline[i].y);
      }

      this.ctx.stroke();
    }
  }

  /**
   * Render label positions and IDs
   */
  private renderLabels(walls: WallVisualization[], color: string): void {
    this.ctx.fillStyle = color;
    this.ctx.font = 'bold 10px Arial';

    for (const wall of walls) {
      for (const label of wall.labels) {
        const { position, angle, chainage, id } = label;

        // Draw label point
        this.ctx.beginPath();
        this.ctx.arc(position.x, position.y, 5, 0, 2 * Math.PI);
        this.ctx.fill();

        // Draw label ID and chainage
        const labelText = `${label.id} (${chainage.toFixed(1)}m)`;
        this.ctx.fillText(labelText, position.x + 8, position.y - 8);

        // Draw angle indicator (small arrow)
        const arrowLen = 15;
        const angleRad = (angle * Math.PI) / 180;
        const endX = position.x + arrowLen * Math.cos(angleRad);
        const endY = position.y + arrowLen * Math.sin(angleRad);

        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(position.x, position.y);
        this.ctx.lineTo(endX, endY);
        this.ctx.stroke();
      }
    }
  }

  /**
   * Render metrics text
   */
  private renderMetrics(metrics: any, color: string): void {
    this.ctx.fillStyle = color;
    this.ctx.font = '12px Courier';
    this.ctx.textBaseline = 'top';

    const lines = [
      `Walls detected: ${metrics.wallCount?.detected || 0}`,
      `Walls ground truth: ${metrics.wallCount?.groundTruth || 0}`,
      `Precision: ${(metrics.precision * 100).toFixed(1)}%`,
      `Recall: ${(metrics.recall * 100).toFixed(1)}%`,
      `F1 Score: ${metrics.f1Score?.toFixed(3) || 'N/A'}`,
      `Avg centerline error: ${metrics.avgCenterlineError?.toFixed(1) || 'N/A'} px`,
      `Avg label spacing error: ${metrics.avgLabelSpacingError?.toFixed(2) || 'N/A'} m`,
      `Label accuracy: ${metrics.labelAccuracy?.toFixed(1) || 'N/A'}%`,
    ];

    let y = 10;
    for (const line of lines) {
      this.ctx.fillText(line, 10, y);
      y += 15;
    }
  }

  /**
   * Export visualization as PNG blob
   */
  async exportAsPNG(): Promise<Blob> {
    return new Promise((resolve) => {
      this.canvas.toBlob((blob) => {
        resolve(blob!);
      }, 'image/png');
    });
  }

  /**
   * Export detection results as JSON
   */
  exportAsJSON(
    walls: WallVisualization[],
    metrics: any
  ): {
    walls: any[];
    metrics: any;
    exportTime: string;
  } {
    return {
      walls: walls.map(w => ({
        id: w.id,
        centerlinePoints: w.centerline,
        labelCount: w.labels.length,
        labels: w.labels,
      })),
      metrics,
      exportTime: new Date().toISOString(),
    };
  }

  /**
   * Parse RGBA color string to components
   */
  private parseRGBA(color: string): [number, number, number] {
    const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (!match) return [0, 0, 0];
    return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])];
  }
}
