const BaseJoi = require('joi');
const sanitizeHtml = require('sanitize-html');

const extension = (joi) => ({
    type: 'string',
    base: joi.string(),
    messages: {
        'string.escapeHTML': '{{#label}} must not include HTML.'
    },
    rules: {
        escapeHTML: {
            validate(value, helpers) {
                const clean = sanitizeHtml(value, {
                    allowedTags: [],
                    allowedAttributes: {},
                });
                if (clean !== value) return helpers.error('string.escapeHTML', { value })
                return clean;
            }
        }
    }
});

const Joi = BaseJoi.extend(extension);

module.exports.userSchema = Joi.object({
    user: Joi.object({
        email: Joi.string().required().escapeHTML(),
        name: Joi.object({
            firstName: Joi.string().escapeHTML(),
            lastName: Joi.string().escapeHTML()
        }),
        addresses: Joi.array(),
        phone: Joi.number()
    }).required()
});

module.exports.productSchema = Joi.object({
    product: Joi.object({
        name: Joi.string().required().escapeHTML(),
        price: Joi.number().min(0).required(),
        category: Joi.string().valid('beverages', 'dairy', 'desserts', 'dry goods', 'fruits', 'vegetables', 'meat'),
        stock: Joi.number().required().min(0),
        discount: Joi.number().max(100)
    }).required()
});

module.exports.orderSchema = Joi.object({
    order: Joi.object({
        address: Joi.string().escapeHTML(),
        total: Joi.number().min(0),
        dataStart: Joi.date(),
        status: Joi.string().valid('Pending', 'Packaging', 'Shipping', 'Delivered', 'Cancelled')
    }).required()
});