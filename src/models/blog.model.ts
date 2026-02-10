import mongoose, { Schema, Document } from 'mongoose';

// ---------------------------------------------------------
// Category Schema
// ---------------------------------------------------------
export interface ICategory extends Document {
  name: string;
  slug: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CategorySchema = new Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: String
  },
  { timestamps: true }
);

export const CategoryModel = mongoose.model<ICategory>('Category', CategorySchema);

// ---------------------------------------------------------
// Comment Schema
// ---------------------------------------------------------
export interface IComment extends Document {
  content: string;
  blog: mongoose.Types.ObjectId;
  author: mongoose.Types.ObjectId;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const CommentSchema = new Schema(
  {
    content: { type: String, required: true },
    blog: { type: Schema.Types.ObjectId, ref: 'Blog', required: true, index: true },
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    deletedAt: Date
  },
  { timestamps: true }
);

export const CommentModel = mongoose.model<IComment>('Comment', CommentSchema);

// ---------------------------------------------------------
// Blog Schema
// ---------------------------------------------------------
export enum BlogStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED'
}

export interface IBlog extends Document {
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  coverImage?: string;
  status: BlogStatus;
  metaTitle?: string;
  metaDescription?: string;
  keywords: string[];
  tags: string[];
  readTime?: number;
  viewCount: number;
  aiGenerated: boolean;
  aiModel?: string;
  originalPrompt?: string;
  author: mongoose.Types.ObjectId;
  categories: mongoose.Types.ObjectId[]; // Stored as Array of IDs (References)
  publishedAt?: Date;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const BlogSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, index: true },
    content: { type: String, required: true },
    excerpt: String,
    coverImage: String,
    status: {
      type: String,
      enum: Object.values(BlogStatus),
      default: BlogStatus.DRAFT,
      index: true
    },
    metaTitle: String,
    metaDescription: String,
    keywords: [String],
    tags: [String],
    readTime: Number,
    viewCount: { type: Number, default: 0 },
    
    // AI Fields
    aiGenerated: { type: Boolean, default: false },
    aiModel: String,
    originalPrompt: String,

    // Relations
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    categories: [{ type: Schema.Types.ObjectId, ref: 'Category' }], // Array of references

    publishedAt: Date,
    deletedAt: Date
  },
  { timestamps: true }
);

// Text Index for Search
BlogSchema.index({ title: 'text', content: 'text', tags: 'text' });

export const BlogModel = mongoose.model<IBlog>('Blog', BlogSchema);
