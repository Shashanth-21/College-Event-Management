var mongoose = require('mongoose');
var MovieSchema = mongoose.Schema({
	EventId:String,
	comments: [
		{
			type: mongoose.Schema.Types.ObjectId,
			ref: "Comment"
		}
	]
});

module.exports = mongoose.model("Movie",MovieSchema);