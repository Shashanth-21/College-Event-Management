var mongoose = require('mongoose');
var commentSchema =  mongoose.Schema({
	text: String,
	sent: Number,
	author: {
		id:{
			type: mongoose.Schema.Types.ObjectId,
			ref:"User"
		},
		username:String
	},
	EventId: String
});
module.exports = mongoose.model("Comment",commentSchema);