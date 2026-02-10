import mongoose, { Schema, Document } from 'mongoose';

// ---------------------------------------------------------
// Refresh Token Schema
// ---------------------------------------------------------
export interface IRefreshToken extends Document {
  token: string;
  user: mongoose.Types.ObjectId;
  expiresAt: Date;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

const RefreshTokenSchema = new Schema(
  {
    token: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    expiresAt: {
      type: Date,
      required: true
    },
    ipAddress: String,
    userAgent: String
  },
  { timestamps: true }
);

// TTL Index: Automatically delete document when expiresAt is reached
// NOTE: MongoDB runs the cleanup thread every 60s.
RefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RefreshTokenModel = mongoose.model<IRefreshToken>('RefreshToken', RefreshTokenSchema);


// ---------------------------------------------------------
// Verification Token Schema (Email Verify)
// ---------------------------------------------------------
export interface IVerificationToken extends Document {
  identifier: string; // Email
  token: string;
  expires: Date;
}

const VerificationTokenSchema = new Schema(
  {
    identifier: {
      type: String,
      required: true
    },
    token: {
      type: String,
      required: true,
      unique: true
    },
    expires: {
      type: Date,
      required: true
    }
  }
);

VerificationTokenSchema.index({ identifier: 1, token: 1 }, { unique: true });
VerificationTokenSchema.index({ expires: 1 }, { expireAfterSeconds: 0 });

export const VerificationTokenModel = mongoose.model<IVerificationToken>('VerificationToken', VerificationTokenSchema);


// ---------------------------------------------------------
// Password Reset Token Schema
// ---------------------------------------------------------
export interface IPasswordResetToken extends Document {
  user: mongoose.Types.ObjectId;
  tokenHash: string;
  expiresAt: Date;
}

const PasswordResetTokenSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  tokenHash: {
    type: String,
    required: true,
    unique: true
  },
  expiresAt: {
    type: Date,
    required: true
  }
});

PasswordResetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const PasswordResetTokenModel = mongoose.model<IPasswordResetToken>('PasswordResetToken', PasswordResetTokenSchema);
