
console.log('[app.js] Script loaded');

window.showPage = function(pageId) {
    try {
        console.log('[showPage] Switching to page:', pageId);
        document.querySelectorAll('.page').forEach(p => {
            p.classList.add('hidden');
            p.classList.remove('active');
        });
        const page = document.getElementById(pageId);
        if (page) {
            page.classList.remove('hidden');
            page.classList.add('active');
        } else {
            console.warn('[showPage] No element found for id:', pageId);
        }
        // Debug: print class lists for loginPage and landingPage
        const loginPage = document.getElementById('loginPage');
        const landingPage = document.getElementById('landingPage');
        if (loginPage) console.log('[showPage] loginPage classes:', loginPage.className);
        if (landingPage) console.log('[showPage] landingPage classes:', landingPage.className);
    } catch (e) {
        console.error('Error showing page:', pageId, e);
    }
};

window.toggleMenu = function() {
    const menu = document.getElementById('sideMenu');
    if (menu) menu.classList.toggle('active');
};

// Stub functions for missing features
window.showRecordsPage = function() {
    console.log('showRecordsPage not yet implemented');
    alert('Records page coming soon!');
};

// Analyze drawing: now auto-invoked on upload; kept as a helper if needed elsewhere
window.analyzeDrawing = function() {
    if (currentImage && typeof window.autoDetectAndLabel === 'function') {
        window.autoDetectAndLabel(currentImage);
    }
};

window.saveRecord = function() {
    console.log('saveRecord not yet implemented');
    alert('Save record coming soon!');
};

window.submitAndExport = function() {
    console.log('submitAndExport not yet implemented');
    alert('Export coming soon!');
};

// --- BEGIN GLOBAL STATE (move to top for hoisting) ---
let currentTestType = null;
let uploadedFiles = [];
let currentImage = null;
let cocoModel = null;
let currentUser = null;
let userSubscription = null;
window.authMode = 'signin';
// --- END GLOBAL STATE ---
// --- BEGIN startForm RESTORE ---
// Test type configuration (from backup)
const testConfigs = {
    'retaining-wall': {
        title: 'Retaining Wall QA',
        fields: [
            { label: 'Wall Height (m)', id: 'wallHeight', type: 'number' },
            { label: 'Wall Type', id: 'wallType', type: 'text', placeholder: 'e.g., Concrete, Brick' },
            { label: 'Materials', id: 'materials', type: 'text' },
            { label: 'Stability Assessment', id: 'stabilityAssessment', type: 'text', placeholder: 'e.g., Good, Fair, Poor' }
        ]
    },
    'peno-tests': {
        title: 'Sand Penetrometer Tests',
        fields: [
            { label: 'Peno Reading', id: 'penoReading', type: 'number' },
            { label: 'Test Depth (m)', id: 'depth', type: 'number' },
            { label: 'Protocol', id: 'protocol', type: 'text', placeholder: 'e.g., Standard Penetrometer' },
            { label: 'Lab Results', id: 'labResults', type: 'text' }
        ]
    },
    'drainage-records': {
        title: 'Drainage Records',
        fields: [
            { label: 'Pipe Size (mm)', id: 'pipeSize', type: 'number' },
            { label: 'Flow Rate (L/s)', id: 'flowRate', type: 'number' },
            { label: 'Condition', id: 'condition', type: 'text', placeholder: 'e.g., Clean, Partially Blocked' },
            { label: 'Inspection Notes', id: 'inspectionNotes', type: 'text' }
        ]
    },
    'earthworks': {
        title: 'Earthworks QA',
        fields: [
            { label: 'Cut Quantity (m³)', id: 'cutQty', type: 'number' },
            { label: 'Fill Quantity (m³)', id: 'fillQty', type: 'number' },
            { label: 'Compaction Test Result', id: 'compactionTest', type: 'text' },
            { label: 'Moisture Content (%)', id: 'moistureContent', type: 'number' }
        ]
    }
};

window.startForm = function(testType) {
    currentTestType = testType;
    uploadedFiles = [];
    const config = testConfigs[testType];
    document.getElementById('formTitle').textContent = config.title;

    // Clear form
    const testForm = document.getElementById('testForm');
    if (testForm) testForm.reset();
    const fileList = document.getElementById('fileList');
    if (fileList) fileList.innerHTML = '';
    const detectedInfo = document.getElementById('detectedInfo');
    if (detectedInfo) detectedInfo.innerHTML = '<p>Upload a drawing to auto-detect information...</p>';
    const testDate = document.getElementById('testDate');
    if (testDate) testDate.value = new Date().toISOString().split('T')[0];
    const uploadedFileName = document.getElementById('uploadedFileName');
    if (uploadedFileName) uploadedFileName.textContent = 'Click to change';

    // Clear table
    const tableBody = document.getElementById('tableBody');
    if (tableBody) tableBody.innerHTML = '';
    if (typeof window.addTableRow === 'function') window.addTableRow(); // Add first empty row

    // Generate type-specific fields
    const fieldsContainer = document.getElementById('typeSpecificFields');
    if (fieldsContainer) {
        fieldsContainer.innerHTML = '<h3>Test-Specific Fields</h3>';
        config.fields.forEach(field => {
            const div = document.createElement('div');
            div.className = 'form-group';
            div.innerHTML = `
                <label>${field.label}:</label>
                <input type="${field.type}" id="${field.id}" placeholder="${field.placeholder || ''}" required>
            `;
            fieldsContainer.appendChild(div);
        });
    }

    // Show form page
    window.showPage('formPage');
};
// --- END startForm RESTORE ---

// Ensure Supabase is ready before any auth calls
document.addEventListener('DOMContentLoaded', async () => {
    // Wait for Supabase client to be ready
    let attempts = 0;
    while (!window.supabaseClient && attempts < 50) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
    }
    if (!window.supabaseClient) {
        alert('Supabase client failed to initialize. Please refresh the page.');
        return;
    }
    initializeApp();
});
// --- AUTHENTICATION LOGIC RESTORED FROM BACKUP ---
// Initialize
function initializeApp() {
    console.log('initializeApp starting...');
    try {
        // Set test date if form exists
        const testDateEl = document.getElementById('testDate');
        if (testDateEl) {
            const today = new Date().toISOString().split('T')[0];
            testDateEl.value = today;
        }
    } catch (e) {
        console.warn('Could not set test date:', e);
    }
    try {
        // Check auth status
        checkAuthStatus();
    } catch (e) {
        console.error('Error checking auth status:', e);
        window.showPage('loginPage');
    }
    try {
        // Load AI model
        if (typeof loadCocoModel === 'function') loadCocoModel();
    } catch (e) {
        console.warn('Could not load AI model:', e);
    }
    console.log('initializeApp complete');
}

async function checkAuthStatus() {
    try {
        const { data: { session } } = await window.supabaseClient.auth.getSession();
        if (session) {
            currentUser = session.user;
            console.log('User logged in:', currentUser.email);
            window.showPage('landingPage');
        } else {
            console.log('No session found');
            window.showPage('loginPage');
        }
    } catch (e) {
        console.error('Auth check error:', e);
        window.showPage('loginPage');
    }
}

window.toggleAuthMode = function() {
    try {
        window.authMode = window.authMode === 'signin' ? 'signup' : 'signin';
        const authTitle = document.getElementById('authTitle');
        const authBtn = document.getElementById('authBtn');
        const toggleAuthBtn = document.getElementById('toggleAuthBtn');
        if (authTitle) authTitle.textContent = window.authMode === 'signin' ? 'Sign In' : 'Create Account';
        if (authBtn) authBtn.textContent = window.authMode === 'signin' ? 'Sign In' : 'Create Account';
        if (toggleAuthBtn) toggleAuthBtn.textContent = window.authMode === 'signin' ? 'Create Account' : 'Back to Sign In';
        const authError = document.getElementById('authError');
        if (authError) authError.innerHTML = '';
    } catch (e) {
        console.error('Error in toggleAuthMode:', e);
    }
};

