import mongoose, { Schema, Document } from 'mongoose';

export enum Role {
  USER = 'USER',
  ADMIN = 'ADMIN'
}

export interface IUser extends Document {
  email: string;
  password?: string;
  name?: string;
  image?: string;
  bio?: string;
  role: Role;
  emailVerified?: Date;
  lastLoginAt?: Date;
  loginCount: number;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  // Virtuals
  blogs?: any[];
}

const UserSchema: Schema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true
    },
    password: {
      type: String,
      select: false // Don't return password by default
    },
    name: {
      type: String,
      trim: true
    },
    image: String,
    bio: String,
    role: {
      type: String,
      enum: Object.values(Role),
      default: Role.USER
    },
    emailVerified: Date,
    lastLoginAt: Date,
    loginCount: {
      type: Number,
      default: 0
    },
    deletedAt: Date
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes
// Removed duplicate index warning
UserSchema.index({ googleId: 1 }); // Anticipating OAuth

// Virtual for blogs
UserSchema.virtual('blogs', {
  ref: 'Blog',
  localField: '_id',
  foreignField: 'author'
});

export default mongoose.model<IUser>('User', UserSchema);
