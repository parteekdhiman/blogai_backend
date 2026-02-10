import express from 'express'
import { validate } from '@/middleware/validation'
import { 
  registerSchema, 
  verifyEmailSchema, 
  resendVerificationSchema, 
  loginSchema, 
  forgotPasswordSchema,
  resetPasswordSchema 
} from '@/utils/validators'
import { 
  register, 
  verifyEmail, 
  resendVerification, 
  login, 
  refreshAccessToken, 
  logout, 
  logoutAll, 
  getActiveSessions, 
  revokeSession,
  forgotPassword,
  resetPasswordController,
  googleCallback 
} from '@/controllers/auth.controller'
import { protect } from '@/middleware/auth'
import passport from '@/config/passport'

const router = express.Router()

// Public routes
router.post('/register', validate(registerSchema), register)
router.post('/login', validate(loginSchema), login)
router.post('/forgot-password', validate(forgotPasswordSchema), forgotPassword)
router.post('/reset-password', validate(resetPasswordSchema), resetPasswordController)
router.post('/refresh', refreshAccessToken)
router.post('/verify-email', validate(verifyEmailSchema), verifyEmail)
router.post('/resend-verification', validate(resendVerificationSchema), resendVerification)

// Google OAuth routes
router.get(
  '/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false
  })
)

router.get(
  '/google/callback',
  passport.authenticate('google', {
    session: false,
    failureRedirect: `${process.env.CLIENT_URL}/login?error=oauth_failed`
  }),
  googleCallback
)

// Protected routes
router.post('/logout', protect, logout)
router.post('/logout-all', protect, logoutAll)
router.get('/sessions', protect, getActiveSessions)
router.delete('/sessions/:sessionId', protect, revokeSession)

export default router
