import { Request, Response, NextFunction } from 'express';
import { aiService } from '@services/ai.service';
import { ApiError } from '@utils/errors';

export const generate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { prompt, systemPrompt, type } = req.body;

    if (!prompt) {
      throw new ApiError(400, 'Prompt is required');
    }

    let result;
    let images: string[] = [];
    let image = ''; // Keep for backward compatibility

    if (type === 'ideas') {
        result = await aiService.generateBlogIdeas(prompt);
    } else {
        // Parallelize text generation and image search
        // Fetch 8 images for selection
        const [text, imgs] = await Promise.all([
          aiService.generateText(prompt, systemPrompt),
          aiService.searchImage(prompt, 8)
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
  } catch (error) {
    next(error);
  }
};
