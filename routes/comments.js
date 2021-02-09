var express = require("express"),
	router	= express.Router({mergeParams:true}),
	Movie 	= require("../models/events"),
	middleware=require("../middleware"),
	Comment	= require("../models/comment"),
	conn = require('../dbConfig');
const { text } = require("body-parser");
	var Sentiment = require("sentiment");
//Comments NEW
var senti = new Sentiment();
router.get("/new",middleware.isLoggedIn,(request,respond)=>{
	Movie.findOne({EventId:request.params.id},function(err,foundMovie){
	if (err){
		console.log(err);
	}else{
		Comment.findOne({"EventId": request.params.id, "author.username":request.user.username},function(err, foundComment){
			if(err)
			console.log(err);
			else
			{
				console.log(foundComment);
				if( foundComment)
				{
					request.flash("error","Feed back already given");
					respond.redirect("/events/"+foundMovie.EventId);
				}
				else{
					respond.render("comments/new",{movie:foundMovie, currentUser:request.user});
				}
			}
		})
		console.log(foundMovie);
		
	}
	});
});
router.get("/positive",middleware.isLoggedIn,(request,respond)=>{
	Movie.findOne({ EventId: request.params.id }).populate("comments").exec(function (err, foundMovie) {
		if (err) {
			console.log(err);

		} else {
        console.log(foundMovie);
			console.log(request.user);
			var count=0;
			foundMovie.comments.forEach(comm => {
				if( comm.sent > 0)
					count++;
			});	
		respond.render("comments/showpos", { currentUser: request.user, movie: foundMovie, count: count });
		}
	});
});
router.get("/negative",middleware.isLoggedIn,(request,respond)=>{
	Movie.findOne({ EventId: request.params.id }).populate("comments").exec(function (err, foundMovie) {
		if (err) {
			console.log(err);

		} else {
			console.log(foundMovie);
			console.log(request.user);
			var count=0;
			foundMovie.comments.forEach(comm => {
				if( comm.sent < 0)
					count++;
			});			
		respond.render("comments/showneg", { currentUser: request.user, movie: foundMovie, count: count});
		}
	});
});

//Comments Create
router.post("/",middleware.isLoggedIn,(request,respond)=>{
	Movie.findOne({EventId:request.params.id},(err,foundMovie)=>{
		if(err){
			console.log(err);
		}else{
			var ob = request.body.com;
					console.log(ob.text);
					var res = senti.analyze(ob.text);
					console.log(res);
			var nAuthor = 
			{
				id : request.user._id,
				username: request.user.username,
			}
			var nComment = 
			{
				text: ob.text,
				sent: res.score,
				author: nAuthor,
				EventId: request.params.id
			};

			Comment.create(nComment,(err,new_comment)=>{
				if(err){
					console.log(err);
				}else{
					//add usernamne and id 
					//savecoment
					new_comment.save(nComment);
					foundMovie.comments.push(new_comment);
					foundMovie.save();
					request.flash("success","Feedback Submitted");
					respond.redirect("/events/"+foundMovie.EventId);
				}
			});
		}
	});
});
//EDit
router.get("/:comment_id/edit",middleware.checkCommentOwnership,(request,respond)=>{
	console.log(request.params);
	Comment.findById(request.params.comment_id,(err,foundComment)=>{
		if(err){
			request.flash("error","Something went wrong");
			respond.redirect("back");
		}else{
			respond.render("comments/edit",{movie:request.params.id,comment:foundComment});
		}
	});
});
//Update
router.put("/:comment_id",middleware.checkCommentOwnership,(request,respond)=>{
	Comment.findByIdAndUpdate(request.params.comment_id,request.body.com,(err,updatedComment)=>{
		if(err){
			respond.redirect("back");
		}else{
			respond.redirect("/events/"+request.params.id);
		}
	});
});
//Delete
router.delete("/:comment_id",middleware.checkCommentOwnership,(request,respond)=>{
	Comment.findByIdAndRemove(request.params.comment_id,(err)=>{
		if(err){
			console.log(err);
			respond.redirect("back");
		}else{
			request.flash("success","Successfully deleted Feedback");
			respond.redirect("/events/"+request.params.id);
		}
	});
});
module.exports = router;