// chatbotRateLimit.middleware.js - Redis-based Daily Rate Limiting for Chatbot

import { StatusCodes } from 'http-status-codes'
import redisCloud from '~/utils/redis.js'

/**
 * Rate Limiting Configuration
 * - Anonymous users: 15 messages per day
 * - Authenticated users: 100 messages per day
 */

const RATE_LIMITS = {
  ANONYMOUS: {
    MAX_REQUESTS: 10,
    WINDOW_MS: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
    MESSAGE: 'Bạn đã hết lượt hỏi miễn phí (10/ngày). Vui lòng đăng nhập để tiếp tục!',
  },
  AUTHENTICATED: {
    MAX_REQUESTS: 100,
    WINDOW_MS: 24 * 60 * 60 * 1000, // 24 hours
    MESSAGE: 'Bạn đã vượt quá giới hạn 100 tin nhắn/ngày. Vui lòng thử lại vào ngày mai!',
  },
}

/**
 * Generate Redis key for rate limiting
 * @param {string} identifier - IP address or user ID
 * @param {boolean} isAuthenticated - Whether user is authenticated
 * @returns {string} Redis key
 */
const getRateLimitKey = (identifier, isAuthenticated) => {
  const prefix = isAuthenticated ? 'chatbot:user' : 'chatbot:anon'
  const date = new Date().toISOString().split('T')[0] // YYYY-MM-DD
  return `${prefix}:${identifier}:${date}`
}

/**
 * Get current request count from Redis
 * @param {string} key - Redis key
 * @returns {Promise<number>} Current count
 */
const getCurrentCount = async (key) => {
  try {
    const count = await redisCloud.get(key)
    return count ? parseInt(count, 10) : 0
  } catch (error) {
    console.error('Error getting rate limit count:', error)
    return 0
  }
}

/**
 * Increment request count in Redis
 * @param {string} key - Redis key
 * @param {number} ttl - Time to live in seconds
 * @returns {Promise<number>} New count
 */
const incrementCount = async (key, ttl) => {
  try {
    const newCount = await redisCloud.incr(key)

    // Set expiry only on first request (count = 1)
    if (newCount === 1) {
      await redisCloud.expire(key, ttl)
    }

    return newCount
  } catch (error) {
    console.error('Error incrementing rate limit count:', error)
    throw error
  }
}

/**
 * Calculate seconds until midnight (reset time)
 * @returns {number} Seconds until midnight
 */
const getSecondsUntilMidnight = () => {
  const now = new Date()
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(0, 0, 0, 0)
  return Math.floor((tomorrow - now) / 1000)
}

/**
 * Chatbot Rate Limiting Middleware
 * Checks if user has exceeded daily message limit
 */