window.handleAuth = async function() {
    try {
        console.log('[handleAuth] Starting authentication...');
        
        // Check if Supabase client is ready
        if (!window.supabaseClient) {
            console.log('[handleAuth] Supabase client not ready, waiting...');
            const errorDiv = document.getElementById('authError');
            if (errorDiv) errorDiv.textContent = 'Initializing... please try again';
            return;
        }
        
        const emailEl = document.getElementById('authEmail');
        const passwordEl = document.getElementById('authPassword');
        const errorDiv = document.getElementById('authError');
        if (!emailEl || !passwordEl || !errorDiv) {
            console.error('Form elements not found');
            return;
        }
        const email = emailEl.value.trim().toLowerCase();
        const password = passwordEl.value.trim();
        if (!email || !password) {
            errorDiv.textContent = 'Please enter email and password';
            return;
        }
        if (password.length < 6) {
            errorDiv.textContent = 'Password must be at least 6 characters';
            return;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            errorDiv.textContent = 'Please enter a valid email address';
            return;
        }
        if (window.authMode === 'signup') {
            console.log('[handleAuth] Signing up...');
            const { data, error } = await window.supabaseClient.auth.signUp({ email, password });
            console.log('[handleAuth] Signup response:', { data, error });
            if (error) {
                errorDiv.textContent = error.message || 'Signup failed';
            } else {
                errorDiv.textContent = 'Account created! Now try signing in.';
                window.authMode = 'signin';
                const authTitle = document.getElementById('authTitle');
                const authBtn = document.getElementById('authBtn');
                const toggleBtn = document.getElementById('toggleAuthBtn');
                if (authTitle) authTitle.textContent = 'Sign In';
                if (authBtn) authBtn.textContent = 'Sign In';
                if (toggleBtn) toggleBtn.textContent = 'Create Account';
                passwordEl.value = '';
            }
        } else {
            console.log('[handleAuth] Signing in...');
            const { data, error } = await window.supabaseClient.auth.signInWithPassword({ email, password });
            console.log('[handleAuth] Signin response:', { data, error });
            if (error) {
                errorDiv.textContent = error.message || 'Sign in failed';
            } else {
                if (data && data.user) {
                    currentUser = data.user;
                    console.log('[handleAuth] User logged in:', currentUser.email);
                    window.showPage('landingPage');
                } else if (data && data.session) {
                    currentUser = data.session.user;
                    console.log('[handleAuth] User logged in via session:', currentUser.email);
                    window.showPage('landingPage');
                } else {
                    errorDiv.textContent = 'Sign in successful but user data not found';
                    console.error('[handleAuth] No user data in response:', data);
                }
                emailEl.value = '';
                passwordEl.value = '';
            }
        }
    } catch (e) {
        console.error('Auth error:', e);
        const errorDiv = document.getElementById('authError');
        if (errorDiv) errorDiv.textContent = e.message || 'Authentication failed';
    }
};

window.handleLogout = function() {
    try {
        if (window.supabaseClient) {
            window.supabaseClient.auth.signOut();
        }
        currentUser = null;
        userSubscription = null;
        const emailEl = document.getElementById('authEmail');
        const passEl = document.getElementById('authPassword');
        if (emailEl) emailEl.value = '';
        if (passEl) passEl.value = '';
        window.showPage('loginPage');
    } catch (e) {
        console.error('Logout error:', e);
    }
};

window.toggleUserMenu = function() {
    const menu = document.getElementById('userMenu');
    if (menu) {
        menu.classList.toggle('active');
        menu.classList.toggle('hidden');
    }
};

window.goHome = function() {
    currentTestType = null;
    uploadedFiles = [];
    window.showPage('landingPage');
};

window.goBack = function() {
    window.goHome();
};

window.showUserProfile = function() {
    const profileEmail = document.getElementById('profileEmail');
    const profilePlan = document.getElementById('profilePlan');
    const profileReports = document.getElementById('profileReports');
    const profileModal = document.getElementById('profileModal');
    
    if (profileEmail) profileEmail.textContent = currentUser?.email || 'N/A';
    if (profilePlan) profilePlan.textContent = userSubscription === 'premium' ? 'Premium' : 'Free';
    if (profileReports) profileReports.textContent = '0';
    if (profileModal) profileModal.classList.remove('hidden');
};

window.showSubscription = function() {
    const freeBtn = document.getElementById('freeBtn');
    const premiumBtn = document.getElementById('premiumBtn');
    
    if (userSubscription === 'free') {
        if (freeBtn) {
            freeBtn.textContent = 'Current Plan';
            freeBtn.disabled = true;
        }
        if (premiumBtn) {
            premiumBtn.textContent = 'Upgrade Now';
            premiumBtn.disabled = false;
        }
    } else {
        if (freeBtn) {
            freeBtn.textContent = 'Downgrade';
            freeBtn.disabled = false;
        }
        if (premiumBtn) {
            premiumBtn.textContent = 'Current Plan';
            premiumBtn.disabled = true;
        }
    }
    
    const subscriptionModal = document.getElementById('subscriptionModal');
    if (subscriptionModal) subscriptionModal.classList.remove('hidden');
}

window.setSubscription = async function(plan) {
    try {
        if (window.supabaseClient) {
            await window.supabaseClient.from('user_profiles').update({
                subscription_plan: plan
            }).eq('id', currentUser.id);
        }
        
        userSubscription = plan;
        window.closeModal('subscriptionModal');
        alert('Subscription updated!');
        checkFeatureAccess();
    } catch (e) {
        console.error('Subscription error:', e);
        alert('Failed to update subscription');
    }
};

window.upgradeToPremium = function() {
    alert('Premium upgrades coming soon! Contact support for access.');
};

window.closeModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('hidden');
};

window.showSettings = function() {
    window.showPage('settingsPage');
};

function checkFeatureAccess() {
    const analysisBtn = document.querySelector('.analyze-btn');
    if (analysisBtn) {
        if (userSubscription !== 'premium') {
            analysisBtn.disabled = true;
        } else {
            analysisBtn.disabled = false;
        }
    }
}

// Assign to window for inline HTML usage - MOVED TO END OF FILE
// --- END AUTHENTICATION LOGIC RESTORE ---


// Attempt to OCR the image to extract a scale like "1:500" and return denominator
async function detectScaleFromImage(dataUrl) {
    if (!window.Tesseract || !window.Tesseract.recognize) return null;
    try {
        const { data } = await window.Tesseract.recognize(dataUrl, 'eng', { logger: () => {} });
        const text = (data && data.text ? data.text : '').toLowerCase();
        const scaleMatch = text.match(/1\s*[:=]\s*(\d{2,6})/);
        if (scaleMatch) {
            const denom = parseInt(scaleMatch[1], 10);
            if (!isNaN(denom) && denom > 0) return denom;
        }
    } catch (e) {
        console.warn('Scale OCR failed:', e);
    }
    return null;
}

// Extract all dimension numbers from the drawing (e.g., "2670", "3560" for wall lengths in mm)
// Returns dimensions in the order they appear (left-to-right, top-to-bottom roughly)
async function extractDimensionsFromImage(dataUrl) {
    if (!window.Tesseract || !window.Tesseract.recognize) return [];
    try {
        const { data } = await window.Tesseract.recognize(dataUrl, 'eng', { logger: () => {} });
        const text = (data && data.text ? data.text : '');
        console.log('OCR Text extracted:', text.substring(0, 500));  // Debug: show first 500 chars
        
        // Find all numbers that look like dimensions (3-5 digits, likely in mm)
        // Keep them in order of appearance for better wall matching
        const matches = text.match(/\b(\d{3,5})\b/g) || [];
        const dimensions = matches.map(m => parseInt(m, 10)).filter(n => n > 500 && n < 9999);
        
        console.log('Raw OCR matches:', matches);
        console.log('Filtered dimensions (500-9999mm):', dimensions);
        
        // Remove duplicates but keep order
        const seen = new Set();
        const unique = dimensions.filter(d => {
            if (seen.has(d)) return false;
            seen.add(d);
            return true;
        }).sort((a, b) => b - a); // Sort descending (largest first = longest walls first)
        
        console.log('Final unique dimensions (sorted descending):', unique);
        return unique;
    } catch (e) {
        console.warn('Dimension OCR failed:', e);
    }
    return [];
}

async function computePixelsPerMeter(canvas, dataUrl) {
    // Default to 1:500 if nothing detected
    let scaleDenominator = 500;
    const detected = await detectScaleFromImage(dataUrl);
    if (detected) scaleDenominator = detected;
    // Heuristic: assume canvas width represents scaleDenominator meters
    // px per meter = canvas.width / scaleDenominator
    const pxPerMeter = Math.max(1, canvas.width / scaleDenominator);
    return pxPerMeter;
}

// Auto pipeline to draw image, read dimensions, and label walls
window.autoDetectAndLabel = async function(dataUrl) {
    const canvas = document.getElementById('drawingCanvas');
    if (!canvas) return;
    const intervalInput = document.getElementById('testInterval');
    const intervalMeters = intervalInput && !isNaN(intervalInput.value) && intervalInput.value > 0
        ? parseFloat(intervalInput.value)
        : 5;
    
    console.log('[autoDetectAndLabel] Starting with interval:', intervalMeters, 'meters');
    
    // Use user-calibrated scale if available, otherwise detect from image
    let scaleToUse = 500; // default denominator
    
    if (window.globalScale) {
        // User has calibrated scale: convert back to denominator (e.g., 1:500)
        scaleToUse = Math.round(1 / window.globalScale);
        console.log('[autoDetectAndLabel] Using calibrated scale: 1:' + scaleToUse);
    } else {
        // Fall back to image detection
        console.log('[autoDetectAndLabel] Detecting scale from image...');
        const detectedScale = await detectScaleFromImage(dataUrl);
        if (detectedScale) {
            scaleToUse = detectedScale;
        }
        console.log('[autoDetectAndLabel] Scale denominator:', scaleToUse);
    }
    
    // Extract actual dimensions from the drawing (primary source)
    console.log('[autoDetectAndLabel] Extracting dimensions from image...');
    const dimensions = await extractDimensionsFromImage(dataUrl);
    console.log('[autoDetectAndLabel] Extracted dimensions (mm):', dimensions);
    
    if (typeof detectWallsAndAnnotate === 'function') {
        detectWallsAndAnnotate(canvas, { intervalMeters, dimensions, scaleDetected: scaleToUse });
    }
};

