"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteCategory = exports.updateCategory = exports.createCategory = exports.getAllCategories = void 0;
const blog_model_1 = require("../models/blog.model");
const errors_1 = require("../utils/errors");
const getAllCategories = async (req, res, next) => {
    try {
        const categories = await blog_model_1.CategoryModel.find().sort({ name: 1 });
        res.status(200).json({
            success: true,
            data: categories,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getAllCategories = getAllCategories;
const createCategory = async (req, res, next) => {
    try {
        const { name, slug, description } = req.body;
        const existing = await blog_model_1.CategoryModel.findOne({ slug });
        if (existing) {
            throw new errors_1.ApiError(400, 'Category with this slug already exists');
        }
        const category = await blog_model_1.CategoryModel.create({
            name,
            slug,
            description
        });
        res.status(201).json({
            success: true,
            data: category,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.createCategory = createCategory;
const updateCategory = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, slug, description } = req.body;
        const category = await blog_model_1.CategoryModel.findByIdAndUpdate(id, { name, slug, description }, { new: true, runValidators: true });
        if (!category) {
            throw new errors_1.ApiError(404, 'Category not found');
        }
        res.status(200).json({
            success: true,
            data: category,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.updateCategory = updateCategory;
const deleteCategory = async (req, res, next) => {
    try {
        const { id } = req.params;
        // Optional logic: Check if any blogs use this category before deleting?
        // For now, simple delete.
        const category = await blog_model_1.CategoryModel.findByIdAndDelete(id);
        if (!category) {
            throw new errors_1.ApiError(404, 'Category not found');
        }
        res.status(200).json({
            success: true,
            data: {},
            message: 'Category deleted successfully'
        });
    }
    catch (error) {
        next(error);
    }
};
exports.deleteCategory = deleteCategory;
