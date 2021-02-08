var express = require("express"),
	router = express.Router(),
	User = require('../models/user.js'),
	Movie = require("../models/events"),
	Comment = require("../models/comment");
const mysql = require('mysql2');
var middleware = require("../middleware");
const conn = require('../dbConfig');
const { request } = require("express");


router.get("/", middleware.isLoggedIn,(request, respond) => {

    if( request.user.role == "student")
    {
        conn.query(
        'SELECT * FROM Registrations JOIN Student ON Registrations.Reg_USN = Student.USN JOIN Events ON Registrations.Event_Id = Events.idEvents  AND  Student.Username=?', [request.user.username],
		function (err, reg, fields) {
			if (err)
				console.log(err);
            console.log(reg);
            respond.render("students/reg",{reg: reg, currentUser: request.user});
        }
        );
        
   }

});

router.delete("/:id", middleware.isLoggedIn,(request, respond)=>
{
    if( request.user.role == "student")
    {
       
        conn.query(
            'DELETE FROM Registrations where Reg_Id=?', [request.params.id],function(err, results, fields)
            {
                if(err)
                    console.log(err);
                console.log(results);
      
                respond.redirect("/events");
            }			
    );
   }

});

module.exports = router;
