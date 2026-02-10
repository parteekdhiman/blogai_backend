import express from 'express';

import { upload } from '@middleware/upload';
import * as uploadController from '@controllers/upload.controller';
import { authenticate } from '@middleware/auth';

const router = express.Router();

// Protect upload route
router.post('/', authenticate, upload.single('image'), uploadController.uploadImage);

export default router;
