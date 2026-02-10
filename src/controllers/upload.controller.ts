import { Request, Response, NextFunction } from 'express';
import cloudinary from '@config/cloudinary';
import { ApiError } from '@utils/errors';
import { Readable } from 'stream';

export const uploadImage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      throw new ApiError(400, 'Please upload a file');
    }

    const file = req.file;
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const publicId = `blog_app/${uniqueSuffix}`;

    // Upload using stream (buffers from memoryStorage)
    const streamUpload = (buffer: Buffer) => {
        return new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
                {
                    public_id: publicId,
                    folder: 'ai_blog_platform',
                },
                (error, result) => {
                    if (result) {
                        resolve(result);
                    } else {
                        reject(error);
                    }
                }
            );
            Readable.from(buffer).pipe(stream);
        });
    };

    const result: any = await streamUpload(file.buffer);

    res.status(200).json({
      success: true,
      data: {
        url: result.secure_url,
        publicId: result.public_id,
      },
      message: 'Image uploaded successfully'
    });

  } catch (error) {
    next(error);
  }
};
