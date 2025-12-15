const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const winston = require('winston');
const { chromium, firefox, webkit } = require('playwright');

// JSON-RPC 2.0 Error Codes
const ErrorCodes = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603
};

// MCP Server Information
const SERVER_INFO = {
  name: 'playwright-mcp-server',
  version: '1.0.0',
  protocolVersion: '2024-11-05'
};

// MCP Capabilities
const SERVER_CAPABILITIES = {
  tools: {
    navigate: {
      description: 'Navigate to a URL',
      parameters: ['url', 'browser', 'waitUntil']
    },
    screenshot: {
      description: 'Take a screenshot of a webpage',
      parameters: ['url', 'browser', 'fullPage', 'selector']
    },
    extractText: {
      description: 'Extract text content from a webpage',
      parameters: ['url', 'selector', 'browser']
    },
    clickElement: {
      description: 'Click an element on a webpage',
      parameters: ['url', 'selector', 'browser', 'waitForSelector']
    },
    fillForm: {
      description: 'Fill a form field on a webpage',
      parameters: ['url', 'selector', 'value', 'browser']
    },
    waitForElement: {
      description: 'Wait for an element to appear on a webpage',
      parameters: ['url', 'selector', 'timeout', 'browser']
    }
  },
  prompts: {},
  resources: {}
};

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

// CORS configuration for Poke and cross-origin support
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'https://poke.com',
      'https://www.poke.com',
      'http://localhost:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3000'
    ];
    
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(null, true); // Allow all origins in production (can be restricted)
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400
};

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" }
}));
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));

// FIX 3: Explicit OPTIONS handler for CORS preflight
app.options('*', cors(corsOptions), (req, res) => {
  res.status(204).end();
});

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

// JSON-RPC 2.0 response helper
function createJsonRpcResponse(id, result = null, error = null) {
  const response = {
    jsonrpc: '2.0',
    id: id
  };
  
  if (error) {
    response.error = {
      code: error.code || ErrorCodes.INTERNAL_ERROR,
      message: error.message || 'Internal error',
      ...(error.data && { data: error.data })
    };
  } else {
    response.result = result;
  }
  
  return response;
}

// Validate JSON-RPC 2.0 request
function validateJsonRpcRequest(req) {
  const { jsonrpc, method, id } = req;
  
  if (jsonrpc && jsonrpc !== '2.0') {
    return {
      valid: false,
      error: {
        code: ErrorCodes.INVALID_REQUEST,
        message: 'Invalid JSON-RPC version. Must be "2.0"'
      }
    };
  }
  
  if (!method || typeof method !== 'string') {
    return {
      valid: false,
      error: {
        code: ErrorCodes.INVALID_REQUEST,
        message: 'Missing or invalid method field'
      }
    };
  }
  
  if (id !== undefined && typeof id !== 'string' && typeof id !== 'number' && id !== null) {
    return {
      valid: false,
      error: {
        code: ErrorCodes.INVALID_REQUEST,
        message: 'Invalid id field. Must be string, number, or null'
      }
    };
  }
  
  return { valid: true };
}

