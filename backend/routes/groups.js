const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const {
  createGroup,
  getUserGroups,
  getGroup,
  joinGroup,
  leaveGroup,
  addMember,
  removeMember,
  updateGroup,
} = require('../controllers/groupController');

// All routes require authentication
router.use(authenticate);

// Validation
const createGroupValidation = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Group name must be between 1 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters'),
];

// Routes
router.post('/', createGroupValidation, createGroup);
router.get('/', getUserGroups);
router.get('/:groupId', getGroup);
router.post('/:groupId/join', joinGroup);
router.post('/:groupId/leave', leaveGroup);
router.post('/:groupId/members', body('userId').notEmpty(), addMember);
router.delete('/:groupId/members/:memberId', removeMember);
router.put('/:groupId', createGroupValidation, updateGroup);

module.exports = router;

