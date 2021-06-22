const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const Product = require('./product');
const User = require('./product');

const OrderSchema = new Schema({
    customer: {
        type: Schema.Types.ObjectId,
        ref: 'User' // add required
    },
    address: {
        type: String // add required
    },
    products: [
        {
            type: Schema.Types.ObjectId,
            ref: 'Product'
        }
    ],
    total: {
        type: Number, // add required
        min: 0
    },
    dateStart: {
        type: Date
    },
    dateEnd: {
        type: Date
    },
    status: {
        type: String,
        enum: ['Pending', 'Packaging', 'Shipping', 'Delivered', 'Cancelled']
    }
});

module.exports = mongoose.model('Order', OrderSchema);