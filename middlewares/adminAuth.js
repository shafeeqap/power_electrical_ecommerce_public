const isLogin = async(req,res,next)=>{
    try {
        if(req.session.admin_id){}

        else{
            res.redirect('/admin')
        }
        next();
        
        
    } catch (error) {
        console.log(error);
        res.status(500).send('Server Error');
    }
}

const isLogout = async(req,res,next)=>{
    try {
        if(req.session.admin_id){
            res.redirect('/admin/adminHome')
        }
        next();
        
    } catch (error) {
        console.log(error);
    }
}

module.exports={
    isLogin,
    isLogout
}