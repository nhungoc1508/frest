const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const passportLocalMongoose = require('passport-local-mongoose');

const ImageSchema = new Schema({
    url: String,
    filename: String
});

const ProductSchema = new Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        
    },
    price: {
        type: Number,
        required: true,
        min: 0,
        
    },
    image: ImageSchema,
    category: {
        type: String,
        enum: ['beverages', 'dairy', 'desserts', 'dry goods', 'fruits', 'vegetables', 'meat'],
        required: true,
        
    },
    stock: {
        type: Number,
        required: true,
        default: 100,
        min: 0,
        
    },
    discount: {
        type: Number,
        default: 0,
        
    }
});

ProductSchema.virtual('discountedPrice').get(function () {
    return this.price * (100 - this.discount) / 100
});

module.exports = mongoose.model('Product', ProductSchema);;