const express = require('express');
const router = express.Router();
const admin = require('../controllers/admin');
const catchAsync = require('../utils/catchAsync');
const ExpressError = require('../utils/ExpressError');
const { isLoggedIn, isAdmin, validateProduct } = require('../middleware');

router.route('/products')
    .get(isLoggedIn, isAdmin, catchAsync(admin.renderProducts))
    .put(isLoggedIn, isAdmin, validateProduct, catchAsync(admin.updateProduct))
    .delete(isLoggedIn, isAdmin, catchAsync(admin.deleteProduct));

router.route('/customers')
    .get(isLoggedIn, isAdmin, catchAsync(admin.renderCustomers));

router.route('/orders')
    .get(isLoggedIn, isAdmin, catchAsync(admin.renderOrders));

module.exports = router;