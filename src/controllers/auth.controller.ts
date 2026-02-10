import { Request, Response, NextFunction } from 'express'
import { 
  registerUser, 
  verifyUserEmail, 
  resendVerificationEmail, 
  loginUser, 
  refreshTokenService, 
  logoutUser, 
  logoutAllDevices,
  requestPasswordReset,
  resetPassword 
} from '@/services/auth.service'
import { ApiError, UnauthorizedError } from '@/utils/errors'
import { RefreshTokenModel } from '@/models/token.model'
import { parseUserAgent } from '@/utils/userAgent'
import { generateTokenPair } from '@/utils/jwt'

export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { name, email, password } = req.body
    
    const result = await registerUser({ name, email, password })
    
    res.status(201).json({
      success: true,
      message: 'Registration successful. Please check your email to verify your account.',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

export const verifyEmail = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { token } = req.body
    
    await verifyUserEmail(token)
    
    res.json({
      success: true,
      message: 'Email verified successfully. You can now login.'
    })
  } catch (error) {
    next(error)
  }
}

export const resendVerification = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email } = req.body
    
    await resendVerificationEmail(email)
    
    res.json({
      success: true,
      message: 'Verification email sent'
    })
  } catch (error) {
    next(error)
  }
}

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, password } = req.body
    const ip = req.ip || 'unknown'
    const userAgent = req.get('user-agent') || 'unknown'
    
    const result = await loginUser({ email, password, ip, userAgent })
    
    // Set refresh token in cookie
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    })
    
    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: result.user,
        accessToken: result.accessToken
      }
    })
  } catch (error) {
    next(error)
  }
}

export const refreshAccessToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const refreshToken = req.cookies.refreshToken
    
    if (!refreshToken) {
      throw new UnauthorizedError('Refresh token not found')
    }
    
    const result = await refreshTokenService(refreshToken)
    
    // Set new refresh token in cookie
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    })
    
    res.json({
      success: true,
      data: {
        accessToken: result.accessToken
      }
    })
  } catch (error) {
    next(error)
  }
}

export const logout = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const refreshToken = req.cookies.refreshToken
    const userId = req.user!.userId
    
    await logoutUser(userId, refreshToken)
    
    // Clear cookie
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    })
    
    res.json({
      success: true,
      message: 'Logged out successfully'
    })
  } catch (error) {
    next(error)
  }
}

export const logoutAll = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.userId
    
    await logoutAllDevices(userId)
    
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    })
    
    res.json({
      success: true,
      message: 'Logged out from all devices'
    })
  } catch (error) {
    next(error)
  }
}

export const getActiveSessions = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.userId
    
    const sessions = await RefreshTokenModel.find({
      user: userId,
      expiresAt: { $gt: new Date() }
    })
    .select('_id ipAddress userAgent createdAt expiresAt token')
    .sort({ createdAt: -1 })
    .lean()
    
    // Parse user agents for better display
    const formattedSessions = sessions.map((session: any) => ({
      id: session._id.toString(),
      ipAddress: session.ipAddress,
      userAgent: session.userAgent,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
      device: parseUserAgent(session.userAgent),
      isCurrent: req.cookies.refreshToken === session.token
    }))
    
    res.json({
      success: true,
      data: formattedSessions
    })
  } catch (error) {
    next(error)
  }
}

export const revokeSession = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { sessionId } = req.params
    const userId = req.user!.userId
    
    await RefreshTokenModel.deleteMany({
      _id: sessionId,
      user: userId // Ensure user can only revoke own sessions
    })
    
    res.json({
      success: true,
      message: 'Session revoked'
    })
  } catch (error) {
    next(error)
  }
}

export const forgotPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email } = req.body
    const ip = req.ip || 'unknown'
    
    await requestPasswordReset(email, ip)
    
    // Always return success to prevent email enumeration
    res.json({
      success: true,
      message: 'If an account exists, a password reset email has been sent'
    })
  } catch (error) {
    next(error)
  }
}

export const googleCallback = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = req.user as any
    
    if (!user) {
      return res.redirect(
        `${process.env.CLIENT_URL}/login?error=oauth_failed`
      )
    }
    
    // Generate tokens
    const tokens = generateTokenPair({
      userId: user.id,
      email: user.email,
      role: user.role
    })
    
    // Store refresh token
    await RefreshTokenModel.create({
      token: tokens.refreshToken,
      user: user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      ipAddress: req.ip || 'unknown',
      userAgent: req.get('user-agent') || 'unknown'
    })
    // User update is handled in passport strategy now
    // Audit log
    const { AuditLogModel } = await import('@/models/audit.model')
    await AuditLogModel.create({
      userId: user.id,
      action: 'OAUTH_LOGIN',
      entity: 'USER',
      entityId: user.id,
      ipAddress: req.ip || 'unknown',
      userAgent: req.get('user-agent') || 'unknown'
    })
    
    // Set refresh token in cookie
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    })

    // Redirect to frontend with access token
    const redirectUrl = `${process.env.CLIENT_URL}/auth/callback?accessToken=${tokens.accessToken}`
    
    res.redirect(redirectUrl)
  } catch (error) {
    next(error)
  }
}

export const resetPasswordController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { token, password } = req.body
    
    await resetPassword(token, password)
    
    res.json({
      success: true,
      message: 'Password reset successful. You can now login with your new password.'
    })
  } catch (error) {
    next(error)
  }
}
