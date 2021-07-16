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
const moment = require("moment");

const { cloudinary, storage } = require('./cloudinary'); //
const multer = require('multer');
const upload = multer({ storage });

const Product = require('./models/product'); //
const User = require('./models/user');
const Order = require('./models/order');
const { isLoggedIn, isLoggedOut, validateProduct, isAdmin } = require('./middleware');

const productRoutes = require('./routes/products');
const customerRoutes = require('./routes/customers');
const adminRoutes = require('./routes/admin');

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
    res.locals.moment = moment;
    next();
})

app.get('/', async (req, res) => {
    const featuredProducts = await Product.find({}).sort({price: -1}).limit(10);
    res.render('home', { products: featuredProducts })
});

app.use('/products', productRoutes);
app.use('/', customerRoutes);
app.use('/manage', adminRoutes);

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

app.use((err, req, res, next) => {
    const { statusCode = 500, message = "Something went wrong" } = err;
    if (!err.message) err.message = "Something went wrong"
    res.status(statusCode).render('error', { err });
})

app.listen(3000, () => {
    console.log('Listening on port 3000')
})