// MCP Tools Implementation with error handling
const mcpTools = {
  // Navigate to URL
  navigate: async (params) => {
    const { url, browser = 'chromium', waitUntil = 'networkidle' } = params;
    
    if (!url) {
      throw {
        code: ErrorCodes.INVALID_PARAMS,
        message: 'Missing required parameter: url'
      };
    }
    
    const browserInstance = browserPool[browser];
    
    if (!browserInstance) {
      throw {
        code: ErrorCodes.INVALID_PARAMS,
        message: `Browser ${browser} not available`
      };
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
      throw {
        code: ErrorCodes.INTERNAL_ERROR,
        message: `Navigation failed: ${error.message}`
      };
    }
  },

  // Take screenshot
  screenshot: async (params) => {
    const { url, browser = 'chromium', fullPage = false, selector } = params;
    
    if (!url) {
      throw {
        code: ErrorCodes.INVALID_PARAMS,
        message: 'Missing required parameter: url'
      };
    }
    
    const browserInstance = browserPool[browser];
    
    if (!browserInstance) {
      throw {
        code: ErrorCodes.INVALID_PARAMS,
        message: `Browser ${browser} not available`
      };
    }
    
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
      throw {
        code: ErrorCodes.INTERNAL_ERROR,
        message: `Screenshot failed: ${error.message}`
      };
    }
  },

  // Extract text content
  extractText: async (params) => {
    const { url, selector = 'body', browser = 'chromium' } = params;
    
    if (!url) {
      throw {
        code: ErrorCodes.INVALID_PARAMS,
        message: 'Missing required parameter: url'
      };
    }
    
    const browserInstance = browserPool[browser];
    
    if (!browserInstance) {
      throw {
        code: ErrorCodes.INVALID_PARAMS,
        message: `Browser ${browser} not available`
      };
    }
    
    const context = await browserInstance.newContext();
    const page = await context.newPage();
    
    try {
      await page.goto(url, { waitUntil: 'networkidle' });
      const text = await page.locator(selector).textContent();
      await context.close();
      
      return { success: true, text, selector };
    } catch (error) {
      await context.close();
      throw {
        code: ErrorCodes.INTERNAL_ERROR,
        message: `Text extraction failed: ${error.message}`
      };
    }
  },

  // Click element
  clickElement: async (params) => {
    const { url, selector, browser = 'chromium', waitForSelector = true } = params;
    
    if (!url || !selector) {
      throw {
        code: ErrorCodes.INVALID_PARAMS,
        message: 'Missing required parameters: url and selector'
      };
    }
    
    const browserInstance = browserPool[browser];
    
    if (!browserInstance) {
      throw {
        code: ErrorCodes.INVALID_PARAMS,
        message: `Browser ${browser} not available`
      };
    }
    
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
      throw {
        code: ErrorCodes.INTERNAL_ERROR,
        message: `Click failed: ${error.message}`
      };
    }
  },

  // Fill form field
  fillForm: async (params) => {
    const { url, selector, value, browser = 'chromium' } = params;
    
    if (!url || !selector || value === undefined) {
      throw {
        code: ErrorCodes.INVALID_PARAMS,
        message: 'Missing required parameters: url, selector, and value'
      };
    }
    
    const browserInstance = browserPool[browser];
    
    if (!browserInstance) {
      throw {
        code: ErrorCodes.INVALID_PARAMS,
        message: `Browser ${browser} not available`
      };
    }
    
    const context = await browserInstance.newContext();
    const page = await context.newPage();
    
    try {
      await page.goto(url, { waitUntil: 'networkidle' });
      await page.fill(selector, value);
      await context.close();
      
      return { success: true, selector, value };
    } catch (error) {
      await context.close();
      throw {
        code: ErrorCodes.INTERNAL_ERROR,
        message: `Form fill failed: ${error.message}`
      };
    }
  },

  // Wait for element
  waitForElement: async (params) => {
    const { url, selector, timeout = 30000, browser = 'chromium' } = params;
    
    if (!url || !selector) {
      throw {
        code: ErrorCodes.INVALID_PARAMS,
        message: 'Missing required parameters: url and selector'
      };
    }
    
    const browserInstance = browserPool[browser];
    
    if (!browserInstance) {
      throw {
        code: ErrorCodes.INVALID_PARAMS,
        message: `Browser ${browser} not available`
      };
    }
    
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
      throw {
        code: ErrorCodes.INTERNAL_ERROR,
        message: `Wait for element failed: ${error.message}`
      };
    }
  }
};

