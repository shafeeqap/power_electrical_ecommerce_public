const User = require('../models/userModel');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const otpGenerator = require('otp-generator');
const randomstring = require('randomstring');
const Category = require('../models/categoryModel');
const Product = require('../models/productModel');
const Brand = require('../models/brandModel');
const Cart = require('../models/cartModel');
const Address = require('../models/addressModel');
const Coupon = require('../models/couponModel');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const { ObjectId } = require('mongodb');
const Banner = require('../models/bannerModel');




var instance = new Razorpay({
    key_id:process.env.key_id,
    key_secret:process.env.key_secret
})




// securePassword (bcrypt)----------------------//
const securePassword = async(password)=>{

    try {
       
        const passwordHash = await bcrypt.hash(password, 10);
        return passwordHash;
    } catch (error) {
        console.log(error);
    }
}


// ---------------------------------------- for send mail ---------------------------------------//
const sendVerifyMail= async(email, otp)=>{
    try {

        const transporter = nodemailer.createTransport({
            host:'smtp.gmail.com',
            port:587,
            secure:false,
            requireTLS:true,
            auth:{
                user:process.env.emailUser,
                pass:process.env.passwordUser
            }
        });

        const mailoption={
            from:process.env.emailUser,
            to:email,
            subject:'For OTP Vrification mail',
            html: `<p> Hi , your OTP is <strong>${otp}</strong>.</p> `,
           
        };
        
        
        await transporter.sendMail(mailoption);
        // const info = await transporter.sendMail(mailOptions);
        
        
    } catch (error) {
        console.error("Error sending email:", error);
        throw error; 
        ;
    }
};

// ---------------------------------------------------Load OTP Verification -----------------------------------//
const loadOtp = async(req,res)=>{
    try {
       
        
        const user = await User.findById(req.session.user_id);

        res.redirect('user-otp',{title:'User-OTP-Verification',user});
        
    } catch (error) {
        console.log(error);
    }
};

// ---------------------------------------------- Verify OTP ---------------------------------------//
const verifyOtp = async (req, res) => {
    try {

        
        // Generate OTP
        const otpCode = otpGenerator.generate(6, {
            digits: true,
            alphabets: false,
            specialChars: false,
            upperCaseAlphabets: false,
            lowerCaseAlphabets: false,
        });

       

        const creationTime = Date.now() / 1000;
        const expirationTime = creationTime + 60;

        // Check if the email already exists in the database.
        const emailCheck = await User.findOne({ email: req.body.email });
        const mobileCheck = await User.findOne({mobile: req.body.mobile});


        if (emailCheck || mobileCheck) {

            res.render('register',{
                message:'Your registration is failed.',
                emailMessage: emailCheck ? 'User is already exist' : '',
                mobileMessage: mobileCheck ? 'Mobile is already exist' : '',
            });

        } else {

            const spassword = await securePassword(req.body.password);

            req.session.name = req.body.name;
            req.session.email = req.body.email;
            req.session.mobile = req.body.mobile;

            if (req.body.name && req.body.email && req.body.mobile) {
                if (req.body.password === req.body.verify_password) {
                    req.session.password = spassword;

                    req.session.otp = {
                        code: otpCode,
                        expiry: expirationTime,
                    };

                    sendVerifyMail(req.session.email, req.session.otp.code);
                    

                    res.render('user-otp', { 
                        message: 'Email OTP has been sent to your email', 
                        user: req.session.user_id 
                    });


                } else {
                    res.render('register', { 
                        message: 'Password does not match',
                        emailMessage:'',
                        mobileMessage :'',
                    });
                }
            } else {
                res.render('register', { 
                    message: 'Please enter all details',
                    emailMessage:'' ,
                    mobileMessage :'',
                });
            }
        }

    } catch (error) {
        console.log(error);
    }
};



//------------------------------------------------- view sign up page ---------------------------------------//
const loadRegister= async(req,res)=>{
    try {
        res.render('register',{ emailMessage: '' ,mobileMessage :''});
    } catch (error) {
        console.log(message);
    }
}

