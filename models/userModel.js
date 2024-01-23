// !mdbgum

const mongoose = require('mongoose'); // Erase if already required

// Declare the Schema of the Mongo model
var userSchema = new mongoose.Schema({
    name:{
        type:String,
        required:true,
    },
    email:{
        type:String,
        required:true,
    },
    mobile:{
        type:String,
        required:true,
    },
    // image:{
    //     type:String,
    //     required:true,
    // },
    password:{
        type:String,
        unique:true,
        required:true,
    },
    is_admin:{
        type:Number,
        required:0,
       
    },
    is_varified:{
        type:Boolean,
        default:false
    },
    token:{
        type:String,
        default:''
    },
    is_block:{
        type:Boolean,
        default:false
    },
    createdAt:{
        type:Date,
        default:Date.now
    },
    wallet:{
        type:Number,
        default:0
    },
    walletHistory:[{
        transactionDate:{
            type:Date
        },
        transactionDetails:{
            type:String
        },
        transactionType:{
            type:String
        },
        transactionAmount:{
            type:Number
        },
        currentBalance:{
            type:Number
        }
    }]


}, {timestamp:true});

//Export the model
module.exports = mongoose.model('User', userSchema);