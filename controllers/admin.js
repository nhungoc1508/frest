const Product = require('../models/product');
const User = require('../models/user');

module.exports.renderProducts = async (req, res) => {
    const products = await Product.find({});
    const categories = ['beverages', 'dairy', 'desserts', 'dry goods', 'fruits', 'vegetables', 'meat'];
    res.render('admin/manage-products', { products, categories })
};

module.exports.updateProduct = async (req, res) => {
    const productId = req.query.product;
    // console.log(req.body.product);
    const { name, price, stock, discount } = req.body.product;
    const product = await Product.findByIdAndUpdate(productId, { name, price, stock, discount }, { new: true });
    await product.save();
    req.flash('success', `Successfully updated ${product.name}!`);
    res.redirect('/manage/products')
};

module.exports.deleteProduct = async (req, res) => {
    const id = req.query.product;
    const product = await Product.findById(id);
    const productName = product.name;
    await Product.findByIdAndDelete(id);
    req.flash('success', `Successfully deleted ${productName}!`);
    res.redirect('/manage/products')
};

module.exports.renderCustomers = async (req, res) => {
    // const customers = await User.find({ role: { $ne: 'admin' } }).populate('orders')
    const customers = await User.find({}).populate('orders')
    res.render('admin/manage-customers', { customers })
};

module.exports.renderOrders = async (req, res) => {
    const orders = await Order.find()
        .populate('customer')
        // .populate('address') // rejected promise error
        .populate({
            path: 'cart',
            populate: {
                path: 'product'
            }
        });
    res.render('admin/manage-orders', { orders })
};