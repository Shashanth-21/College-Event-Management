

const mysql = require('mysql2');

const conn = mysql.createConnection({
    host: 'localhost',
  user: 'root',
  password: 'your_password',
  database: 'Event_Management',
    
  });

  conn.connect((err)=>{
    if(err)
    console.log('its error '+ err);
    else
    console.log("connected...");

  });

  module.exports = conn;


