import express from 'express';
import ChatController from './chat.controller';
import { authMiddleware } from '../../middlewares/auth';

const router = express.Router();

// Everything here is scoped to the caller's own threads by ChatService — there
// is no admin override, because reading other people's messages is not a
// feature anyone asked for.
router.use(authMiddleware);

router.get('/unread-count', ChatController.unreadCount);
router.get('/', ChatController.listMine);
router.post('/open', ChatController.open);
router.get('/:id', ChatController.getOne);
router.get('/:id/messages', ChatController.messages);
router.post('/:id/messages', ChatController.send);
router.patch('/:id/read', ChatController.markRead);
router.patch('/:id/archive', ChatController.archive);

export const ChatRoutes = router;
