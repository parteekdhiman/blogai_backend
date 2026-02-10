import { Request, Response, NextFunction } from 'express';
import UserModel from '@models/user.model';
import { BlogModel, BlogStatus } from '@models/blog.model';

/**
 * Controller for fetching public stats for the About page.
 */
export const getPublicStats = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const totalUsers = await UserModel.countDocuments();
    const totalBlogs = await BlogModel.countDocuments({ status: BlogStatus.PUBLISHED });
    
    const blogStats = await BlogModel.aggregate([
      { $match: { status: BlogStatus.PUBLISHED } },
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
  } catch (error) {
    next(error);
  }
};
