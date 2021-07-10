const express = require('express');
const router = express.Router();
const products = require('../controllers/products');
const catchAsync = require('../utils/catchAsync');
const Product = require('../models/product');
const { isLoggedIn, validateProduct, isAdmin } = require('../middleware');
const { cloudinary, storage } = require('../cloudinary'); //
const multer = require('multer');
const upload = multer({ storage });

router.route('/')
    .get(catchAsync(products.index))
    .post(isLoggedIn, isAdmin, upload.single('imageUpload'), catchAsync(products.createNewproduct));

router.get('/new', isLoggedIn, isAdmin, products.renderNewProduct);

router.route('/:id')
    .get(catchAsync(products.showProduct))
    .post(isLoggedIn, catchAsync(products.addProduct))
    .put(isLoggedIn, isAdmin, validateProduct, upload.single('imageUpload'), catchAsync(products.editProduct))
    .delete(isLoggedIn, isAdmin, catchAsync(products.deleteProduct));

router.get('/:id/edit', isLoggedIn, isAdmin, catchAsync(products.renderEditProduct));

module.exports = router;