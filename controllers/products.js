const Product = require('../models/product');
const { cloudinary, storage } = require('../cloudinary');

module.exports.index = async (req, res) => {
    const { category } = req.query;
    let products;
    if (category == null) {
        products = await Product.find({});
    } else {
        products = await Product.find({ category: category })
    }
    if (products.length == 0) {
        req.flash('error', 'The content you requested does not exist.')
        res.redirect('/products')
    }
    res.render('product/index', { products, category })
};

module.exports.renderNewProduct = (req, res) => {
    res.render('product/new')
};

module.exports.createNewProduct = async (req, res) => {
    // ADD VALIDATEPRODUCT MIDDLEWARE
    delete req.session.returnTo;
    const product = new Product(req.body.product);
    if (req.file) {
        // console.log(req.file)
        product.image = { url: req.file.path, filename: req.file.filename };
    } else {
        product.image = { url: req.body.product.image }
    }
    await product.save();
    res.redirect(`/products/${product._id}`)
};

module.exports.showProduct = async (req, res) => {
    const { id } = req.params;
    const product = await Product.findById(id);
    // TODO: Add catch error not found
    res.render('product/show', { product })
};

module.exports.addProduct = async (req, res) => {
    const { id } = req.params;
    let qty = req.body.qty;
    if (!qty) {
        qty = 1;
    }
    const product = await Product.findById(id);
    const currentUser = req.user;
    const cartIndex = currentUser.cart.findIndex(item => item.product == id);
    if (cartIndex === -1) {
        currentUser.cart.push({ product: product, qty: parseInt(qty) });
    } else {
        currentUser.cart[cartIndex].qty += parseInt(qty);
    }
    await currentUser.save();
    req.flash('success', 'Successfully added product to cart!');
    const redirectUrl = req.session.returnTo || `/products/${id}`;
    // console.log(req.session.returnTo);
    delete req.session.returnTo;
    res.redirect(redirectUrl)
};

module.exports.deleteProduct = async (req, res) => {
    const { id } = req.params;
    await Product.findByIdAndDelete(id);
    req.flash('success', 'Successfully deleted product!')
    res.redirect('/products')
};

module.exports.renderEditProduct = async (req, res) => {
    const { id } = req.params;
    const product = await Product.findById(id);
    // console.log(product.image.filename == null)
    res.render('product/edit', { product })
};

module.exports.editProduct = async (req, res) => {
    // const { id } = req.params;
    // const product = await Product.findByIdAndUpdate(id, { ...req.body.product }, { new: true });
    // await product.save();
    // req.flash('success', 'Successfully updated product!');
    // res.redirect(`/products/${product._id}`)

    const { id } = req.params;
    const product = await Product.findByIdAndUpdate(id, { ...req.body.product }, { new: true });
    if (req.body.imageMethod == 'URL') {
        product.image = { url: req.body.imageURL, filename: ''};
    } else {
        product.image = { url: req.file.path, filename: req.file.filename }
    }
    await product.save();
    req.flash('success', 'Successfully updated product!');
    res.redirect(`/products/${product._id}`)
};