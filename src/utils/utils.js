/* eslint-disable indent */
// utils.js - Extended utility functions for gym management system

export const sanitize = (data, fieldsToRemove = []) => {
  if (!data) return null

  // mặc định luôn bỏ mấy field nhạy cảm
  const defaultFields = ['createdAt', 'updatedAt', '_destroy', 'password']

  // gộp cả default và custom
  const fields = new Set([...defaultFields, ...fieldsToRemove])

  // loại bỏ field không mong muốn
  const safeData = Object.keys(data).reduce((acc, key) => {
    if (!fields.has(key)) {
      acc[key] = data[key]
    }
    return acc
  }, {})

  return safeData
}

export const convertVnpayDateToISO = (vnp_PayDate) => {
  if (!vnp_PayDate || vnp_PayDate.length !== 14) {
    throw new Error('Invalid vnp_PayDate format')
  }

  const year = vnp_PayDate.substring(0, 4)
  const month = vnp_PayDate.substring(4, 6)
  const day = vnp_PayDate.substring(6, 8)
  const hour = vnp_PayDate.substring(8, 10)
  const minute = vnp_PayDate.substring(10, 12)
  const second = vnp_PayDate.substring(12, 14)

  const date = new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}`)

  return date.toISOString()
}

export function calculateEndDate(startDateISO, monthsToAdd) {
  const startDate = new Date(startDateISO)

  const endDate = new Date(startDate)
  endDate.setMonth(endDate.getMonth() + Number(monthsToAdd))

  return endDate.toISOString()
}

export function countRemainingDays(endISO) {
  const now = new Date()
  const end = new Date(endISO)

  const diffMs = end.getTime() - now.getTime()

  if (diffMs <= 0) return 0

  return Math.ceil(diffMs / (1000 * 60 * 60 * 24))
}

export function calculateDiscountedPrice(originalPrice, discountPercent) {
  if (discountPercent < 0 || discountPercent > 100) {
    throw new Error('Discount must be between 0 and 100')
  }

  const discountAmount = (originalPrice * discountPercent) / 100
  const finalPrice = originalPrice - discountAmount

  return {
    originalPrice,
    discountPercent,
    discountAmount,
    finalPrice,
  }
}

export const createRedirectUrl = (paymentData, baseUrl, service) => {
  const params = new URLSearchParams()

  params.append('service', service)

  Object.entries(paymentData).forEach(([key, value]) => {
    params.append(key, value)
  })

  return `${baseUrl}${params.toString()}`
}

export function updateImages(imageURL = [], imageFile = [], imageURLDatabase = []) {
  const finalImage = [...imageURL, ...imageFile]
  const removeImage = imageURLDatabase.filter((img) => !finalImage.includes(img))
  return { finalImage, removeImage }
}

export function idFromTimestamp() {
  return Date.now().toString() + '-' + Math.random().toString(36).slice(2, 6)
}

export function isValidDateRange(start, end) {
  const startDate = new Date(start)
  const endDate = new Date(end)

  if (isNaN(startDate) || isNaN(endDate)) {
    throw new Error('Ngày không hợp lệ')
  }

  return startDate < endDate
}

// Helper function to generate class sessions
export const generateClassSessions = (classId, startDate, endDate, recurrenceArray, trainers, className) => {
  const sessions = []
  const start = new Date(startDate)
  const end = new Date(endDate)
  const now = new Date()

  recurrenceArray.forEach((recurrence) => {
    const { dayOfWeek, startTime, endTime, roomId } = recurrence

    let currentDate = new Date(start)

    while (currentDate.getDay() !== dayOfWeek) {
      currentDate.setDate(currentDate.getDate() + 1)
    }

    while (currentDate <= end) {
      const sessionStart = new Date(currentDate)
      sessionStart.setHours(startTime.hour, startTime.minute, 0, 0)

      const sessionEnd = new Date(currentDate)
      sessionEnd.setHours(endTime.hour, endTime.minute, 0, 0)

      const durationMs = sessionEnd - sessionStart
      const hours = durationMs / (1000 * 60 * 60)

      if (sessionStart > now) {
        sessions.push({
          classId: classId.toString(),
          trainers: trainers,
          users: [],
          roomId: roomId,
          startTime: sessionStart.toISOString(),
          endTime: sessionEnd.toISOString(),
          hours: hours,
          title: `${className} - ${getDayName(dayOfWeek)} ${formatTime(startTime)}-${formatTime(endTime)}`,
        })
      }

      currentDate.setDate(currentDate.getDate() + 7)
    }
  })

  return sessions
}

// Helper function to get day name
export const getDayName = (dayOfWeek) => {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  return days[dayOfWeek]
}

// Helper function to format time
export const formatTime = (time) => {
  const hour = time.hour.toString().padStart(2, '0')
  const minute = time.minute.toString().padStart(2, '0')
  return `${hour}:${minute}`
}

// Additional helper functions for chatbot
export function formatPrice(price) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(price)
}

export function formatDateVN(dateString) {
  if (!dateString) return 'N/A'
  return new Date(dateString).toLocaleDateString('vi-VN')
}

export function formatDateTimeVN(dateString) {
  if (!dateString) return 'N/A'
  return new Date(dateString).toLocaleString('vi-VN')
}

export function formatDateRange(startDate, endDate) {
  const start = new Date(startDate).toLocaleDateString('vi-VN')
  const end = new Date(endDate).toLocaleDateString('vi-VN')

  if (start === end) {
    return start
  }

  return `${start} - ${end}`
}

export function calculateTimeUntil(targetDate) {
  const now = new Date()
  const target = new Date(targetDate)
  const diffMs = target - now

  if (diffMs <= 0) return { hours: 0, minutes: 0, canCancel: false }

  const hours = Math.floor(diffMs / (1000 * 60 * 60))
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))

  return {
    hours,
    minutes,
    totalHours: diffMs / (1000 * 60 * 60),
    canCancel: diffMs > 1 * 60 * 60 * 1000, // 1 hour in milliseconds
  }
}

// Date range calculations for schedule viewing
export function calculateDateRange(timeRange) {
  const now = new Date()
  let startDate, endDate

  switch (timeRange) {
    case 'today':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      endDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000)
      break

    case 'tomorrow':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
      endDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000)
      break

    case 'this_week':
      const dayOfWeek = now.getDay()
      const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysToMonday)
      endDate = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000)
      break

    case 'next_week':
      const dayOfWeekNext = now.getDay()
      const daysToNextMonday = dayOfWeekNext === 0 ? 1 : 8 - dayOfWeekNext
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysToNextMonday)
      endDate = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000)
      break

    case 'this_month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1)
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1)
      break

    default: // 'upcoming' - next 7 days
      startDate = new Date(now)
      endDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  }

  return {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  }
}

export function getTimeRangeText(timeRange) {
  switch (timeRange) {
    case 'today':
      return 'hôm nay'
    case 'tomorrow':
      return 'ngày mai'
    case 'this_week':
      return 'tuần này'
    case 'next_week':
      return 'tuần tới'
    case 'this_month':
      return 'tháng này'
    default:
      return '7 ngày tới'
  }
}

// Entity extraction utilities
export function extractTimeRangeFromText(text) {
  const textLower = text.toLowerCase()

  if (textLower.includes('hôm nay') || textLower.includes('today')) return 'today'
  if (textLower.includes('ngày mai') || textLower.includes('tomorrow')) return 'tomorrow'
  if (textLower.includes('tuần này') || textLower.includes('this week')) return 'this_week'
  if (textLower.includes('tuần tới') || textLower.includes('next week')) return 'next_week'
  if (textLower.includes('tháng này') || textLower.includes('this month')) return 'this_month'

  return 'upcoming'
}

export function extractConfirmationFromText(text) {
  return /xác nhận|đồng ý|ok|yes|có/i.test(text)
}

// Validation utilities
export function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function validatePhone(phone) {
  // Vietnamese phone format
  const phoneRegex = /^(\+84|84|0)([3|5|7|8|9])([0-9]{8})$/
  return phoneRegex.test(phone)
}

export function validatePassword(password) {
  // At least 6 characters
  return password && password.length >= 6
}

// Random ID generators
export function generateAnonymousId() {
  return `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

export function generateSessionId() {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}
