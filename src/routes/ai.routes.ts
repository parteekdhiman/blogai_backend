import express from 'express';

import * as aiController from '@controllers/ai.controller';

const router = express.Router();

router.post('/generate', aiController.generate);

export default router;
