const bcrypt = require('bcrypt');
const config = require('../config');

async function hashPassword(password) {
  return await bcrypt.hash(password, config.bcrypt.saltRounds);
}

async function comparePassword(plain, hashed) {
  return await bcrypt.compare(plain, hashed);
}

const PASSWORD_RULES = {
  minLength: 8,
  hasUpperCase: /[A-Z]/,
  hasLowerCase: /[a-z]/,
  hasNumber: /[0-9]/,
};

function validatePasswordStrength(password) {
  if (password.length < PASSWORD_RULES.minLength) {
    return { valid: false, message: `Password must be at least ${PASSWORD_RULES.minLength} characters` };
  }
  if (!PASSWORD_RULES.hasUpperCase.test(password)) {
    return { valid: false, message: 'Password must contain at least one uppercase letter' };
  }
  if (!PASSWORD_RULES.hasLowerCase.test(password)) {
    return { valid: false, message: 'Password must contain at least one lowercase letter' };
  }
  if (!PASSWORD_RULES.hasNumber.test(password)) {
    return { valid: false, message: 'Password must contain at least one number' };
  }
  return { valid: true, message: '' };
}

module.exports = {
  hashPassword,
  comparePassword,
  validatePasswordStrength,
  PASSWORD_RULES,
};
