const Banner = require('../models/bannerModel');
const path = require('path');
const sharp = require('sharp');

//---------------------------------------- Load View Banner-----------------------------------//
const loadViewBanner = async(req, res)=>{
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

        const banner = await Banner.find({
            $or:[
                {bannerHead:{$regex:'.*'+search+'.*', $options:'i'}},
                {description:{$regex:'.*'+search+'.*', $options:'i'}},
             
            ]
        }).limit(limit*1).skip(Math.max((page-1)*limit,0)).exec();
        

        // count
        const count = await Banner.find({ 
            $or:[
                {bannerHead:{$regex:'.*'+search+'.*', $options:'i'}},
                {description:{$regex:'.*'+search+'.*', $options:'i'}},
  
            ]
        }).countDocuments();

        res.render('view-banner',{
            title:'View Banner',
            banner:banner,
            totalPages:Math.ceil(count/limit),  //Ex:- count of document/limit (9/6 = 1.5 => 2)
            currentPage:page,   // page 1
        });
    
        
    } catch (error) {
        console.log(error);
        res.status(500).send('Internal Server Error');
    }
};

//----------------------------------------- Load Add Banner Page -------------------------------// 
const loadAddBanner = async(req, res)=>{
    try {
        res.render('add-banner',{
            title:'Add Banner'
        });
        
    } catch (error) {
        console.log(error);
        res.status(500).send('Internal Server Error');
    }
};

//------------------------------------------------- Add Banner -------------------------------------//
const AddBanner = async(req, res)=>{
    try {
        const bannerHead = req.body.bannerHead;
        const description = req.body.description;

        const images = [];

        if(req.files && req.files.length>0){
            for(let i=0;i<req.files.length;i++){
                const filename = req.files[i].filename;

                // Resize image to 300x300 pixels
                await sharp(path.join(__dirname, '../public/adminAssets/images', filename))
                    .resize(300, 300)
                    .toFile(path.join(__dirname, '../public/adminAssets/images', 'resized-' + filename));
            
                images[i] = 'resized-' + filename;
            }
        }


        const banners = new Banner({
            bannerHead:bannerHead,
            description:description,
            image:images
        });

        const result = await banners.save();
    
        res.redirect('/admin/view-banner');

        
    } catch (error) {
        console.log(error);
        res.status(500).render('500');
    }
};

//------------------------------------------------ Load Edit Banner Page -----------------------------------------//
const loadEditBanner = async(req, res)=>{
    try {
        const bannerId = req.query.bannerId;
        const bannerData = await Banner.findOne({_id:bannerId});
       

        res.render('edit-banner',{
            title:'Edit Banner',
            bannerData:bannerData
        });
        
    } catch (error) {
        console.log(error);
        res.status(500).render('500');
    }
};


// ----------------------------------------------- Upadete Banner ---------------------------------------------//
const EditBanner = async (req, res) => {
    try {
        const bannerId = req.body.id;

        const images = [];

        if (req.files && req.files.length > 0) {
            for (let i = 0; i < req.files.length; i++) {
                const filename = req.files[i].filename;

                // Resize image to 300x300 pixels
                await sharp(path.join(__dirname, '../public/adminAssets/images', filename))
                    .resize(300, 300)
                    .toFile(path.join(__dirname, '../public/adminAssets/images', 'resized-' + filename));
            
                images[i] = 'resized-' + filename;
            }
        }

        const bannerData = await Banner.findByIdAndUpdate(
            { _id: bannerId },
            {
                $set: {
                    bannerHead: req.body.bannerHead,
                    description: req.body.description,
                    image: images,
                },
            }
        );

        if (bannerData) {
        
            res.redirect('/admin/view-banner');
        } else {
           
            res.redirect('/admin/edit-banner');
        }
    } catch (error) {
        console.log(error);
        res.status(500).render('500');
    }
};

// -------------------------------------------- Banner Status ------------------------------------//
const bannerStatus = async(req, res)=>{
    try {

        const statusId = req.query.id;

        const statusData = await Banner.findById({_id:statusId});
        
        if(statusData.status===true){
            await Banner.updateOne({_id:statusId},{$set:{status:false}});

            res.redirect('/admin/view-banner');

        }else{
            await Banner.updateOne({_id:statusId},{$set:{status:true}});
            
            res.redirect('/admin/view-banner');
        }
        

        
    } catch (error) {
        console.log(error);
        res.status(500).render('500');
    }
}



module.exports={
    loadViewBanner,
    loadAddBanner,
    AddBanner,
    loadEditBanner,
    EditBanner,
    bannerStatus
}