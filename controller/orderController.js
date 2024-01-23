const Cart = require('../models/cartModel');
const User = require('../models/userModel');
const Product = require('../models/productModel');
const Address = require('../models/addressModel');
const Order = require('../models/orderModel');
const Coupon = require('../models/couponModel');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const { ObjectId } = require('mongodb');
const { log } = require('console');



// Create Razorpay instance
var instance = new Razorpay({
    key_id: process.env.key_id,
    key_secret: process.env.key_secret
});




const loadCheckOut = async(req,res)=>{
    try {

        const userId = req.session.user_id
        const userData = await User.findOne({_id:userId});

        const cartData = await Cart.findOne({userId:userId}).populate("products.productId").exec();
       
        const couponData = await Coupon.find({status:true});


        if (!cartData || !cartData.products) {
            console.log('Cart data or products not found');
            return res.status(400).send('Cart data or products not found');
        }

        const wallet = userData.wallet;
       

        const products = cartData.products
       
     
        const cart = await Cart.findOne({userId:userId});
 
        const address = await Address.findOne({userId:userId})
       

        let Total;

        const total = await Cart.aggregate([ 
            {$match:{userId:new ObjectId(userId)}},
            {$unwind: "$products"},
            {$project:{price:"$products.price", quantity:"$products.quantity"}},
            {$group:{_id:null, total:{$sum:{$multiply:["$quantity", "$price"]}}}}

        ]).exec();
      

        if (!total || !total[0] || total[0].total === undefined) {
            console.log('Total not found in aggregation result');
            return res.status(400).send('Total not found in aggregation result');
        }


        Total=total[0].total
        res.render('checkout',{
            user:userData,
            products,
            total:Total,
            address,
            wallet,
            couponData
        });
        
    } catch (error) {
        console.log(error);
    }
};

