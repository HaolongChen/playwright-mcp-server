FROM mcr.microsoft.com/playwright:v1.40.0-focal

# Set working directory
WORKDIR /app

# Install Node.js LTS and curl (needed for health checks)
RUN curl -fsSL https://deb.nodesource.com/setup_lts.x | bash - && \
    apt-get install -y nodejs curl && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Install Playwright browsers and dependencies
RUN npx playwright install --with-deps

# Copy application code
COPY . .

# Create non-root user for security
RUN groupadd -r playwright && useradd -r -g playwright -G audio,video playwright && \
    mkdir -p /home/playwright && \
    chown -R playwright:playwright /app /home/playwright

# Set HOME directory for the non-root user (Render requirement)
ENV HOME=/home/playwright

USER playwright

# Render dynamically assigns PORT - expose it
# Note: server.js already uses process.env.PORT with fallback to 3000
EXPOSE ${PORT:-3000}

# Health check with dynamic port support
# Render sets PORT env var, so we use it in the health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:${PORT:-3000}/health || exit 1

# Start the server
CMD ["node", "server.js"]