export const chatbotRateLimitMiddleware = async (req, res, next) => {
  try {
    // Determine if user is authenticated
    // User is authenticated if userId exists in params or body
    const userId = req.params.userId || req.body.userId
    const isAuthenticated = !!userId

    // Get identifier (userId for authenticated, IP for anonymous)
    const identifier = isAuthenticated ? userId : req.ip || req.connection.remoteAddress

    // Get rate limit config
    const config = isAuthenticated ? RATE_LIMITS.AUTHENTICATED : RATE_LIMITS.ANONYMOUS

    // Generate Redis key
    const redisKey = getRateLimitKey(identifier, isAuthenticated)

    // Get current count
    const currentCount = await getCurrentCount(redisKey)

    // Calculate remaining requests
    const remaining = Math.max(0, config.MAX_REQUESTS - currentCount)

    // Add rate limit info to request object (for response headers)
    req.rateLimit = {
      limit: config.MAX_REQUESTS,
      current: currentCount,
      remaining: remaining,
      resetAt: getSecondsUntilMidnight(),
      isAuthenticated: isAuthenticated,
    }

    // Check if limit exceeded
    if (currentCount >= config.MAX_REQUESTS) {
      console.warn(`⚠️ Rate limit exceeded for ${isAuthenticated ? 'user' : 'IP'}: ${identifier}`, {
        current: currentCount,
        limit: config.MAX_REQUESTS,
        isAuthenticated,
      })

      return res.status(StatusCodes.TOO_MANY_REQUESTS).json({
        success: false,
        message: config.MESSAGE,
        error: {
          code: 'CHATBOT_RATE_LIMIT_EXCEEDED',
          limit: config.MAX_REQUESTS,
          current: currentCount,
          remaining: 0,
          resetInSeconds: getSecondsUntilMidnight(),
          resetAt: new Date(Date.now() + getSecondsUntilMidnight() * 1000).toISOString(),
          requiresLogin: !isAuthenticated,
        },
        suggestion: isAuthenticated
          ? `Bạn đã hết ${config.MAX_REQUESTS} lượt hỏi hôm nay. Vui lòng quay lại vào ngày mai!`
          : 'Đăng nhập để được 100 lượt hỏi mỗi ngày thay vì 15 lượt!',
      })
    }

    // Increment count
    const ttl = getSecondsUntilMidnight()
    await incrementCount(redisKey, ttl)

    // Update remaining count after increment
    req.rateLimit.remaining = remaining - 1
    req.rateLimit.current = currentCount + 1

    // Log successful request
    console.log(
      `✅ Chatbot request allowed for ${isAuthenticated ? 'user' : 'IP'}: ${identifier} (${currentCount + 1}/${
        config.MAX_REQUESTS
      })`
    )

    // Continue to next middleware
    next()
  } catch (error) {
    console.error('❌ Error in chatbot rate limit middleware:', error)

    // On error, allow the request but log the error
    // This prevents rate limiting from breaking the application
    console.warn('⚠️ Rate limiting failed, allowing request through')
    next()
  }
}

/**
 * Middleware to add rate limit info to response headers
 */
export const addRateLimitHeaders = (req, res, next) => {
  // Add rate limit info to response headers if available
  if (req.rateLimit) {
    res.setHeader('X-RateLimit-Limit', req.rateLimit.limit)
    res.setHeader('X-RateLimit-Remaining', req.rateLimit.remaining)
    res.setHeader('X-RateLimit-Reset', req.rateLimit.resetAt)
    res.setHeader('X-RateLimit-Type', req.rateLimit.isAuthenticated ? 'authenticated' : 'anonymous')
  }

  next()
}

/**
 * Get rate limit status for a user/IP (utility function for debugging)
 * @param {string} identifier - User ID or IP address
 * @param {boolean} isAuthenticated - Whether user is authenticated
 * @returns {Promise<object>} Rate limit status
 */
export const getRateLimitStatus = async (identifier, isAuthenticated = false) => {
  try {
    const config = isAuthenticated ? RATE_LIMITS.AUTHENTICATED : RATE_LIMITS.ANONYMOUS
    const redisKey = getRateLimitKey(identifier, isAuthenticated)
    const currentCount = await getCurrentCount(redisKey)
    const remaining = Math.max(0, config.MAX_REQUESTS - currentCount)

    return {
      identifier,
      isAuthenticated,
      limit: config.MAX_REQUESTS,
      current: currentCount,
      remaining: remaining,
      resetInSeconds: getSecondsUntilMidnight(),
      isLimitExceeded: currentCount >= config.MAX_REQUESTS,
    }
  } catch (error) {
    console.error('Error getting rate limit status:', error)
    return null
  }
}

/**
 * Reset rate limit for a user/IP (admin utility function)
 * @param {string} identifier - User ID or IP address
 * @param {boolean} isAuthenticated - Whether user is authenticated
 * @returns {Promise<boolean>} Success status
 */
export const resetRateLimit = async (identifier, isAuthenticated = false) => {
  try {
    const redisKey = getRateLimitKey(identifier, isAuthenticated)
    await redisCloud.del(redisKey)
    console.log(`✅ Rate limit reset for ${isAuthenticated ? 'user' : 'IP'}: ${identifier}`)
    return true
  } catch (error) {
    console.error('Error resetting rate limit:', error)
    return false
  }
}

/**
 * Export configuration for reference
 */
export const CHATBOT_RATE_LIMITS = RATE_LIMITS

export default chatbotRateLimitMiddleware