//---------------------------------------------- Place Order -----------------------------------------//
const placeOrder = async(req, res)=>{
    try {
        const userId = req.session.user_id
        const address = req.body.address
        
        const cartData = await Cart.findOne({userId:userId});
        const totalAmountString = req.body.total.replace('₹', ''); // remove ₹ symbol
        const total = parseInt(totalAmountString);
        const paymentMethod = req.body.payment;
        const userData = await User.findOne({_id:userId});
        const name = userData.name
        
        const uniNum = Math.floor(Math.random()*900000)+100000;
        const status = paymentMethod==='COD' ? 'placed':'pending';
        const statusLevel = status==='placed' ? 1 : 0;
        const walletBalance = userData.wallet;
        let totalWalletBalance = userData.wallet-total
        // const productId = req.query.productId
        // console.log(productId);
        const code = req.body.code
        // console.log('code',code);

        const couponData = await Coupon.findOne({couponCode:code});
        
        const today = new Date();
        const deliveryDate = new Date(today);
        deliveryDate.setDate(today.getDate() +7);

        const cartProducts = cartData.products.map(productItem =>({
            productId:productItem.productId,
            quantity:productItem.quantity,
            orderStatus:'Placed',
            statusLevel:1,
            paymentStatus:'Pending',
            'returnOrderStatus.status':'none',
            'returnOrderStatus.reason':'none',
            'cancelOrderStatus.reason':'none'
        }))

        const order = new Order({
            deliveryDetails:address,
            uniqueId:uniNum,
            userId:userId,
            userName:name,
            paymentMethod:paymentMethod,
            products:cartProducts,
            totalAmount:total,
            date:new Date(),
            expectedDelivery:deliveryDate
        })

        const orderData = await order.save();
        
        const orderid = order._id
        
        if(orderData){
            if(paymentMethod==='COD'){
                
                for(const item of cartData.products){
                    const productId = item.productId._id;
                    const quantity = parseInt(item.quantity,10);
                    const result = await Product.updateOne({_id:productId},
                        {$inc:{qty:-quantity}}) 
                    
                }
                res.json({success:true, orderid})

                if(req.session.code){
                    const coupon = await Coupon.findOne({couponCode:req.session.code});
                    const disAmount = coupon.discountAmount;
                    await Order.updateOne({_id:orderid},
                        {$set:{discount:disAmount}})

                        res.json({success:true, orderid})
                }

            }else{
            
                const orderId = orderData._id;
            
                const totalAmount = orderData.totalAmount;
                
                if(paymentMethod==='onlinePayment'){
                
                    var option ={
                        amount:totalAmount*100,
                        currency:"INR",
                        receipt: "" + orderId
                    };


                    instance.orders.create(option, (error, order) =>{
                        
                        if (error) {
                            console.error('Razorpay API error:', error);
                            res.status(500).json({ success: false, error: 'Razorpay API error' });
                        } else {
                            
                            res.json({ order });
                        }

                    });

                }
                else if(paymentMethod==='wallet'){
                    const dec = await Coupon.updateOne(
                        {couponCode:req.session.code},
                        {$inc:{usersLimit:-1}})

                        const userUsed = await Coupon.updateOne(
                            {couponCode:req.session.code},
                            {$push:{usedUsers:userId}})

                    if(walletBalance>=totalAmount){
                        const result = await User.findOneAndUpdate({_id:userId},
                            {$inc:{wallet:-totalAmount},
                            $push:{walletHistory:{
                            transactionDate:new Date(),
                            transactionAmount:total,
                            transactionDetails:"Purchased Product Amount.",
                            transactionType:"Debit",
                            currentBalance:totalWalletBalance
                        }}},{new:true});

                    

                        const orderUpdate = await Order.findByIdAndUpdate({_id:orderId},
                            {$set:{"products.$[].paymentStatus":"success"}});

                

                            if(req.session.code){
                                const coupon = await Coupon.findOne({couponCode:req.session.code});
                                const disAmount = coupon.discountAmount;
                                await Order.updateOne({_id:orderid},
                                    {$set:{discount:disAmount}})
                                    
                                    res.json({success:true, orderid})
                            } else if(result){
                                const updated = await Cart.deleteOne({userId:req.session.user_id});
                                for(let i=0; i<cartProducts.length;i++){
                                    const productId = cartProducts[i].productId;
                                    const quantity = cartProducts[i].quantity;
                                    await Product.findOneAndUpdate({_id:productId},
                                        {$inc:{qty:-quantity}});

                                }
                                res.json({success:true, orderid})
                            
                            }else{
                                res.json({ success: true, orderid });
                            }
                           

                    }else{
                        res.json({walletFailed:true});
                    }

                }
                
            }

            // Clear the user's cart after placing the order
            await Cart.findOneAndUpdate({ userId: userId }, { $set: { products: [] } });

        }else {
            // Handle the case when orderData is not available
            res.status(400).json({ error: 'Failed to place the order' });
        }


    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }

};

