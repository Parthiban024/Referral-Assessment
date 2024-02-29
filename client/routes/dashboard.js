// routes/dashboard.js

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Referral = require('../models/Referral');


router.get('/', auth, async (req, res) => {
  try {
    const userReferrals = await Referral.find({ referrer: req.user.id });
    const totalReferrals = userReferrals.length;
    const successfulReferrals = userReferrals.filter(ref => ref.referredUser).length;
    res.json({ totalReferrals, successfulReferrals });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
