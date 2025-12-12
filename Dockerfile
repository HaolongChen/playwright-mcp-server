# Minimal Dockerfile for Playwright MCP Server on Render
FROM mcr.microsoft.com/playwright:v1.40.0-jammy

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production && npm cache clean --force

# Install only the browsers we need (chromium is most commonly used, add others if needed)
RUN npx playwright install --with-deps chromium firefox webkit

# Copy application file
COPY server.js ./

# Set environment variables
ENV NODE_ENV=production \
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

# The base image already has pwuser - just fix ownership of /app
RUN chown -R pwuser:pwuser /app

# Switch to the existing pwuser (non-root)
USER pwuser

# Expose port (Render assigns dynamically via PORT env var)
EXPOSE 3000

# Start the server
CMD ["node", "server.js"]
