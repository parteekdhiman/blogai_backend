import UserModel, { IUser } from '@/models/user.model'
import { VerificationTokenModel, RefreshTokenModel, PasswordResetTokenModel } from '@/models/token.model'
import { AuditLogModel } from '@/models/audit.model'
import { comparePassword, hashPassword } from '@/utils/bcrypt'
import { sendVerificationEmail, sendWelcomeEmail, sendAccountLockedEmail, sendPasswordResetEmail } from '@/services/email.service'
import { ApiError, UnauthorizedError } from '@/utils/errors'
import crypto from 'crypto'
import { checkRateLimit, redis } from '@/config/redis'
import { generateTokenPair, JWTPayload, verifyRefreshToken } from '@/utils/jwt'
import mongoose from 'mongoose'

interface RegisterInput {
  name: string
  email: string
  password: string
}

export const registerUser = async (input: RegisterInput) => {
  const { name, email, password } = input
  
  // Rate limiting
  const rateLimitKey = `register:${email}`
  const { allowed } = await checkRateLimit(rateLimitKey, 3, 3600) // 3 per hour
  
  if (!allowed) {
    throw new ApiError(429, 'Too many registration attempts. Try again later.')
  }
  
  // Check if user exists
  const existingUser = await UserModel.findOne({ email })
  
  if (existingUser) {
    throw new ApiError(409, 'Email already registered')
  }
  
  // Hash password
  const hp = await hashPassword(password)
  
  // Generate verification token
  const verificationToken = crypto.randomUUID()
  const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
  
  // MongoDB Transaction (if Replica Set is enabled)
  // For standalone, we can just do two operations. 
  // We'll use a session for best practice in case you have a replica set.
  const session = await mongoose.startSession()
  let user
  
  try {
    session.startTransaction()
    
    // Create User
    const [newUser] = await UserModel.create([{
      name,
      email,
      password: hp,
      role: 'USER'
    }], { session })
    
    // Create Verification Token
    await VerificationTokenModel.create([{
      identifier: email,
      token: verificationToken,
      expires: tokenExpiry
    }], { session })
    
    await session.commitTransaction()
    user = newUser
  } catch (err) {
    await session.abortTransaction()
    throw err
  } finally {
    session.endSession()
  }
  
  // Send verification email
  sendVerificationEmail(email, verificationToken).catch(err => {
    // console.error needs to be replaced with logger, but keeping as is for now + logger usage if possible
    console.error('Failed to send verification email:', err)
  })
  
  return {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt
    },
    message: 'Verification email sent'
  }
}

export const verifyUserEmail = async (token: string) => {
  // Find token
  const verificationToken = await VerificationTokenModel.findOne({ token })
  
  if (!verificationToken) {
    throw new ApiError(404, 'Invalid or expired verification token')
  }
  
  // Check expiry (handled by TTL mostly, but explicit check is good)
  if (verificationToken.expires < new Date()) {
    await VerificationTokenModel.deleteOne({ token })
    throw new ApiError(410, 'Verification token expired')
  }
  
  // Find user
  const user = await UserModel.findOne({ email: verificationToken.identifier })
  
  if (!user) {
    throw new ApiError(404, 'User not found')
  }
  
  if (user.emailVerified) {
    throw new ApiError(400, 'Email already verified')
  }
  
  const session = await mongoose.startSession()
  try {
    session.startTransaction()
    
    user.emailVerified = new Date()
    await user.save({ session })
    
    await VerificationTokenModel.deleteOne({ token }, { session })
    
    await session.commitTransaction()
  } catch (err) {
    await session.abortTransaction()
    throw err
  } finally {
    session.endSession()
  }
  
  // Send welcome email
  sendWelcomeEmail(user.email, user.name || 'User').catch(console.error)
  
  return true
}

