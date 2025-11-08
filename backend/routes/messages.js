const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const {
  getMessages,
  getMessage,
  editMessage,
  deleteMessage,
  addReaction,
  removeReaction,
  votePoll,
} = require('../controllers/messageController');

// All routes require authentication
router.use(authenticate);

// Validation
const editMessageValidation = [
  body('content')
    .trim()
    .isLength({ min: 1, max: 5000 })
    .withMessage('Message content must be between 1 and 5000 characters'),
];

// Routes
router.get('/group/:groupId', getMessages);
router.get('/:messageId', getMessage);
router.put('/:messageId', editMessageValidation, editMessage);
router.delete('/:messageId', deleteMessage);
router.post('/:messageId/reactions', body('emoji').notEmpty(), addReaction);
router.delete('/:messageId/reactions', body('emoji').notEmpty(), removeReaction);
router.post('/:messageId/vote', body('optionIndex').isInt({ min: 0 }), votePoll);

module.exports = router;

