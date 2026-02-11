"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadImage = void 0;
const cloudinary_1 = __importDefault(require("../config/cloudinary"));
const errors_1 = require("../utils/errors");
const stream_1 = require("stream");
const uploadImage = async (req, res, next) => {
    try {
        if (!req.file) {
            throw new errors_1.ApiError(400, 'Please upload a file');
        }
        const file = req.file;
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const publicId = `blog_app/${uniqueSuffix}`;
        // Upload using stream (buffers from memoryStorage)
        const streamUpload = (buffer) => {
            return new Promise((resolve, reject) => {
                const stream = cloudinary_1.default.uploader.upload_stream({
                    public_id: publicId,
                    folder: 'ai_blog_platform',
                }, (error, result) => {
                    if (result) {
                        resolve(result);
                    }
                    else {
                        reject(error);
                    }
                });
                stream_1.Readable.from(buffer).pipe(stream);
            });
        };
        const result = await streamUpload(file.buffer);
        res.status(200).json({
            success: true,
            data: {
                url: result.secure_url,
                publicId: result.public_id,
            },
            message: 'Image uploaded successfully'
        });
    }
    catch (error) {
        next(error);
    }
};
exports.uploadImage = uploadImage;
