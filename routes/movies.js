var express = require("express"),
	router = express.Router(),
	middleware = require("../middleware"),
	Movie = require("../models/movies");
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

const parseUrl = express.urlencoded({ extended: false });
const parseJson = express.json({ extended: false });

router.get("/", (request, respond) => {

	conn.query(
		'SELECT * FROM Events ORDER BY date',
		function (err, results, fields) {
			if (err)
				console.log(err);
			console.log(results);
			respond.render("movies/index", { list: results, currentUser: request.user });
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
					'INSERT INTO Events(Name,date,Venue,Fee,Last_Date,Club_Code) VALUES (?,?,?,?,?,?)', [body.eName, body.eDate, body.eVenue, body.eFee, body.eLDate, club[0].idClubs],
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
	respond.redirect("/movies");
});

// New Page
router.get("/new", middleware.isLoggedIn, (request, respond) => {
	respond.render("movies/new", { currentUser: request.user });
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
					'REPLACE INTO Registrations (Event_Id, Reg_Date, Reg_USN)values(?,?,?)', [request.params.id, date, Sresult[0].USN],
					function (err, results, fields) {
						if (err) {
							console.log(err);
							respond.redirect("/movies");
						}
						else {
							console.log(results);
							//request.flash("sucess", "Successfully Registered");
							//respond.redirect("/movies");
						}
					}
				);
			}

		}

	);
	request.flash("success", "Successfully Registered");
	respond.redirect("/movies");


});


// Show Page
router.get("/:id", middleware.isLoggedIn, (request, respond) => {
	// Movie.findById(request.params.movieId).populate("comments").exec(function(err,foundMovie){
	// 	if (err){
	// 	console.log(err);
	// }else{
	// 	respond.render("movies/show",{movie:foundMovie, currentUser:request.user});
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
									respond.render("movies/show", { events: results[0], club: cresults[0], currentUser: request.user, movie: foundMovie });
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
			respond.render("movies/regs", { stdeve: results, currentUser: request.user });
		}
		else {
			console.log(err);
			respond.redirect("/movies");
		}
	});

});
// pay info
router.get("/:id/pay", middleware.isLoggedIn, (request, respond) => {
	conn.query('SELECT * FROM Events WHERE idEvents = ?', [request.params.id], function (err, results, fields) {

		if (!err) {
			respond.render("movies/pay", { event: results[0], currentUser: request.user });
		}
		else {
			console.log(err);
			respond.redirect("/movies/" + request.params.id);
		}
		//
	});
})

// payment post route

