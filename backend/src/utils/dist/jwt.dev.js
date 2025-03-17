"use strict";

// utils/jwt.js
var jwt = require('jsonwebtoken');

var generateToken = function generateToken(userId) {
  return jwt.sign({
    id: userId
  }, // Using 'id' instead of '_id'
  process.env.JWT_SECRET, {
    expiresIn: '24h'
  });
};

module.exports = {
  generateToken: generateToken
};