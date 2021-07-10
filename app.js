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

const { cloudinary, storage } = require('./cloudinary');
const multer = require('multer');
const upload = multer({ storage });

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
// app.use('/static', express.static(path.join(__dirname, 'public')));

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
    res.locals.info = req.flash('info');
    next();
})

app.get('/', (req, res) => {
    res.send('Ok')
});

app.get('/products', async (req, res) => {
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
    res.render('product/index', { products })
})

app.post('/products', isLoggedIn, isAdmin, upload.single('imageUpload'), async (req, res) => {
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

app.put('/products/:id', isLoggedIn, isAdmin, upload.single('imageUpload'), async (req, res) => {
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
})

app.delete('/products/:id', isLoggedIn, isAdmin, async (req, res) => {
    const { id } = req.params;
    await Product.findByIdAndDelete(id);
    req.flash('success', 'Successfully deleted product!')
    res.redirect('/products')
})

app.get('/products/:id/edit', isLoggedIn, isAdmin, async (req, res) => {
    const { id } = req.params;
    const product = await Product.findById(id);
    console.log(product.image.filename == null)
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
    if (user.cart.length == 0) {
        req.flash('info', 'You do not have any item in your cart.')
        res.redirect('/profile')
    } else {
        res.render('user/checkout', { user })
    }
})

app.post('/checkout', async (req, res) => {
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
        res.redirect('/profile')
    }
})

app.get('/logout', (req, res) => {
    req.logout();
    res.redirect('/products')
})

app.get('/sandbox', isLoggedIn, isAdmin, async (req, res) => {
    const orders = await Order.find()
        .populate('customer')
        // .populate('address') // rejected promise error
        .populate({
            path: 'cart',
            populate: {
                path: 'product'
            }
        });
    res.render('sandbox', { orders })
})

app.get('/info', (req, res) => {
    res.render('user/information')
})

app.put('/info', async (req, res) => {
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
})

app.post('/info', async (req, res) => {
    const { street, city } = req.body;
    const { addressId } = req.query;
    const id = res.locals.currentUser._id;
    const user = await User.findById(id).populate('addresses');
    const addressIndexInArray = user.addresses.findIndex(a => a._id == addressId);
    user.addresses[addressIndexInArray] = { street, city };
    await user.save();
    req.flash('success', 'Successfully updated address!');
    res.redirect('/info')
})

app.get('/manage/products', isLoggedIn, isAdmin, async (req, res) => {
    const products = await Product.find({});
    const categories = ['beverages', 'dairy', 'desserts', 'dry goods', 'fruits', 'vegetables', 'meat'];
    res.render('admin/manage-products', { products, categories })
})

app.put('/manage/products', isLoggedIn, isAdmin, async (req, res) => {
    const productId = req.query.product;
    // console.log(req.body.product);
    const { name, price, stock, discount } = req.body.product;
    const product = await Product.findByIdAndUpdate(productId, { name, price, stock, discount }, { new: true });
    await product.save();
    req.flash('success', `Successfully updated ${product.name}!`);
    res.redirect('/manage/products')
})

app.delete('/manage/products', isLoggedIn, isAdmin, async (req, res) => {
    const id = req.query.product;
    const product = await Product.findById(id);
    const productName = product.name;
    await Product.findByIdAndDelete(id);
    req.flash('success', `Successfully deleted ${productName}!`);
    res.redirect('/manage/products')
})

app.get('/manage/customers', isLoggedIn, isAdmin, async (req, res) => {
    // const customers = await User.find({ role: { $ne: 'admin' } }).populate('orders')
    const customers = await User.find({}).populate('orders')
    res.render('admin/manage-customers', { customers })
})

app.get('/manage/orders', isLoggedIn, isAdmin, async (req, res) => {
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
})

app.get('/search', async (req, res) => {
    const { query } = req.query;
    const matches = await Product.find({ name: { $regex: `.*${query}.*` } })
    // console.log(matches)
    res.render('product/search', { matches, query })
})

app.post('/search', (req, res) => {
    // console.log(req.body)
    // res.send(req.query)
    const query = req.body.query;
    res.redirect(`/search?query=${query}`)
})

app.use((err, req, res, next) => {
    const { statusCode = 500, message = "Something went wrong" } = err;
    if (!err.message) err.message = "Something went wrong"
    res.status(statusCode).render('error', { err });
})

app.listen(3000, () => {
    console.log('Listening on port 3000')
})