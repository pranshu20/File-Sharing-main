//import { ObjectID } from "bson";
const mongoose =require("mongoose");
//import { stringify } from "querystring";
//if( !mongoose.Types.ObjectId.isValid(id) ) return false;
const UserSchema = new mongoose.Schema({
	email: {
		type: String,
		//required: true,
        unique: true,
	},
    // password: {
    //     type: String,
    //     required: true,
    // },
    name:{
        type: String,
        //required: true,
    },
    shared:[{
        type: String,
        // ref: 'file',
    }],
    // edit: [{
    //     type: String,
    //     required: true,
    // }],
    MyFiles : [{
        type: String,
        // ref: 'file',
    }]


});
const user = mongoose.model("user",UserSchema);
module.exports = user;
//export default mongoose.model("user", UserSchema);