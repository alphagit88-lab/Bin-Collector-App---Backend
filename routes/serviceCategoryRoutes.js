const express = require('express');
const router = express.Router();
const serviceCategoryController = require('../controllers/serviceCategoryController');
const { authenticate, verifyRole } = require('../middleware/authMiddleware');

// Public route to get all categories (for customers to pick)
router.get('/', serviceCategoryController.getAllCategories);

// Protected routes (admin only)
router.post('/', authenticate, verifyRole(['admin']), serviceCategoryController.createCategory);
router.get('/:id', authenticate, verifyRole(['admin']), serviceCategoryController.getCategoryById);
router.put('/:id', authenticate, verifyRole(['admin']), serviceCategoryController.updateCategory);
router.delete('/:id', authenticate, verifyRole(['admin']), serviceCategoryController.deleteCategory);

module.exports = router;
