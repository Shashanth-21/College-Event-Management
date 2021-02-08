var express = require("express"),
	router = express.Router(),
	middleware = require("../middleware"),
	Movie = require("../models/events");
const { request } = require("express");
const conn = require('../dbConfig');
// Index Page 
var today = new Date();
var date = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate();
const https = require("https");
const qs = require("querystring");
var Paytm = require("paytmchecksum");
const checksum_lib = require("../Paytm/checksum");
const config = require("../Paytm/config");
const shortid = require('shortid');
const { SSL_OP_EPHEMERAL_RSA } = require("constants");

const parseUrl = express.urlencoded({ extended: false });
const parseJson = express.json({ extended: false });
const bodyparser = require('body-parser');
const path = require('path');
const PUBLISHABLE_KEY = "pk_test_51I2K79A5JWiCHFlnwAHeXfeYKBhgR5oUVKISXK9nhLVZ4QonR9yt6gbKt2qGPD7bfyNuIlWmIkAYFOPwvFnylZBE00BJgjaZUL";
const SECRET_KEY = "sk_test_51I2K79A5JWiCHFln7RDuFVcv9op2KO5nobrnI54Z9LQaarhR4PiBsQ5SRBfYj3OBhuXdEQW6fKGml9jI6Gh58n6y00JSvmh4GH";
const stripe = require("stripe")(SECRET_KEY);
router.get("/", (request, respond) => {

	conn.query(
		'SELECT * FROM Events ORDER BY date ',
		function (err, results, fields) {
			if (err)
				console.log(err);
			console.log(results);
			respond.render("events/index", { list: results, currentUser: request.user, display: results.slice(0, Math.min(3, results.length)) });
		}
	);

});

// Create offer
router.post("/", middleware.isLoggedIn, (request, respond) => {

	const body = request.body;
	conn.query(
		'SELECT * from Club where Admin_Id=?', [request.user.username],
		function (err, club, fields) {
			if (err)
				console.log(err);
			else {
				console.log(request.user.username);
				console.log(club);
				conn.query(
					'INSERT INTO Events(Name,date,Venue,Fee,Last_Date,Club_Code,Image) VALUES (?,?,?,?,?,?,?)', [body.eName, body.eDate, body.eVenue, body.eFee, body.eLDate, club[0].idClubs, body.eImage],
					function (err, results, fields) {
						if (err)
							console.log(err);
						console.log(results);
						conn.query('SELECT * FROM Events WHERE Name=?', [body.eName], function (err, event, fields) {
							if (!err) {
								console.log(event);
								var newEvent =
								{
									EventId: event[0].idEvents
								};
								Movie.create(newEvent, (err, New_Event) => {
									if (err) {
										console.log("Error While adding Data To Db");
									}
									console.log(New_Event);
								});
							}
						});

					}
				);
			}
		}
	);
	request.flash("success", "Event Added");
	respond.redirect("/events");
});

// New Page
router.get("/new", middleware.isLoggedIn, (request, respond) => {
	respond.render("events/new", { currentUser: request.user });
});
//new reg for events
router.post("/:id", middleware.isLoggedIn, (request, respond) => {
	console.log(request.user);
	console.log(request.params);
	console.log(request.body);

	conn.query(
		'SELECT * FROM Student WHERE Username=?', [request.user.username],
		function (err, Sresult, fields) {
			if (err)
				console.log(err);
			else {
				console.log(Sresult);

				conn.query(
					'REPLACE INTO Registrations (Reg_Id, Event_Id, Reg_Date, Reg_USN)values(?,?,?,?)', [request.params.id + Sresult[0].USN, request.params.id, date, Sresult[0].USN],
					function (err, results, fields) {
						if (err) {
							console.log(err);
							respond.redirect("/events");
						}
						else {
							console.log(results);
							//request.flash("sucess", "Successfully Registered");
							//respond.redirect("/events");
						}
					}
				);
			}

		}

	);
	request.flash("success", "Successfully Registered");
	respond.redirect("/events");


});


// Show Page
router.get("/:id", (request, respond) => {
	// Movie.findById(request.params.movieId).populate("comments").exec(function(err,foundMovie){
	// 	if (err){
	// 	console.log(err);
	// }else{
	// 	respond.render("events/show",{movie:foundMovie, currentUser:request.user});
	// }
	// });
	Movie.findOne({ EventId: request.params.id }).populate("comments").exec(function (err, foundMovie) {
		if (err) {
			console.log(err);

		} else {
			console.log(foundMovie);
			console.log(request.user);
			conn.query(
				'SELECT * FROM Events WHERE idEvents = ?', [request.params.id],
				function (err, results, fields) {
					if (err)
						console.log(err);
					else {
						console.log(results + "hi");
						conn.query(
							'SELECT * FROM Club WHERE idClubs=?', [results[0].Club_Code],
							function (err, cresults, fields) {
								if (err)
									console.log(err);
								else {
									console.log(cresults);
									respond.render("events/show", { events: results[0], club: cresults[0], currentUser: request.user, movie: foundMovie });
								}
							}
						);

					}
				}
			);
		}
	});
	console.log(request.params);



});

