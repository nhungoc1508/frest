const express = require('express');
const router = express.Router();
const passport = require('passport');
const customers = require('../controllers/customers');
const catchAsync = require('../utils/catchAsync');
const ExpressError = require('../utils/ExpressError');
const Product = require('../models/product');
const { isLoggedIn, isLoggedOut } = require('../middleware');
const User = require('../models/user');

router.route('/login')
    .get(isLoggedOut, customers.renderLogin)
    .post(isLoggedOut, passport.authenticate('local', { failureFlash: true, failureRedirect: '/login' }), customers.login);

router.route('/register')
    .get(isLoggedOut, customers.renderRegister)
    .post(isLoggedOut, catchAsync(customers.register));

router.route('/cart')
    .get(isLoggedIn, catchAsync(customers.renderCart))
    .post(isLoggedIn, catchAsync(customers.updateCart));

router.route('/checkout')
    .get(isLoggedIn, catchAsync(customers.renderCheckout))
    .post(isLoggedIn, catchAsync(customers.checkout));

router.get('/logout', isLoggedIn, customers.logout);

router.route('/info')
    .get(isLoggedIn, catchAsync(customers.renderInfo))
    .put(isLoggedIn, catchAsync(customers.updateInfo))
    .post(isLoggedIn, catchAsync(customers.updateAddress));

router.get('/search')
    .get(catchAsync(customers.renderSearch))
    .post(customers.search);

module.exports = router;