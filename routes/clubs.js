var express = require("express"),
	router = express.Router(),
    Movie = require("../models/events"),
    middleware = require("../middleware"),
    conn = require('../dbConfig');

router.get("/", middleware.isLoggedIn, (request, respond) => {

	conn.query(
		'SELECT * FROM Club',
		function (err, results, fields) {
			if (err)
				console.log(err);
			console.log(results);
			respond.render("clubs/show", { list: results, currentUser: request.user });
		}
	);

});

module.exports =  router;