// Create a mask from brown boundary lines to exclude annotations/legend
function createBrownBoundaryMask(imageData) {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    
    // Create white mask image (all white initially)
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = width;
    maskCanvas.height = height;
    const maskCtx = maskCanvas.getContext('2d');
    maskCtx.fillStyle = 'white';
    maskCtx.fillRect(0, 0, width, height);
    const maskImageData = maskCtx.getImageData(0, 0, width, height);
    const maskData = maskImageData.data;
    
    // Detect brown boundary pixels and dilate them
    // Looking for darker brown (legend areas), not tan building fills
    const brownPixels = new Set();
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        // Detect darker brown (legend/annotation areas): R > 100, G < 80, B < 70
        // This avoids matching light tan building fills
        if (r > 100 && g < 80 && b < 70 && r > g && r > b) {
            brownPixels.add(i / 4);
        }
    }
    
    if (brownPixels.size === 0) {
        // No brown found - use entire image
        return maskImageData;
    }
    
    // Find bounding box of brown pixels
    let minX = width, maxX = 0, minY = height, maxY = 0;
    brownPixels.forEach(idx => {
        const x = idx % width;
        const y = Math.floor(idx / width);
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
    });
    
    // Expand bounding box by 10% to include nearby walls
    const expandX = Math.max(5, Math.floor((maxX - minX) * 0.05));
    const expandY = Math.max(5, Math.floor((maxY - minY) * 0.05));
    minX = Math.max(0, minX - expandX);
    maxX = Math.min(width - 1, maxX + expandX);
    minY = Math.max(0, minY - expandY);
    maxY = Math.min(height - 1, maxY + expandY);
    
    // Set mask: white inside building area, black outside (to be ignored)
    for (let i = 0; i < maskData.length; i += 4) {
        const idx = i / 4;
        const x = idx % width;
        const y = Math.floor(idx / width);
        
        if (x >= minX && x <= maxX && y >= minY && y <= maxY) {
            maskData[i] = 255;     // R
            maskData[i + 1] = 255; // G
            maskData[i + 2] = 255; // B
            maskData[i + 3] = 255; // A
        } else {
            maskData[i] = 0;     // R
            maskData[i + 1] = 0; // G
            maskData[i + 2] = 0; // B
            maskData[i + 3] = 255; // A
        }
    }
    
    maskCtx.putImageData(maskImageData, 0, 0);
    return maskImageData;
}

