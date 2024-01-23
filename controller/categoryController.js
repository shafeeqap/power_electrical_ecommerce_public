const { default: mongoose } = require('mongoose');
const Category = require('../models/categoryModel');
const Offer = require('../models/offerModel');
const Product = require('../models/productModel');
const { json } = require('express');

//--------------------------------------------- View Category Page------------------------------------//
const viewCategory = async(req,res)=>{
    try {
        
            // search
            var search='';
            if(req.query.search){
                search=req.query.search;
            }
    
            //Pagination
            var page=1;
            if(req.query.page){
                page=parseInt(req.query.page);
            }
    
            const limit=6;
    
        const categoryData = await Category.find({
            $or:[
                {categoryName:{$regex:'.*'+search+'.*', $options:'i'}},
                {description:{$regex:'.*'+search+'.*', $options:'i'}},
             
            ]
        }).limit(limit*1)
        .skip(Math.max((page-1)*limit,0))
        .populate('offer')
        .exec();

    

        // count
        const count = await Category.find({ 
            $or:[
                {categoryName:{$regex:'.*'+search+'.*', $options:'i'}},
                {description:{$regex:'.*'+search+'.*', $options:'i'}},
  
            ]
        }).countDocuments();

        const availableOffers = await Offer.find({status:true, expiryDate:{$gte: new Date()}});
                
    
    
        res.render('view-category',{
            title:'View Category',
            categoryData,
            totalPages:Math.ceil(count/limit),  //Ex:- count of document/limit (9/6 = 1.5 => 2)
            currentPage:page,   // page 1
            availableOffers
        }); 
    
    } catch (error) {
        console.log(error);
        res.status(500).send('Server error');
    }
}

//------------------------------------------------ Add new category Load --------------------------------//
const addCategoryLoad = async(req,res)=>{
    try {
        
        res.render('add-category',{title:'Add Category'})

    } catch (error) {
        console.log(error);
    }
};

//------------------------------------------------- Add new category -----------------------------//
const addCategory = async(req,res)=>{
    try {
        const categoryName=req.body.categoryName;
        const description=req.body.description;
        const image=req.file.filename;

        const category=new Category({
            categoryName:categoryName,
            description:description,
            image:image
        
        })
        const categoryData = await category.save();
       

        if(categoryData){
            
            res.redirect('/admin/view-category');
        }else{
        
            res.render('/admin/add-category',{title:'Something Wrong'});
        }
    } catch (error) {
        console.log(error);
        res.status(500).send('Server error');
    }
}

//--------------------------------------------------- Edit Category Load ---------------------------------------//
const editCategoryLoad = async(req,res)=>{
    try {
        const id = req.query.id;
       
        const categoryData = await Category.findById({_id:id});
      
        if(categoryData){
            res.render('edit-category',{
                title:'Edit Category',
                categoryData
            });
        }else{
            res.redirect('/admin/view-category');
        }

    } catch (error) {
        console.log(error);
    }
}

//-------------------------------------------------------- Update Category --------------------------------------//
const updateCategory = async(req,res)=>{
    try {
        
        const id = req.body.id;
    
        const categoryData = await Category.findByIdAndUpdate({_id:id},
            {$set:{
                categoryName:req.body.category,
                description:req.body.description,
                image:req.file.filename,
                is_block: req.body.is_block,
            }});
            
            if(categoryData){
                res.redirect('/admin/view-category');
            }else{
                res.render('edit-category');
            }
            

    } catch (error) {
        console.log(error);
    }
}

//--------------------------------------------- Category List/Unlist ---------------------------------------//
const categoryListorUnlist = async(req,res)=>{
    try {
        const id = req.query.id;
     
        const categoryData = await Category.findById({_id:id});
       
        if(categoryData.is_block===true){
            await Category.updateOne({_id:id},{$set:{is_block:false}});
          
            res.redirect('/admin/view-category');
        }else{

            await Category.updateOne({_id:id},{$set:{is_block:true}});
            res.redirect('/admin/view-category');
        };
        


    } catch (error) {
        console.log(error);
    }
};

// ------------------------------------ Apply Category Offer -------------------------------//
const applyOffer = async (req, res) => {
    try {
        const { offerId, categoryId } = req.body;


        const offerData = await Offer.findOne({ _id: offerId });

        if (!offerData) {
            return res.json({ status: false, message: 'Offer not found' });
        }


        const categoryData = await Category.findOneAndUpdate(
            { _id: categoryId },
            { $set: { offer: offerId } },
            { new: true }
        );

        if (!categoryData) {
            return res.json({ status: false, message: 'Category not found' });
        }

        const updatedProduct = await Product.updateMany(
            { category: categoryId },
            [
                {
                    $set: {
                        categoryOffer: new mongoose.Types.ObjectId(offerId),
                        categoryDiscountedPrice: {
                            $subtract: [
                                "$price",
                                {
                                    $divide: [
                                        { $multiply: ["$price", offerData.percentage] },
                                        100,
                                    ],
                                },
                            ],
                        },
                    },
                },
            ],
            { new: true, lean: true }
        );
        
        
        

        if (updatedProduct) {
            res.json({ status: true });
        } else {
            return res.json({ status: false, message: 'Failed to update products' });
        }


    } catch (error) {
        console.log(error);
        res.status(500).json({ status: false, message: 'Internal Server Error' });
    }
};



// ------------------------------------- Remove Apply Offer -------------------------------------------//Address

const removeCategoryOffer = async (req, res) => {
    try {
        const { categoryId } = req.body;

        const categoryData = await Category.findOne({ _id: categoryId });

        if (!categoryData) {
            return res.json({ status: false, message: 'Category not found' });
        }

        if (categoryData.offer) {
            const updateCategory = await Category.updateOne(
                { _id: categoryId },
                {
                    $unset: {
                        offer: ""
                    }
                }
            );

            const updatedProduct = await Product.updateOne(
                { category: categoryId },
                {
                    $unset: {
                        categoryOffer: "",
                        categoryDiscountedPrice: ""
                    }
                }
            );

            return res.json({status:true});



        }else{

            return res.json({status:false, message: "Offer field does not exist in the category",});

        };

        

    } catch (error) {
        console.log(error);
        res.status(500).json({ status: false, message: 'Internal Server Error' });
    }
}




module.exports={
    addCategoryLoad,
    addCategory,
    viewCategory,
    editCategoryLoad,
    updateCategory,
    categoryListorUnlist,
    applyOffer,
    removeCategoryOffer
}