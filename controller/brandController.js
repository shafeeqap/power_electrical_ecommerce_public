const Brand = require('../models/brandModel');


//------------------------------------------ View Brand --------------------------------------------//
const viewBrand = async(req,res)=>{
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

    
        const brandData = await Brand.find({
            $or:[
                {brandName:{$regex:'.*'+search+'.*', $options:'i'}},
                {specification:{$regex:'.*'+search+'.*', $options:'i'}},
                
             
            ]
        }).limit(limit*1).skip(Math.max((page-1)*limit,0)).exec();

        // count
        const count = await Brand.find({ 
            $or:[
                {brandName:{$regex:'.*'+search+'.*', $options:'i'}},
                {specification:{$regex:'.*'+search+'.*', $options:'i'}},
  
            ]
        }).countDocuments();
        
    
        res.render('view-brand',{
            title:'View Brand',
            brandData,
            totalPages:Math.ceil(count/limit),  //Ex:- count of document/limit (9/6 = 1.5 => 2)
            currentPage:page,   // page 1
        });
        
    } catch (error) {
        console.log(error);
        // res.status(500).send('Internal Server Error');
    }
};

//------------------------------------------------- AddbBrand Load ------------------------------------//
const addBrandLoad = async(req,res)=>{
    try {
        res.render('add-brand',{title:'Add Brand'})
        
    } catch (error) {
        console.log(error);
    }
};

// Add Brand
const addBrand = async(req,res)=>{
    try {

        const brand = new Brand({
            brandName:req.body.brandName,
            specification:req.body.specification,
            image:req.file.filename
        });
        const brandData = await brand.save();
        
        if(brandData){
            res.redirect('/admin/view-brand');
        }else{
            res.render('add-brand');
        }

        
    } catch (error) {
        console.log(error);
    }
};

// Edit Brand Load
const editBrandLoad = async(req,res)=>{
    try {
        const brand_id = req.query.id;
        
        const brandData = await Brand.findById({_id:brand_id});
        
        if(brandData){
            res.render('edit-brand',{
                title:'Edit Brand',
                brandData
            });
        }else{
            res.redirect('/admin/view-brand');
        }

    } catch (error) {
        console.log(error);
    }
};

// Edit Brand
const editBrand = async(req,res)=>{
    try {
        const brand_id = req.body.id;
    
        const brandData = await Brand.findByIdAndUpdate({_id:brand_id},
            {$set:{
                brandName:req.body.brandName,
                specification:req.body.specification,
                image:req.file.filename,
                is_block:req.body.is_block
            }});
        

        if(brandData){
            res.redirect('/admin/view-brand');
        }else{
            res.redirect('/admin/edit-brand');
        }

        
    } catch (error) {
        console.log(error);
    }
};

// Brand List/Unlist
const brandListorUnlist = async(req,res)=>{
    try {
        const brand_id = req.query.id;
       
        const brandData = await Brand.findById({_id:brand_id});
       
        if(brandData.is_block===false){
            await Brand.updateOne({_id:brand_id},{$set:{is_block:true}});
            res.redirect('/admin/view-brand');

        }else{
            await Brand.updateOne({_id:brand_id},{$set:{is_block:false}});
            res.redirect('/admin/view-brand');
        }
        
    } catch (error) {
        console.log(error);
    }
}

module.exports={
    viewBrand,
    addBrandLoad,
    addBrand,
    editBrandLoad,
    editBrand,
    brandListorUnlist
}