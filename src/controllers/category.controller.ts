import { Request, Response, NextFunction } from 'express';
import { CategoryModel } from '@models/blog.model';
import { ApiError } from '@utils/errors';

export const getAllCategories = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const categories = await CategoryModel.find().sort({ name: 1 });
    res.status(200).json({
      success: true,
      data: categories,
    });
  } catch (error) {
    next(error);
  }
};

export const createCategory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, slug, description } = req.body;

    const existing = await CategoryModel.findOne({ slug });
    if (existing) {
        throw new ApiError(400, 'Category with this slug already exists');
    }

    const category = await CategoryModel.create({
        name,
        slug,
        description
    });

    res.status(201).json({
      success: true,
      data: category,
    });
  } catch (error) {
    next(error);
  }
};

export const updateCategory = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const { name, slug, description } = req.body;

        const category = await CategoryModel.findByIdAndUpdate(
            id,
            { name, slug, description },
            { new: true, runValidators: true }
        );

        if (!category) {
            throw new ApiError(404, 'Category not found');
        }

        res.status(200).json({
            success: true,
            data: category,
        });
    } catch (error) {
        next(error);
    }
};

export const deleteCategory = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;

        // Optional logic: Check if any blogs use this category before deleting?
        // For now, simple delete.

        const category = await CategoryModel.findByIdAndDelete(id);

        if (!category) {
            throw new ApiError(404, 'Category not found');
        }

        res.status(200).json({
            success: true,
            data: {},
            message: 'Category deleted successfully'
        });
    } catch (error) {
        next(error);
    }
};
