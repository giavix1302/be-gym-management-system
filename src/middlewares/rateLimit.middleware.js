import rateLimit from 'express-rate-limit'
import { StatusCodes } from 'http-status-codes'

// Default configuration for rate limiting
const DEFAULT_CONFIG = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skipSuccessfulRequests: false, // Don't skip successful requests
  skipFailedRequests: false, // Don't skip failed requests
}

// Custom error message handler
const createErrorMessage = (req, rateLimitInfo) => {
  const { limit, used, remaining, resetTime } = rateLimitInfo

  return {
    success: false,
    message: 'Quá nhiều yêu cầu từ IP này, vui lòng thử lại sau.',
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      limit,
      used,
      remaining,
      resetTime: new Date(resetTime),
      retryAfter: Math.round((resetTime - Date.now()) / 1000), // seconds
    },
    suggestion:
      remaining === 0
        ? `Vui lòng đợi ${Math.round((resetTime - Date.now()) / 1000)} giây trước khi thử lại.`
        : `Bạn còn ${remaining} lần thử trong ${Math.round((resetTime - Date.now()) / 60000)} phút.`,
  }
}

// Main rate limiting middleware factory
export const rateLimitMiddleware = (customConfig = {}) => {
  const config = { ...DEFAULT_CONFIG, ...customConfig }

  return rateLimit({
    ...config,
    handler: (req, res, next, options) => {
      const rateLimitInfo = {
        limit: options.max,
        used: req.rateLimit.used,
        remaining: req.rateLimit.remaining,
        resetTime: req.rateLimit.resetTime,
      }

      const errorResponse = createErrorMessage(req, rateLimitInfo)

      res.status(StatusCodes.TOO_MANY_REQUESTS).json(errorResponse)
    },
    // Store rate limit info in headers
    standardHeaders: true,
    legacyHeaders: false,
  })
}

// Pre-configured rate limiters for common use cases
export const commonRateLimiters = {
  // Very strict - for sensitive operations
  strict: rateLimitMiddleware({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 requests per 15 minutes
  }),

  // Authentication endpoints
  auth: rateLimitMiddleware({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 login attempts per 15 minutes
    skipSuccessfulRequests: true, // Don't count successful logins
  }),

  // Registration endpoints
  registration: rateLimitMiddleware({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // 3 registration attempts per hour
  }),

  // API endpoints - moderate
  api: rateLimitMiddleware({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per 15 minutes
  }),

  // Chat/messaging - more generous
  chat: rateLimitMiddleware({
    windowMs: 60 * 1000, // 1 minute
    max: 50, // 50 messages per minute
  }),

  // Anonymous users - stricter
  anonymous: rateLimitMiddleware({
    windowMs: 60 * 1000, // 1 minute
    max: 20, // 20 requests per minute
  }),

  // File uploads - very strict
  upload: rateLimitMiddleware({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // 10 uploads per hour
  }),

  // Password reset - strict
  passwordReset: rateLimitMiddleware({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // 3 password reset attempts per hour
  }),

  // Admin operations - moderate
  admin: rateLimitMiddleware({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 50, // 50 admin operations per 5 minutes
  }),

  // Database operations - strict
  database: rateLimitMiddleware({
    windowMs: 60 * 1000, // 1 minute
    max: 30, // 30 database operations per minute
  }),

  // Public API - generous but controlled
  public: rateLimitMiddleware({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200, // 200 requests per 15 minutes
  }),
}

// Advanced rate limiter with different limits based on user role
export const createRoleBasedRateLimiter = (roleConfigs) => {
  return (req, res, next) => {
    const userRole = req.user?.role || 'anonymous'
    const config = roleConfigs[userRole] || roleConfigs.default || DEFAULT_CONFIG

    const limiter = rateLimitMiddleware(config)
    return limiter(req, res, next)
  }
}

// Dynamic rate limiter based on endpoint sensitivity
export const createDynamicRateLimiter = (configs) => {
  return (req, res, next) => {
    const method = req.method.toLowerCase()
    const path = req.route?.path || req.path

    // Determine config based on method and path
    let selectedConfig = configs.default || DEFAULT_CONFIG

    // More strict for write operations
    if (['post', 'put', 'patch', 'delete'].includes(method)) {
      selectedConfig = configs.write || selectedConfig
    }

    // Even more strict for admin paths
    if (path.includes('/admin/')) {
      selectedConfig = configs.admin || selectedConfig
    }

    // Most strict for sensitive operations
    if (path.includes('/auth/') || path.includes('/password/')) {
      selectedConfig = configs.sensitive || selectedConfig
    }

    const limiter = rateLimitMiddleware(selectedConfig)
    return limiter(req, res, next)
  }
}

// Skip rate limiting for certain conditions
export const createConditionalRateLimiter = (config, skipCondition) => {
  return (req, res, next) => {
    if (skipCondition(req)) {
      return next() // Skip rate limiting
    }

    const limiter = rateLimitMiddleware(config)
    return limiter(req, res, next)
  }
}

// Rate limiter with custom key generator (e.g., by user ID instead of IP)
export const createCustomKeyRateLimiter = (config, keyGenerator) => {
  const customConfig = {
    ...config,
    keyGenerator: keyGenerator || ((req) => req.ip),
  }

  return rateLimitMiddleware(customConfig)
}

// Example usage configurations for different modules
export const moduleRateLimiters = {
  // User module
  user: {
    login: commonRateLimiters.auth,
    register: commonRateLimiters.registration,
    profile: commonRateLimiters.api,
    passwordReset: commonRateLimiters.passwordReset,
  },

  // Chatbot module
  chatbot: {
    message: commonRateLimiters.chat,
    anonymous: commonRateLimiters.anonymous,
    admin: commonRateLimiters.admin,
  },

  // Booking module
  booking: {
    create: rateLimitMiddleware({
      windowMs: 60 * 1000, // 1 minute
      max: 10, // 10 bookings per minute
    }),
    cancel: rateLimitMiddleware({
      windowMs: 60 * 1000, // 1 minute
      max: 5, // 5 cancellations per minute
    }),
    list: commonRateLimiters.api,
  },

  // Payment module
  payment: {
    create: rateLimitMiddleware({
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 20, // 20 payment attempts per hour
    }),
    webhook: rateLimitMiddleware({
      windowMs: 60 * 1000, // 1 minute
      max: 100, // 100 webhook calls per minute
    }),
  },

  // File upload module
  files: {
    upload: commonRateLimiters.upload,
    download: rateLimitMiddleware({
      windowMs: 60 * 1000, // 1 minute
      max: 50, // 50 downloads per minute
    }),
  },
}

// Utility function to log rate limit violations
export const logRateLimitViolation = (req, rateLimitInfo) => {
  console.warn('Rate limit violation:', {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    url: req.originalUrl,
    method: req.method,
    userId: req.user?.id,
    rateLimitInfo,
    timestamp: new Date().toISOString(),
  })
}

// Export default for easy importing
export default rateLimitMiddleware
