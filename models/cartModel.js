const mongoose = require('mongoose');

const cartSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    products: [
        {
            productId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Product',
                required: true,
            },
            quantity: {
                type: Number,
                required: true,
                default: 1,
            },
            price: {
                type: Number,
                default: 0,
            },
            totalPrice: {
                type: Number,
                default: function () {
                    // Check for valid numeric values before calculating
                    const validQuantity = Number.isFinite(this.quantity) ? this.quantity : 1;
                    const validPrice = Number.isFinite(this.price) ? this.price : 0;
                    return validQuantity * validPrice;
                },
            },
        },
    ],
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model('Cart', cartSchema);
