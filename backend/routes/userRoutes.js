const express = require('express');
const { getAllUsers, updateUser, deleteUser } = require('../controllers/userController');
const { protect, admin } = require('../middleware/auth');

const router = express.Router();

// All routes here are restricted to logged-in administrators
router.use(protect, admin);

router.get('/', getAllUsers);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);

module.exports = router;