// user registration-------------//
const insertUser = async(req,res)=>{

    try {
    
        const currentTime = Math.floor(Date.now()/1000)

        if(req.body.otp === req.session.otp.code && 
            currentTime<=req.session.otp.expiry ){
            
            
            const user = new User({
                name:req.session.name,
                email:req.session.email,
                mobile:req.session.mobile,
                password:req.session.password,
                is_varified:1,
                is_admin:0
                
            });

            const userData = await user.save();
            

          

            if (userData) {
                // Registration successful
                res.json({ success: true });
            } else {
                // Registration failed
                res.json({ success: false, message: 'Your registration is failed.' });
            }
        } else {
            // OTP verification failed
            res.json({ success: false, message: 'Invalid OTP.' });
        }

        
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: 'An error occurred while processing your request' });
    }
};



//  ----------------------------- Resend OTP after expire time ------------------------------------//
const resendOtp = async(req,res)=>{ 
    try {
        console.log('Resend OTP',req.body);

        const currentTime = Date.now() / 1000;

        if(req.session.otp.expire != null){
            if(currentTime>req.session.otp.expire){
                const newDigit = otpGenerator.generate(6,{
                    digits: true,
                    alphabets: false,
                    specialChars: false,
                    upperCaseAlphabets: false,
                    lowerCaseAlphabets: false,
                });
                req.session.otp.code=newDigit;
                const newExpiry=currentTime+60;
                req.session.otp.expiry=newExpiry;
                sendVerifyMail(req.session.email, req.session.otp.code);

                res.render('user-otp', { 
                    message: 'New OTP send into your Email', 
                    user: req.session.user_id 
                });

                
            }else{
                res.render('user-otp', { 
                    message: 'You can request a new otp after old otp expires', 
                    user: req.session.user_id 
                });
            }
            console.log("New OTP sent to email successfully");

        }else{
            res.render('user-otp',{message:'Already registerd'
        })
        }

        
    } catch (error) {
        console.log("Error sending OTP:",error);
        res.status(500).send("Error sending OTP");
        
    }
};


// -------------------------------------------- for reset password send mail --------------------------------//
const sendResetPasswordMail= async(name,email,token)=>{
    try {
        const transporter = nodemailer.createTransport({
            host:'smtp.gmail.com',
            port:587,
            secure:false,
            requireTLS:true,
            auth:{
                user:process.env.emailUser,
                pass:process.env.passwordUser
            }
        });
        const mailoption={
            from:process.env.emailUser,
            to:email,
            subject:'For Reset Password',
            html:'<p> Hi '+ name +', please click here to <a href="http://localhost:3000/reset-password?token='+token+'"> Reset </a> your password.</p> '
            
        }
        transporter.sendMail(mailoption, function(error, info){
            if(error){
                console.log(error);
            }else{
                 console.log("Email has been sent :-", info.response);
            }
        })
        
    } catch (error) {
        console.log(error.message);
    }
}

// ------------------------------------------------ Login user method --------------------------------------//
const loginLoad = async(req,res)=>{
    try {
        res.render('login');
    } catch (error) {
        console.log(error); 
    }
};

// ---------------------------------------------- Verify Login -------------------------------------------//
const verifyLogin=async(req, res)=>{

    try {
        const email=req.body.email;
        const password=req.body.password;

        if(email===''){
            return res.render('login',{message:'Please enter email'})
        }

        const userData = await User.findOne({email:email});
     

        if(userData){
            if(userData.is_block==false){

                const passwordMatch = await bcrypt.compare(password, userData.password);

                if(passwordMatch){

                    if(userData.is_varified === 0){

                        return res.render('login', {message:"Please verify your mail."});
                
                    }else{
                        req.session.user_id = userData._id;

                        return res.redirect('/home');
                    }

                }else{
                    
                    return res.status(401).json({message:"Email and password is incorrect."});
                }

            }else{

                return res.status(403).json({ message: "Your account is blocked." });
       
            }    

        }else{
            return res.status(401).json({message:"Email and password is incorrect."});
        }

    } catch (error) {
        console.log(error,  { message: 'An error occurred', status: 500 });
        return res.status(500).json({message:'An error occurred'});
    }
}

//--------------------------------------------- Load Home page -----------------------------------------------//
const loadHome = async(req,res)=>{
    try {

        const categoryData = await Category.find({is_block:false}).populate('offer')
        const productData = await Product.find({is_active:true})
        .populate('offer')
        .populate({path:"category", populate:{path:"offer"}})
        .populate('brandName')
        const user = await User.findById(req.session.user_id);
        const userData = await User.find({is_block:false});
        const banner = await Banner.find({status:true});
        
        
        
        if (!user) {
            return res.redirect('/login');
        }
        
        

        if (!userData) {
            return res.redirect('/login');
        }

        
            res.render('home',{
                user,
                categoryData,
                productData,
                title:'Home',
                banner
            });




    } catch (error) {
        console.log(error);
        res.status(500).send('Internal Server Error');
    }
}

