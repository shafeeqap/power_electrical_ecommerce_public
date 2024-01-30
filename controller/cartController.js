const Cart = require('../models/cartModel');
const User = require('../models/userModel');
const Product = require('../models/productModel');
const { ObjectId } = require('mongodb');



// ------------------------------------------------Add to Cart-----------------------------------//
const addToCart = async (req, res) => {
    try {
        if (req.session.user_id) {
            const productId = req.body.id;
            const userId = req.session.user_id;

            const userData = await User.findOne({ _id: userId });
            if (!userData) {
                return res.status(404).json({ success: false, error: 'User not found' });
            }

            const userCart = await Cart.findOne({ userId: userId });
            const productData = await Product.findById(productId);

        

            if (!productData) {
                return res.status(404).json({ success: false, error: 'Product not found' });
            }

            let productPrice = 0;

            if (productData.discountedPrice || productData.categoryDiscountedPrice) {
                if (productData.discountedPrice) {
                    productPrice = productData.discountedPrice;
                } else {
                    productPrice = productData.categoryDiscountedPrice;
                }
            } else if (productData.discountedPrice && productData.categoryDiscountedPrice) {
                productPrice = Math.max(productData.discountedPrice, productData.categoryDiscountedPrice);
            } else {
                productPrice = productData.price;
            }

            if (userCart) {
                const productExist = userCart.products.findIndex(product => product.productId == productId);

                

                if (productExist !== -1) {
                    const cartData = await Cart.findOne(
                        { userId: userId, "products.productId": productId },
                        { "products.productId.$": 1, "products.quantity": 1 }
                    );

                    const [{ quantity }] = cartData.products;

                    if (productData.qty <= quantity) {
                        return res.json({ success: false });
                    } else {
                        await Cart.findOneAndUpdate(
                            { userId: userId, "products.productId": productId },
                            { $inc: { "products.$.quantity": 1 } }
                        );
                    }
                } else {
                    await Cart.findOneAndUpdate(
                        { userId: userId },
                        { $push: { products: { productId: productId, price: productPrice } } }
                    );
                }
            } else {
                const data = new Cart({
                    userId: userId,
                    products: [{ productId: productId, price: productPrice }],
                });

                await data.save();
            }

            return res.json({ success: true });
        } else {
            res.json({ loginRequired: true });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
};




// --------------------------------------------------Cart Page Load-----------------------------------//
const cartLoad = async(req,res)=>{
    try {

        
        const user = await User.findById(req.session.user_id);
   
  
        if (!user) {
            return res.render('cart', { 
                message: "User not found", 
                cart: [], 
                total: 0 
            });
        }

        const user_Id = user._id;
    

        const cartData = await Cart.findOne({userId:user_Id}).populate("products.productId");
        

        if(req.session.user_id){
        
            if(cartData){
             
                let Total;
                if(cartData.products !=0){
                    const total = await Cart.aggregate([
                    {$match: {userId :new ObjectId(user_Id)},
                    },
                    {$unwind:'$products'},
                    {$project:{price:'$products.price',quantity:'$products.quantity'}},
                    {$group:{_id:null, total:{$sum: {$multiply:["$quantity","$price"]}}}}]);

                    Total=total[0].total
            
                    res.render('cart',{
                        user, 
                        cart:cartData.products, 
                        userId:user_Id, 
                        total:Total
                    });
                }else{
                    res.render('cart',{
                        user, 
                        cart:[], 
                        total:0 
                    });
                }
                
            }else{
                res.render('cart',{
                    user, 
                    cart:[], 
                    total:0
                });
            }

        }else{
            res.render('cart',{
                message:"User Logged", 
                cart:[], 
                total:0
            });
           
        }
        
    } catch (error) {
        console.log(error);
        res.render('500').send('Internal Server Error');
    }
}

// ---------------------------------------- Cart Quantity --------------------------------------//
const cartQuantity = async(req, res)=>{
    try {

        const userId = req.session.user_id;
        const productId = req.body.product;
    
        const count = parseInt(req.body.count);
        

        const cartData = await Cart.findOne({userId:new ObjectId(userId),
            "products.productId":new ObjectId(productId)},
            {"products.productId.$":1, "products.quantity":1});
            

        const [{quantity:quantity}]=cartData.products;
        

        const stockAvailable = await Product.findById({_id:new ObjectId(productId)})
        

        if(stockAvailable.qty < quantity + count){
            return res.json({changeSuccess:false, message:'Insufficient stock'});

        }else{

            await Cart.updateOne({userId:userId,"products.productId":productId},
            {$inc:{"products.$.quantity":count}});

            res.json({changeSuccess:true});
        }
        
        const updateCartData = await Cart.findOne({userId:userId});
    
      
        const updatedProduct = updateCartData.products.find((product)=>product.productId.toString()===productId.toString());


        const updatedQuantity = updatedProduct.quantity;


        // const productPrice = stockAvailable.price;
        const productPrice = updatedProduct.price;
   
        const productTotal = productPrice*updatedQuantity
       

        const prodcutTotal = await Cart.updateOne({userId:userId,"products.productId":productId},
        {$set:{"products.$.totalPrice":productTotal}})

     

    } catch (error) {
        console.log(error);
        res.render('500').send('Internal Server Error');
    }
}

// -------------------------------- Remove Cart Product --------------------------------//
const removeProduct = async(req,res)=>{
    try {
        const productId = req.body.product;
        
        const user_Id = req.session.user_id;
    

        const cartData = await Cart.findOneAndUpdate({"userId": user_Id, "products.productId":productId},
        {$pull:{products:{productId:productId}}} ,{new:true});

        if (cartData) {
            res.json({ success: true, cartData: cartData.products });
        } else {
            res.json({ success: false, message: 'Product not found in the cart.' });
        }
        
    } catch (error) {
        console.log(error);
        res.render('500').send('Internal Server Error');
    }
};

//--------------------------- Product Details Page Quantity -----------------------------//
const productDetailsQuantity = async(req, res)=>{
    try {
        
    } catch (error) {
        console.log(error);
    }
}

module.exports={
    cartLoad,
    addToCart,
    cartQuantity,
    removeProduct,
    productDetailsQuantity
}