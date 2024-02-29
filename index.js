// server.js

const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require('bcrypt');
const { check, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const config = require('config');
const User = require('./models/user');
const path = require('path');
const app = express();

// Middleware
app.use(bodyParser.json());
app.use(cors());
// MongoDB Configuration
const dbURI = 'mongodb+srv://ParthiGMR:Parthiban7548@parthibangmr.1quwer2.mongodb.net/empmonit';
mongoose.connect(dbURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log(err));

  const auth = (req, res, next) => {
    // Get token from header
    const token = req.header('x-auth-token');
  
    // Check if token doesn't exist
    if (!token) {
      return res.status(401).json({ msg: 'No token, authorization denied' });
    }
  
    try {
      // Verify token
      const decoded = jwt.verify(token, config.get('jwtSecret'));
  
      // Add user from payload
      req.user = decoded.user;
      next();
    } catch (err) {
      res.status(400).json({ msg: 'Token is not valid' });
    }
  };


// Registration
app.post('/api/auth/register', [
    check('name', 'Please enter a username').not().isEmpty(),
    check('email', 'Please enter a valid email').isEmail(),
    check('password', 'Please enter a password with 6 or more characters').isLength({ min: 6 })
  ], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
  
    const { name, email, password, referralCode } = req.body;
  
    try {
      let user = await User.findOne({ email });
      if (user) {
        return res.status(400).json({ msg: 'User already exists' });
      }
  
      // Hash the password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
  
      user = new User({ name, email, password: hashedPassword });
      
      // Check if a referral code is provided
      if (referralCode) {
        // Find the referrer
        const referrer = await User.findOne({ referralCode });
        if (referrer) {
          // Update the referrer's balance with the reward amount (e.g., 10% of a certain value)
          // Adjust the reward calculation according to your requirements
          referrer.balance += 0.1 * YOUR_REWARD_VALUE;
          await referrer.save();
        }
      }

      await user.save();
  
      res.status(200).json({ msg: 'User registered successfully' });
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  });


app.post(
    '/api/auth/login',
    [
      // Validation checks for user input
      check('email', 'Please include a valid email').isEmail(),
      check('password', 'Password is required').exists()
    ],
    async (req, res) => {
      // Check if there are any validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
  
      const { email, password } = req.body;
  
      try {
        // Check if user exists
        let user = await User.findOne({ email });
  
        if (!user) {
          return res.status(400).json({ errors: [{ msg: 'Invalid credentials' }] });
        }
  
        // Check if the provided password matches the user's password
        const isMatch = await bcrypt.compare(password, user.password);
  
        if (!isMatch) {
          return res.status(400).json({ errors: [{ msg: 'Invalid credentials' }] });
        }
  
        // Return JWT token
        const payload = {
          user: {
            id: user.id
          }
        };
  
        jwt.sign(
          payload,
          config.get('jwtSecret'),
          { expiresIn: 3600 }, // Token expires in 1 hour (adjust as needed)
          (err, token) => {
            if (err) throw err;
            res.json({ token });
          }
        );
      } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
      }
    }
  );

  // Referral Tracking
app.post('/track', async (req, res) => {
    const { referralCode } = req.body;
  
    try {
      const referrer = await User.findOne({ referralCode });
  
      if (!referrer) {
        return res.status(404).json({ msg: 'Referral code not found' });
      }
  
      // Implement logic to track successful referrals
  
      res.json({ msg: 'Referral tracked successfully' });
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  });


// Referral Tracking Endpoint
app.post('/api/referral/track', auth, async (req, res) => {
    const { referralCode } = req.body;

    try {
        // Find the user associated with the referral code
        const referrer = await User.findOne({ referralCode });

        if (!referrer) {
            return res.status(404).json({ msg: 'Referral code not found' });
        }

        // Update the new user's referredBy field with the referrer's ID
        const newUser = await User.findByIdAndUpdate(req.user.id, { referredBy: referrer._id }, { new: true });

        if (!newUser) {
            return res.status(404).json({ msg: 'User not found' });
        }

        // Implement your reward calculation logic here
        // For example, you can calculate 10% of a certain value as the reward
        const rewardAmount = calculateReward(newUser);

        // Update the referrer's account balance or points with the reward amount
        referrer.balance += rewardAmount; // Assuming referrer has a balance property

        // Save the updated referrer object
        await referrer.save();

        // Save the updated new user object
        await newUser.save();

        res.json({ msg: 'Referral tracked successfully', rewardAmount });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Function to calculate the reward amount (10% of a certain value)
function calculateReward(newUser) {
    // Implement your reward calculation logic here
    // For example, you can calculate 10% of a certain value
    // Here, we assume that the reward is 10% of a fixed value (e.g., 100)
    const rewardPercentage = 0.1; // 10%
    const fixedValue = 100; // Example value
    return fixedValue * rewardPercentage;
}


  

  

// Function to generate unique referral code
function generateReferralCode() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const codeLength = 6;
    let referralCode = '';
  
    for (let i = 0; i < codeLength; i++) {
      referralCode += characters.charAt(Math.floor(Math.random() * characters.length));
    }
  
    return referralCode;
}

// POST route to generate a unique referral code
app.post('/generate', (req, res) => {
    try {
      const referralCode = generateReferralCode();
      res.json({ referralCode });
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
});





  
  
  
// Referral Tracking
app.post('/track', auth, async (req, res) => {
    const { referralCode } = req.body;
    const referringUserId = req.user.id; // Get the ID of the user making the referral
  
    try {
      const referrer = await User.findOne({ referralCode });
  
      if (!referrer) {
        return res.status(404).json({ msg: 'Referral code not found' });
      }
  
      // Create a new referral record
      const newReferral = new Referral({
        referringUser: referringUserId,
        referredUser: referrer._id // Save the ID of the user being referred
      });
  
      // Save the referral record to the database
      await newReferral.save();
  
      res.json({ msg: 'Referral tracked successfully' });
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  });
  

  // Dashboard - Get referral statistics
app.get('/referral/stats', async (req, res) => {
    try {
      // Retrieve total number of users
      const totalUsers = await User.countDocuments();
  
      // Retrieve total number of users with referral codes
      const usersWithReferralCodes = await User.countDocuments({ referralCode: { $exists: true, $ne: null } });
  
      // Implement your logic to track successful referrals
      // For example, you can count the number of users who have successfully referred others
      const successfulReferrals = await User.countDocuments({ referredBy: { $exists: true, $ne: null } });
  
      // Return referral statistics
      res.json({
        totalUsers,
        usersWithReferralCodes,
        successfulReferrals,
        // Add additional statistics here based on your requirements
      });
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  });


// Apply auth middleware to routes that require authentication
app.get('/referral-code', auth, async (req, res) => {
    try {
      // Fetch the user's referral code
      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ msg: 'User not found' });
      }
  
      // Ensure that the user has a referral code
      if (!user.referralCode) {
        return res.status(404).json({ msg: 'Referral code not found for this user' });
      }

      res.json({ referralCode: user.referralCode });
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  });


// Serve static files from the React build directory
app.use(express.static(path.join(__dirname, 'referral-program-frontend/build')));

// Handle requests to root URL by serving the index.html file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '/referral-program-frontend/build', 'index.html'));
});
  
  
// Start Server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