//------------------------------------------- Checkout page Verify Payment --------------------------------------//
const verifyPayment = async (req, res) => {
    try {
      const details = req.body;
      const cartData = await Cart.findOne({ userId: req.session.user_id });
      const products = cartData.products;


      const hmac = crypto.createHmac('sha256', process.env.KEY_SECRET);
      hmac.update(details.payment.razorpay_order_id + '|' + details.payment.razorpay_payment_id);
      const hmacValue = hmac.digest('hex');

 

  
      if (hmacValue === details.payment.razorpay_signature) {
        for (let i = 0; i < products.length; i++) {
          const productId = products[i].productId;
          const quantity = products[i].qty;

    
        
        // Update product quantity in a way that it cannot go below 0
        const updatedqty = await Product.findByIdAndUpdate(
            { _id: productId, qty: { $gte: quantity } },
            { $inc: { qty:-quantity } }
        );




        if (!updatedqty) {
            // Handle the case where the product quantity is insufficient
            return res.status(400).json({ error: 'Insufficient product quantity' });
        }

        }

        const result = await Order.findByIdAndUpdate(
          { _id: details.order.receipt },
          { $set: { 'products.$[].paymentStatus': 'success' } }
        );
  
        const dec = await Coupon.updateOne(
          { couponCode: req.session.code },
          { $inc: { usersLimit: -1 } }
        );
  
        const userUsed = await Coupon.updateOne(
          { couponCode: req.session.code },
          { $push: { usedUsers: req.session.user_id } }
        );
  
        await Order.findByIdAndUpdate(
          { _id: details.order.receipt },
          { $set: { paymentId: details.payment.razorpay_payment_id } }
        );
  
        await Cart.deleteOne({ userId: req.session.user_id });
        const orderid = details.order.receipt;
  
        if (req.session.code) {
          const coupon = await Coupon.findOne({ couponCode: req.session.code });
          const disAmount = coupon.discountAmount;
          await Order.updateOne(
            { _id: orderid },
            { $set: { discount: disAmount } },
            { upsert: true }
          );
          return res.json({ codsuccess: true, orderid });
        }
  
        return res.json({ codsuccess: true, orderid });
    } else {

        return res.status(400).json({ error: 'Invalid signature' });
        
      }
    } catch (error) {
      console.log(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  };
  

//------------------------------------------ Order Placed Page Load ---------------------------------------//
const orderPlacedPageLoad = async(req, res)=>{
    try {
        const userId = req.session.user_id;
        const userData = await User.findOne({_id:userId});
        
        res.render('orderPlaced',{user:userData})
        
    } catch (error) {
        console.log(error);
    }
};


//------------------------------------------- Load Order Page ---------------------------------------//
const loadOrderPage = async (req, res) => {
    try {
        // Search
        var search = '';
        if (req.query.search) {
            search = req.query.search;
        }

        // Pagination
        var page = 1;
        if (req.query.page) {
            page = req.query.page;
        }

        const limit = 6;

        const userId = req.session.user_id;

        const userData = await User.findOne({ _id: userId });

        const isValidDate = (date) => date instanceof Date && !isNaN(date.valueOf());

        const orderData = await Order.find({
            userId: userId,
            $or: [
                { date: isValidDate(new Date(search)) ? new Date(search) : null },
                { totalAmount: { $eq: !isNaN(search) ? Number(search) : null } },
                { paymentMethod: { $regex: '.*' + search + '.*', $options: 'i' } },
                { 'products.orderStatus': { $regex: '.*' + search + '.*', $options: 'i' } },
                { uniqueId: { $eq: !isNaN(search) ? Number(search) : null } },
            ],
        })
        .sort({ date: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec();

        // count of page
        const totalDocuments = await Order.countDocuments({
            userId: userId,
            $or: [
                { date: isValidDate(new Date(search)) ? new Date(search) : null },
                { totalAmount: { $eq: !isNaN(search) ? Number(search) : null } },
                { paymentMethod: { $regex: '.*' + search + '.*', $options: 'i' } },
                { 'products.orderStatus': { $regex: '.*' + search + '.*', $options: 'i' } },
                { uniqueId: { $eq: !isNaN(search) ? Number(search) : null } },
            ],
        });

    

        // Count of all documents (without pagination)
        const totalPages = Math.ceil(totalDocuments / limit);

        res.render('orders', {
            user: userData,
            orderData,
            totalPages,
            currentPage: page,
        });
    } catch (error) {
        console.log(error);
        res.status(500).render('error', { error: 'Internal Server Error' });
    }
};



//------------------------------------ Load Order Details -------------------------------//
const orderDetails = async(req, res)=>{
    try {
        const id = req.query.id
        
        const userId = req.session.user_id
        const userData = await User.findOne({_id:userId})
        const orderData = await Order.findOne({_id:id}).populate('products.productId');
        
        

        res.render('orderDetails',{user:userData, orders:orderData})
        
    } catch (error) {
        console.log(error);
        res.status(500).render('error', { error: 'Internal Server Error' });
    }
};


// ------------------------------------------- User Cancel Order --------------------------------------------//
const cancelOrder = async(req, res)=>{
    try {

        const orderId = req.query.orderId;
        const productIdToCancel = req.query.productId;
        const userId = req.session.user_id;
        const cancelReason = req.body.reason;
        const cancelAmount = req.body.totalPrice;
        const amount = parseInt(cancelAmount);
        const refundOption = req.body.refundOption;
        
        const userData = await User.findOne({_id:userId});
    
        const currentWalletBalance = userData.wallet+amount;
        const orderData = await Order.findOne({_id:orderId});
    

        if(orderData.paymentMethod==='COD'){

            const productInfo = orderData.products.find((
            product)=>String(product.productId)===String(productIdToCancel));

            

            productInfo.orderStatus = 'Cancelled',
            productInfo.paymentStatus = 'Cancelled',
            productInfo.cancelOrderStatus.reason = cancelReason,
            productInfo.updatedAt = Date.now(),
            await orderData.save();

            const quantity = productInfo.quantity
            const productId = productInfo.productId
            

            // increment quantity
            const updateQuantity = await Product.findByIdAndUpdate(
                {_id:productId},
                {$inc:{qty:quantity}},
                { new: true });

               

                res.redirect('/orders');
        

        }else {

            if(refundOption){

                await User.findOneAndUpdate(
                    {_id:userId},
                    {$inc:{wallet:cancelAmount},
                    $push:{
                        walletHistory:{
                            transactionDate:new Date(),
                            transactionDetails:'Cancelled Product Amount Credited',
                            transactionType:'Credit',
                            transactionAmount:cancelAmount,
                            currentBalance:currentWalletBalance
                        }
                    }
                }
            );

                const productInfo = orderData.products.find((
                product)=>String(product.productId)===String(productIdToCancel));
            

                productInfo.orderStatus = 'Cancelled',
                productInfo.paymentStatus = 'Refund',
                productInfo.reason = cancelReason,
                productInfo.updatedAt = Date.now(),
                await orderData.save();
    
                const quantity = productInfo.quantity
                const productId = productInfo.productId
            
    
                // increment quantity
                const updateQuantity = await Product.findByIdAndUpdate(
                    {_id:productId},
                    {$inc:{qty:quantity}},
                    { new: true });

                    res.redirect('/orders');
            }
            
        }

        
    } catch (error) {
        console.log(error);
        res.status(500).send('Internal Server Error');
    }
};


// ------------------------------------------- User Return Order --------------------------------------------//
const returnOrder = async(req, res)=>{
    try {

        const orderId = req.query.orderId;
        const productIdToReturn = req.query.productId;
        const userId = req.session.user_id;
        const returnReson = req.body.reason;
        const returnAmount = req.body.totalPrice;
        const amount = parseInt(returnAmount);
        const refundOption = req.body.refundOption;
        
        const orderData = await Order.findOne({_id:orderId});
        
        const userData = await User.findOne({_id:userId});
        

        const currentWalletBalance = userData.wallet+amount;


        if(orderData.paymentMethod==='COD'){

            const productInfo = orderData.products.find((product)=>String(product.productId)===String(productIdToReturn));

            productInfo.orderStatus = 'Returned';
            productInfo.paymentStatus = 'Cancelled';
            productInfo.returnOrderStatus.reason=returnReson;
            productInfo.updatedAt=Date.now();

            await orderData.save();

            const quantity = productInfo.quantity;
            const productId = productInfo.productId;

            const updatedQuantity = await Product.findOneAndUpdate(
                {_id:productId},
                {$inc:{qty:quantity}},
                {new:true});

                

                res.redirect('orders');

        }else{
            if(refundOption){
                await User.findOneAndUpdate({_id:userId},
                    {$inc:{wallet:returnAmount},
                    $push:{walletHistory:{
                    transactionDate:new Date(),
                    transactionDetails:'Returned Product Amount Credited',
                    transactionType:'Credit',
                    transactionAmount:returnAmount,
                    currentBalance:currentWalletBalance
                }
            }
        }
    );

        
                const productInfo = orderData.products.find((order)=>String(order.productId)===String(productIdToReturn));

                productInfo.orderStatus='Returned';
                productInfo.paymentStatus='Refund';
                productInfo.returnOrderStatus.reason=returnReson;
                productInfo.updatedAt=Date.now();

                await orderData.save()

                const quantity = productInfo.quantity;
                const productId = productInfo.productId;

                const updatedQuantity = await Product.findOneAndUpdate(
                    {_id:productId},
                    {$inc:{qty:quantity}},
                    {new:true});

                    res.redirect('/orders');
            }
        }
        
        
    } catch (error) {
        console.log(error);
    }
};



//-------------------------------------------- Load Checkout Edit Addrss -------------------------------------------//
const loadCheckoutEditAddress = async(req, res)=>{
    try {
        const id = req.query.id
    
        const userId = req.session.user_id
        const userData = await User.findById({_id:userId});
        let userAddress = await Address.findOne({userId:userId},
            {addresses:{$elemMatch:{_id:id}}});
            
            const address = userAddress.addresses
        
            res.render('editCheckoutAddress',{user:userData,address:address[0]})
        
    } catch (error) {
        console.log(error);
    }
};

//---------------------------------------- Edit Checkout Address -----------------------------------//
const editCheckoutAddress = async(req, res)=>{
    try {

        const addressId = req.body.id
    
        const userId = req.session.user_id
    
        const updateAddress = await Address.updateOne({userId:userId,'addresses._id':addressId},
        {$set:{
            'addresses.$.fullName':req.body.fullName,
            'addresses.$.city':req.body.city,
            'addresses.$.country':req.body.country,
            'addresses.$.pincode':req.body.pincode,
            'addresses.$.state':req.body.state,
            'addresses.$.mobile':req.body.mobile
        }})

        res.redirect('/checkout');
        
        
    } catch (error) {
        console.log(error);
    }
};


//------------------------------------ Delete Checkout address ----------------------------------//
const deleteCheckoutaddress = async(req, res)=>{
    try {
       const userId = req.session.user_id;
       const addressId = req.query.id;

       const addressData = await Address.updateOne({
            userId:userId},
            {$pull:{addresses:{_id:addressId}}});

    
        res.redirect('/checkout')
        
    } catch (error) {
        console.log(error);
    }
};

//--------------------------------- Add Checkout Address --------------------------------------------//
const addCheckoutAddress = async(req, res)=>{
    try {

        let userAddress = await Address.findOne({userId:req.session.user_id});
        if(!userAddress){

            userAddress = new Address({
                userId:req.session.user_id,
                addresses:[
                    {
                        fullName:req.body.fullName,
                        mobile:req.body.mobile,
                        city:req.body.city,
                        state:req.body.state,
                        country:req.body.country,
                        pincode:req.body.pincode
                    }
                ]
            })
        }else{
            userAddress.addresses.push({
                fullName:req.body.fullName,
                mobile:req.body.mobile,
                city:req.body.city,
                state:req.body.state,
                country:req.body.country,
                pincode:req.body.pincode

            })
        }
        await userAddress.save();

        res.redirect('/checkout');
        
    } catch (error) {
        console.log(error);
        res.status(500).send('Internal Server Error');
    }
};


//Load Order Status Page
const loadOrderStatus = async(req, res)=>{
    try {
        const id = req.query.id
        console.log('Status Id',id);
        const userId = req.session.user_id
        console.log('User Id', userId);

        
        if(!id || !userId){
            console.log('Invalid id or userId');
            return res.status(400).send('Invalid id or userId');
        }

        const userData = await User.findById({_id:userId});
        const orderData = await Order.find({_id:id});
      

        if(!orderData){
        
            return res.status(404).send('Order Data not found');
        };

        res.render('orderStatus',{user:userData})

    } catch (error) {
        console.log(error);
    }
}

module.exports={
    loadCheckOut,
    placeOrder,
    orderPlacedPageLoad,
    loadOrderPage,
    orderDetails,
    loadCheckoutEditAddress,
    editCheckoutAddress,
    deleteCheckoutaddress,
    addCheckoutAddress,
    verifyPayment,
    loadOrderStatus,
    cancelOrder,
    returnOrder
}