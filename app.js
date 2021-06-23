if (process.env.NODE_ENV !== "production") {
    require('dotenv').config();
}

const express = require('express');
const ejsMate = require('ejs-mate');
const path = require('path');
const mongoose = require('mongoose');
const methodOverride = require('method-override');
const session = require('express-session');
const flash = require('connect-flash');
const passport = require('passport');
const LocalStrategy = require('passport-local');
const MongoStore = require('connect-mongo');

const Product = require('./models/product');
const User = require('./models/user');
const Order = require('./models/order');
const { isLoggedIn, isLoggedOut, validateProduct, isAdmin } = require('./middleware');

const dbUrl = process.env.DB_URL || 'mongodb://localhost:27017/frest';
console.log(dbUrl);
mongoose.connect(dbUrl, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useUnifiedTopology: true
});

const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", () => {
    console.log("Database connected");
});

const app = express();

app.engine('ejs', ejsMate);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'public')));

const secret = process.env.SECRET || 'asecret';

const store = MongoStore.create({
    mongoUrl: dbUrl,
    touchAfter: 24 * 60 * 60,
    crypto: {
        secret: secret,
    }
});

store.on('error', function (e) {
    console.log("Session store error", e)
});

const sessionConfig = {
    store,
    name: 'session',
    secret,
    resave: false,
    saveUninitialized: true,
    cookie: {
        httpOnly: true,
        // secure: true,
        expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
        maxAge: 1000 * 60 * 60 * 24 * 7
    }
};

app.use(session(sessionConfig));
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req, res, next) => {
    res.locals.currentUser = req.user;
    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error');
    next();
})

app.get('/', (req, res) => {
    res.send('Ok')
});

app.get('/products', async (req, res) => {
    const products = await Product.find({});
    res.render('product/index', { products })
})

app.post('/products', isLoggedIn, isAdmin, validateProduct, async (req, res) => {
    // delete req.session.returnTo;
    const product = new Product(req.body.product);
    await product.save();
    res.redirect(`/products/${product._id}`)
})

app.get('/products/new', isLoggedIn, isAdmin, (req, res) => {
    res.render('product/new')
})

app.get('/products/:id', async (req, res) => {
    const { id } = req.params;
    const product = await Product.findById(id);
    // TODO: Add catch error not found
    res.render('product/show', { product })
})

app.post('/products/:id', isLoggedIn, async (req, res) => {
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
})

app.put('/products/:id', isLoggedIn, isAdmin, async (req, res) => {
    const { id } = req.params;
    const product = await Product.findByIdAndUpdate(id, { ...req.body.product }, { new: true });
    await product.save();
    res.redirect(`/products/${product._id}`)
})

app.delete('/products/:id', isLoggedIn, isAdmin, async (req, res) => {
    const { id } = req.params;
    await Product.findByIdAndDelete(id);
    res.redirect('/products')
})

app.get('/products/:id/edit', isLoggedIn, isAdmin, async (req, res) => {
    const { id } = req.params;
    const product = await Product.findById(id);
    res.render('product/edit', { product })
})

app.get('/login', isLoggedOut, (req, res) => {
    // console.log('Login GET')
    res.render('user/login')
})

app.post('/login', isLoggedOut, passport.authenticate('local', { failureFlash: true, failureRedirect: '/login' }), (req, res) => {
    // console.log('Login POST')
    req.flash('success', 'Welcome back!');
    const redirectUrl = req.session.returnTo || '/products';
    console.log(req.session.returnTo);
    delete req.session.returnTo;
    res.redirect(redirectUrl)
})

app.get('/register', isLoggedOut, (req, res) => {
    res.render('user/register')
})

app.post('/register', isLoggedOut, async (req, res) => {
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
})

app.get('/profile', isLoggedIn, async (req, res) => {
    const user = await User.findById(req.user._id).populate('orders').populate({
        path: 'cart',
        populate: {
            path: 'product'
        }
    });
    
    res.render('user/profile', { user })
})

app.post('/profile', isLoggedIn, async (req, res) => {
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
    res.redirect('/profile')
})

app.get('/checkout', async (req, res) => {
    const user = await User.findById(req.user._id).populate({
        path: 'cart',
        populate: {
            path: 'product'
        }
    });
    res.render('user/checkout', { user })
})

app.post('/checkout', async (req, res) => {
    const { address } = req.body;
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
    res.redirect('/profile')
})

app.get('/logout', (req, res) => {
    req.logout();
    res.redirect('/products')
})

app.get('/info', (req, res) => {
    res.render('user/information')
})

app.put('/info', async (req, res) => {
    const { email, firstName, lastName, phone } = req.body;
    const id = res.locals.currentUser._id;
    const user = await User.findByIdAndUpdate(id, { email, name: { firstName, lastName }, phone}, { new: true });
    await user.save();
    req.flash('success', 'Successfully updated information!');
    res.redirect('/info')
})

app.get('/manage/products', isLoggedIn, isAdmin, async (req, res) => {
    const products = await Product.find({});
    res.render('admin/manage-products', { products })
})

app.get('/manage/customers', isLoggedIn, isAdmin, async (req, res) => {
    const customers = await User.find({role: {$ne: 'admin'}})
    res.render('admin/manage-customers', { customers })
})

app.get('/search', (req, res) => {
    res.render('product/search')
})

app.use((err, req, res, next) => {
    const { statusCode = 500, message = "Something went wrong" } = err;
    if (!err.message) err.message = "Something went wrong"
    res.status(statusCode).render('error', { err });
})

app.listen(3000, () => {
    console.log('Listening on port 3000')
})