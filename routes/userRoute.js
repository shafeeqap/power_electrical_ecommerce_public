
require('dotenv').config();
const express = require('express');

const user_router = express();

const session = require('express-session');

const config = require('../config/config');

//------------------------------------------------------------//
const userController = require('../controller/userController');
const cartController = require('../controller/cartController');
const orderController = require('../controller/orderController');
const couponController = require('../controller/couponController');
const contactController = require('../controller/contactController');
//------------------------------------------------------------//

const path = require('path');
const userAuth = require('../middlewares/userAuth');

user_router.set('view engine', 'ejs');
user_router.set('views','./views/users');




user_router.use(express.static(path.join(__dirname, 'public')));
user_router.use(express.json());
user_router.use(express.urlencoded({extended:true}));


const multer = require('multer');
//-----------multer-------------------------//
const storage = multer.diskStorage({
  destination:function(req,file,cb){
    cb(null,path.join(__dirname,'../public/userImages'));
  },
  filename:function(req,file,cb){
    const name = Date.now()+'-'+file.originalname;
    cb(null,name);
  }
});
const upload = multer({storage:storage});
//------------------------------------------//

user_router.get('/register', userAuth.isLogout,userController.loadRegister);
user_router.post('/register',userController.verifyOtp);
user_router.get('/user-otp',userController.loadOtp);
user_router.post('/user-otp',userController.insertUser);
user_router.get('/resend-otp',userController.resendOtp);

user_router.get('/', userAuth.isLogout, userController.loginLoad)
user_router.get('/login', userAuth.isLogout,userController.loginLoad);
user_router.post('/login', userAuth.isLogout,userController.verifyLogin);
user_router.get('/logout',userAuth.isLogin,userController.userLogout);


user_router.get('/forget-password',userAuth.isLogout,userController.forgetPassword)
user_router.post('/forget-password',userController.forgetVerify);
user_router.get('/reset-password',userAuth.isLogout,userController.resetPasswordLoad)
user_router.post('/reset-password',userController.resetPassword)

user_router.get('/home', userAuth.isLogin, userAuth.is_blocked, userController.loadHome);

user_router.get('/product',userAuth.isLogin, userAuth.is_blocked, userController.productLoad);
user_router.get('/productDetails',userController.loadProductDetails);
user_router.post('/productDetails/cart-quantity',cartController.productDetailsQuantity);


user_router.get('/cart',userAuth.isLogin, userAuth.is_blocked, cartController.cartLoad);
user_router.post('/addToCart',userAuth.isLogin, cartController.addToCart);
user_router.post('/cart-quantity',userAuth.isLogin,cartController.cartQuantity);
user_router.post('/remove-product',userAuth.isLogin,cartController.removeProduct);

user_router.get('/profile',userAuth.isLogin, userAuth.is_blocked, userController.loadProfile);
user_router.get('/address',userAuth.isLogin, userAuth.is_blocked, userController.loadAddress);
user_router.get('/addAddress',userAuth.isLogin, userAuth.is_blocked, userController.loadAddAddress);
user_router.post('/addAddress',userAuth.isLogin, userAuth.is_blocked, userController.addAddress);
user_router.get('/editAddress',userAuth.isLogin, userAuth.is_blocked, userController.loadEditAddress);
user_router.post('/editAddress',userAuth.isLogin, userAuth.is_blocked, userController.updateUserAddress);
user_router.get('/changePassword', userAuth.isLogin, userAuth.is_blocked, userController.loadChangePassword);
user_router.post('/changePassword',userController.changePasswordVerify);


user_router.get('/checkout',userAuth.isLogin, userAuth.is_blocked, orderController.loadCheckOut);
user_router.post('/verifyPayment',userAuth.isLogin, orderController.verifyPayment);
user_router.get('/editCheckoutAddress',userAuth.isLogin, userAuth.is_blocked, orderController.loadCheckoutEditAddress);
user_router.post('/editCheckoutAddress',userAuth.isLogin, userAuth.is_blocked, orderController.editCheckoutAddress);
user_router.get('/deleteCheckoutaddress',userAuth.isLogin, orderController.deleteCheckoutaddress);
user_router.post('/addCheckoutAddress',orderController.addCheckoutAddress);


user_router.post('/placeOrder',userAuth.isLogin, userAuth.is_blocked, orderController.placeOrder);
user_router.get('/orderPlaced/:id', userAuth.is_blocked, orderController.orderPlacedPageLoad);
user_router.get('/orders',userAuth.isLogin, userAuth.is_blocked, orderController.loadOrderPage);
user_router.get('/orderDetails',userAuth.isLogin, userAuth.is_blocked, orderController.orderDetails);
user_router.get('/orderStatus', userAuth.isLogin ,orderController.loadOrderStatus);
user_router.post('/orderCancel', userAuth.isLogin, orderController.cancelOrder);
user_router.post('/orderReturn',userAuth.isLogin, orderController.returnOrder);


user_router.get('/coupon', userAuth.isLogin, couponController.couponUserPageLoad);
user_router.post('/couponApply', userAuth.isLogin, couponController.applyCoupon);
user_router.post('/deleteCoupon', userAuth.isLogin, couponController.deleteAppliedCoupon);


user_router.get('/wallet', userAuth.isLogin ,userAuth.is_blocked, userController.getWallet);
user_router.post('/profile/addMoneyToWallet',userAuth.isLogin, userController.addMoneyToWallet);
user_router.post('/verifyWalletpayment',userAuth.isLogin, userController.verifyWalletpayment);
user_router.get('/walletHistory', userAuth.isLogin, userAuth.is_blocked, userController.walletHistory)

user_router.get('/contact',userAuth.isLogin, userAuth.is_blocked, contactController.contactLoad);





module.exports = user_router;
