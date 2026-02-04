/**
 * UI Integration for Robust Wall Detection
 * Connects the detection pipeline to the frontend interface
 */

import { RobustWallDetectionPipeline, RobustDetectionConfig } from './robustDetectionPipeline';
import { ScaleCalibrator, ScaleCalibrationUI } from './scaleCalibrator';
import { WallDetectionTestHarness } from './testHarness';
import { DebugOverlay, DEFAULT_DEBUG_CONFIG } from './debugOverlay';

export class WallDetectionUI {
  private pipeline: RobustWallDetectionPipeline;
  private calibrator: ScaleCalibrator;
  private calibrationUI: ScaleCalibrationUI | null = null;
  private testHarness: WallDetectionTestHarness;
  private debugMode = false;
  private debugCanvas: HTMLCanvasElement | null = null;

  constructor() {
    const config: RobustDetectionConfig = {
      minWallLengthMetres: 3,
      enableDebugOverlay: this.debugMode,
    };

    this.pipeline = new RobustWallDetectionPipeline(config);
    this.calibrator = new ScaleCalibrator();
    this.testHarness = new WallDetectionTestHarness(config);
  }

  /**
   * Initialize UI components
   */
  async initializeUI(): Promise<void> {
    console.log('[WallDetectionUI] Initializing UI components');

    // Create debug canvas if needed
    const debugContainer = document.getElementById('debugOverlayContainer');
    if (debugContainer) {
      this.debugCanvas = document.createElement('canvas');
      this.debugCanvas.id = 'debugOverlay';
      this.debugCanvas.style.border = '1px solid #ccc';
      this.debugCanvas.style.maxWidth = '100%';
      debugContainer.appendChild(this.debugCanvas);
    }

    // Setup event listeners
    this.setupEventListeners();
  }

  /**
   * Setup DOM event listeners
   */
  private setupEventListeners(): void {
    // Debug mode toggle
    const debugToggle = document.getElementById('debugModeToggle') as HTMLInputElement;
    if (debugToggle) {
      debugToggle.addEventListener('change', (e) => {
        this.debugMode = (e.target as HTMLInputElement).checked;
        console.log(`[WallDetectionUI] Debug mode: ${this.debugMode}`);
      });
    }

    // Scale calibration
    const calibrateBtn = document.getElementById('calibrateScaleBtn');
    if (calibrateBtn) {
      calibrateBtn.addEventListener('click', () => this.startScaleCalibration());
    }

    // Run tests
    const testBtn = document.getElementById('runTestsBtn');
    if (testBtn) {
      testBtn.addEventListener('click', () => this.runTests());
    }

    // Export JSON
    const exportBtn = document.getElementById('exportJsonBtn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => this.exportResults());
    }

    // Analyze image
    const analyzeBtn = document.getElementById('analyzeDrawingBtn');
    if (analyzeBtn) {
      analyzeBtn.addEventListener('click', () => this.analyzeCurrentImage());
    }
  }

  /**
   * Start interactive scale calibration
   */
  private startScaleCalibration(): void {
    const canvas = document.getElementById('canvas') as HTMLCanvasElement;
    if (!canvas) {
      alert('Canvas not found');
      return;
    }

    console.log('[WallDetectionUI] Starting scale calibration mode');

    if (!this.calibrationUI) {
      this.calibrationUI = new ScaleCalibrationUI(canvas, this.calibrator);
    }

    this.calibrationUI.enableCalibrationMode();

    alert(
      'Scale Calibration Mode Active:\n' +
        '1. Click two points on the image\n' +
        '2. Enter the real-world distance (metres) between them\n' +
        '3. The system will calibrate all measurements'
    );
  }

