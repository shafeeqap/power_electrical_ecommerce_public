const mongoose = require('mongoose');

const contactScheema = new mongoose.Schema({

    clientName:{
        type:String,
        required:true
    },
    email:{
        type:String,
        required:true
    },
    subject:{
        type:String,
        required:true
    },
    message:{
        type:String,
        required:true
    },
    createdAt:{
        type:Date,
        default:Date.now,
    }

},{timestamps:true});

module.exports = mongoose.model("Contact",contactScheema);