//------------------------------------------- Load Product --------------------------------------------//
const productLoad = async(req,res)=>{
    try {

        // Search
        var search='';
        if(req.query.search){
            search=req.query.search;
        }

        // Pagination
        var page=1;
        if(req.query.page){
            page =req.query.page;
        }

        const limit=6;

        const user =  await User.findById(req.session.user_id);
        const categoryData = await Category.find({is_block:false}).populate('offer')
        const brandData = await Brand.find({is_block:false});


        const productData = await Product.find({
            is_active:true,
            $or:[
                {name:{$regex:'.*'+search+'.*',$options:'i'}},
                // {category.categoryName:{$regex:'.*'+search+'.*',$options:'i'}},
                // {brandName:{$regex:'.*'+search+'.*',$options:'i'}},
            ]
        })
        .limit(limit*1)
        .skip((page-1)*limit)
        .populate({path:"category", populate:{path:"offer"}})
        .populate('brandName')
        .populate('offer')
        .exec();

        // Count of pages
        const count = await Product.find({
            is_active:true,
            $or:[
                {name:{$regex:'.*'+search+'.*',$options:'i'}},
                // {category:{$regex:'.*'+search+'.*',$options:'i'}},
                // {brandName:{$regex:'.*'+search+'.*',$options:'i'}},
            ]
        }).countDocuments()

    

        res.render('product', {
            user,
            productData,
            categoryData,
            brandData,
            totalPages:Math.ceil(count/limit),  //Ex:- count of document/limit (9/6 = 1.5 => 2)
            currentPage:page,   // page 1
            title:'Product'
        });


    } catch (error) {
        console.log(error);
        res.render('500')
    }
};


// ------------------------------------------------ Product Details Load ----------------------------------------//
const loadProductDetails = async(req, res)=>{
    try {

        const productId = req.query.id;
        
        
        const userData = await User.findById(req.session.user_id);
        const productData = await Product.findById({_id:productId});
    
        
        
        if(productData){

            res.render('productDetails',{
                user:userData,
                product:productData 
            });
        }else{
            res.render('productDetails',{message:'Product Details not available'});
        }

        
    } catch (error) {
        console.log(error);
        res.render('500')
    }
}


//-------------------------------------------------- User Logout ---------------------------------------//
const userLogout = async(req,res)=>{
    try {
        req.session.destroy();
        res.redirect('/');
    } catch (error) {
        console.log(error);
        res.render('500')
    }
}

// ----------------------------------------Forget Password-------------------------------------------------//
const forgetPassword = async(req,res)=>{
    try {

        const userData = await User.findById(req.session.user_id);

        res.render('forget-password',{
            user:userData||null,
            message:''
        });
    } catch (error) {
        console.log(error);
        res.render('500')
    }
}

// -----------------------------------------------Forget Password Verify----------------------------------//
const forgetVerify = async(req,res)=>{
    try {
        const email = req.body.email;
        if(email===''){
            res.render('forget-password',{
                message:'Please enter your email',
                user:req.session.user_id
            })
            
        }
        const userData = await User.findOne({email:email});
        if(userData){
            if(userData.is_varified===0){
                res.render('forget-password',{
                    message:'Please verify your email',
                    user:req.session.user_id
                });
            }else{
                const randomString = randomstring.generate();
                const updatedData = await User.updateOne({email:email},{$set:{token:randomString}});
                sendResetPasswordMail(userData.name,userData.email,randomString);

                res.render('forget-password',{
                    message:'Please check your mail to reset your password.',
                    user:req.session.user_id
                });
            }
        }else{
            res.render('forget-password',{
                message:'Your email is in correct',
                user:req.session.user_id
            });
        }
        
    } catch (error) {
        console.log(error);
        res.render('500')
    }
}

// ----------------------------------------------Reset Password Load----------------------------------------//
const resetPasswordLoad = async(req,res)=>{
    try {
        
        const token = req.query.token;

        if(!token){
            
            return res.render('error', {message:'Token is invalid',status:404})
        }
        const tokenData = await User.findOne({token:token});

        if (!tokenData) {
            
            return res.render('error',{message:'Token is invalid',status:404});
            
        }else{
            

            res.render('reset-password',{
                user_id:tokenData._id,
                user:tokenData._id
            });
        
        }
        
    } catch (error) {
        console.log(error);
        res.render('500')
    }
}

