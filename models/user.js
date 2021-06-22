const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const passportLocalMongoose = require('passport-local-mongoose');

const UserSchema = new Schema({
    email: {
        type: String,
        required: true,
        unique: true
    },
    name: {
        firstName: {
            type: String,
        },
        lastName: {
            type: String,
        }
    },
    addresses: [{
        street: String,
        city: String
    }],
    phone: Number,
    role: {
        type: String,
        enum: ['customer', 'admin'],
        default: 'customer'
    },
    cart: [
        {
            product: {
                type: Schema.Types.ObjectId,
                ref: 'Product'
            },
            qty: {
                type: Number,
                default: 1
            }
        }
    ],
    orders: [
        {
            type: Schema.Types.ObjectId,
            ref: 'Order'
        }
    ]
});

UserSchema.virtual('total').get(function () {
    let total = 0;
    for (let item of this.cart) {
        total += item.product.price * item.qty;
    }
    return total
});

// UserSchema.virtual('fullAddresses').get(function () {

// })

UserSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model('User', UserSchema);