// Use OpenCV.js to detect straight lines (walls) and place labels based on actual dimensions
function detectWallsAndAnnotate(canvas, options = {}) {
    if (!window.cv) {
        alert('OpenCV.js not loaded.');
        return;
    }
    const intervalMeters = options.intervalMeters || 5;
    const dimensions = options.dimensions || [];
    const scaleDetected = options.scaleDetected || 500;  // Default to 1:500 if not detected
    
    console.log('[detectWallsAndAnnotate] Scale:', scaleDetected, 'Interval:', intervalMeters, 'Dimensions:', dimensions);
    const startTime = performance.now();
    
    const context = canvas.getContext('2d');
    
    // Store original image before detection modifies the canvas
    const originalImageData = context.getImageData(0, 0, canvas.width, canvas.height);
    
    // Step 1: Create a mask of the brown building boundary
    const brownMask = createBrownBoundaryMask(originalImageData);
    
    const src = cv.imread(canvas);
    let dst = new cv.Mat();
    let lines = new cv.Mat();
    let mask = cv.matFromImageData(brownMask);
    
    // Convert to grayscale
    cv.cvtColor(src, dst, cv.COLOR_RGBA2GRAY, 0);
    
    // Apply the brown boundary mask to ignore annotations/legend
    cv.bitwise_and(dst, mask, dst);
    
    // Apply morphological operations to enhance continuous lines
    let kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(2, 2));
    cv.morphologyEx(dst, dst, cv.MORPH_CLOSE, kernel, new cv.Point(-1, -1), 1);
    cv.morphologyEx(dst, dst, cv.MORPH_OPEN, kernel, new cv.Point(-1, -1), 1);
    kernel.delete();
    
    // Apply Gaussian blur to reduce noise and connect near-broken lines
    cv.GaussianBlur(dst, dst, new cv.Size(3, 3), 0);
    
    // Edge detection - improved thresholds for better wall detection
    cv.Canny(dst, dst, 30, 90, 3, false);
    
    // Hough line transform - improved to detect more walls
    cv.HoughLinesP(dst, lines, 1, Math.PI / 180, 40, 30, 15);
    
    console.log('Detected', lines.rows, 'line segments before merging');
    
    // --- Merge collinear and connected lines ---
    const minLineLength = canvas.width / 35;  // More lenient minimum line length
    const angleThreshold = 0.15;  // Increased tolerance for angle differences
    const distThreshold = 35;  // Increased distance threshold for nearby lines
    let mergedLines = [];
    let used = new Array(lines.rows).fill(false);
    
    for (let i = 0; i < lines.rows; ++i) {
        if (used[i]) continue;
        let [x1, y1, x2, y2] = lines.data32S.slice(i * 4, i * 4 + 4);
        let dx = x2 - x1;
        let dy = y2 - y1;
        let lengthPx = Math.sqrt(dx * dx + dy * dy);
        if (lengthPx < minLineLength) continue;
        
        let group = [{x1, y1, x2, y2}];
        used[i] = true;
        let angle1 = Math.atan2(dy, dx);
        
        for (let j = 0; j < lines.rows; ++j) {
            if (i === j || used[j]) continue;
            let [xx1, yy1, xx2, yy2] = lines.data32S.slice(j * 4, j * 4 + 4);
            let ddx = xx2 - xx1;
            let ddy = yy2 - yy1;
            let angle2 = Math.atan2(ddy, ddx);
            
            if (Math.abs(angle1 - angle2) < angleThreshold || Math.abs(Math.abs(angle1 - angle2) - Math.PI) < angleThreshold) {
                let distA = Math.hypot(x1 - xx1, y1 - yy1);
                let distB = Math.hypot(x2 - xx2, y2 - yy2);
                let distC = Math.hypot(x1 - xx2, y1 - yy2);
                let distD = Math.hypot(x2 - xx1, y2 - yy1);
                if (distA < distThreshold || distB < distThreshold || distC < distThreshold || distD < distThreshold) {
                    group.push({x1: xx1, y1: yy1, x2: xx2, y2: yy2});
                    used[j] = true;
                }
            }
        }
        
        let allPoints = [];
        group.forEach(l => { allPoints.push([l.x1, l.y1]); allPoints.push([l.x2, l.y2]); });
        let maxDist = 0, p1 = allPoints[0], p2 = allPoints[1];
        for (let m = 0; m < allPoints.length; ++m) {
            for (let n = m + 1; n < allPoints.length; ++n) {
                let d = Math.hypot(allPoints[m][0] - allPoints[n][0], allPoints[m][1] - allPoints[n][1]);
                if (d > maxDist) { maxDist = d; p1 = allPoints[m]; p2 = allPoints[n]; }
            }
        }
        mergedLines.push({x1: p1[0], y1: p1[1], x2: p2[0], y2: p2[1]});
    }
    
    // --- Post-process: Merge parallel walls that are very close together (double walls) ---
    let finalWalls = [];
    let mergedIndices = new Set();
    
    for (let i = 0; i < mergedLines.length; i++) {
        if (mergedIndices.has(i)) continue;
        
        let wall = {...mergedLines[i]};
        mergedIndices.add(i);
        
        // Try to merge with nearby parallel walls (only for true double walls, very close)
        for (let j = i + 1; j < mergedLines.length; j++) {
            if (mergedIndices.has(j)) continue;
            
            let other = mergedLines[j];
            const dx1 = wall.x2 - wall.x1;
            const dy1 = wall.y2 - wall.y1;
            const dx2 = other.x2 - other.x1;
            const dy2 = other.y2 - other.y1;
            
            // Check if parallel (same angle within threshold)
            const angle1 = Math.atan2(dy1, dx1);
            const angle2 = Math.atan2(dy2, dx2);
            const angleThreshold = 0.10;
            
            if (Math.abs(angle1 - angle2) < angleThreshold || Math.abs(Math.abs(angle1 - angle2) - Math.PI) < angleThreshold) {
                // Check distance between walls (perpendicular distance)
                const perpDist = Math.abs((wall.x1 - other.x1) * dy1 - (wall.y1 - other.y1) * dx1) / Math.sqrt(dx1*dx1 + dy1*dy1);
                
                if (perpDist < 50) {  // Increased threshold - only merge if very close (true double walls)
                    // Take the longer one
                    const len1 = Math.sqrt(dx1*dx1 + dy1*dy1);
                    const len2 = Math.sqrt(dx2*dx2 + dy2*dy2);
                    if (len2 > len1) {
                        wall = {...other};
                    }
                    mergedIndices.add(j);
                }
            }
        }
        
        finalWalls.push(wall);
    }
    
    mergedLines = finalWalls;
    console.log('After merging double walls:', mergedLines.length, 'walls remain');
    
    // Filter and sort walls
    // For subdivision plans: filter out the outer frame and keep internal walls
    const frameThreshold = 8;  // Pixels from edge - less aggressive framing
    mergedLines = mergedLines
        .map(l => ({...l, length: Math.sqrt((l.x2-l.x1)**2 + (l.y2-l.y1)**2)}))
        .filter(l => {
            // Exclude outer frame (lines very close to canvas edges) - but less aggressively
            const minDist = Math.min(l.x1, l.x2, l.y1, l.y2, canvas.width - l.x1, canvas.width - l.x2, canvas.height - l.y1, canvas.height - l.y2);
            if (minDist < frameThreshold && (minDist < 3 || minDist > canvas.width - 3)) {
                // Only filter if extremely close to very edge
                return false;
            }
            
            const dx = l.x2 - l.x1, dy = l.y2 - l.y1;
            const angle = Math.abs(Math.atan2(dy, dx));
            const isHorizontal = angle < 0.30 || angle > Math.PI - 0.30;
            const isVertical = Math.abs(angle - Math.PI/2) < 0.30;
            return (isHorizontal || isVertical) && l.length >= canvas.width / 50;  // Lower threshold to catch more walls
        })
        .sort((a, b) => {
            // Chronological ordering: start at top-left, trace perimeter clockwise, then interior
            // This ensures engineers test in a logical, efficient sequence
            
            // First, identify if walls are on the boundary or interior
            const boundaryThreshold = Math.max(canvas.width, canvas.height) / 10;
            
            const isABoundary = (wall) => {
                const minDist = Math.min(wall.x1, wall.x2, wall.y1, wall.y2, 
                                        canvas.width - wall.x1, canvas.width - wall.x2, 
                                        canvas.height - wall.y1, canvas.height - wall.y2);
                return minDist < boundaryThreshold;
            };
            
            const aBoundary = isABoundary(a);
            const bBoundary = isABoundary(b);
            
            if (aBoundary !== bBoundary) {
                // Perimeter walls first
                return aBoundary ? -1 : 1;
            }
            
            // For perimeter walls: trace clockwise from top-left
            if (aBoundary) {
                // Top edge first (smallest Y)
                const centerAY = (a.y1 + a.y2) / 2;
                const centerBY = (b.y1 + b.y2) / 2;
                const topEdgeThreshold = canvas.height / 4;
                
                const aOnTop = centerAY < topEdgeThreshold;
                const bOnTop = centerBY < topEdgeThreshold;
                
                if (aOnTop && !bOnTop) return -1;
                if (!aOnTop && bOnTop) return 1;
                
                if (aOnTop) {
                    // Top edge: left to right
                    const centerAX = (a.x1 + a.x2) / 2;
                    const centerBX = (b.x1 + b.x2) / 2;
                    return centerAX - centerBX;
                }
                
                // Right edge: top to bottom
                const rightEdgeThreshold = canvas.width * 0.75;
                const aOnRight = (a.x1 + a.x2) / 2 > rightEdgeThreshold;
                const bOnRight = (b.x1 + b.x2) / 2 > rightEdgeThreshold;
                
                if (aOnRight && !bOnRight) return -1;
                if (!aOnRight && bOnRight) return 1;
                
                if (aOnRight) {
                    return (a.y1 + a.y2) / 2 - (b.y1 + b.y2) / 2;
                }
                
                // Bottom edge: right to left
                const bottomEdgeThreshold = canvas.height * 0.75;
                const aOnBottom = (a.y1 + a.y2) / 2 > bottomEdgeThreshold;
                const bOnBottom = (b.y1 + b.y2) / 2 > bottomEdgeThreshold;
                
                if (aOnBottom && !bOnBottom) return -1;
                if (!aOnBottom && bOnBottom) return 1;
                
                if (aOnBottom) {
                    return (b.x1 + b.x2) / 2 - (a.x1 + a.x2) / 2;
                }
                
                // Left edge: bottom to top
                return (b.y1 + b.y2) / 2 - (a.y1 + a.y2) / 2;
            }
            
            // Interior walls: organize by region
            const regionSize = Math.max(canvas.width, canvas.height) / 3;
            const getRegion = (wall) => {
                const centerX = (wall.x1 + wall.x2) / 2;
                const centerY = (wall.y1 + wall.y2) / 2;
                const regionX = Math.floor(centerX / regionSize);
                const regionY = Math.floor(centerY / regionSize);
                return regionY * 3 + regionX;
            };
            
            const regionA = getRegion(a);
            const regionB = getRegion(b);
            if (regionA !== regionB) return regionA - regionB;
            
            // Within same region, sort by Y then X
            const centerAY = (a.y1 + a.y2) / 2;
            const centerBY = (b.y1 + b.y2) / 2;
            if (Math.abs(centerAY - centerBY) > 20) return centerAY - centerBY;
            
            const centerAX = (a.x1 + a.x2) / 2;
            const centerBX = (b.x1 + b.x2) / 2;
            return centerAX - centerBX;
        });
    
    console.log('Detected', mergedLines.length, 'walls');
    
    // Get filter settings - enable brown wall filter to only label brown walls
    const filterBrownCheckbox = document.getElementById('filterBrownCheckbox');
    const brownWallFilterEnabled = true;  // ENABLED - detect only brown walls
    
    // If brown wall filter is enabled, get image data for color detection
    let imageData = null;
    if (brownWallFilterEnabled) {
        imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    }
    
    // Filter walls: if brown filter enabled, keep only brown walls
    let filteredLines = mergedLines;
    if (brownWallFilterEnabled && imageData) {
        filteredLines = mergedLines.filter(wall => window.isBrownWall(wall.x1, wall.y1, wall.x2, wall.y2, imageData));
        console.log('Brown wall filter applied. Walls before:', mergedLines.length, 'Walls after:', filteredLines.length);
    }
    
    // Assign dimensions to walls intelligently
    // Sort dimensions descending, assign to longest walls first
    let sortedByLength = [...filteredLines].sort((a, b) => b.length - a.length);
    let dimensionAssignments = new Map();
    
    console.log('Available dimensions:', dimensions, 'Number of walls:', mergedLines.length);
    
    // Strategy: assign each extracted dimension to one wall, starting with longest walls
    for (let i = 0; i < dimensions.length && i < sortedByLength.length; i++) {
        dimensionAssignments.set(sortedByLength[i], dimensions[i]);
    }
    
    // If we have fewer dimensions than walls, try to extrapolate from ratio
    // E.g., if we have 5 dimensions for 15 walls, estimate dimensions for remaining walls
    if (dimensions.length > 0 && dimensions.length < mergedLines.length) {
        const avgDimension = dimensions.reduce((a, b) => a + b, 0) / dimensions.length;
        console.log('Average extracted dimension:', avgDimension, 'mm');
        
        for (let i = dimensions.length; i < sortedByLength.length; i++) {
            const wall = sortedByLength[i];
            // Estimate based on pixel ratio to first wall
            const firstWallPixels = sortedByLength[0].length;
            const thisWallPixels = wall.length;
            const firstWallDim = dimensionAssignments.get(sortedByLength[0]) || avgDimension;
            const estimatedDim = (thisWallPixels / firstWallPixels) * firstWallDim;
            
            // Only assign if it's reasonable (between 500-9999 mm)
            if (estimatedDim > 500 && estimatedDim < 9999) {
                dimensionAssignments.set(wall, Math.round(estimatedDim));
            }
        }
    }
    
    // Apply assignments back
    for (let wall of mergedLines) {
        if (dimensionAssignments.has(wall)) {
            wall.assignedDimension = dimensionAssignments.get(wall);
        }
    }
    
    console.log('Assigned', dimensionAssignments.size, 'dimensions to', filteredLines.length, 'walls');
    
    // Label all walls
    let labelCount = 1;
    const maxLabels = 100;
    let totalLabelsPlaced = 0;
    
    for (let k = 0; k < filteredLines.length && labelCount <= maxLabels; ++k) {
        let {x1, y1, x2, y2, length, assignedDimension} = filteredLines[k];
        let dx = x2 - x1;
        let dy = y2 - y1;
        
        // Use assigned dimension in meters (convert from mm), fallback to pixel-based estimate using detected scale
        let wallLengthMeters = 0;
        let hasRealDimension = false;
        if (assignedDimension) {
            wallLengthMeters = assignedDimension / 1000;  // mm to meters
            hasRealDimension = true;
            console.log(`Wall uses extracted dimension: ${assignedDimension}mm = ${wallLengthMeters}m`);
        } else {
            // Use detected scale (default 1:500): estimate from pixel length
            // At 1:scaleDetected scale, canvas.width pixels represent scaleDetected meters
            const pixelsPerMeter = canvas.width / scaleDetected;
            wallLengthMeters = length / pixelsPerMeter;
            console.log(`Wall uses scale-based estimate: ${length}px / ${pixelsPerMeter.toFixed(1)}px/m = ${wallLengthMeters.toFixed(2)}m`);
        }
        
        // Calculate number of labels based on wall length and user interval
        // Formula: ceiling of (wall length / interval) = number of test locations
        // For walls over intervalMeters (5m default), ensure at least 2 labels
        let numLabels = 0;
        if (hasRealDimension) {
            // Real dimension: use ceiling division to round up
            numLabels = Math.ceil(wallLengthMeters / intervalMeters);
            // Ensure walls over interval size get at least 2 labels
            if (wallLengthMeters > intervalMeters && numLabels < 2) {
                numLabels = 2;
            }
            // Add minimum spacing constraint: labels need at least 15px apart
            const labelSpacing = length / (numLabels + 1);
            if (labelSpacing < 15 && numLabels > 1) {
                numLabels = Math.max(1, Math.floor(length / 20));  // Adjust to ensure spacing
            }
        } else {
            // Estimated wall: use ceiling division
            numLabels = Math.ceil(wallLengthMeters / intervalMeters);
            // Ensure walls over interval size get at least 2 labels
            if (wallLengthMeters > intervalMeters && numLabels < 2) {
                numLabels = 2;
            }
            // Add minimum spacing constraint
            const labelSpacing = length / (numLabels + 1);
            if (labelSpacing < 15 && numLabels > 1) {
                numLabels = Math.max(1, Math.floor(length / 20));
            }
        }
        numLabels = Math.min(3, Math.max(1, numLabels));  // Cap at 3, min 1
        
        console.log(`Wall ${k}: Length=${length.toFixed(0)}px, Estimated=${wallLengthMeters.toFixed(2)}m, Labels=${numLabels}`);
        
        // Draw red line on the detected wall for visualization
        context.beginPath();
        context.moveTo(x1, y1);
        context.lineTo(x2, y2);
        context.strokeStyle = 'red';
        context.lineWidth = 3;
        context.stroke();
        
        // Place labels evenly along the wall
        for (let n = 0; n < numLabels && labelCount <= maxLabels; n++) {
            // Space labels evenly: for numLabels, place at 1/(numLabels+1), 2/(numLabels+1), etc.
            const frac = (n + 1) / (numLabels + 1);
            const lx = x1 + frac * dx;
            const ly = y1 + frac * dy;
            
            // Draw yellow circle with black border
            context.beginPath();
            context.arc(lx, ly, 10, 0, 2 * Math.PI);
            context.fillStyle = 'yellow';
            context.fill();
            context.strokeStyle = 'black';
            context.lineWidth = 2;
            context.stroke();
            
            // Draw label number
            context.fillStyle = 'black';
            context.font = 'bold 14px Arial';
            context.textAlign = 'center';
            context.textBaseline = 'middle';
            context.fillText(labelCount, lx, ly);
            labelCount++;
            totalLabelsPlaced++;
        }
    }
    
    console.log('Total labels placed:', totalLabelsPlaced);
    
    // No need to restore original image - keep the labeled version
    // The labels are already drawn on the canvas above
    
    // Store the total label count globally for table population
    window.detectedTestLocations = totalLabelsPlaced;
    
    // Auto-populate test results table
    window.populateTestResultsTable(totalLabelsPlaced);
    
    const endTime = performance.now();
    console.log(`Wall detection completed in ${(endTime - startTime).toFixed(0)}ms`);
    
    src.delete();
    dst.delete();
    lines.delete();
    mask.delete();
}

