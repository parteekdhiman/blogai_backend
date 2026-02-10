import express from 'express';

import { authenticate } from '@middleware/auth';
import * as userController from '@controllers/user.controller';

const router = express.Router();

router.get('/profile', authenticate, userController.getProfile);
router.patch('/profile', authenticate, userController.updateProfile);

export default router;
