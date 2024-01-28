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
        res.render('error', { message: 'An error occurred', status: 500 });
    }
};

const newContact = async(req, res)=>{
    try {
        const {name, email, subject, message}=req.body;
        
        const contact = new Contact({
            clientName:name,
            email:email,
            subject:subject,
            message:message
        })

        const contactData = await contact.save();

        if(contactData){
            res.json({
                success:true, 
                message:"Thank you for contacting ! we will get touch with you."
            });
        }else{
            res.json({
                success:false,
                message:"Sorry some errors !."
            });
        }

    } catch (error) {
        console.log(error);
        res.render('error', { message: 'An error occurred', status: 500 });
    }
}


module.exports={
    contactLoad,
    newContact
}