export const resendVerificationEmail = async (email: string) => {
  // Rate limit
  const rateLimitKey = `resend_verify:${email}`
  const { allowed } = await checkRateLimit(rateLimitKey, 3, 3600)
  
  if (!allowed) {
    throw new ApiError(429, 'Too many requests. Try again later.')
  }
  
  const user = await UserModel.findOne({ email })
  
  if (!user) {
    return true
  }
  
  if (user.emailVerified) {
    throw new ApiError(400, 'Email already verified')
  }
  
  // Delete old tokens
  await VerificationTokenModel.deleteMany({ identifier: email })
  
  // Generate new token
  const token = crypto.randomUUID()
  const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000)
  
  await VerificationTokenModel.create({
    identifier: email,
    token,
    expires: expiry
  })
  
  await sendVerificationEmail(email, token)
  
  return true
}

interface LoginInput {
  email: string
  password: string
  ip: string
  userAgent: string
}

export const loginUser = async (input: LoginInput) => {
  const { email, password, ip, userAgent } = input
  const _redis = redis // Local alias for type narrowing
  
  // 1. Rate limiting
  const rateLimitKey = `login_attempts:${email}`
  const { allowed, remaining } = await checkRateLimit(rateLimitKey, 5, 900)
  
  if (!allowed) {
    throw new ApiError(429, 'Too many login attempts. Please try again in 15 minutes.')
  }
  
  // 2. Check account lockout
  const lockoutKey = `account_locked:${email}`
  if (_redis) {
    const isLocked = await _redis.get(lockoutKey)
    if (isLocked) {
      throw new ApiError(423, 'Account temporarily locked. Try again later.')
    }
  }
  
  // 3. Find user (Must explicitly select password as we set select: false in schema)
  const user = await UserModel.findOne({ email }).select('+password')
  
  if (!user || !user.password) {
    if (_redis) {
      await _redis.incr(rateLimitKey)
      await _redis.expire(rateLimitKey, 900)
    }
    throw new ApiError(401, 'Invalid credentials')
  }
  
  // 4. Check email verification
  if (!user.emailVerified && process.env.NODE_ENV !== 'development') {
    throw new ApiError(403, 'Please verify your email before logging in')
  }
  
  // 5. Verify password
  const isValid = await comparePassword(password, user.password)
  
  if (!isValid) {
    if (_redis) {
      await _redis.incr(rateLimitKey)
      
      if (remaining <= 1) {
        await _redis.setex(lockoutKey, 1800, '1') // Lock for 30 min
        sendAccountLockedEmail(user.email, user.name || 'User').catch(console.error)
      }
    }
    
    throw new ApiError(401, 'Invalid credentials')
  }
  
  // 6. Clear failed attempts
  if (_redis) {
    await _redis.del(rateLimitKey)
  }
  
  // 7. Generate tokens
  const tokens = generateTokenPair({
    userId: user._id.toString(),
    email: user.email,
    role: user.role
  })
  
  // 8. Store refresh token & update user stats
  const session = await mongoose.startSession()
  try {
    session.startTransaction()
    
    await RefreshTokenModel.create([{
      token: tokens.refreshToken,
      user: user._id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      ipAddress: ip,
      userAgent
    }], { session })
    
    // Update user login stats
    user.lastLoginAt = new Date()
    user.loginCount = (user.loginCount || 0) + 1
    await user.save({ session })
    
    // Audit Log
    await AuditLogModel.create([{
      userId: user._id,
      action: 'LOGIN',
      entity: 'USER',
      entityId: user._id.toString(),
      ipAddress: ip,
      userAgent
    }], { session })
    
    await session.commitTransaction()
  } catch (err) {
    await session.abortTransaction()
    throw err
  } finally {
    session.endSession()
  }
  
  return {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    user: {
      id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
      image: user.image
    }
  }
}