// MCP initialization endpoint
app.post('/mcp/initialize', async (req, res) => {
  try {
    const { jsonrpc, method, params, id } = req.body;
    
    logger.info('MCP initialization request received');
    
    // Validate JSON-RPC request
    const validation = validateJsonRpcRequest(req.body);
    if (!validation.valid) {
      // FIX 1: Always return HTTP 200 for JSON-RPC 2.0 errors
      return res.status(200).json(createJsonRpcResponse(id, null, validation.error));
    }
    
    if (method !== 'initialize') {
      // FIX 1: Always return HTTP 200 for JSON-RPC 2.0 errors
      return res.status(200).json(createJsonRpcResponse(id, null, {
        code: ErrorCodes.METHOD_NOT_FOUND,
        message: `Method not found: ${method}`
      }));
    }
    
    // Return initialization response
    const result = {
      protocolVersion: SERVER_INFO.protocolVersion,
      capabilities: SERVER_CAPABILITIES,
      serverInfo: {
        name: SERVER_INFO.name,
        version: SERVER_INFO.version
      }
    };
    
    logger.info('MCP initialization successful');
    res.json(createJsonRpcResponse(id, result));
    
  } catch (error) {
    logger.error('Initialization error:', error);
    // FIX 1: Always return HTTP 200 for JSON-RPC 2.0 errors
    res.status(200).json(createJsonRpcResponse(req.body?.id, null, {
      code: ErrorCodes.INTERNAL_ERROR,
      message: 'Failed to initialize MCP server',
      data: { details: error.message }
    }));
  }
});

// MCP Protocol Routes
app.post('/mcp', async (req, res) => {
  try {
    const { jsonrpc, method, params, id } = req.body;
    
    // Handle initialize method
    if (method === 'initialize') {
      const result = {
        protocolVersion: SERVER_INFO.protocolVersion,
        capabilities: SERVER_CAPABILITIES,
        serverInfo: {
          name: SERVER_INFO.name,
          version: SERVER_INFO.version
        }
      };
      logger.info('MCP initialization via /mcp endpoint');
      return res.json(createJsonRpcResponse(id, result));
    }
    
    // Validate JSON-RPC request (if jsonrpc field is present)
    if (jsonrpc) {
      const validation = validateJsonRpcRequest(req.body);
      if (!validation.valid) {
        // FIX 1: Always return HTTP 200 for JSON-RPC 2.0 errors
        return res.status(200).json(createJsonRpcResponse(id, null, validation.error));
      }
    }
    
    logger.info(`MCP request: ${method}`, { params });
    
    if (!mcpTools[method]) {
      // FIX 1: Always return HTTP 200 for JSON-RPC 2.0 errors
      return res.status(200).json(createJsonRpcResponse(id, null, {
        code: ErrorCodes.METHOD_NOT_FOUND,
        message: `Unknown method: ${method}`,
        data: {
          availableMethods: Object.keys(mcpTools)
        }
      }));
    }
    
    try {
      const result = await mcpTools[method](params || {});
      
      // FIX 2: Check only jsonrpc === '2.0' for response format detection
      if (jsonrpc === '2.0') {
        res.json(createJsonRpcResponse(id, result));
      } else {
        // Legacy format for backward compatibility
        res.json(result);
      }
    } catch (toolError) {
      // FIX 1: Handle tool-specific errors with HTTP 200
      if (toolError.code) {
        // Already formatted error
        res.status(200).json(createJsonRpcResponse(id, null, toolError));
      } else {
        // Generic error
        throw toolError;
      }
    }
    
  } catch (error) {
    logger.error(`MCP error for ${req.body?.method}:`, error);
    // FIX 1: Always return HTTP 200 for JSON-RPC 2.0 errors
    res.status(200).json(createJsonRpcResponse(req.body?.id, null, {
      code: ErrorCodes.INTERNAL_ERROR,
      message: error.message || 'Internal server error',
      data: { method: req.body?.method }
    }));
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
    browsers: browserStatus,
    server: SERVER_INFO
  });
});

// Server info endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Playwright MCP Server is running',
    server: SERVER_INFO,
    capabilities: SERVER_CAPABILITIES
  });
});

// List available tools
app.get('/tools', (req, res) => {
  res.json({
    tools: SERVER_CAPABILITIES.tools,
    description: 'Available MCP tools for Playwright automation'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  
  // Check if response has already been sent
  if (res.headersSent) {
    return next(err);
  }
  
  // FIX 1: Always return HTTP 200 for JSON-RPC 2.0 errors
  res.status(200).json(createJsonRpcResponse(req.body?.id, null, {
    code: ErrorCodes.INTERNAL_ERROR,
    message: 'Unhandled server error',
    data: { details: err.message }
  }));
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

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  
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
      logger.info(`Server info:`, SERVER_INFO);
      logger.info(`MCP Protocol Version: ${SERVER_INFO.protocolVersion}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
