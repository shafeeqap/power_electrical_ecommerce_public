const Offer = require('../models/offerModel');


//------------------------------------------- Load View Offer Page ------------------------------------------//
const loadViewOffer = async (req, res) => {
    try {
        // Search
        let search = '';
        if (req.query.search) {
            search = req.query.search;
        }

        // Pagination
        let page = 1;
        if (req.query.page) {
            page = parseInt(req.query.page);
        }

        const limit = 6;

        // MongoDB Query
        const query = {
            $or: [
                { offerName: { $regex: new RegExp(search, 'i') } },
                // { status: { $regex: new RegExp(search, 'i') } },
                { percentage: parseInt(search) || 0 },
            ],
        };
        

        // Check if the search string is a valid date
        if (!isNaN(new Date(search))) {
            query.$or.push(
                { startingDate: { $gte: new Date(search) } },
                { expiryDate: { $gte: new Date(search) } }
            );
        } else {
            // If it's not a valid date, try to parse as a number for the percentage field
            const parsedPercentage = parseInt(search);
            if (!isNaN(parsedPercentage)) {
                query.$or.push({ percentage: parsedPercentage });
            }
        }

        // Fetching Offer Data
        const offerData = await Offer.find(query)
            .limit(limit)
            .skip(Math.max((page - 1) * limit, 0))
            .exec();

        // Count
        const count = await Offer.countDocuments(query);
        res.render('view-offers', {
            title: 'View Offers',
            offerData: offerData,
            now: new Date(),
            totalPages: Math.ceil(count / limit),
            currentPage: page,
        });


        return;
        
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
};


// --------------------------------------- Load Add Offer Page ---------------------------------------------//
const loadAddOffer = async(req, res)=>{
    try {

        res.render('add-offer',{title:'Add Offer'});
        
    } catch (error) {
        console.log(error);
        res.status(500).send('Internal Server Error');
    }
};

//-------------------------------------- Add Offers -----------------------------------------------------//
const addOffer = async(req, res)=>{
    try {
       
        const { startingDate, expiryDate, percentage }=req.body;
        const offerName = req.body.offerName.toUpperCase();

        const existOffer = await Offer.findOne({offerName:offerName});
        if(existOffer){
            res.render('add-offer',{
                message:'Offer already existing',
                title:'add-offer'
            });

        }else{

            const offers = new Offer({
                offerName:offerName,
                startingDate:startingDate,
                expiryDate:expiryDate,
                percentage:percentage
            });

            await offers.save();

            res.redirect('/admin/view-offers');

        }
        
        
    } catch (error) {
        console.log(error);
        res.status(500).send('Internal Server Error');
    }
};


// ------------------------------------------- Load Edti Offer Page ------------------------------------------//
const loadEditOffer = async(req, res)=>{
    try {

        const offerId = req.query.offerId;

        const offerData = await Offer.findById({_id:offerId})
        if(offerData){
            res.render('edit-offer',{
                title:'Edit Offer',
                offerData:offerData
            })
        }
        
        
    } catch (error) {
        console.log();
        res.status(500).send('Internal Server Error');
    }
};

// ---------------------------------- Update Offer ---------------------------------------------//
const editOffer = async(req, res)=>{
    try {

        const id = req.body.id;
        
        const updatedOffer = await Offer.updateOne({_id:id},
            {$set:{
                offerName:req.body.offerName.toUpperCase(),
                startingDate:req.body.startingDate,
                expiryDate:req.body.expiryDate,
                percentage:req.body.percentage

            }});

            if(updatedOffer){

                res.redirect('/admin/view-offers')
            }
        
    } catch (error) {
        console.log(error);
        res.status(500).send('Internal Server Error');
    }
};

//------------------------------------------ Cancel Offer ---------------------------------------------//
const cancelOffer = async(req, res)=>{
    try {

        const offerId = req.body.offerId
        
        const cancelled = await Offer.updateOne({_id:offerId},
            {$set:{
                status:false
            }});

            res.json({status:true});
        
    } catch (error) {
        console.log(error);
        res.status(500).send('Internal Server Error');
    }
}

module.exports={
    loadViewOffer,
    loadAddOffer,
    addOffer,
    loadEditOffer,
    editOffer,
    cancelOffer
}
