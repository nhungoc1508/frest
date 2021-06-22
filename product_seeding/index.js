const mongoose = require('mongoose');
const products = require('./products');
const Product = require('../models/product');

if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}
 
const dbUrl = process.env.DB_URL;

mongoose.connect(dbUrl, {
    useNewUrlParser    : true,
    useCreateIndex     : true,
    useUnifiedTopology : true
});

const db = mongoose.connection;

db.on("error", console.error.bind(console, "connection error:"));
db.once("open", () => {
    console.log("Database connected");
});

const seedDB = async () => {
    await Product.deleteMany({});
    // console.log(products);
    for (let i = 0; i < products.length; i++) {
        const product = products[i];
        const newProduct = new Product({
            name: product.product_name,
            price: product.product_price,
            image: {
                url: product.img_url
            },
            category: product.category
        });
        await newProduct.save()
    }
}

seedDB().then(() => {
    mongoose.connection.close();
})