// -----------------------------------------Reset Password----------------------------------------------//
const resetPassword = async(req,res)=>{
    try {
        const password = req.body.password;
        const user_id = req.body.user_id;
        

        const secure_password = await securePassword(password); 

        const updatedData = await User.findByIdAndUpdate({_id:user_id},{$set:{password:secure_password,token:''}})

    

        res.redirect('/');

    } catch (error) {
        console.log(error);
        res.render('500')
    }
}

// -------------------------------------------Load profile-----------------------------------------------//
const loadProfile = async(req, res)=>{
    try {

        // Check if req.session.user_id is defined
        if (!req.session.user_id) {
            return res.status(400).send('User ID is missing');
        }

        const userId = req.session.user_id
        const userData = await User.findById({_id:userId});

        // Check if the user was found
        if (!userData) {
            return res.status(404).send('User not found');
        }

        const address = await Address.findOne({userId:userId})
        

        const couponData = await Coupon.find({status:true});
        


        res.render('profile',{
            user:userData, 
            address,
            couponData
        });
        
    } catch (error) {
        console.log(error);
        res.render('500')
    }
};

// Load User Address Detailes
const loadAddress = async(req, res)=>{
    try {
        const userId = req.session.user_id
        const userData = await User.findById({_id:userId});
        const address = await Address.findOne({userId:userId})
    
        
        res.render('address',{user:userData,address})
        
    } catch (error) {
        console.log(error);
        res.render('500')     
    }
}


// Load Add New Address Page
const loadAddAddress = async(req,res)=>{
    try {
        const userId = req.session.user_id
        const userData = await User.findById({_id:userId});
        const address = await Address.findOne({userId:userId})

        res.render('addAddress',{user:userData, address});
        
    } catch (error) {
        console.log(error);
        res.render('500')
    }
}


// Add New Address Page
const addAddress = async(req, res)=>{
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

        res.redirect('/profile')
        
    } catch (error) {
        console.log(error);
        res.render('500')
    }
};

// Load Edit Address
const loadEditAddress = async(req, res)=>{
    try {
        const id = req.query.id
       
        const userId = req.session.user_id
        const userData = await User.findById({_id:userId});
        const userAddress = await Address.findOne({userId:userId},{addresses:{$elemMatch:{_id:id}}});
        
        const address = userAddress.addresses
       


        res.render('editAddress',{user:userData, address})
        
    } catch (error) {
        console.log(error);
        res.render('500')
    }
};

// Update User Address
const updateUserAddress = async(req, res)=>{
    try {
        const addressId = req.body.id
        
        const userId = req.session.user_id

        const updateAddress = await Address.updateOne({userId:userId, 'addresses._id':addressId},
        {$set:{
            'addresses.$.fullName':req.body.fullName,
            'addresses.$.mobile':req.body.mobile,
            'addresses.$.country':req.body.country,
            'addresses.$.city':req.body.city,
            'addresses.$.pincode':req.body.pincode,
            'addresses.$.state':req.body.state
        }})

    
            res.redirect('/profile');

        
    } catch (error) {
        console.log(error);
        res.render('500')
    }
};

// ----------------------------------------------Change Password (userprofilePage)---------------------------------------
const loadChangePassword = async(req, res)=>{
    try {
        const userId = req.session.user_id
        const userData = await User.findById({_id:userId});
        // console.log('UserData',userData);

        res.render('changePassword',{user:userData});
        
    } catch (error) {
        console.log(error);
        res.render('500')
    }
};


// ----------------------------------Change Password Verify--------------------------------------------------
const changePasswordVerify = async(req,res)=>{
    try {

        const currentpassword = req.body.currentpassword;
        
        const newpassword = req.body.newpassword;
        const confirmpassword = req.body.confirmpassword;
        const userId = req.session.user_id;
        const userData = await User.findById(userId)
 

        if (!userData) {
            return res.status(404).json({
                success: false,
                message: 'User not found.',
            });
        }

        const oldPassword = userData.password

        const passwordMatch = await bcrypt.compare(currentpassword, oldPassword);
       
            if(passwordMatch){
                if(newpassword===confirmpassword){

                    const sec_password = await securePassword(newpassword)

                    const updatedPassword = await User.updateOne(
                        {_id:userId},
                        {$set:{password:sec_password}});

                        return res.json({success:true});

                }else{
                    return res.status(400).json({
                        success:false,
                        message: 'New password and confirm password do not match.'
                    });
                }
                
            }else{
                return res.status(400).json({
                    success:false,
                    message:'Your old password does not match'});
            }
            
        
    } catch (error) {
        console.log(error);
        res.render('500')
    }
};


