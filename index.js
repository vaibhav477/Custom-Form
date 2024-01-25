const port = 3000;
const express = require('express');
const app = express();
const bodyParser = require('body-parser')
const mysql = require('mysql');
const client = require('twilio')('AC448ee907c0a7eef7daa0a371386d7e3a', '5b111751782516e0d8710ddfbf9474e4');
const twilioKey='EJQ5XMCZ9LKB6GZ52C6BJGK7'

app.use(express.json()); // Add this line to parse JSON requests

app.set('view engine','ejs');
app.set('views','./views');

app.post("/registerUser", function(req, res) {
    let Name = req.body.name;
    let Email = req.body.email;
    let Dob = req.body.dob;
    let CurrentSalary = req.body.current_salary;
    let Saving = req.body.saving;
    let LoanAmount = req.body.loan_amount;
    let Phone =  req.body.phone;
    let Remark = {};
    let flag = 0;
 
    //console.log(Name,Email,Dob,CurrentSalary,Saving,LoanAmount, Phone);
 
     //validate 
 
     //send the date in db
    
     client.messages
         .create({
             body: 'Testing here ' + Name,
             from: '+12092484665',
             to: '+917011214319'
         })
         .then(message => {
             console.log(message.sid);
             // Handle success if needed
         })
         .catch(error => {
             console.error('Error sending SMS:', error);
             // Handle error if needed
         })
         .finally(() => {
             // This block will be executed regardless of success or failure
             return res.status(200).send("registered!!");
         });
 });
 

app.post("/sendSMS", function(req, res) {
    let Name = req.body.name;
    let Email = req.body.email;
    let Dob = req.body.dob;
    let CurrentSalary = req.body.current_salary;
    let Saving = req.body.saving;
    let LoanAmount = req.body.loan_amount;
    let Phone =  req.body.phone;
    let Remark = {};
    let flag = 0;
 
    //console.log(Name,Email,Dob,CurrentSalary,Saving,LoanAmount, Phone);
 
 
     //validate 
 
     //send the date in db
     

        client.messages
            .create({
                body: 'hello testing sms',
                from: '+12092484665',
                to: '+917011214319'
            })
            .then(message => console.log(message.sid))
            .done();
     
 
     return res.status(200).send("registered!!")
     
 });

// app.post("/verifyUser", function(req, res) {
   
//     let Phone =  req.body.phone;
    

//         client.messages
//             .create({
//                 body: 'hello testing sms',
//                 from: '+12092484665',
//                 to: '+917011214319'
//             })
//             .then(message => console.log(message.sid))
//             .done();
     
 
//      return res.status(200).send("registered!!")
     
//  });


app.get("/form",function(req,res){
    return res.render('index')

})


app.listen(port, function(err) {
    if (err) {
        console.error("Error starting the server:", err);
    } else {
        console.log("Server running at port " + port);
    }
});