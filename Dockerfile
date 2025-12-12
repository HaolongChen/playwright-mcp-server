# Simplified single-stage Dockerfile for Render deployment
# Uses official Playwright image with all browser dependencies pre-installed
FROM mcr.microsoft.com/playwright:v1.40.0-jammy

# Set working directory
WORKDIR /app

# Install Node.js 18 LTS (recommended for Playwright) and curl for health checks
# The base image has Node.js, but we ensure we have the right version
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    curl \
    ca-certificates && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

# Copy package files first for better layer caching
COPY package*.json ./

# Install Node dependencies
# Using npm ci for reproducible builds
RUN npm ci --only=production && \
    npm cache clean --force

# Install Playwright browsers and system dependencies
# This ensures all browser binaries and dependencies are properly installed
RUN npx playwright install --with-deps chromium firefox webkit

# Copy all application files
COPY server.js ./
COPY nginx.conf ./

# Create directory for logs
RUN mkdir -p /app/logs

# Set environment variables for Render
# PORT is dynamically assigned by Render
ENV NODE_ENV=production \
    HOME=/home/pwuser \
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

# Create non-root user and set permissions
# Using pwuser (Playwright user) that comes with the base image
RUN groupadd -r appuser || true && \
    useradd -r -g appuser -d /home/pwuser appuser || true && \
    chown -R appuser:appuser /app && \
    chmod -R 755 /app

# Switch to non-root user for security
USER appuser

# Expose port (Render will override with its own PORT env var)
EXPOSE 3000

# Health check for container orchestration
# Uses Render's PORT environment variable
HEALTHCHECK --interval=30s --timeout=10s --start-period=90s --retries=3 \
    CMD curl -f http://localhost:${PORT:-3000}/health || exit 1

# Start the application
CMD ["node", "server.js"]
