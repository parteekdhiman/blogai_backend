"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generate = void 0;
const ai_service_1 = require("../services/ai.service");
const errors_1 = require("../utils/errors");
const generate = async (req, res, next) => {
    try {
        const { prompt, systemPrompt, type } = req.body;
        if (!prompt) {
            throw new errors_1.ApiError(400, 'Prompt is required');
        }
        let result;
        let images = [];
        let image = ''; // Keep for backward compatibility
        if (type === 'ideas') {
            result = await ai_service_1.aiService.generateBlogIdeas(prompt);
        }
        else {
            // Parallelize text generation and image search
            // Fetch 8 images for selection
            const [text, imgs] = await Promise.all([
                ai_service_1.aiService.generateText(prompt, systemPrompt),
                ai_service_1.aiService.searchImage(prompt, 8)
            ]);
            result = text;
            images = imgs;
            image = imgs.length > 0 ? imgs[0] : '';
        }
        res.status(200).json({
            success: true,
            data: {
                content: result,
                image: image, // Primary image (first one)
                images: images // All fetched images
            },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.generate = generate;
