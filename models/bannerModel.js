const mongoose = require('mongoose');


const bannerSchema = new mongoose.Schema({
    bannerHead:{
        type:String,
        requird:true
    },
    description:{
        type:String,
        require:true,
    },
    image:{
        type:Array,
        require:true
    },
    status:{
        type:Boolean,
        default:true
    }
});

module.exports = mongoose.model('Banner',bannerSchema);