import express from 'express';

import * as categoryController from '@controllers/category.controller';
import { authenticate, authorize } from '@middleware/auth';
import { Role } from '@models/user.model';

const router = express.Router();

router.get('/', categoryController.getAllCategories);
router.post('/', authenticate, authorize(Role.ADMIN), categoryController.createCategory);
router.patch('/:id', authenticate, authorize(Role.ADMIN), categoryController.updateCategory);
router.delete('/:id', authenticate, authorize(Role.ADMIN), categoryController.deleteCategory);

export default router;
