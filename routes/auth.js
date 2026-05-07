const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ChatbotConfig = require('../models/ChatbotConfig');
const authMiddleware = require('../middleware/auth');

// Generate JWT Token
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, email: user.email },
    process.env.JWT_SECRET || 'super_secret_jwt_token_for_saas_platform_12345',
    { expiresIn: '7d' }
  );
};

// @route   POST /api/auth/register
// @desc    Register user & create default chatbot config
router.post('/register', async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({ message: 'Please enter all fields' });
    }

    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: 'User already exists' });
    }

    user = new User({ email, password });
    await user.save();

    // Generate Default Chatbot Settings for this user
    const defaultConfig = new ChatbotConfig({
      userId: user._id,
      businessName: email.split('@')[0].toUpperCase() + ' Help',
      supportEmail: email,
      tone: 'friendly'
    });
    await defaultConfig.save();

    const token = generateToken(user);
    res.status(201).json({
      token,
      user: { id: user._id, email: user.email }
    });
  } catch (err) {
    console.error('Register error:', err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({ message: 'Please enter all fields' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = generateToken(user);
    res.json({
      token,
      user: { id: user._id, email: user.email }
    });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET /api/auth/me
// @desc    Get user data
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
