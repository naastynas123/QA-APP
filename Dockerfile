FROM node:20-slim

# Install Python for the backend
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        python3 python3-pip python3-venv \
        libgl1 libglib2.0-0 && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# --- Backend setup ---
COPY backend/requirements.txt backend/requirements.txt
RUN python3 -m venv /app/venv && \
    /app/venv/bin/pip install --no-cache-dir -r backend/requirements.txt
COPY backend/main.py backend/label_placement.py backend/wall_detection.py backend/models.py backend/

# --- Frontend setup ---
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev 2>/dev/null || npm install --omit=dev

COPY index.html app.js style.css config.js server.js ./
COPY wall-detector.html wall-detector.js wall-detector.css ./
COPY rjv-logo.jpg ./

# --- Start script ---
COPY <<'EOF' /app/start.sh
#!/bin/sh
/app/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8001 --app-dir /app/backend &
BACKEND_PID=$!
HOST=0.0.0.0 node /app/server.js &
FRONTEND_PID=$!
wait $BACKEND_PID $FRONTEND_PID
EOF
RUN chmod +x /app/start.sh

EXPOSE 8000 8001

CMD ["/app/start.sh"]
