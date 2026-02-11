"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPublicStats = void 0;
const user_model_1 = __importDefault(require("@models/user.model"));
const blog_model_1 = require("@models/blog.model");
/**
 * Controller for fetching public stats for the About page.
 */
const getPublicStats = async (req, res, next) => {
    try {
        const totalUsers = await user_model_1.default.countDocuments();
        const totalBlogs = await blog_model_1.BlogModel.countDocuments({ status: blog_model_1.BlogStatus.PUBLISHED });
        const blogStats = await blog_model_1.BlogModel.aggregate([
            { $match: { status: blog_model_1.BlogStatus.PUBLISHED } },
            { $group: { _id: null, totalViews: { $sum: '$viewCount' } } }
        ]);
        const totalViews = blogStats.length > 0 ? blogStats[0].totalViews : 0;
        // Derived metric: approximate hours saved (e.g., 2 hours per blog)
        const hoursSaved = totalBlogs * 2;
        res.json({
            success: true,
            data: {
                totalUsers,
                totalBlogs,
                totalViews,
                hoursSaved
            }
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getPublicStats = getPublicStats;
