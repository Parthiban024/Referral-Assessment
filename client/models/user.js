// models/User.js
const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  referralCode: {
    type: String,
    unique: true,
  },
  referredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Referencing the User model itself
  },
});

// Generate referral code and populate referredBy before saving user
UserSchema.pre('save', async function(next) {
  if (!this.referralCode) {
    this.referralCode = generateReferralCode();
  }
  if (this.referredByCode) {
    const referrer = await this.constructor.findOne({ referralCode: this.referredByCode });
    if (referrer) {
      this.referredBy = referrer._id;
    }
  }
  next();
});

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

module.exports = mongoose.model('UserNewRef', UserSchema); // Change model name to 'User'
