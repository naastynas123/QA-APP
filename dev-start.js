/**
 * dev-start.js — Start both frontend and backend servers for local development.
 *
 * Usage:  npm run dev
 *
 * This launches:
 *   - Python FastAPI backend on port 8001
 *   - Node.js static file server on port 8000
 *
 * Press Ctrl+C to stop both.
 */

const { spawn } = require('child_process');
const path = require('path');

const isWindows = process.platform === 'win32';
const pythonCmd = isWindows ? 'python' : 'python3';

// --- Start backend ---
const backend = spawn(
  pythonCmd,
  ['-m', 'uvicorn', 'main:app', '--host', '127.0.0.1', '--port', '8001', '--reload'],
  {
    cwd: path.join(__dirname, 'backend'),
    stdio: 'pipe',
    shell: isWindows,
  }
);

backend.stdout.on('data', (data) => {
  process.stdout.write(`[backend]  ${data}`);
});

backend.stderr.on('data', (data) => {
  process.stderr.write(`[backend]  ${data}`);
});

backend.on('error', (err) => {
  console.error(`\n❌ Backend failed to start: ${err.message}`);
  console.error('   Make sure Python 3 and the backend dependencies are installed:');
  console.error('   cd backend && pip install -r requirements.txt\n');
});

backend.on('close', (code) => {
  if (code !== null && code !== 0) {
    console.error(`[backend]  exited with code ${code}`);
  }
});

// --- Start frontend ---
const frontend = spawn('node', ['server.js'], {
  cwd: __dirname,
  stdio: 'pipe',
  shell: isWindows,
});

frontend.stdout.on('data', (data) => {
  process.stdout.write(`[frontend] ${data}`);
});

frontend.stderr.on('data', (data) => {
  process.stderr.write(`[frontend] ${data}`);
});

frontend.on('error', (err) => {
  console.error(`\n❌ Frontend failed to start: ${err.message}\n`);
});

frontend.on('close', (code) => {
  if (code !== null && code !== 0) {
    console.error(`[frontend] exited with code ${code}`);
  }
});

// --- Graceful shutdown ---
function shutdown() {
  console.log('\nShutting down...');
  backend.kill();
  frontend.kill();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

console.log('');
console.log('╔══════════════════════════════════════════════════════════╗');
console.log('║              QA-APP Development Server                  ║');
console.log('║                                                        ║');
console.log('║  Frontend:       http://localhost:8000                  ║');
console.log('║  Backend:        http://localhost:8001                  ║');
console.log('║  Wall Detector:  http://localhost:8000/wall-detector.html  ║');
console.log('║                                                        ║');
console.log('║  Press Ctrl+C to stop both servers                     ║');
console.log('╚══════════════════════════════════════════════════════════╝');
console.log('');
