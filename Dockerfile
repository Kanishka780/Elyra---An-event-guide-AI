# Stage 1: Build robust frontend
FROM node:20-slim AS build
WORKDIR /app/frontend

# Use --frozen-lockfile or similar isn't strictly needed for prototype but COPYing correctly is
COPY frontend/package*.json ./
RUN npm install

COPY frontend/ ./
RUN npm run build

# Stage 2: Backend & final image
FROM python:3.12-slim
WORKDIR /app

# Set environment variables for better performance
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Install backend dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend files
COPY backend/ .

# Copy built frontend assets to the backend's static folder
# Ensure the destination directory exists
RUN mkdir -p /app/static
COPY --from=build /app/frontend/dist /app/static

# Cloud Run sets PORT automatically
ENV PORT=8080
EXPOSE 8080

# Start Uvicorn (using shell form to expand $PORT)
CMD uvicorn main:app --host 0.0.0.0 --port $PORT
