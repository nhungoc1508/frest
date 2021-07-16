const User = require('../models/user');
const Product = require('../models/product');
const Order = require('../models/order');

module.exports.renderLogin = (req, res) => { //
    // console.log('Login GET')
    res.render('user/login')
};

module.exports.login = (req, res) => {
    // console.log('Login POST')
    req.flash('success', 'Welcome back!');
    const redirectUrl = req.session.returnTo || '/products';
    console.log(req.session.returnTo);
    delete req.session.returnTo;
    res.redirect(redirectUrl)
};

module.exports.renderRegister = (req, res) => {
    res.render('user/register')
};

module.exports.register = async (req, res) => {
    try {
        const { username, email, password } = req.body;
        const user = new User({ username, email });
        const registeredUser = await User.register(user, password);
        req.login(registeredUser, err => {
            if (err) return next(err);
            req.flash('success', 'Welcome to Frest!');
            res.redirect('/products')
        });
    } catch (e) {
        req.flash('error', e.message);
        res.redirect('/register')
    }
};

module.exports.renderCart = async (req, res) => {
    const user = await User.findById(req.user._id).populate({
        path: 'orders',
        populate: {
            path: 'cart',
            populate: {
                path: 'product'
            }
        }
    }).populate({
        path: 'cart',
        populate: {
            path: 'product'
        }
    });
    console.log(user.orders[0])
    // Address hasn't been exported as a schema on its own
    // I'm depending on a roundabout way for now
    const addressIDs = user.orders.map(order => order.address);
    const addresses = addressIDs.map(function(address) {
        const ind = user.addresses.findIndex(add => add._id.equals(address));
        const addressObj = user.addresses[ind];
        return addressObj
    });

    res.render('user/cart', { user, addresses })
};

module.exports.updateCart = async (req, res) => {
    const productId = req.query.product;
    const user = await User.findById(req.user._id);
    const cartIndex = user.cart.findIndex(item => item.product == productId);
    let qty = req.body.qty;
    let msg = ''
    if (cartIndex !== -1) {
        if (!qty) { // remove item
            user.cart.splice(cartIndex, 1);
            msg = 'Successfully removed product from cart!';
        } else { // update item qty
            user.cart[cartIndex].qty = qty;
            msg = 'Successfully updated product quantity!';
        }
    }
    await user.save();
    req.flash('success', msg);
    res.redirect('/cart')
};

module.exports.renderCheckout = async (req, res) => {
    const user = await User.findById(req.user._id).populate({
        path: 'cart',
        populate: {
            path: 'product'
        }
    });
    if (user.cart.length == 0) {
        req.flash('info', 'You do not have any item in your cart.')
        res.redirect('/cart')
    } else {
        res.render('user/checkout', { user })
    }
};

module.exports.checkout = async (req, res) => {
    const { address } = req.body;
    if (!address) {
        req.flash('error', 'You currently have no address. Please add an address first.')
        res.redirect('/info')
    } else {
        const user = await User.findById(req.user._id).populate({
            path: 'cart',
            populate: {
                path: 'product'
            }
        });
        // Without populating, user.total is NaN
        const addressIndex = user.addresses.findIndex(add => add._id == address);
        const addressObj = user.addresses[addressIndex];
        const order = new Order({
            customer: user,
            address: addressObj,
            cart: user.cart,
            total: user.total
        });
        await order.save();
        user.orders.push(order);
        while (user.cart.length > 0) {
            user.cart.pop();
        }
        await user.save();
        req.flash('success', 'Successfully placed an order!');
        res.redirect('/cart')
    }
};

module.exports.logout = (req, res) => {
    req.logout();
    res.redirect('/products')
};

module.exports.renderInfo = (req, res) => {
    res.render('user/information')
};

module.exports.updateInfo = async (req, res) => {
    const { email, firstName, lastName, phone, street, city } = req.body;
    const id = res.locals.currentUser._id;
    const user = await User.findByIdAndUpdate(id, {
        email,
        name: { firstName, lastName },
        phone
    },
        { new: true });
    if (street, city) {
        user.addresses.push({ street, city });
    }
    // console.log(user.addresses);
    await user.save();
    req.flash('success', 'Successfully updated information!');
    res.redirect('/info')
};

module.exports.updateAddress = async (req, res) => {
    const { street, city } = req.body;
    const { addressId } = req.query;
    const id = res.locals.currentUser._id;
    const user = await User.findById(id).populate('addresses');
    const addressIndexInArray = user.addresses.findIndex(a => a._id == addressId);
    user.addresses[addressIndexInArray] = { street, city };
    await user.save();
    req.flash('success', 'Successfully updated address!');
    res.redirect('/info')
};

module.exports.renderSearch = async (req, res) => {
    const { query } = req.query;
    const matches = await Product.find({ name: { $regex: `.*${query}.*` } })
    // console.log(matches)
    res.render('product/search', { matches, query })
};

module.exports.search = (req, res) => {
    // console.log(req.body)
    // res.send(req.query)
    const query = req.body.query;
    res.redirect(`/search?query=${query}`)
};