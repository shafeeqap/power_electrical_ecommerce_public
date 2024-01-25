require('dotenv').config();
const express = require('express');
const admin_route = express();
const session = require('express-session');

const adminAuth = require('../middlewares/adminAuth');



const path = require('path');
const multer = require('multer');

admin_route.set('view engine', 'ejs');
admin_route.set('views', './views/admin');




admin_route.use(express.static(path.join(__dirname,'public')));
admin_route.use(express.json());
admin_route.use(express.urlencoded({extended:true}));

//----------------multer--------------------//
const storage = multer.diskStorage({
    destination:function(req,file,cb){
        cb(null,path.join(__dirname,'../public/adminAssets/images'));
    },
    filename:function(req,file,cb){
        const name=Date.now()+'-'+file.originalname;
        cb(null,name);
    }
});


const upload = multer({
    storage:storage,
    fileFilter:(req,file,cb)=>{
        if(file.mimetype==="image/png"||
            file.mimetype==="image/jpg"||
            file.mimetype==="image/jpeg"||
            file.mimetype==="image/webp"||
            file.mimetype==="image/avif"||
            file.mimetype==="image/svg"
        ){
            cb(null,true)
        }else{
            cb(null,false);
            return cb(new Error("Only .png, .jpg, .jpeg, .webp, .svg format allowed."));
        }
    }
});
//----------------------------------//


const adminController = require('../controller/adminController');
const categoryController = require('../controller/categoryController');
const productController = require('../controller/productController');
const brandController = require('../controller/brandController');
const couponController = require('../controller/couponController');
const bannerController = require('../controller/bannerController');
const offerController = require('../controller/offerController');


admin_route.get('/',adminAuth.isLogout,adminController.loadLogin);
admin_route.post('/',adminController.verifyLogin);
admin_route.get('/adminHome',adminAuth.isLogin,adminController.loadDashboard);
admin_route.get('/logout',adminAuth.isLogin,adminController.logout);

admin_route.get('/forget-password',adminAuth.isLogout,adminController.forgetLoad);
admin_route.post('/forget-password',adminAuth.isLogout,adminController.forgetverify);
admin_route.get('/reset-password',adminAuth.isLogout,adminController.resetPasswordLoad);
admin_route.post('/reset-password',adminController.resetPassword);

admin_route.get('/view-users',adminAuth.isLogin,adminController.viewUsers);
admin_route.get('/is_blockedUser',adminController.userBlockorActive);

admin_route.get('/view-product',adminAuth.isLogin,productController.viewProduct);
admin_route.get('/add-product',adminAuth.isLogin,productController.loadAddProduct);
admin_route.post('/add-product',upload.array('image',4),productController.addProduct);
admin_route.get('/edit-product',adminAuth.isLogin,productController.editProductLoad);
admin_route.post('/edit-product',upload.array('image',4),productController.editProduct);
admin_route.get('/is_activeProduct',adminAuth.isLogin,productController.productListorUnlist);
admin_route.post('/remove-image',productController.removeImage)

admin_route.get('/view-category',adminAuth.isLogin,categoryController.viewCategory);
admin_route.get('/add-category',adminAuth.isLogin,categoryController.addCategoryLoad);
admin_route.post('/add-category',upload.single('image'),categoryController.addCategory);
admin_route.get('/edit-category',adminAuth.isLogin,categoryController.editCategoryLoad);
admin_route.post('/edit-category',upload.single('image'),categoryController.updateCategory);
admin_route.get('/is_blockCategory',adminAuth.isLogin,categoryController.categoryListorUnlist);

admin_route.get('/view-brand',adminAuth.isLogin,brandController.viewBrand);
admin_route.get('/add-brand',adminAuth.isLogin,brandController.addBrandLoad);
admin_route.post('/add-brand',upload.single('image'),brandController.addBrand);
admin_route.get('/edit-brand',adminAuth.isLogin,brandController.editBrandLoad);
admin_route.post('/edit-brand',upload.single('image'),brandController.editBrand);
admin_route.get('/is_blockBrand',brandController.brandListorUnlist);


admin_route.get('/view-orders',adminAuth.isLogin,adminController.loadViewOrders);
admin_route.get('/view-ordersDetails',adminAuth.isLogin,adminController.viewOrderDetails);
admin_route.post('/view-ordersDetails/changeStatus',adminController.changeOrderStatus);
admin_route.post('/adminCancelOrder',adminAuth.isLogin, adminController.adminCancelOrder);

admin_route.get('/view-coupon', adminAuth.isLogin, couponController.loadViewCoupon);
admin_route.get('/add-coupon', adminAuth.isLogin, couponController.loadAddCoupon);
admin_route.post('/add-coupon', couponController.AddCoupon);
admin_route.get('/edit-coupon', adminAuth.isLogin, couponController.loadEditCoupon);
admin_route.post('/edit-coupon', couponController.editCoupon);
admin_route.get('/delete-coupon', adminAuth.isLogin, couponController.deletecoupon);


admin_route.get('/view-banner', adminAuth.isLogin, bannerController.loadViewBanner);
admin_route.get('/add-banner', adminAuth.isLogin, bannerController.loadAddBanner);
admin_route.post('/add-banner',upload.array('image',4), bannerController.AddBanner);
admin_route.get('/edit-banner', adminAuth.isLogin, bannerController.loadEditBanner);
admin_route.post('/edit-banner', upload.array('image',4), bannerController.EditBanner);
admin_route.get('/bannerStatus',adminAuth.isLogin, bannerController.bannerStatus);


admin_route.get('/view-offers', adminAuth.isLogin, offerController.loadViewOffer);
admin_route.get('/add-offer', adminAuth.isLogin, offerController.loadAddOffer);
admin_route.post('/add-offer', adminAuth.isLogin, offerController.addOffer);
admin_route.get('/edit-offer',adminAuth.isLogin, offerController.loadEditOffer);
admin_route.post('/edit-offer',adminAuth.isLogin, offerController.editOffer);
admin_route.patch('/cancelOffer',adminAuth.isLogin, offerController.cancelOffer);
admin_route.patch('/applyOffer',adminAuth.isLogin, categoryController.applyOffer);
admin_route.patch('/removeOffer', adminAuth.isLogin, categoryController.removeCategoryOffer);

admin_route.patch('/applyProductOffer',adminAuth.isLogin, productController.applyProductOffer);
admin_route.patch('/removeProductOffer', adminAuth.isLogin, productController.removeProductOffer);






module.exports = admin_route
