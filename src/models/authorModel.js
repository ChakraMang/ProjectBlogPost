const mongoose = require('mongoose');
const validator = require('validator');





const authorSchema = new mongoose.Schema({
 fname: {
        type: String,
        required: true
    },
    lname: {
        type: String,
        required: true

    },
    title: {
        type: String,
        enum: [Mr, Mrs, Miss]
    },
    email:{
        type:String,
        validate:{
              validator: validator.isEmail,
              message: '{VALUE} is not a valid email',
             unique:true
            }
        },
    password: {
        type: String,
        required: true
    }
},
{ timestamps: true });


module.exports = mongoose.model('Book', authorSchema) //users
