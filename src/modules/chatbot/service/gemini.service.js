// gemini.service.js - Gemini AI Integration with Function Calling

import { GoogleGenerativeAI } from '@google/generative-ai'
import { FUNCTION_DECLARATIONS, SYSTEM_PROMPT } from '~/config/chatbot.config.js'
import { executeFunctionCall } from './functions.service.js'
import { env } from '~/config/environment.config.js'

// Initialize Gemini client
let geminiModel = null

/**
 * Initialize Gemini model with function declarations
 */
const initializeGeminiWithFunctions = () => {
  try {
    if (!env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not configured')
    }

    const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY)

    // Create model with function calling tools
    const model = genAI.getGenerativeModel({
      model: env.GEMINI_MODEL_NAME || 'gemini-1.5-pro',
      generationConfig: {
        temperature: 0.7,
        topP: 0.9,
        topK: 40,
        maxOutputTokens: 2048,
      },
      tools: [
        {
          functionDeclarations: FUNCTION_DECLARATIONS,
        },
      ],
      systemInstruction: SYSTEM_PROMPT,
    })

    geminiModel = model
    console.log('✅ Gemini AI with function calling initialized successfully')
    return model
  } catch (error) {
    console.error('❌ Failed to initialize Gemini AI:', error)
    throw error
  }
}

/**
 * Get or create Gemini model instance
 */
const getGeminiModel = () => {
  if (!geminiModel) {
    return initializeGeminiWithFunctions()
  }
  return geminiModel
}

/**
 * Build conversation context from history
 * @param {object} conversation - Conversation object with messages array
 * @param {string} userId - User ID (null if anonymous)
 * @param {string} userName - User name
 * @returns {array} Formatted messages for Gemini API
 */
const buildConversationContext = (conversation, userId, userName) => {
  try {
    const messages = []

    // Add system context message
    const userContext = userId
      ? `User: authenticated, userId: ${userId}, userName: ${userName}`
      : 'User: anonymous (not logged in)'

    const currentTime = new Date().toISOString()

    messages.push({
      role: 'user',
      parts: [{ text: `Context: ${userContext}, Current time: ${currentTime}` }],
    })

    messages.push({
      role: 'model',
      parts: [{ text: 'Understood. I will assist accordingly based on this context.' }],
    })

    // Get last 10 messages from conversation history
    const recentMessages = conversation.messages ? conversation.messages.slice(-10) : []

    // Add conversation history
    for (const msg of recentMessages) {
      const role = msg.type === 'user' ? 'user' : 'model'
      messages.push({
        role: role,
        parts: [{ text: msg.content }],
      })
    }

    console.log(`📝 Built context with ${messages.length} messages (${recentMessages.length} from history)`)
    return messages
  } catch (error) {
    console.error('Error building conversation context:', error)
    return []
  }
}

/**
 * Handle function calling flow with Gemini
 * @param {string} userMessage - User's message
 * @param {object} conversation - Conversation object
 * @param {string} userId - User ID (null if anonymous)
 * @param {string} userName - User display name
 * @returns {string} Final AI response text
 */
export const handleFunctionCallingFlow = async (userMessage, conversation, userId = null, userName = null) => {
  try {
    console.log('🤖 Starting Gemini function calling flow...')

    // Get or initialize model
    const model = getGeminiModel()

    // Build conversation history
    const history = buildConversationContext(conversation, userId, userName)

    // Start chat with history
    const chat = model.startChat({
      history: history,
    })

    // Send user message
    console.log(`💬 User: ${userMessage}`)
    let result = await chat.sendMessage(userMessage)
    let response = result.response

    // Function calling loop - Keep calling until we get a text response
    let iterationCount = 0
    const MAX_ITERATIONS = 5 // Prevent infinite loops

    while (response.functionCalls && response.functionCalls.length > 0 && iterationCount < MAX_ITERATIONS) {
      iterationCount++
      console.log(`🔄 Function calling iteration ${iterationCount}`)

      const functionCalls = response.functionCalls
      const functionResponses = []

      // Execute all function calls
      for (const functionCall of functionCalls) {
        console.log(`📞 Function call: ${functionCall.name}`, functionCall.args)

        try {
          // Execute the function
          const functionResult = await executeFunctionCall(functionCall.name, functionCall.args, userId)

          // Add to responses array
          functionResponses.push({
            functionResponse: {
              name: functionCall.name,
              response: functionResult,
            },
          })

          console.log(`✅ Function ${functionCall.name} executed successfully`)
        } catch (error) {
          console.error(`❌ Error executing function ${functionCall.name}:`, error)

          // Return error response to Gemini
          functionResponses.push({
            functionResponse: {
              name: functionCall.name,
              response: {
                success: false,
                error: `Lỗi khi thực thi function: ${error.message}`,
                fallback: true,
              },
            },
          })
        }
      }

      // Send function results back to Gemini
      console.log(`📤 Sending ${functionResponses.length} function results back to Gemini`)
      result = await chat.sendMessage(functionResponses)
      response = result.response
    }

    // Check if we hit max iterations
    if (iterationCount >= MAX_ITERATIONS) {
      console.warn('⚠️ Max function calling iterations reached')
    }

    // Get final text response
    const finalResponse = response.text()
    console.log(`✅ Final AI response: ${finalResponse.substring(0, 100)}...`)

    return finalResponse
  } catch (error) {
    console.error('❌ Gemini function calling flow error:', error)

    // Return friendly error message
    if (error.message?.includes('API key')) {
      return 'Xin lỗi, hệ thống AI đang gặp sự cố cấu hình. Vui lòng liên hệ hotline 1900-1234 để được hỗ trợ.'
    }

    if (error.message?.includes('quota') || error.message?.includes('rate limit')) {
      return 'Hệ thống đang quá tải. Vui lòng thử lại sau ít phút hoặc liên hệ hotline 1900-1234.'
    }

    return 'Xin lỗi, AI đang gặp sự cố kỹ thuật. Vui lòng thử lại sau!\n\n📞 Hotline hỗ trợ: 1900-1234'
  }
}

/**
 * Simple chat without function calling (fallback)
 * @param {string} message - User message
 * @returns {string} AI response
 */
export const simpleChat = async (message) => {
  try {
    const model = getGeminiModel()
    const chat = model.startChat()

    const result = await chat.sendMessage(message)
    return result.response.text()
  } catch (error) {
    console.error('Simple chat error:', error)
    throw error
  }
}

/**
 * Health check for Gemini service
 * @returns {boolean} Service health status
 */
export const healthCheck = async () => {
  try {
    const model = getGeminiModel()
    const result = await model.generateContent('test')
    return {
      healthy: true,
      model: env.GEMINI_MODEL_NAME || 'gemini-1.5-pro',
      message: 'Gemini service is healthy',
    }
  } catch (error) {
    console.error('Gemini health check failed:', error)
    return {
      healthy: false,
      error: error.message,
      message: 'Gemini service is unhealthy',
    }
  }
}

// Export service functions
export default {
  handleFunctionCallingFlow,
  simpleChat,
  healthCheck,
  initializeGeminiWithFunctions,
  buildConversationContext,
  getGeminiModel,
}
