const { userSchema, productSchema, orderSchema } = require('./schemas.js');
const ExpressError = require('./utils/ExpressError');
const Product = require('./models/product');
const User = require('./models/user');

module.exports.isLoggedIn = (req, res, next) => {
    if (!req.isAuthenticated()) {
        // console.log("In isLoggedIn")
        req.session.returnTo = req.originalUrl;
        req.flash('error', 'You must be logged in.');
        return res.redirect('/login')
    }
    next();
}

module.exports.isLoggedOut = (req, res, next) => {
    if (req.isAuthenticated()) {
        req.session.returnTo = req.originalUrl;
        req.flash('error', 'You must log out first.');
        return res.redirect('/products')
    }
    next();
}

// module.exports.validateProduct = (req, res, next) => {
//     const { error } = productSchema.validate(req.body);
//     if (error) {
//         const msg = error.details.map(el => el.message).join(', ')
//         throw new ExpressError(msg, 400);
//     } else {
//         next();
//     }
// }

module.exports.isAdmin = async (req, res, next) => {
    const currentUser = req.user;
    if (currentUser.role !== 'admin') {
        // console.log("In isAdmin")
        req.flash('error', 'You do not have permission to do that.');
        return res.redirect('/products')
    }
    next();
}