window.handleFileUpload = function(event) {
    const files = event.target.files;
    Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const fileObj = {
                name: file.name,
                type: file.type,
                data: e.target.result
            };
            uploadedFiles.push(fileObj);
            renderFileList();
            updateDetectedInfo();
            
            // Handle images directly
            if (file.type.startsWith('image/')) {
                currentImage = e.target.result;
                if (typeof window.displayImageForAnalysis === 'function') {
                    window.displayImageForAnalysis(e.target.result);
                }
            }
            // Handle PDFs by converting to image
            else if (file.type === 'application/pdf') {
                console.log('PDF detected, converting to image...');
                if (typeof PDFDocument !== 'undefined') {
                    // Using PDF library if available
                    convertPDFToImage(e.target.result, file.name);
                } else if (typeof pdfjsLib !== 'undefined') {
                    // Using PDF.js if available
                    convertPDFToImagePDFJS(e.target.result);
                } else {
                    // Fallback: try pdf.js from CDN or show error
                    loadPDFJSLibrary().then(() => {
                        convertPDFToImagePDFJS(e.target.result);
                    }).catch(() => {
                        alert('PDF support requires PDF.js library. Please use an image file (PNG, JPG) instead.');
                    });
                }
            }
            
            // Update filename display
            const uploadedFileName = document.getElementById('uploadedFileName');
            if (uploadedFileName && uploadedFiles.length > 0) {
                uploadedFileName.textContent = uploadedFiles[0].name;
            }
        };
        
        if (file.type.startsWith('image/')) {
            reader.readAsDataURL(file);
        } else if (file.type === 'application/pdf') {
            reader.readAsArrayBuffer(file);
        } else {
            reader.readAsDataURL(file);
        }
    });
};

// Load PDF.js library dynamically
window.loadPDFJSLibrary = function() {
    return new Promise((resolve, reject) => {
        if (typeof pdfjsLib !== 'undefined') {
            resolve();
            return;
        }
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
        script.onload = () => {
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            resolve();
        };
        script.onerror = () => reject('Failed to load PDF.js');
        document.head.appendChild(script);
    });
};

// Convert PDF to image using PDF.js
window.convertPDFToImagePDFJS = async function(pdfBuffer) {
    try {
        const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(pdfBuffer) }).promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 2.0 });
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        
        await page.render({
            canvasContext: ctx,
            viewport: viewport
        }).promise;
        
        currentImage = canvas.toDataURL('image/png');
        console.log('PDF converted to image');
        
        if (typeof window.displayImageForAnalysis === 'function') {
            window.displayImageForAnalysis(currentImage);
        }
    } catch (error) {
        console.error('Error converting PDF:', error);
        alert('Error converting PDF. Please use a JPG or PNG image instead.');
    }
};

window.handlePhotoUpload = function(event) {
    window.handleFileUpload(event);
};

// Detect if a wall line contains brown pixels (for brown wall filtering)
window.isBrownWall = function(x1, y1, x2, y2, imageData) {
    if (!imageData) return false;
    
    const data = imageData.data;
    const width = imageData.width;
    
    // Sample along the line to check for brown color
    const numSamples = Math.max(10, Math.floor(Math.sqrt((x2-x1)**2 + (y2-y1)**2) / 5));
    let brownPixelCount = 0;
    let sampledColors = [];
    
    for (let i = 0; i < numSamples; i++) {
        const t = i / numSamples;
        const x = Math.round(x1 + (x2 - x1) * t);
        const y = Math.round(y1 + (y2 - y1) * t);
        
        if (x < 0 || x >= width || y < 0 || y >= imageData.height) continue;
        
        const pixelIdx = (y * width + x) * 4;
        const r = data[pixelIdx];
        const g = data[pixelIdx + 1];
        const b = data[pixelIdx + 2];
        const a = data[pixelIdx + 3];
        
        sampledColors.push({r, g, b, a});
        
        // Brown color detection: R is dominant, G and B are lower
        // Brown walls typically: R > 130, and R > G and R > B
        // More lenient to catch tan/brown shades
        if (r > 130 && r > g && r > b && (g < 120 || b < 100)) {
            brownPixelCount++;
        }
    }
    
    // Consider it brown if 25% or more samples are brown (more lenient than 30%)
    const isBrown = brownPixelCount >= numSamples * 0.25;
    
    if (false) { // Set to true for debugging
        console.log(`Wall (${x1},${y1})->(${x2},${y2}): ${brownPixelCount}/${numSamples} brown = ${isBrown}`);
        if (sampledColors.length > 0) {
            console.log('Sample colors:', sampledColors.slice(0, 3));
        }
    }
    
    return isBrown;
};

// Apply brown wall filter: only show/label brown walls
window.toggleBrownWallFilter = function(enabled) {
    const filterBrownCheckbox = document.getElementById('filterBrownCheckbox');
    if (filterBrownCheckbox) {
        filterBrownCheckbox.checked = enabled;
    }
    
    // Re-run detection with new filter
    if (currentImage && typeof window.autoDetectAndLabel === 'function') {
        window.autoDetectAndLabel(currentImage);
    }
};

// Re-apply labeling when the user updates interval (clears canvas and relabels)
window.applyInterval = function() {
    if (!currentImage) {
        alert('Upload a drawing first.');
        return;
    }
    const canvas = document.getElementById('drawingCanvas');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        // Redraw image
        const img = new Image();
        img.onload = function() {
            ctx.drawImage(img, 0, 0);
            // Re-run detection with new interval
            if (typeof window.autoDetectAndLabel === 'function') {
                window.autoDetectAndLabel(currentImage);
            }
        };
        img.src = currentImage;
    }
};

// Zoom control functions - REMOVED


// Show the uploaded image on the analysis canvas
window.displayImageForAnalysis = function(dataUrl) {
    const canvas = document.getElementById('drawingCanvas');
    const analysisSection = document.getElementById('analysisSection');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = function() {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        if (analysisSection) analysisSection.classList.remove('hidden');
        // Auto-run detection and labeling after the image is drawn
        if (typeof window.autoDetectAndLabel === 'function') {
            window.autoDetectAndLabel(dataUrl);
        }
    };
    img.src = dataUrl;
};


function renderFileList() {
    const fileList = document.getElementById('fileList');
    if (!fileList) return;
    fileList.innerHTML = '';
    
    uploadedFiles.forEach((file, index) => {
        const div = document.createElement('div');
        div.className = 'file-item';
        div.innerHTML = `
            <span>${file.name}</span>
            <button type="button" onclick="window.removeFile(${index})">Remove</button>
        `;
        fileList.appendChild(div);
    });
}

window.removeFile = function(index) {
    uploadedFiles.splice(index, 1);
    renderFileList();
    if (uploadedFiles.length === 0) {
        const elem = document.getElementById('uploadedFileName');
        if (elem) elem.textContent = 'Click to change';
    }
};

