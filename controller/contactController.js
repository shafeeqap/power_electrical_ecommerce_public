const Contact = require('../models/contactModal');
const User = require('../models/userModel');

const contactLoad = async(req, res)=>{
    try {

        const user =  await User.findById(req.session.user_id);
    

        res.render('contact',{
            user:user,
        });
        
    } catch (error) {
        console.log(error);
    }
};


module.exports={
    contactLoad,
}