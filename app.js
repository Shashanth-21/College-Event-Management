const express		= require('express'),
	apk 			= express(),
	bodyParser		= require('body-parser'),
	mongoose 		= require('mongoose'),
	Movie 			= require("./models/events.js"),
	passport		= require("passport"),
	LocalStrategy	= require('passport-local'),
	methodOveride	= require('method-override'),
	User			= require('./models/user.js'),
	flash 			= require('connect-flash'),
	logger 			=require('morgan')
	Comment 		= require("./models/comment.js");

const commentRoutes = require("./routes/comments"),
	eventsRoutes = require("./routes/events"),
	indexRoutes = require("./routes/index"),
	clubRoutes = require("./routes/clubs"),
	regRoutes = require("./routes/register");
const DB_URL=process.env.DB_URL || "mongodb://localhost:27017/ems";
const PORT = process.env.PORT ||3000;
// const IP = process.env.IP || "127.0.0.1"


const mysql = require('mysql2');
const { db } = require('./models/events.js');
const { request } = require('express');
 
// create the connection to database

apk.set("view engine", "ejs");
apk.use(bodyParser.urlencoded({extended: true}));
apk.use(express.static(__dirname+"/public"));
apk.use(methodOveride("_method"));
apk.use(logger('dev'));

mongoose.connect(DB_URL, { useNewUrlParser: true, useUnifiedTopology: true});


mongoose.set('useFindAndModify', false);
apk.use(require("express-session")({
	secret:"I have to complete this by today",
	resave:false,
	saveUninitialized:false
}));

apk.use(flash());
apk.use((request,respond,next)=>{
	respond.locals.currentUser = request.user;
	respond.locals.error =request.flash("error");
	respond.locals.success =request.flash("success");
	next();
});



//Passport Config

apk.use(passport.initialize());
apk.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

apk.use("/",indexRoutes);
apk.use("/events",eventsRoutes);
apk.use("/student",regRoutes);
apk.use("/events/:id/comments",commentRoutes);
apk.use("/clubs",clubRoutes);

apk.get("*",(request,respond)=>{
	respond.send("Use a Valid Url");
});
apk.listen(PORT,()=>{
	console.log(process.env.PORT,process.env.IP);
});

module.exports= ()=>{
  var conn= mysql.createConnection({
	host: 'localhost',
  user: 'root',
  password: 'Shashanth@21',
  database: 'Event_Managemnet',
	
  });

  conn.connect((err)=>{
	if(err)
	console.log('its error '+ err);
	else
	console.log("connected...");

  });
}