router.post("/:id/pay", middleware.isLoggedIn, [parseUrl, parseJson], (req, res) => {
	var name, email;
	conn.query(
		'SELECT * FROM Student WHERE Username=?', [req.user.username],
		function (err, Sresult, fields) {
			if (err)
				console.log(err);
			else {
				console.log(Sresult);
				name = Sresult[0].Username;
				email = Sresult[0].Email;
				if (!req.body.eFee) {
					res.status(400).send('Payment failed')
				} else {
					var params = {};
					params['MID'] = config.PaytmConfig.mid;
					params['WEBSITE'] = config.PaytmConfig.website;
					params['CHANNEL_ID'] = 'WEB';
					params['INDUSTRY_TYPE_ID'] = 'Retail';
					params['ORDER_ID'] = 'TEST_' + new Date().getTime();
					params['CUST_ID'] = shortid.generate();
					params['TXN_AMOUNT'] = req.body.eFee;
					params['CALLBACK_URL'] = 'http://localhost:3000/movies/' + req.params.id + '/pay/callback';
					params['EMAIL'] = email;
					console.log(email);
					console.log(params);

					checksum_lib.genchecksum(params, config.PaytmConfig.key, function (err, checksum) {
						var txn_url = "https://securegw-stage.paytm.in/theia/processTransaction"; // for staging
						// var txn_url = "https://securegw.paytm.in/theia/processTransaction"; // for production

						var form_fields = "";
						for (var x in params) {
							form_fields += "<input type='hidden' name='" + x + "' value='" + params[x] + "' >";
						}
						form_fields += "<input type='hidden' name='CHECKSUMHASH' value='" + checksum + "' >";

						res.writeHead(200, { 'Content-Type': 'text/html' });
						res.write('<html><head><title>Merchant Checkout Page</title></head><body><center><h1>Please do not refresh this page...</h1></center><form method="post" action="' + txn_url + '" name="f1">' + form_fields + '</form><script type="text/javascript">document.f1.submit();</script></body></html>');
						res.end();
						console.log("Hi");
					});
				}
			}
		});

})
router.post("/:id/pay/callback", middleware.isLoggedIn, (req, res) => {
	// Route for verifiying payment
	console.log("Inside Call back");
	console.log(req.body);
	var response = "";
	var checksumhash = req.body.CHECKSUMHASH;
	// 	// delete post_data.CHECKSUMHASH;
	var result = checksum_lib.verifychecksum(req.body, config.PaytmConfig.key, checksumhash);
	console.log("Checksum Result => ", result, "\n");

	// Set up the request


	conn.query(
		'SELECT * FROM Student WHERE Username=?', [req.user.username],
		function (err, Sresult, fields) {
			if (err)
				console.log(err);
			else {
				console.log(Sresult);

				conn.query(
					'REPLACE INTO Registrations (Event_Id, Reg_Date, Reg_USN)values(?,?,?)', [req.params.id, date, Sresult[0].USN],
					function (err, Rresults, fields) {
						if (err) {
							console.log(err);
							res.redirect("/movies");
						}
						else {
							console.log(Rresults);
							conn.query(
								'SELECT * FROM Registrations WHERE Event_Id=? AND Reg_USN=?', [req.params.id, Sresult[0].USN],
								function (err1, RESULTS, fields) {
									if (!err) {
										console.log(RESULTS);
										conn.query('INSERT INTO Payments values(?,?,?,?)', [req.body.TXNID, RESULTS[0].Reg_Id, req.body.TXNAMOUNT, req.body.TXNDATE], function (err2, Presults, fields) {
											if (!err) {
												console.log(Presults);

												req.flash("success", "ID: " + req.body.ORDERID + " Payment Successful");
												req.logOut();
												res.redirect("/movies");
											}
											else {
												console.log(err2);
											}
										});
									}
									else {
										console.log(err1);
									}
								}
							);
							//request.flash("sucess", "Successfully Registered");
							//respond.redirect("/movies");
						}
					}
				);
			}

		}

	);


	// post the data





});


// Edit Details

router.get("/:id/edit", middleware.isLoggedIn, (request, respond) => {
	console.log(request.params);
	const body = request.body;
	conn.query('SELECT * FROM Events WHERE idEvents = ?', [request.params.id], function (err, results, fields) {

		if (!err) {
			respond.render("movies/edit", { event: results[0], currentUser: request.user });
		}
		else {
			console.log(err);
			respond.redirect("/movies");
		}
		//
	});
});
// //Backend
router.put("/:id", middleware.isLoggedIn, (request, respond) => {
	const body = request.body;
	conn.query('UPDATE  Events SET Name=?,date=?,Venue=?,Fee=?,Last_Date=? WHERE idEvents=?', [body.eName, body.eDate, body.eVenue, body.eFee, body.eLDate, request.params.id], function (err, results, fields) {
		if (err) {
			console.log(err);
			respond.redirect("/movies");
		} else {
			// console.log(request.body.m);
			// console.log(updatedMovie);

		}
	});

	request.flash("success", "Event Details Edited");
	respond.redirect("/movies/" + request.params.id);

});


router.delete("/:id", middleware.isLoggedIn, (request, respond) => {
	Movie.findOneAndDelete({ EventId: request.params.id }, (err) => {
		if (err) {
			respond.redirect("/movies");
			console.log(err);
		} else {
			conn.query('DELETE FROM Events  WHERE idEvents=?', [request.params.id], function (err, results, fields) {
				if (err) {
					console.log(err);
					respond.redirect("/movies");
				}
			}
			);

		}
	});
	// respond.send("you are trying to delete");
	request.flash("success", "Event Deleted");
	respond.redirect("/movies");

});


module.exports = router;