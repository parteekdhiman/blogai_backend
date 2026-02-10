import jwt from 'jsonwebtoken'
import { ApiError } from '@/utils/errors'

export interface JWTPayload {
  userId: string
  email: string
  role: string
}

interface TokenPair {
  accessToken: string
  refreshToken: string
}

export const generateAccessToken = (payload: JWTPayload): string => {
  return jwt.sign(
    payload,
    process.env.JWT_SECRET!,
    { expiresIn: (process.env.JWT_ACCESS_EXPIRY || '15m') as any }
  )
}

export const generateRefreshToken = (payload: JWTPayload): string => {
  return jwt.sign(
    payload,
    process.env.JWT_REFRESH_SECRET!,
    { expiresIn: (process.env.JWT_REFRESH_EXPIRY || '7d') as any }
  )
}

export const generateTokenPair = (payload: JWTPayload): TokenPair => {
  return {
    accessToken: generateAccessToken(payload),
    refreshToken: generateRefreshToken(payload)
  }
}

export const verifyAccessToken = (token: string): JWTPayload => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new ApiError(401, 'Access token expired')
    }
    throw new ApiError(401, 'Invalid access token')
  }
}

export const verifyRefreshToken = (token: string): JWTPayload => {
  try {
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET!) as JWTPayload
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new ApiError(401, 'Refresh token expired')
    }
    throw new ApiError(401, 'Invalid refresh token')
  }
}
