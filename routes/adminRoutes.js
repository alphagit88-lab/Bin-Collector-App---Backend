const express = require('express');
const router = express.Router();
const {
  createAdmin,
  createUser,
  getAllAdmins,
  getUsersByRole,
  updateAdmin,
  updateUser,
  deleteAdmin,
  deleteUser,
} = require('../controllers/adminController');
const { authenticate, requireAdmin } = require('../middleware/authMiddleware');

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(requireAdmin);

router.post('/', createAdmin);
router.post('/users', createUser);
router.get('/', getAllAdmins);
router.get('/users/:role', getUsersByRole);
router.put('/:id', updateAdmin);
router.put('/users/:id', updateUser);
router.delete('/:id', deleteAdmin);
router.delete('/users/:id', deleteUser);

module.exports = router;
