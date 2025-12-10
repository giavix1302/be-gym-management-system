// openai.service.js - OpenAI Integration with Function Calling

import OpenAI from 'openai'
import { FUNCTION_DECLARATIONS, SYSTEM_PROMPT } from '~/config/chatbot.config.js'
import { executeFunctionCall } from './functions.service.js'
import { env } from '~/config/environment.config.js'

// Initialize OpenAI client
let openaiClient = null

/**
 * Initialize OpenAI client
 */
const initializeOpenAI = () => {
  try {
    if (!env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured')
    }

    openaiClient = new OpenAI({
      apiKey: env.OPENAI_API_KEY,
    })

    console.log('✅ OpenAI client initialized successfully')
    return openaiClient
  } catch (error) {
    console.error('❌ Failed to initialize OpenAI:', error)
    throw error
  }
}

/**
 * Get or create OpenAI client instance
 */
const getOpenAIClient = () => {
  if (!openaiClient) {
    return initializeOpenAI()
  }
  return openaiClient
}

/**
 * Convert function declarations to OpenAI tools format
 */
const convertToOpenAITools = () => {
  return FUNCTION_DECLARATIONS.map((func) => ({
    type: 'function',
    function: {
      name: func.name,
      description: func.description,
      parameters: func.parameters,
    },
  }))
}

/**
 * Build conversation context from history
 * @param {object} conversation - Conversation object with messages array
 * @param {string} userId - User ID (null if anonymous)
 * @param {string} userName - User name
 * @returns {array} Formatted messages for OpenAI API
 */
const buildConversationContext = (conversation, userId, userName) => {
  try {
    const messages = []

    // Add system message
    const userContext = userId
      ? `User: authenticated, userId: ${userId}, userName: ${userName}`
      : 'User: anonymous (not logged in)'

    const currentTime = new Date().toISOString()

    messages.push({
      role: 'system',
      content: `${SYSTEM_PROMPT}\n\nContext: ${userContext}, Current time: ${currentTime}`,
    })

    // Get last 10 messages from conversation history
    const recentMessages = conversation.messages ? conversation.messages.slice(-10) : []

    // Add conversation history
    for (const msg of recentMessages) {
      const role = msg.type === 'user' ? 'user' : 'assistant'
      messages.push({
        role: role,
        content: msg.content,
      })
    }

    console.log(`📝 Built context with ${messages.length} messages (${recentMessages.length} from history)`)
    return messages
  } catch (error) {
    console.error('Error building conversation context:', error)
    return [
      {
        role: 'system',
        content: SYSTEM_PROMPT,
      },
    ]
  }
}

/**
 * Handle function calling flow with OpenAI
 * @param {string} userMessage - User's message
 * @param {object} conversation - Conversation object
 * @param {string} userId - User ID (null if anonymous)
 * @param {string} userName - User display name
 * @returns {string} Final AI response text
 */
export const handleFunctionCallingFlow = async (userMessage, conversation, userId = null, userName = null) => {
  try {
    console.log('🤖 Starting OpenAI function calling flow...')

    // Get or initialize client
    const client = getOpenAIClient()

    // Build conversation history
    const messages = buildConversationContext(conversation, userId, userName)

    // Add user message
    messages.push({
      role: 'user',
      content: userMessage,
    })

    console.log(`💬 User: ${userMessage}`)

    // Get OpenAI tools format
    const tools = convertToOpenAITools()

    // Function calling loop
    let iterationCount = 0
    const MAX_ITERATIONS = 5

    while (iterationCount < MAX_ITERATIONS) {
      iterationCount++
      console.log(`🔄 Function calling iteration ${iterationCount}`)

      // Call OpenAI
      const response = await client.chat.completions.create({
        model: env.OPENAI_MODEL_NAME || 'gpt-4o-mini',
        messages: messages,
        tools: tools,
        tool_choice: 'auto',
        temperature: 0.7,
        max_tokens: 2048,
      })

      const assistantMessage = response.choices[0].message

      // Add assistant message to history
      messages.push(assistantMessage)

      // Check if there are function calls
      if (!assistantMessage.tool_calls || assistantMessage.tool_calls.length === 0) {
        // No function calls, return the response
        const finalResponse = assistantMessage.content
        console.log(`✅ Final AI response: ${finalResponse.substring(0, 100)}...`)
        return finalResponse
      }

      // Execute function calls
      console.log(`📞 Processing ${assistantMessage.tool_calls.length} function calls`)

      for (const toolCall of assistantMessage.tool_calls) {
        const functionName = toolCall.function.name
        const functionArgs = JSON.parse(toolCall.function.arguments)

        console.log(`📞 Function call: ${functionName}`, functionArgs)

        try {
          // Execute the function
          const functionResult = await executeFunctionCall(functionName, functionArgs, userId)

          // Add function result to messages
          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify(functionResult),
          })

          console.log(`✅ Function ${functionName} executed successfully`)
        } catch (error) {
          console.error(`❌ Error executing function ${functionName}:`, error)

          // Return error response
          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify({
              success: false,
              error: `Lỗi khi thực thi function: ${error.message}`,
              fallback: true,
            }),
          })
        }
      }
    }

    // Max iterations reached
    console.warn('⚠️ Max function calling iterations reached')
    return 'Xin lỗi, tôi đang gặp sự cố kỹ thuật. Vui lòng thử lại!\n\n📞 Hotline: 1900-1234'
  } catch (error) {
    console.error('❌ OpenAI function calling flow error:', error)

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
    const client = getOpenAIClient()

    const response = await client.chat.completions.create({
      model: env.OPENAI_MODEL_NAME || 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: message,
        },
      ],
      temperature: 0.7,
      max_tokens: 2048,
    })

    return response.choices[0].message.content
  } catch (error) {
    console.error('Simple chat error:', error)
    throw error
  }
}

/**
 * Health check for OpenAI service
 * @returns {boolean} Service health status
 */
export const healthCheck = async () => {
  try {
    const client = getOpenAIClient()
    const response = await client.chat.completions.create({
      model: env.OPENAI_MODEL_NAME || 'gpt-4-turbo-preview',
      messages: [{ role: 'user', content: 'test' }],
      max_tokens: 10,
    })

    return {
      healthy: true,
      model: env.OPENAI_MODEL_NAME || 'gpt-4-turbo-preview',
      message: 'OpenAI service is healthy',
    }
  } catch (error) {
    console.error('OpenAI health check failed:', error)
    return {
      healthy: false,
      error: error.message,
      message: 'OpenAI service is unhealthy',
    }
  }
}

// Export service functions
export default {
  handleFunctionCallingFlow,
  simpleChat,
  healthCheck,
  initializeOpenAI,
  buildConversationContext,
  getOpenAIClient,
}