  /**
   * Analyze current image with detection pipeline
   */
  private async analyzeCurrentImage(): Promise<void> {
    const canvas = document.getElementById('canvas') as HTMLCanvasElement;
    if (!canvas) {
      alert('No canvas found');
      return;
    }

    console.log('[WallDetectionUI] Analyzing current image');

    try {
      // Get current scale
      const scaleInfo = this.calibrator.getResult();
      const metresPerPixel = scaleInfo.metresPerUnit || 0.05;

      console.log(`[WallDetectionUI] Using scale: ${metresPerPixel} m/px (${scaleInfo.strategy})`);

      // Run detection
      const result = await this.pipeline.detectFromCanvas(canvas, metresPerPixel, {
        enableDebugOverlay: this.debugMode,
        debugCanvas: this.debugCanvas || undefined,
      });

      // Display results
      this.displayResults(result);

      // Export debug info
      if (this.debugMode) {
        this.displayDebugInfo(result);
      }
    } catch (error) {
      console.error('[WallDetectionUI] Analysis failed:', error);
      alert(`Analysis failed: ${error}`);
    }
  }

  /**
   * Display detection results
   */
  private displayResults(result: any): void {
    const resultsPanel = document.getElementById('detectionResults');
    if (!resultsPanel) return;

    const walls = result.wallPaths || [];
    const totalLabels = walls.reduce((sum: number, w: any) => sum + (w.markers?.length || 0), 0);

    const html = `
      <div class="results-summary">
        <h3>Detection Results</h3>
        <p><strong>Walls Detected:</strong> ${walls.length}</p>
        <p><strong>Total Labels:</strong> ${totalLabels}</p>
        <p><strong>Scale:</strong> ${result.scaleInfo.sourceInfo}</p>
        
        <h4>Wall Details:</h4>
        <ul>
          ${walls
            .map(
              (w: any) => `
            <li>
              ${w.id}: ${w.lengthMetres.toFixed(2)}m 
              (${w.markers?.length || 0} labels, confidence: ${(w.confidenceScore * 100).toFixed(0)}%)
            </li>
          `
            )
            .join('')}
        </ul>
      </div>
    `;

    resultsPanel.innerHTML = html;
  }

  /**
   * Display debug information
   */
  private displayDebugInfo(result: any): void {
    const debugPanel = document.getElementById('debugInfo');
    if (!debugPanel) return;

    const debugLog = result.debugLog || [];

    const html = `
      <div class="debug-panel">
        <h3>Debug Log</h3>
        <pre>${debugLog.map((line: string) => line.replace(/</g, '&lt;').replace(/>/g, '&gt;')).join('\n')}</pre>
      </div>
    `;

    debugPanel.innerHTML = html;
  }

  /**
   * Run comprehensive test suite
   */
  private async runTests(): Promise<void> {
    console.log('[WallDetectionUI] Running comprehensive test suite');

    try {
      const testResults = await this.testHarness.runAllTests();
      const report = this.testHarness.generateReport();

      // Display report
      const reportPanel = document.getElementById('testResults');
      if (reportPanel) {
        reportPanel.innerHTML = `<pre>${report}</pre>`;
      }

      // Log results
      console.log(report);

      // Offer to download
      const shouldDownload = confirm('Download test results as JSON?');
      if (shouldDownload) {
        this.downloadJSON(testResults, 'wall-detection-test-results.json');
      }
    } catch (error) {
      console.error('[WallDetectionUI] Test suite failed:', error);
      alert(`Tests failed: ${error}`);
    }
  }

  /**
   * Export results as JSON
   */
  private exportResults(): void {
    console.log('[WallDetectionUI] Exporting results as JSON');

    const testResults = this.testHarness.exportResults();
    this.downloadJSON(testResults, 'wall-detection-results.json');
  }

  /**
   * Helper: Download JSON file
   */
  private downloadJSON(data: any, filename: string): void {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Get calibrator for external use
   */
  getCalibrator(): ScaleCalibrator {
    return this.calibrator;
  }

  /**
   * Get pipeline for external use
   */
  getPipeline(): RobustWallDetectionPipeline {
    return this.pipeline;
  }
}
