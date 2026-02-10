# How to Run QA-APP Locally in VS Code

This guide walks you through getting the QA-APP running on your own machine using Visual Studio Code.

---

## Prerequisites

Install these before you start:

| Tool | Version | Download |
|------|---------|----------|
| **Node.js** | 18 or newer | https://nodejs.org/ |
| **Python** | 3.10 or newer | https://www.python.org/downloads/ |
| **Git** | any recent | https://git-scm.com/ |
| **VS Code** | any recent | https://code.visualstudio.com/ |

To verify your installs, open a terminal and run:

```bash
node --version    # should print v18.x or higher
python --version  # should print 3.10 or higher  (use python3 on Mac/Linux)
git --version
```

---

## Step 1 — Clone the Repository

Open a terminal (or the VS Code integrated terminal) and run:

```bash
git clone https://github.com/naastynas123/QA-APP.git
cd QA-APP
```

Or if you already have the repo, pull the latest changes:

```bash
cd QA-APP
git pull origin main
```

> **Tip:** In VS Code you can also use *File → Open Folder* and select the `QA-APP` directory.

---

## Step 2 — Install Frontend Dependencies

From the project root (`QA-APP/`):

```bash
npm install
```

This installs the Node.js packages listed in `package.json`.

---

## Step 3 — Install Backend Dependencies

```bash
cd backend
pip install -r requirements.txt
```

> On Mac/Linux you may need `pip3` instead of `pip`.  
> If you prefer a virtual environment:
> ```bash
> python -m venv venv
> source venv/bin/activate   # Mac/Linux
> venv\Scripts\activate      # Windows
> pip install -r requirements.txt
> ```

Then go back to the project root:

```bash
cd ..
```

---

## Step 4 — Start Both Servers

### Option A: Single command (recommended)

From the project root:

```bash
npm run dev
```

This starts **both** the backend (port 8001) and the frontend (port 8000) at the same time.

### Option B: Two separate terminals

**Terminal 1 — Backend (Python):**

```bash
cd backend
uvicorn main:app --host 127.0.0.1 --port 8001 --reload
```

> The `--reload` flag auto-restarts the server when you edit Python files.

**Terminal 2 — Frontend (Node.js):**

```bash
node server.js
```

---

## Step 5 — Open in Your Browser

Once both servers are running, open your browser to:

- **Main QA App:** [http://localhost:8000](http://localhost:8000)
- **Wall Detector:** [http://localhost:8000/wall-detector.html](http://localhost:8000/wall-detector.html)
- **Backend health check:** [http://localhost:8001/health](http://localhost:8001/health)

---

## How to Use the Wall Detector

1. Go to [http://localhost:8000/wall-detector.html](http://localhost:8000/wall-detector.html)
2. **Upload** a PDF or image of a civil engineering drawing (left panel)
3. **Calibrate the scale** — click two points on a known dimension and enter the real-world distance
4. **Pick the wall colour** — click the eyedropper, then click on a brown wall in the drawing
5. **Detect Walls** — the backend finds brown walls and draws outlines on the canvas
6. **Measure & Label** — labels are placed at the spacing interval you set
7. **Export** — download an annotated PNG or a JSON file of all wall/label data

---

## Project Structure

```
QA-APP/
├── index.html              ← Main QA app page (login, forms, records)
├── app.js                  ← Main app JavaScript
├── style.css               ← Main app styles
├── config.js               ← Supabase auth configuration
├── wall-detector.html      ← Wall detection page (3-panel layout)
├── wall-detector.js        ← Wall detection frontend logic
├── wall-detector.css       ← Wall detection styles
├── server.js               ← Node.js static file server (port 8000)
├── package.json            ← Node.js dependencies & scripts
├── backend/
│   ├── main.py             ← FastAPI server (port 8001)
│   ├── wall_detection.py   ← OpenCV wall detection
│   ├── label_placement.py  ← Deterministic label placement
│   ├── models.py           ← API request/response schemas
│   ├── requirements.txt    ← Python dependencies
│   └── tests/              ← Backend unit tests (54 tests)
├── Dockerfile              ← Full-stack container
├── docker-compose.yml      ← Multi-service orchestration
└── README.md               ← Full documentation
```

---

## Running Tests

```bash
cd backend
pip install pytest
python -m pytest tests/ -v
```

All 54 tests should pass.

---

## Stopping the Servers

- If you used `npm run dev`, press **Ctrl+C** in the terminal to stop both.
- If you ran them separately, press **Ctrl+C** in each terminal window.

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `node: command not found` | Install Node.js from https://nodejs.org/ |
| `python: command not found` | Install Python; on Mac/Linux try `python3` |
| `pip: command not found` | Try `pip3` or `python -m pip` |
| Port 8000 already in use | Close the other app using that port, or edit `server.js` to use a different port |
| Port 8001 already in use | Change the port in the backend `uvicorn` command |
| `CORS error` in browser console | Make sure the backend is running on port 8001 |
| Wall detection returns no results | Try lowering the "Min area" slider or adjusting the tolerance |
| Backend won't start (OpenCV error) | Run `pip install opencv-python-headless` |

---

## Alternative: Docker Setup

If you have Docker Desktop installed, you can skip all the above and just run:

```bash
docker compose up --build
```

This builds and starts everything automatically. Open http://localhost:8000 when it's ready.
