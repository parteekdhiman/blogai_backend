"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProfile = exports.getProfile = void 0;
const user_model_1 = __importDefault(require("@models/user.model"));
const errors_1 = require("@utils/errors");
const getProfile = async (req, res, next) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            throw new errors_1.ApiError(401, 'User not authenticated');
        }
        const user = await user_model_1.default.findById(userId);
        if (!user) {
            throw new errors_1.ApiError(404, 'User not found');
        }
        res.status(200).json({
            success: true,
            data: user,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getProfile = getProfile;
const updateProfile = async (req, res, next) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            throw new errors_1.ApiError(401, 'User not authenticated');
        }
        const { name, bio, image } = req.body;
        const user = await user_model_1.default.findByIdAndUpdate(userId, { name, bio, image }, { new: true, runValidators: true });
        if (!user) {
            throw new errors_1.ApiError(404, 'User not found');
        }
        res.status(200).json({
            success: true,
            data: user,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.updateProfile = updateProfile;
