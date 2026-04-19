# Stage 1: Build robust frontend
FROM node:20-slim AS build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Backend & final image
FROM python:3.12-slim
WORKDIR /app

# Install dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend files
COPY backend/ .

# Copy built frontend assets to a static folder in backend
COPY --from=build /app/frontend/dist /app/static

# Expose port (Cloud Run sets PORT env var automatically)
ENV PORT=8000
EXPOSE 8000

# Start Uvicorn (using shell form to expand $PORT)
CMD uvicorn main:app --host 0.0.0.0 --port $PORT
