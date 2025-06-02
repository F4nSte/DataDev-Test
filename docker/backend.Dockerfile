# Multi-stage build for Python Flask backend
FROM python:3.11-slim as base

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app

# Install system dependencies including python-magic
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    curl \
    libmagic1 \
    libmagic-dev \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements first for better caching
COPY apps/backend/requirements.txt ./requirements.txt

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Development stage
FROM base as development
ENV FLASK_ENV=development
ENV FLASK_APP=apps.backend.src.app:create_app
COPY apps/backend/ ./apps/backend/
EXPOSE 5000
CMD ["python", "-m", "flask", "run", "--host=0.0.0.0", "--port=5000", "--debug"]

# Production stage
FROM base as production

# Set Flask app environment
ENV FLASK_APP=apps.backend.src.app:create_app
ENV FLASK_ENV=production

# Copy application code
COPY apps/backend/ ./apps/backend/

# Create storage directories and ensure proper permissions
RUN mkdir -p /app/apps/backend/storage/uploads /app/apps/backend/storage/database /app/logs

# Create non-root user for security
RUN groupadd -r appuser && useradd -r -g appuser appuser

# Set ownership of the entire app directory to appuser
RUN chown -R appuser:appuser /app

USER appuser

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:5000/health || exit 1

# Expose port
EXPOSE 5000

# Run application using Flask
CMD ["python", "-m", "flask", "run", "--host=0.0.0.0", "--port=5000"] 