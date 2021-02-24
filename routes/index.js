var express = require("express"),
	router = express.Router(),
	passport = require("passport"),
	User = require('../models/user.js'),
	LocalStrategy = require('passport-local'),
	Movie = require("../models/events"),
	Comment = require("../models/comment");
const mysql = require('mysql2');
var middleware = require("../middleware");
const conn = require('../dbConfig');
const { register } = require("../models/user.js");

//Root Route
router.get("/", function (request, respond) {

	respond.render("landing");
});

//Register Form
router.get("/register", (request, respond) => {
	console.log("Registraion");
	console.log(request.user);
	respond.render("register", { currentUser: request.user });
});

//Sign Up Logic
router.post("/register", (request, respond) => {
	var newUser;
	if (request.body.Role) {
		newUser = new User({ username: request.body.username, role: "Admin" });
	}
	else
		newUser = new User({ username: request.body.username, role: "student" });
	User.register(newUser, request.body.password, (err, createdUser) => {
		if (err) {
			console.log(err);
			console.log(err.message);
			request.flash("error", err.message);
			return respond.redirect("register");
		}
		console.log(createdUser.username);


		var renderFileLoc;
		if (request.body.Role)
			renderFileLoc = "register/club";
		else
			renderFileLoc = "register/student";

		passport.authenticate("local")(request, respond, () => { respond.redirect(renderFileLoc); });
	});
});

// signup details from student
router.get("/register/student", middleware.isLoggedIn, (request, respond) => {
	respond.render("signup/student");

});

router.post("/register/student", middleware.isLoggedIn, (request, respond) => {

	console.log("posted");
	console.log(request.user);
	console.log(request.body);
	const body = request.body;
	conn.query(
		//'INSERT INTO student VALUES (?,?,?,?,?,?,?)',[request.user.username,body.sName,body.sUsn,body.sDepartment,body.sAddress,body.sContactNo,body.sCGPA],
		'INSERT INTO Student VALUES (?,?,?,?,?,?,?)', [request.user.username, body.sUsn, body.sName, body.sEmail, body.sDepartment, body.sSection, body.sSemester],
		function (err, results, fields) {
			if (err) {
				console.log(err.sqlMessage);
				console.log("Failure");
				console.log(request.params);

				request.flash('error', 'Invalid Details USN or Email already taken');
				respond.redirect("student");
			}
			else {

				console.log(results);

				request.flash("success", "Added Details successfully");
				respond.redirect("/events");
			}
			// results contains rows returned by server
			// console.log(fields); // fields contains extra meta data about results, if available
		}
	);


});

// signup details from club
router.get("/register/club", (request, respond) => {
	respond.render("signup/club");

});

router.post("/register/club", middleware.isLoggedIn, (request, respond) => {

	console.log("posted");
	//respond.redirect("/events");
	const flag = 1;
	console.log(request.user);
	console.log(request.body);
	const body = request.body;
	conn.query(
		'INSERT INTO Club (Admin_Id,ClubName,President,Insta_Id,Fb_Id,Start_Year) VALUES (?,?,?,?,?,?)', [request.user.username, body.cName, body.cPres, body.cInsta, body.cFb, body.cYear],
		function (err, results, fields) {
			if (err) {
				console.log(err);
				console.log("Failure");
				flag = 0;
				request.flash('error', 'Club Name Should be Unique');
				respond.redirect("club");
			}
			else {
				console.log(results);
				request.flash("success", "club details added successfully");
				respond.redirect("/events");
			}

			// results contains rows returned by server
			// console.log(fields); // fields contains extra meta data about results, if available
		}
	)

	//request.flash("success", "Added Details Succesfully");
	//respond.redirect("/events");
});

//LOgin Form 
router.get("/login", (request, respond) => {
	console.log(request.flash("error"));
	respond.render("login");
});


//apk.post("/login", middleware,callback)
router.post("/login", passport.authenticate(
	"local", { successRedirect: "/events", failureRedirect: "/login", failureFlash: "Invalid Username or Password", successFlash: "Logged in Successfully" }));

//LogOut Route
router.get("/logout", (request, respond) => {
	request.flash("success", "logged you out");
	request.logout();
	respond.redirect("/events");
});

//result


//MyAcc

router.get("/myAcc", middleware.isLoggedIn, (request, respond) => {

	if (request.user.role == 'student') {
		conn.query(
			'SELECT * FROM Student WHERE Username=?', [request.user.username],
			function (err, results, fields) {
				if (err) {
					console.log(err);
				}
				else
				{
					if( results.length==0)
						respond.redirect("/register/student");
					
				    else
					respond.render("signup/studentEdit", { data: results[0], currentUser: request.user });
				}
					
			}
		);
	}
	else {
		conn.query(
			'SELECT * FROM Club WHERE Admin_Id=?', [request.user.username],
			function (err, results, fields) {
				if (err)
					console.log(err);
				else
				{
					if( results.length==0)
						respond.redirect("/register/club");
					else
					{
						
						respond.render("signup/clubEdit", { data: results[0], currentUser: request.user });
					}
					
				}
			}
		);

	}



});

router.post("/myAcc", middleware.isLoggedIn, (request, respond) => {

	console.log("posted");

	const body = request.body;


	if (request.user.role == 'student') {
		conn.query(
			'UPDATE Student SET USN=?,SName=?,Email=?,Department=?,Section=?,Semester=? WHERE Username=?', [body.sUsn, body.sName, body.sEmail, body.sDepartment, body.sSection, body.sSemester, request.user.username],
			function (err, results, fields) {
				if (err) {
					console.log(err);
					request.flash("error", "Details Matched with other user");
					respond.redirect("myAcc");
				}
				else {
					console.log(results);
					request.flash("success", "Details Updated");
					respond.redirect("/events");
				}

			}
		);

	}
	else {
		conn.query(
			'UPDATE Club SET  ClubName=?, President=?, Insta_Id=?, Fb_Id=?, Start_Year=? WHERE Admin_Id=?', [body.cName, body.cPres, body.cInsta, body.cFb, body.cYear, request.user.username],
			function (err, results, fields) {
				if (err) {
					console.log(err);
					request.flash("error", "Details Matched with other user");
					respond.redirect("myAcc");
				}
				else {
					console.log(results);
					request.flash("success", "Details Updated");
					respond.redirect("/events");
				}

			}
		);

	}


});

//middleware
function isLoggedIn(request, respond, next) {
	if (request.isAuthenticated()) {
		return next();
	}
	respond.render("login");
}

module.exports = router;
