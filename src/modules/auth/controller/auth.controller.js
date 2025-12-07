import { StatusCodes } from 'http-status-codes'
import { authService } from '../service/auth.service.js'

const login = async (req, res, next) => {
  try {
    const result = await authService.login(req.body)

    if (result.success) {
      // set refresh token vào httpOnly cookie
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', // chỉ bật secure khi deploy https
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 ngày
      })

      return res.status(StatusCodes.OK).json(result)
    } else {
      return res.status(StatusCodes.UNAUTHORIZED).json(result)
    }
  } catch (error) {
    next(error)
  }
}

const signup = async (req, res, next) => {
  try {
    const result = await authService.signup(req.body)

    if (result.success) {
      res.status(StatusCodes.OK).json(result)
    } else {
      res.status(StatusCodes.BAD_REQUEST).json(result)
    }
  } catch (error) {
    next(error)
  }
}

const verify = async (req, res, next) => {
  try {
    const result = await authService.verify(req.body)
    if (result.success) {
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', // chỉ bật secure khi deploy https
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 ngày
      })
      res.status(StatusCodes.OK).json(result)
    } else {
      res.status(StatusCodes.UNAUTHORIZED).json(result)
    }
  } catch (error) {
    next(error)
  }
}

// Refresh token
const refreshToken = async (req, res, next) => {
  try {
    const refreshToken = req.cookies.refreshToken
    console.log('🚀 ~ refreshToken ~ token:', refreshToken)
    if (!refreshToken) {
      return res.status(StatusCodes.UNAUTHORIZED).json({ message: 'No refresh token' })
    }

    const result = await authService.refresh(refreshToken)

    if (result.success) {
      return res.status(StatusCodes.OK).json({
        success: true,
        accessToken: result.accessToken,
      })
    } else {
      return res.status(StatusCodes.UNAUTHORIZED).json(result)
    }
  } catch (error) {
    next(error)
  }
}

const logout = async (req, res, next) => {
  try {
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // chỉ bật khi https
      sameSite: 'strict',
    })

    return res.status(StatusCodes.OK).json({
      success: true,
      message: 'Logged out successfully',
    })
  } catch (error) {
    next(error)
  }
}

const forgotPasswordSentOTP = async (req, res, next) => {
  try {
    const result = await authService.forgotPasswordSentOTP(req.body)

    if (result.success) {
      res.status(StatusCodes.OK).json(result)
    } else {
      res.status(StatusCodes.BAD_REQUEST).json(result)
    }
  } catch (error) {
    next(error)
  }
}

const forgotPasswordVerifyOTP = async (req, res, next) => {
  try {
    const result = await authService.forgotPasswordVerifyOTP(req.body)

    if (result.success) {
      res.status(StatusCodes.OK).json(result)
    } else {
      res.status(StatusCodes.BAD_REQUEST).json(result)
    }
  } catch (error) {
    next(error)
  }
}

export const authController = {
  login,
  signup,
  verify,
  refreshToken,
  logout,
  forgotPasswordSentOTP,
  forgotPasswordVerifyOTP,
}