window.populateTestResultsTable = function(numLocations) {
    const tableBody = document.getElementById('tableBody');
    if (!tableBody) return;
    
    // Clear existing rows
    tableBody.innerHTML = '';
    
    // Create rows for each detected location
    for (let i = 1; i <= numLocations; i++) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>Location ${i}</td>
            <td><input type="number" min="0" max="100" placeholder="%" /></td>
            <td><input type="number" min="0" max="100" placeholder="%" /></td>
            <td><input type="text" placeholder="Notes" /></td>
        `;
        tableBody.appendChild(row);
    }
};

function updateDetectedInfo() {
    const detectedInfo = document.getElementById('detectedInfo');
    if (!detectedInfo) return;
    
    if (uploadedFiles.length === 0) {
        detectedInfo.innerHTML = '<p>Upload a drawing to auto-detect information...</p>';
        return;
    }
    
    detectedInfo.innerHTML = `
        <p>✓ ${uploadedFiles.length} file(s) uploaded</p>
        <p>• Auto-Sectioning: Segments detected</p>
        <p>• Drawing dimensions: Ready for analysis</p>
    `;
}

function displayImageForAnalysis(imageData) {
    // This function can be expanded later for image analysis
    console.log('Image prepared for analysis');
}

function saveRecord() {
    if (!validateForm()) {
        alert('Please fill in all required fields.');
        return;
    }

    const config = testConfigs[currentTestType];
    const tableData = getTableData();
    
    const record = {
        id: Date.now(),
        testType: currentTestType,
        testTitle: config.title,
        inspectorName: document.getElementById('inspectorName').value,
        siteLocation: document.getElementById('siteLocation').value,
        testDate: document.getElementById('testDate').value,
        testingFrequency: document.getElementById('testingFrequency').value,
        notes: document.getElementById('notes').value,
        tableData: tableData,
        files: uploadedFiles,
        typeSpecificData: {}
    };
    
    // Collect type-specific data
    config.fields.forEach(field => {
        const elem = document.getElementById(field.id);
        if (elem) record.typeSpecificData[field.id] = elem.value;
    });
    
    // Save to localStorage
    let records = JSON.parse(localStorage.getItem('qaRecords') || '[]');
    records.push(record);
    localStorage.setItem('qaRecords', JSON.stringify(records));
    
    return record;
}

function submitAndExport() {
    if (!validateForm()) {
        alert('Please fill in all required fields.');
        return;
    }

    const record = saveRecord();
    if (record && record.id) {
        exportToDOCX(record.id);
    }
}

function validateForm() {
    const inspector = document.getElementById('inspectorName') ? document.getElementById('inspectorName').value.trim() : '';
    const location = document.getElementById('siteLocation') ? document.getElementById('siteLocation').value.trim() : '';
    const frequency = document.getElementById('testingFrequency') ? document.getElementById('testingFrequency').value.trim() : '';
    
    return inspector && location && frequency;
}

function getTableData() {
    const tbody = document.getElementById('tableBody');
    if (!tbody) return [];
    const data = [];
    
    tbody.querySelectorAll('tr').forEach(row => {
        const cells = row.querySelectorAll('td input');
        if (cells.length === 4) {
            data.push({
                location: cells[0].value,
                density: cells[1].value,
                moisture: cells[2].value,
                notes: cells[3].value
            });
        }
    });
    
    return data;
}

window.addTableRow = function() {
    const tbody = document.getElementById('tableBody');
    if (!tbody) return;
    const rowNum = tbody.rows ? tbody.rows.length + 1 : 1;
    
    const row = tbody.insertRow();
    row.innerHTML = `
        <td><input type="text" placeholder="Location ${rowNum}"></td>
        <td><input type="number" placeholder="0" step="0.1"></td>
        <td><input type="number" placeholder="0" step="0.1"></td>
        <td><input type="text" placeholder="Notes..."></td>
    `;
};

// Export to DOCX
async function exportToDOCX(recordId) {
    const records = JSON.parse(localStorage.getItem('qaRecords') || '[]');
    const record = records.find(r => r.id === recordId);
    
    if (!record) {
        alert('Record not found');
        return;
    }
    
    try {
        // Wait for docx library to load
        let attempts = 0;
        let docxLib = window.docx;
        
        while (!docxLib && attempts < 10) {
            await new Promise(resolve => setTimeout(resolve, 100));
            docxLib = window.docx;
            attempts++;
        }
        
        if (!docxLib) {
            console.error('docx library not available:', { window_docx: window.docx, docxLib });
            alert('Document library not loaded. Please refresh the page and try again.');
            return;
        }
        
        const Document = docxLib.Document;
        const Packer = docxLib.Packer;
        const Paragraph = docxLib.Paragraph;
        const Table = docxLib.Table;
        const TableCell = docxLib.TableCell;
        const TableRow = docxLib.TableRow;
        
        if (!Document || !Packer) {
            console.error('Required classes not found in docx library');
            alert('Document library components missing. Please refresh the page.');
            return;
        }
        
        // Build document sections
        const sections = [
            new Paragraph({
                text: record.testTitle,
                bold: true,
                size: 28
            }),
            new Paragraph(''),
            new Paragraph({
                text: 'Test Information',
                bold: true,
                size: 20
            }),
            new Paragraph(`Inspector: ${record.inspectorName}`),
            new Paragraph(`Site Location: ${record.siteLocation}`),
            new Paragraph(`Date: ${new Date(record.testDate).toLocaleDateString()}`),
            new Paragraph(`Testing Frequency: ${record.testingFrequency}`),
            new Paragraph('')
        ];
        
        // Add type-specific data
        if (Object.keys(record.typeSpecificData).length > 0) {
            sections.push(new Paragraph({
                text: 'Test-Specific Data',
                bold: true,
                size: 20
            }));
            
            const config = testConfigs[record.testType];
            if (config) {
                config.fields.forEach(field => {
                    sections.push(new Paragraph(`${field.label}: ${record.typeSpecificData[field.id] || 'N/A'}`));
                });
            }
            sections.push(new Paragraph(''));
        }
        
        // Add test results table
        if (record.tableData && record.tableData.length > 0) {
            sections.push(new Paragraph({
                text: 'Test Results',
                bold: true,
                size: 20
            }));
            
            const tableRows = [
                new TableRow({
                    children: [
                        new TableCell({ children: [new Paragraph('Test Location')], shading: { fill: '1e5a96' } }),
                        new TableCell({ children: [new Paragraph('Density (%)')], shading: { fill: '1e5a96' } }),
                        new TableCell({ children: [new Paragraph('Moisture (%)')], shading: { fill: '1e5a96' } }),
                        new TableCell({ children: [new Paragraph('Notes')], shading: { fill: '1e5a96' } })
                    ]
                })
            ];
            
            record.tableData.forEach(row => {
                tableRows.push(
                    new TableRow({
                        children: [
                            new TableCell({ children: [new Paragraph(row.location || '-')] }),
                            new TableCell({ children: [new Paragraph(row.density || '-')] }),
                            new TableCell({ children: [new Paragraph(row.moisture || '-')] }),
                            new TableCell({ children: [new Paragraph(row.notes || '-')] })
                        ]
                    })
                );
            });
            
            sections.push(new Table({
                rows: tableRows,
                width: { size: 100, type: 'pct' }
            }));
            sections.push(new Paragraph(''));
        }
        
        // Add notes
        if (record.notes) {
            sections.push(new Paragraph({
                text: 'Notes',
                bold: true,
                size: 20
            }));
            sections.push(new Paragraph(record.notes));
            sections.push(new Paragraph(''));
        }
        
        // Add attachments
        if (record.files && record.files.length > 0) {
            sections.push(new Paragraph({
                text: 'Attachments',
                bold: true,
                size: 20
            }));
            
            record.files.forEach(file => {
                sections.push(new Paragraph(`• ${file.name}`));
                
                if (file.type.startsWith('image/') && file.data) {
                    try {
                        const base64Data = file.data.includes('base64,') ? file.data.split('base64,')[1] : file.data;
                        sections.push(new Paragraph({
                            children: [
                                {
                                    type: 'image',
                                    data: base64Data,
                                    transformation: {
                                        width: 400,
                                        height: 300
                                    }
                                }
                            ]
                        }));
                    } catch (e) {
                        console.warn('Could not embed image:', e);
                        sections.push(new Paragraph('(Image could not be embedded)'));
                    }
                }
            });
        }
        
        const doc = new Document({
            sections: [{
                children: sections
            }]
        });
        
        Packer.toBlob(doc).then(blob => {
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `${record.testTitle.replace(/\s+/g, '_')}_${record.testDate}.docx`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            alert('Document exported successfully!');
            window.goBack();
        }).catch(err => {
            console.error('Export error:', err);
            alert('Failed to generate document. Please try again.');
        });
    } catch (e) {
        console.error('Export error:', e);
        alert('Error exporting document: ' + e.message);
    }
}

// --- SCALE CALIBRATION HANDLERS ---
let globalScale = null; // metres per pixel
let calibrationMode = false;
let calibrationClicks = [];

window.startScaleCalibration = function() {
    console.log('Starting scale calibration...');
    const canvas = document.getElementById('drawingCanvas');
    if (!canvas) {
        alert('Upload a drawing first');
        return;
    }
    
    calibrationMode = true;
    calibrationClicks = [];
    canvas.style.cursor = 'crosshair';
    
    const statusDiv = document.getElementById('scaleStatus');
    if (statusDiv) {
        statusDiv.innerHTML = '📍 Click first point on the drawing...';
        statusDiv.style.borderLeftColor = '#2196F3';
    }
    
    const handleCanvasClick = (e) => {
        if (!calibrationMode) return;
        
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;
        
        calibrationClicks.push({x, y});
        console.log(`Calibration click ${calibrationClicks.length}: (${x.toFixed(1)}, ${y.toFixed(1)})`);
        
        if (calibrationClicks.length === 1) {
            if (statusDiv) {
                statusDiv.innerHTML = '📍 Click second point on the drawing...';
            }
        } else if (calibrationClicks.length === 2) {
            const dx = calibrationClicks[1].x - calibrationClicks[0].x;
            const dy = calibrationClicks[1].y - calibrationClicks[0].y;
            const pixelDistance = Math.sqrt(dx * dx + dy * dy);
            
            calibrationMode = false;
            canvas.style.cursor = 'crosshair';
            canvas.removeEventListener('click', handleCanvasClick);
            
            const realWorldDistance = prompt(
                `Distance between the two points (in metres)?\n\nPixel distance: ${pixelDistance.toFixed(1)}px`,
                '1'
            );
            
            if (realWorldDistance === null) {
                if (statusDiv) {
                    statusDiv.innerHTML = '⚠️ Calibration cancelled';
                    statusDiv.style.borderLeftColor = '#ff6b6b';
                }
                return;
            }
            
            const metres = parseFloat(realWorldDistance);
            if (isNaN(metres) || metres <= 0) {
                alert('Invalid distance entered');
                if (statusDiv) {
                    statusDiv.innerHTML = '⚠️ Invalid distance entered';
                    statusDiv.style.borderLeftColor = '#ff6b6b';
                }
                return;
            }
            
            globalScale = metres / pixelDistance;
            window.globalScale = globalScale;
            console.log(`Scale set: 1 pixel = ${globalScale.toFixed(6)} metres`);
            
            if (statusDiv) {
                statusDiv.innerHTML = `✅ <strong>Scale calibrated</strong>: 1 pixel = ${globalScale.toFixed(4)} metres (1:${Math.round(1/globalScale)})`;
                statusDiv.style.borderLeftColor = '#10b981';
            }
            
            // Enable label button if walls are detected
            updateWdButtons();
            
            // Also re-run the old client-side labelling
            if (currentImage) {
                setTimeout(() => {
                    autoDetectAndLabel(currentImage);
                }, 500);
            }
        }
    };
    
    canvas.addEventListener('click', handleCanvasClick);
};

window.setQuickScale = function() {
    console.log('Setting quick scale to 1:500...');
    globalScale = 1 / 500;
    window.globalScale = globalScale;
    
    const statusDiv = document.getElementById('scaleStatus');
    if (statusDiv) {
        statusDiv.innerHTML = `✅ <strong>Scale set to preset</strong>: 1 pixel = ${globalScale.toFixed(4)} metres (1:500)`;
        statusDiv.style.borderLeftColor = '#10b981';
    }
    
    updateWdButtons();
    
    if (currentImage) {
        console.log('Re-running detection with preset scale...');
        autoDetectAndLabel(currentImage);
    }
};

// =========================================================================
// BACKEND WALL DETECTION & LABELLING INTEGRATION
// Communicates with Python FastAPI backend (port 8001)
// =========================================================================

const WD_BACKEND_URL = "http://localhost:8001";

// State for backend-detected walls/labels
let wdWalls = [];
let wdLabels = [];
let wdImageBase64 = null; // raw base64 (no data-url prefix) for API

/** POST JSON to backend */
async function wdApiPost(endpoint, body) {
    console.log(`[WD] POST ${endpoint}`);
    const res = await fetch(`${WD_BACKEND_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
    if (!res.ok) {
        const detail = await res.text();
        throw new Error(`${res.status}: ${detail}`);
    }
    return res.json();
}

/** Convert RGB to OpenCV HSV (H 0-179, S 0-255, V 0-255) */
function rgbToHsvCV(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const d = max - min;
    let h = 0, s = 0, v = max;
    if (d > 0) {
        s = d / max;
        if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        else if (max === g) h = ((b - r) / d + 2) / 6;
        else h = ((r - g) / d + 4) / 6;
    }
    return { h: Math.round(h * 179), s: Math.round(s * 255), v: Math.round(v * 255) };
}

// Default brown HSV
let wdBrownHSV = { h: 15, s: 120, v: 120 };
let wdPickingColor = false;

/** Enable/disable wall-detect buttons based on state */
function updateWdButtons() {
    const hasImage = !!wdImageBase64;
    const hasWalls = wdWalls.length > 0;
    
    const measureBtn = document.getElementById('wdMeasureBtn');
    const exportPng = document.getElementById('wdExportPng');
    const exportJson = document.getElementById('wdExportJson');
    const pickBtn = document.getElementById('wdPickColorBtn');
    
    if (measureBtn) measureBtn.disabled = !hasImage;
    if (exportPng) exportPng.disabled = !hasWalls;
    if (exportJson) exportJson.disabled = !hasWalls;
    if (pickBtn) pickBtn.disabled = !hasImage;
}

/** Called when an image is loaded – stores base64 for API calls */
function wdSetImageBase64(dataUrl) {
    if (!dataUrl) { wdImageBase64 = null; return; }
    wdImageBase64 = dataUrl.replace(/^data:[^;]+;base64,/, "");
    wdWalls = [];
    wdLabels = [];
    ensureDefaultScale();
    updateWdButtons();
}

/** Auto-apply the default scale if none is set */
function ensureDefaultScale() {
    if (!globalScale || globalScale <= 0) {
        const presetEl = document.getElementById('wdScalePreset');
        const denom = presetEl ? parseInt(presetEl.value, 10) : 500;
        globalScale = 1 / denom;
        window.globalScale = globalScale;
    }
}

/** Colour picker – sample colour from canvas on click */
window.startColorPick = function() {
    const canvas = document.getElementById('drawingCanvas');
    if (!canvas) return;
    wdPickingColor = true;
    canvas.style.cursor = 'crosshair';
    
    const pickHandler = (e) => {
        if (!wdPickingColor) return;
        wdPickingColor = false;
        canvas.style.cursor = 'crosshair';
        canvas.removeEventListener('click', pickHandler);
        
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const x = Math.round((e.clientX - rect.left) * scaleX);
        const y = Math.round((e.clientY - rect.top) * scaleY);
        
        const ctx = canvas.getContext('2d');
        const px = ctx.getImageData(x, y, 1, 1).data;
        const r = px[0], g = px[1], b = px[2];
        wdBrownHSV = rgbToHsvCV(r, g, b);
        
        const swatch = document.getElementById('wdColorSwatch');
        if (swatch) swatch.style.background = `rgb(${r},${g},${b})`;
        console.log(`[WD] Picked colour RGB(${r},${g},${b}) → HSV(${wdBrownHSV.h},${wdBrownHSV.s},${wdBrownHSV.v})`);
    };
    
    canvas.addEventListener('click', pickHandler);
};

/** Apply a scale preset from the dropdown */
window.applyScalePreset = function(denominator) {
    const denom = parseInt(denominator, 10);
    if (isNaN(denom) || denom <= 0) return;
    globalScale = 1 / denom;
    window.globalScale = globalScale;
    const statusDiv = document.getElementById('scaleStatus');
    if (statusDiv) {
        statusDiv.innerHTML = `📏 Scale: <strong>1:${denom}</strong>`;
        statusDiv.style.borderLeftColor = '#10b981';
    }
    console.log(`[WD] Scale set to 1:${denom}`);
};

/** One-click: detect walls + label them in a single action */
window.measureAndLabel = async function() {
    if (!wdImageBase64) { alert('Upload a drawing first.'); return; }
    
    const measureBtn = document.getElementById('wdMeasureBtn');
    
    // Step 1: Auto-apply scale if not set
    ensureDefaultScale();
    
    if (measureBtn) measureBtn.textContent = '⏳ Detecting walls...';
    
    try {
        // Step 2: Detect walls
        const tol = parseInt(document.getElementById('wdTolerance')?.value || '10', 10);
        const hsv = wdBrownHSV;
        const detectBody = {
            image_base64: wdImageBase64,
            brown_hsv_lower: { h: Math.max(0, hsv.h - tol), s: Math.max(0, hsv.s - 40), v: Math.max(0, hsv.v - 60) },
            brown_hsv_upper: { h: Math.min(179, hsv.h + tol), s: Math.min(255, hsv.s + 40), v: Math.min(255, hsv.v + 60) },
            tolerance: tol,
            min_area: parseInt(document.getElementById('wdMinArea')?.value || '500', 10),
            fill_holes: document.getElementById('wdFillHoles')?.checked ?? true,
        };
        
        const detectData = await wdApiPost("/detect_walls", detectBody);
        wdWalls = detectData.walls || [];
        wdLabels = [];
        console.log(`[WD] Detected ${detectData.wall_count} wall(s)`);
        
        if (wdWalls.length === 0) {
            renderWdOverlay();
            updateWdResults();
            updateWdButtons();
            alert('No walls detected. Try adjusting the tolerance or wall colour in Advanced Settings.');
            return;
        }
        
        // Step 3: Label walls
        if (measureBtn) measureBtn.textContent = '⏳ Placing labels...';
        
        const spacing = parseFloat(document.getElementById('testInterval')?.value || '5');
        const prefix = document.getElementById('wdPrefix')?.value || 'RW';
        
        const labelBody = {
            walls: wdWalls,
            scale_metres_per_pixel: globalScale,
            spacing_metres: spacing,
            prefix: prefix,
            min_remaining_fraction: 0.5,
        };
        
        const labelData = await wdApiPost("/label_walls", labelBody);
        wdLabels = labelData.labels || [];
        console.log(`[WD] Placed ${labelData.label_count} label(s)`);
        
        renderWdOverlay();
        updateWdResults();
        updateWdButtons();
        
        // Populate the test results table
        window.populateTestResultsTable(labelData.label_count);
        
        alert(`✅ Done! Found ${wdWalls.length} wall(s) and placed ${labelData.label_count} label(s).`);
    } catch (err) {
        console.error('[WD] Measure & Label error:', err);
        alert('Measure & Label failed: ' + err.message);
    } finally {
        if (measureBtn) measureBtn.textContent = '📏 Measure & Label';
    }
};

/** Detect walls via backend */
window.backendDetectWalls = async function() {
    if (!wdImageBase64) { alert('Upload a drawing first.'); return; }
    
    const tol = parseInt(document.getElementById('wdTolerance')?.value || '10', 10);
    const hsv = wdBrownHSV;
    const body = {
        image_base64: wdImageBase64,
        brown_hsv_lower: { h: Math.max(0, hsv.h - tol), s: Math.max(0, hsv.s - 40), v: Math.max(0, hsv.v - 60) },
        brown_hsv_upper: { h: Math.min(179, hsv.h + tol), s: Math.min(255, hsv.s + 40), v: Math.min(255, hsv.v + 60) },
        tolerance: tol,
        min_area: parseInt(document.getElementById('wdMinArea')?.value || '500', 10),
        fill_holes: document.getElementById('wdFillHoles')?.checked ?? true,
    };
    
    const detectBtn = document.getElementById('wdDetectBtn');
    if (detectBtn) detectBtn.textContent = '⏳ Detecting...';
    
    try {
        const data = await wdApiPost("/detect_walls", body);
        wdWalls = data.walls || [];
        wdLabels = [];
        console.log(`[WD] Detected ${data.wall_count} wall(s)`);
        renderWdOverlay();
        updateWdResults();
        updateWdButtons();
        alert(`✅ Detected ${data.wall_count} wall(s). Click "Measure & Label" to place labels.`);
    } catch (err) {
        console.error('[WD] Detection error:', err);
        alert('Wall detection failed: ' + err.message + '\n\nMake sure the backend is running on port 8001.');
    } finally {
        if (detectBtn) detectBtn.textContent = '🔍 Detect Walls';
    }
};

/** Label walls via backend */
window.backendLabelWalls = async function() {
    if (!wdWalls.length) { alert('Detect walls first.'); return; }
    if (!globalScale || globalScale <= 0) { alert('Set the scale first (calibrate or use preset).'); return; }
    
    const spacing = parseFloat(document.getElementById('testInterval')?.value || '5');
    const prefix = document.getElementById('wdPrefix')?.value || 'RW';
    
    const body = {
        walls: wdWalls,
        scale_metres_per_pixel: globalScale,
        spacing_metres: spacing,
        prefix: prefix,
        min_remaining_fraction: 0.5,
    };
    
    const labelBtn = document.getElementById('wdLabelBtn');
    if (labelBtn) labelBtn.textContent = '⏳ Labelling...';
    
    try {
        const data = await wdApiPost("/label_walls", body);
        wdLabels = data.labels || [];
        console.log(`[WD] Placed ${data.label_count} label(s)`);
        renderWdOverlay();
        updateWdResults();
        updateWdButtons();
        
        // Also populate the test results table with the detected label count
        window.populateTestResultsTable(data.label_count);
        
        alert(`✅ Placed ${data.label_count} label(s) across ${wdWalls.length} wall(s).`);
    } catch (err) {
        console.error('[WD] Labelling error:', err);
        alert('Labelling failed: ' + err.message);
    } finally {
        if (labelBtn) labelBtn.textContent = '🏷️ Measure & Label';
    }
};

/** Export annotated PNG via backend */
window.backendExportPng = async function() {
    if (!wdImageBase64 || !wdWalls.length) return;
    
    const body = {
        image_base64: wdImageBase64,
        walls: wdWalls,
        labels: wdLabels,
    };
    
    try {
        const data = await wdApiPost("/export", body);
        const a = document.createElement("a");
        a.href = "data:image/png;base64," + data.annotated_image_base64;
        a.download = "wall-detection-export.png";
        a.click();
    } catch (err) {
        console.error('[WD] Export error:', err);
        alert('Export failed: ' + err.message);
    }
};

/** Export JSON of wall/label data */
window.backendExportJson = function() {
    const payload = {
        scale_metres_per_pixel: globalScale,
        walls: wdWalls,
        labels: wdLabels,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "wall-detection-data.json";
    a.click();
    URL.revokeObjectURL(a.href);
};

/** Render wall outlines and labels on the overlay canvas */
function renderWdOverlay() {
    const canvas = document.getElementById('drawingCanvas');
    const overlay = document.getElementById('drawingOverlay');
    if (!canvas || !overlay) return;
    
    overlay.width = canvas.width;
    overlay.height = canvas.height;
    // Match the overlay display size to the drawing canvas
    const canvasRect = canvas.getBoundingClientRect();
    overlay.style.width = canvasRect.width + 'px';
    overlay.style.height = canvasRect.height + 'px';
    
    const ctx = overlay.getContext('2d');
    ctx.clearRect(0, 0, overlay.width, overlay.height);
    
    // Draw wall polylines (red)
    for (const wall of wdWalls) {
        const pts = wall.polyline;
        if (!pts || pts.length < 2) continue;
        
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) {
            ctx.lineTo(pts[i].x, pts[i].y);
        }
        ctx.stroke();
    }
    
    // Draw labels
    for (const lbl of wdLabels) {
        // Callout line
        if (lbl.callout) {
            ctx.strokeStyle = 'rgba(255, 200, 0, 0.8)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(lbl.callout.start.x, lbl.callout.start.y);
            ctx.lineTo(lbl.callout.end.x, lbl.callout.end.y);
            ctx.stroke();
        }
        
        // Yellow circle marker at position
        ctx.fillStyle = 'rgba(255, 255, 0, 0.9)';
        ctx.beginPath();
        ctx.arc(lbl.position.x, lbl.position.y, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Label text
        ctx.fillStyle = '#000';
        ctx.font = 'bold 11px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        // Show just the label number part for readability
        const shortText = lbl.text || '';
        const numPart = shortText.split('-').pop() || shortText;
        ctx.fillText(numPart, lbl.position.x, lbl.position.y);
        
        // Full label text near callout end
        if (lbl.callout && lbl.callout.end) {
            ctx.font = 'bold 10px Arial';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'bottom';
            
            const tx = lbl.callout.end.x + 2;
            const ty = lbl.callout.end.y - 2;
            const tm = ctx.measureText(lbl.text);
            ctx.fillStyle = 'rgba(255, 255, 0, 0.85)';
            ctx.fillRect(tx - 1, ty - 11, tm.width + 4, 14);
            ctx.fillStyle = '#000';
            ctx.fillText(lbl.text, tx, ty);
        }
    }
}

/** Update the results panel with wall data */
function updateWdResults() {
    const panel = document.getElementById('wdResultsPanel');
    if (panel) panel.style.display = wdWalls.length > 0 ? 'block' : 'none';
    
    const statWalls = document.getElementById('wdStatWalls');
    const statLabels = document.getElementById('wdStatLabels');
    const statTotal = document.getElementById('wdStatTotalLen');
    const tbody = document.getElementById('wdResultsBody');
    
    if (statWalls) statWalls.textContent = wdWalls.length;
    if (statLabels) statLabels.textContent = wdLabels.length;
    
    let totalLen = 0;
    if (tbody) {
        if (wdWalls.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:#999;">No walls detected yet</td></tr>';
        } else {
            let html = '';
            for (const w of wdWalls) {
                const lenM = globalScale ? (w.length_pixels * globalScale) : 0;
                totalLen += lenM;
                const wallLabels = wdLabels.filter(l => l.wall_id === w.wall_id);
                const statusText = wallLabels.length > 0 ? '✅ Labelled' : '⬜ Detected';
                html += `<tr>
                    <td>${w.wall_id}</td>
                    <td>${globalScale ? lenM.toFixed(2) : (w.length_pixels.toFixed(0) + 'px')}</td>
                    <td>${wallLabels.length}</td>
                    <td>${statusText}</td>
                </tr>`;
            }
            tbody.innerHTML = html;
        }
    }
    if (statTotal) statTotal.textContent = totalLen > 0 ? totalLen.toFixed(1) : '0';
}

// Hook: when an image is displayed for analysis, also prepare for backend detection
window.displayImageForAnalysis = function(dataUrl) {
    // Store base64 for backend API calls
    wdSetImageBase64(dataUrl);
    
    // Call original display function
    const canvas = document.getElementById('drawingCanvas');
    const analysisSection = document.getElementById('analysisSection');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = function() {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        if (analysisSection) analysisSection.classList.remove('hidden');
        
        // Also run the old client-side detection
        if (typeof window.autoDetectAndLabel === 'function') {
            window.autoDetectAndLabel(dataUrl);
        }
    };
    img.src = dataUrl;
};

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, calling initializeApp');
    initializeApp();
});

