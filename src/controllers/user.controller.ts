import { Request, Response, NextFunction } from 'express';
import UserModel from '@models/user.model';
import { ApiError } from '@utils/errors';

export const getProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
        throw new ApiError(401, 'User not authenticated');
    }

    const user = await UserModel.findById(userId);
    if (!user) {
        throw new ApiError(404, 'User not found');
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
        throw new ApiError(401, 'User not authenticated');
    }

    const { name, bio, image } = req.body;

    const user = await UserModel.findByIdAndUpdate(
      userId, 
      { name, bio, image },
      { new: true, runValidators: true }
    );

    if (!user) {
        throw new ApiError(404, 'User not found');
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};