export const refreshTokenService = async (token: string) => {
  let payload: JWTPayload
  try {
    payload = verifyRefreshToken(token)
  } catch (error) {
    throw new UnauthorizedError('Invalid refresh token')
  }
  
  // Find token and populate user
  const storedToken = await RefreshTokenModel.findOne({ token }).populate('user')
  
  if (!storedToken) {
    throw new UnauthorizedError('Refresh token not found')
  }
  
  if (storedToken.expiresAt < new Date()) {
    await RefreshTokenModel.deleteOne({ token })
    throw new UnauthorizedError('Refresh token expired')
  }
  
  if (!storedToken.user) {
    throw new UnauthorizedError('User not found')
  }
  
  const user = storedToken.user as unknown as IUser
  
  // Generate new
  const newTokens = generateTokenPair({
    userId: user._id.toString(),
    email: user.email,
    role: user.role
  })
  
  // Rotate token
  // Delete old
  await RefreshTokenModel.deleteOne({ token })
  
  // Create new
  await RefreshTokenModel.create({
    token: newTokens.refreshToken,
    user: user._id,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    ipAddress: storedToken.ipAddress,
    userAgent: storedToken.userAgent
  })
  
  return {
    accessToken: newTokens.accessToken,
    refreshToken: newTokens.refreshToken
  }
}

export const requestPasswordReset = async (email: string, ip: string) => {
  const emailRateLimitKey = `forgot_password:email:${email}`
  const { allowed: emailAllowed } = await checkRateLimit(emailRateLimitKey, 3, 3600)
  
  if (!emailAllowed) return true
  
  const ipRateLimitKey = `forgot_password:ip:${ip}`
  const { allowed: ipAllowed } = await checkRateLimit(ipRateLimitKey, 10, 3600)
  
  if (!ipAllowed) {
    throw new ApiError(429, 'Too many requests. Try again later.')
  }
  
  const user = await UserModel.findOne({ email })
  
  if (!user) return true
  
  const resetToken = crypto.randomBytes(32).toString('hex')
  const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex')
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000)
  
  // Delete old
  await PasswordResetTokenModel.deleteMany({ user: user._id })
  
  // Create new
  await PasswordResetTokenModel.create({
    user: user._id,
    tokenHash,
    expiresAt
  })
  
  await sendPasswordResetEmail(user.email, user.name || 'User', resetToken)
  
  await AuditLogModel.create({
    userId: user._id,
    action: 'PASSWORD_RESET_REQUESTED',
    entity: 'USER',
    entityId: user._id.toString(),
    ipAddress: ip
  })
  
  return true
}

export const logoutUser = async (userId: string, refreshToken?: string) => {
  if (refreshToken) {
    await RefreshTokenModel.deleteMany({
      user: userId,
      token: refreshToken
    })
  }
  
  await AuditLogModel.create({
    userId,
    action: 'LOGOUT',
    entity: 'USER',
    entityId: userId
  })
  
  return true
}

export const logoutAllDevices = async (userId: string) => {
  await RefreshTokenModel.deleteMany({ user: userId })
  
  await AuditLogModel.create({
    userId,
    action: 'LOGOUT_ALL',
    entity: 'USER',
    entityId: userId
  })
  
  return true
}

export const resetPassword = async (token: string, password: string) => {
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
  
  const storedToken = await PasswordResetTokenModel.findOne({ tokenHash }).populate('user')
  
  if (!storedToken) {
    throw new ApiError(400, 'Invalid or expired password reset token')
  }
  
  if (storedToken.expiresAt < new Date()) {
    await PasswordResetTokenModel.deleteOne({ tokenHash })
    throw new ApiError(400, 'Password reset token has expired')
  }
  
  if (!storedToken.user) {
    throw new ApiError(404, 'User not found')
  }
  
  const user = storedToken.user as unknown as IUser
  const hashedPassword = await hashPassword(password)
  
  const session = await mongoose.startSession()
  try {
    session.startTransaction()
    
    user.password = hashedPassword
    await user.save({ session })
    
    await PasswordResetTokenModel.deleteOne({ tokenHash }, { session })
    
    await AuditLogModel.create([{
      userId: user._id,
      action: 'PASSWORD_RESET_SUCCESSFUL',
      entity: 'USER',
      entityId: user._id.toString()
    }], { session })
    
    await session.commitTransaction()
  } catch (err) {
    await session.abortTransaction()
    throw err
  } finally {
    session.endSession()
  }
  
  return true
}

