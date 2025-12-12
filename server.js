const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const winston = require('winston');
const { chromium, firefox, webkit } = require('playwright');

// Setup logging
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'playwright-mcp-server' },
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Browser pool management
const browserPool = {
  chromium: null,
  firefox: null,
  webkit: null
};

// Initialize browsers
async function initializeBrowsers() {
  try {
    logger.info('Initializing browsers...');
    browserPool.chromium = await chromium.launch({ headless: true });
    browserPool.firefox = await firefox.launch({ headless: true });
    browserPool.webkit = await webkit.launch({ headless: true });
    logger.info('All browsers initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize browsers:', error);
    throw error;
  }
}

// MCP Tools Implementation
const mcpTools = {
  // Navigate to URL
  navigate: async (params) => {
    const { url, browser = 'chromium', waitUntil = 'networkidle' } = params;
    const browserInstance = browserPool[browser];
    
    if (!browserInstance) {
      throw new Error(`Browser ${browser} not available`);
    }

    const context = await browserInstance.newContext();
    const page = await context.newPage();
    
    try {
      await page.goto(url, { waitUntil });
      const title = await page.title();
      await context.close();
      
      return { success: true, title, url };
    } catch (error) {
      await context.close();
      throw error;
    }
  },

  // Take screenshot
  screenshot: async (params) => {
    const { url, browser = 'chromium', fullPage = false, selector } = params;
    const browserInstance = browserPool[browser];
    
    const context = await browserInstance.newContext();
    const page = await context.newPage();
    
    try {
      await page.goto(url, { waitUntil: 'networkidle' });
      
      let screenshotOptions = { fullPage };
      if (selector) {
        const element = await page.locator(selector).first();
        screenshotOptions = { clip: await element.boundingBox() };
      }
      
      const screenshot = await page.screenshot(screenshotOptions);
      await context.close();
      
      return { 
        success: true, 
        screenshot: screenshot.toString('base64'),
        contentType: 'image/png'
      };
    } catch (error) {
      await context.close();
      throw error;
    }
  },

  // Extract text content
  extractText: async (params) => {
    const { url, selector = 'body', browser = 'chromium' } = params;
    const browserInstance = browserPool[browser];
    
    const context = await browserInstance.newContext();
    const page = await context.newPage();
    
    try {
      await page.goto(url, { waitUntil: 'networkidle' });
      const text = await page.locator(selector).textContent();
      await context.close();
      
      return { success: true, text, selector };
    } catch (error) {
      await context.close();
      throw error;
    }
  },

  // Click element
  clickElement: async (params) => {
    const { url, selector, browser = 'chromium', waitForSelector = true } = params;
    const browserInstance = browserPool[browser];
    
    const context = await browserInstance.newContext();
    const page = await context.newPage();
    
    try {
      await page.goto(url, { waitUntil: 'networkidle' });
      
      if (waitForSelector) {
        await page.waitForSelector(selector);
      }
      
      await page.click(selector);
      const currentUrl = page.url();
      await context.close();
      
      return { success: true, currentUrl, clickedSelector: selector };
    } catch (error) {
      await context.close();
      throw error;
    }
  },

  // Fill form field
  fillForm: async (params) => {
    const { url, selector, value, browser = 'chromium' } = params;
    const browserInstance = browserPool[browser];
    
    const context = await browserInstance.newContext();
    const page = await context.newPage();
    
    try {
      await page.goto(url, { waitUntil: 'networkidle' });
      await page.fill(selector, value);
      await context.close();
      
      return { success: true, selector, value };
    } catch (error) {
      await context.close();
      throw error;
    }
  },

  // Wait for element
  waitForElement: async (params) => {
    const { url, selector, timeout = 30000, browser = 'chromium' } = params;
    const browserInstance = browserPool[browser];
    
    const context = await browserInstance.newContext();
    const page = await context.newPage();
    
    try {
      await page.goto(url, { waitUntil: 'networkidle' });
      await page.waitForSelector(selector, { timeout });
      const isVisible = await page.isVisible(selector);
      await context.close();
      
      return { success: true, selector, isVisible };
    } catch (error) {
      await context.close();
      throw error;
    }
  }
};

// MCP Protocol Routes
app.post('/mcp', async (req, res) => {
  try {
    const { method, params } = req.body;
    
    logger.info(`MCP request: ${method}`, { params });
    
    if (!mcpTools[method]) {
      return res.status(400).json({
        error: `Unknown method: ${method}`,
        availableMethods: Object.keys(mcpTools)
      });
    }
    
    const result = await mcpTools[method](params);
    res.json(result);
    
  } catch (error) {
    logger.error(`MCP error for ${req.body.method}:`, error);
    res.status(500).json({
      error: error.message,
      method: req.body.method
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  const browserStatus = {
    chromium: !!browserPool.chromium,
    firefox: !!browserPool.firefox,
    webkit: !!browserPool.webkit
  };
  
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    browsers: browserStatus
  });
});

// List available tools
app.get('/tools', (req, res) => {
  res.json({
    tools: Object.keys(mcpTools),
    description: 'Available MCP tools for Playwright automation'
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  
  for (const [name, browser] of Object.entries(browserPool)) {
    if (browser) {
      await browser.close();
      logger.info(`${name} browser closed`);
    }
  }
  
  process.exit(0);
});

// Start server
async function startServer() {
  try {
    await initializeBrowsers();
    
    app.listen(PORT, '0.0.0.0', () => {
      logger.info(`Playwright MCP Server running on port ${PORT}`);
      logger.info(`Health check: http://localhost:${PORT}/health`);
      logger.info(`Available tools: http://localhost:${PORT}/tools`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();