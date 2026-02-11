"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const validation_1 = require("@/middleware/validation");
const validators_1 = require("@/utils/validators");
const blog_controller_1 = require("@/controllers/blog.controller");
const auth_1 = require("@/middleware/auth");
const router = express_1.default.Router();
/**
 * Public Routes
 */
/**
 * Public Routes
 */
router.get('/', auth_1.optionalAuth, blog_controller_1.getBlogs);
router.get('/:slug', auth_1.optionalAuth, blog_controller_1.getBlogBySlug);
/**
 * Protected Routes
 */
router.post('/', auth_1.authenticate, (0, validation_1.validate)(validators_1.createBlogSchema), blog_controller_1.createBlog);
exports.default = router;