//------------------------------------------------- Get wallet Page-----------------------------------------//
const getWallet = async(req, res )=>{
    try {
    
        const userId = req.session.user_id;
      

        const userData = await User.findOne({_id:userId});
        
        res.render('wallet',{user:userData})

        
        
    } catch (error) {
        console.log(error);
        res.render('500')
    }
};


//--------------------------------------------- Add money to wallet ------------------------------------//
const addMoneyToWallet = async(req, res)=>{
    try {
        const {amount}=req.body
      
        const id = crypto.randomBytes(8).toString('hex');
        
        var options={
            amount:amount*100,
            currency:'INR',
            receipt:'Hello'+id
        }

        instance.orders.create(options,(err, order)=>{
            if(err){
                res.json({status:false});
            }else{
                res.json({status:true, payment:order})
            }
        })

    } catch (error) {
        console.log(error);
        res.render('500')
    }
};


// ----------------------------------------Verify Wallet Payment--------------------------------------//
const verifyWalletpayment = async(req, res)=>{
    try {
        const userId = req.session.user_id;
        
        const details = req.body;
        
        const amount = parseInt(details.order.amount)/100;
     
        let hmac = crypto.createHmac('sha256', process.env.KEY_SECRET)

        hmac.update(details.payment.razorpay_order_id + '|' + details.payment.razorpay_payment_id);

            hmac = hmac.digest('hex');
            if(hmac===details.payment.razorpay_signature){
                const user = await User.findById(userId);
                const currentWalletBalance = user.wallet || 0;
                
                const updatedBalance = currentWalletBalance + amount;
            

                const walletHistory={
                    transactionDate:new Date(),
                    transactionDetails: 'Deposited via Razorpay',
                    transactionType:"Credit",
                    transactionAmount: amount,
                    currentBalance: updatedBalance
                    
                }
               

                await User.findByIdAndUpdate({_id:userId},
                    {$inc:{wallet:amount},
                    $push:{walletHistory}
                });

                return res.json({status:true});
            }else{
                return res.json({status:flase});
            }
        
    } catch (error) {
        console.log(error);
        res.render('500')
    }
};

//-------------------------------- Wallet History----------------------------//

const walletHistory = async (req, res) => {
    try {
        // Search
        var search = '';
        if (req.query.search) {
            search = req.query.search;
        }

        // Pagination
        var page = 1;
        if (req.query.page) {
            page = parseInt(req.query.page, 10);
        }

        var limit = 6;

        const userId = req.session.user_id;

    
        const user = await User.findById(userId);

        // Access the walletHistory array and sort it by date in descending order
        const walletHistoryData = user.walletHistory.sort((a, b) =>b.transactionDate - a.transactionDate);

        // Perform search if applicable
        const filteredData = walletHistoryData.filter(data =>
            data.transactionDetails.includes(search) || data.transactionType.includes(search)
        );

        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedData = filteredData.slice(startIndex, endIndex);
            
        

        const count = filteredData.length;

        // Render the template with the paginated data
        res.render('walletHistory', {
            user,
            walletHistory: paginatedData,
            totalPages: Math.ceil(count / limit),
            currentPage: page,
            limit: limit,
        });
    } catch (error) {
        console.log(error);
        res.render('500');
    }
};

  





module.exports ={
    loadRegister,
    insertUser,
    loadOtp,
    verifyOtp,
    resendOtp,
    loginLoad,
    verifyLogin,
    loadHome,
    productLoad,
    loadProductDetails,
    userLogout,
    forgetPassword,
    forgetVerify,
    resetPasswordLoad,
    resetPassword,
    loadProfile,
    loadAddress,
    loadAddAddress,
    addAddress,
    loadEditAddress,
    updateUserAddress,
    loadChangePassword,
    changePasswordVerify,
    getWallet,
    addMoneyToWallet,
    verifyWalletpayment,
    walletHistory

}