"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.BlogModel = exports.BlogStatus = exports.CommentModel = exports.CategoryModel = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const CategorySchema = new mongoose_1.Schema({
    name: { type: String, required: true, unique: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: String
}, { timestamps: true });
exports.CategoryModel = mongoose_1.default.model('Category', CategorySchema);
const CommentSchema = new mongoose_1.Schema({
    content: { type: String, required: true },
    blog: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Blog', required: true, index: true },
    author: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    deletedAt: Date
}, { timestamps: true });
exports.CommentModel = mongoose_1.default.model('Comment', CommentSchema);
// ---------------------------------------------------------
// Blog Schema
// ---------------------------------------------------------
var BlogStatus;
(function (BlogStatus) {
    BlogStatus["DRAFT"] = "DRAFT";
    BlogStatus["PUBLISHED"] = "PUBLISHED";
})(BlogStatus || (exports.BlogStatus = BlogStatus = {}));
const BlogSchema = new mongoose_1.Schema({
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
    author: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    categories: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'Category' }], // Array of references
    publishedAt: Date,
    deletedAt: Date
}, { timestamps: true });
// Text Index for Search
BlogSchema.index({ title: 'text', content: 'text', tags: 'text' });
exports.BlogModel = mongoose_1.default.model('Blog', BlogSchema);