router.get("/:id/regs", middleware.isLoggedIn, (request, respond) => {

	conn.query('SELECT * FROM Registrations JOIN Student ON Registrations.Reg_USN = Student.USN AND Registrations.Event_Id = ?', [request.params.id], function (err, results, fields) {

		if (!err) {
			console.log(results);
			respond.render("events/regs", { stdeve: results, currentUser: request.user });
		}
		else {
			console.log(err);
			respond.redirect("/events");
		}
	});

});
// pay info
router.get("/:id/pay", (request, respond) => {
	conn.query('SELECT * FROM Events WHERE idEvents = ?', [request.params.id], function (err, results, fields) {

		if (!err) {
			respond.render("events/pay", { event: results[0], currentUser: request.user, key: PUBLISHABLE_KEY });
		}
		else {
			console.log(err);
			respond.redirect("/events/" + request.params.id);
		}
		//
	});
})
router.post("/:id/pay", function (req, res) {

	// Moreover you can take more details from user 
	conn.query(
		'SELECT * FROM Student WHERE Username=?', [req.user.username],
		function (err, Sresult, fields) {
			if (err) {
				console.log(err);
				res.redirect("/events");
			}
			else {
				//console.log(Sresult);
				console.log(req.body);
				stripe.customers.create({
					email: req.body.stripeEmail,
					source: req.body.stripeToken,
					name: Sresult[0].name,
					address: {
						line1: 'TC 9/4 Old MES colony',
						postal_code: '110092',
						city: 'New Delhi',
						state: 'Delhi',
						country: 'India',
					},
					// receipt_email: req.body.stripeEmail
				})
					.then((customer) => {

						return stripe.charges.create({
							amount: req.body.eFee*100,    // Charing Rs 25 
							description: "Event Fee",
							currency: 'INR',
							customer: customer.id
						});
					})
					.then((charge) => {
						console.log(charge);
						conn.query(
							'INSERT INTO Registrations (Reg_Id, Event_Id, Reg_USN, Reg_Date) values(?,?,?,?)', [req.params.id + Sresult[0].USN, req.params.id, Sresult[0].USN, date],
							function (err, Rresults, fields) {
								if (err) {
									console.log(err);
									console.log("Hiiiiiiiiiiiiiiiiiiiii");
									res.redirect("/events/" + req.params.id + "/pay");
								}
								else {
									console.log(Rresults);
									conn.query(
										'SELECT * FROM Registrations WHERE Event_Id=? AND Reg_USN=?', [req.params.id, Sresult[0].USN],
										function (err1, RESULTS, fields) {
											if (!err) {
												//console.log(RESULTS);
												conn.query('INSERT INTO Payments values(?,?,?,?)', [RESULTS[0].Reg_Id+req.params.id+date, RESULTS[0].Reg_Id, req.body.eFee, date], function (err2, Presults, fields) {
													if (!err) {
														console.log(Presults);				
													}
													else {
														console.log("Hiiiiiiiiiiiiiiiiiiiiiiiiii")
														console.log(err2);
													}
												});
											}
											else {
												console.log("wrestdfgvhbjxsdcrftvgbyhnujimcfvgby");
												console.log(err1);
											}
										}
									);
								}
							});
						})
								.catch((err) => {
								res.send(err)    // If some error occurs 
							});
					}

				//request.flash("sucess", "Successfully Registered");
				//respond.redirect("/events");
			});
			req.flash("success","Thanks for registering to the event");
			res.redirect("/events");
	});



router.get("/:id/edit", middleware.isLoggedIn, (request, respond) => {
	console.log(request.params);
	const body = request.body;
	conn.query('SELECT * FROM Events WHERE idEvents = ?', [request.params.id], function (err, results, fields) {

		if (!err) {
			respond.render("events/edit", { event: results[0], currentUser: request.user });
		}
		else {
			console.log(err);
			respond.redirect("/events");
		}
		//
	});
});
// //Backend
router.put("/:id", middleware.isLoggedIn, (request, respond) => {
	const body = request.body;
	conn.query('UPDATE  Events SET Name=?,date=?,Venue=?,Fee=?,Last_Date=?,Image=? WHERE idEvents=?', [body.eName, body.eDate, body.eVenue, body.eFee, body.eLDate,body.eImage, request.params.id], function (err, results, fields) {
		if (err) {
			console.log(err);
			respond.redirect("/events");
		} else {
			// console.log(request.body.m);
			// console.log(updatedMovie);

		}
	});

	request.flash("success", "Event Details Edited");
	respond.redirect("/events/" + request.params.id);

});


router.delete("/:id", middleware.isLoggedIn, (request, respond) => {
	Movie.findOneAndDelete({ EventId: request.params.id }, (err) => {
		if (err) {
			respond.redirect("/events");
			console.log(err);
		} else {
			conn.query('DELETE FROM Events  WHERE idEvents=?', [request.params.id], function (err, results, fields) {
				if (err) {
					console.log(err);
					respond.redirect("/events");
				}
			}
			);

		}
	});
	// respond.send("you are trying to delete");
	request.flash("success", "Event Deleted");
	respond.redirect("/events");

});


module.exports = router;