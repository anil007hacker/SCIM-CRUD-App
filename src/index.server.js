const express = require('express')
const path = require('path')
const bodyParser = require('body-parser')
const mongoose = require('mongoose')
const User = require('../Modal/User')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const data = require('../src/Data')
const cors = require('cors');

const JWT_SECRET = "t2fdg8obnjwjiobgtxwetvbbfn2p2d6gfybonijcm1pjdsbcoufvgebchnwwhndidnmd"

mongoose.connect(
    'mongodb+srv://anilsharma:Passw0rd@oauth-user-db.zbnag.mongodb.net/myFirstDatabase?retryWrites=true&w=majority',
    {
        useNewUrlParser : true,
        useUnifiedTopology : true,
        useCreateIndex : true
})


const app = express()
app.use('/',express.static(path.join(__dirname, 'static')))
app.use(bodyParser.json())
app.use(cors());
app.options('*', cors());

app.post('/api/login', async(req,res)=>{

    const {email, password} = req.body

    const user = await User.findOne({email}).lean()

    if(!user){
        res.json({
            status:"error",
            message : "Invalid Email or Password"
        })
    }

    if(await bcrypt.compare(password, user.password)){
        const token = jwt.sign({
            id : user._id,
            email : user.email,
            password : user.password
        }, 
            JWT_SECRET
    )
        res.json({
            status : "ok",
            token : token,
            user_details : user
        })
    }
    res.json({
        status:"error",
            message : "Invalid Email or Password"
    })
})

function isAuthenticated(req,res,next){
    console.log(req.headers.authorization)
    if(req.headers.authorization){
        if(req.headers.authorization.split(" ")[0] == "Bearer"){
            var token = req.headers.authorization.split(" ")[1];
            if(token){
                jwt.verify(token, JWT_SECRET, (err, decodedToken)=> {
                    if(err){
                        return res.json({
                            "msg":"Not authrized inside verify"
                        })
                    }
                    else{
                        console.log(decodedToken.email);
                        next();
                    }
            })
        }
    }
}else{
    return res.status(401).json({
        "Success" : "Fail",
        "Message": "Authorization header is missing"
    })
}
}

app.get('/scim/v2/api/users',isAuthenticated,async(req, res, next)=> {
    if(req.query.userName){
        var emailFiltered = req.query.userName;
        console.log("Email to find",emailFiltered)
        if(emailFiltered===undefined){
                return res.status(404).json({
                    "Success" : false,
                    "Message" : "No user with such userName"
                })
        }
        User.find({email: emailFiltered }, function (err, docs) {
            if (err){
                return res.status(404).json({
                    "Success" : false,
                    "Message" : "No user with such userName"
                })
            }
            if(docs[0]!=null && docs[0]!={} && docs[0]!=undefined){
                return res.status(200).json({
                    "schemas": [
                        "urn:ietf:params:scim:schemas:core:1.0"
                    ],
                "id" : `${docs[0].id}`,
                "userName" : `${docs[0].email}`,
                "name": {
                    "familyName": `${docs[0].lastname}`, 	
                    "givenName": `${docs[0].firstname}`,
                    "formatted": `${docs[0].firstname} ${docs[0].lastname}`
                },
                "emails": {
                    "value": `${docs[0].email}`,
                    "type": "work",
                    "primary": true
                }
                });
            }
            else{
                return res.status(404).json({
                    "Success" : false,
                    "Message" : "No user with such userName"
                })
            }
        console.log("inside if")
    })}
    else{
        User.find({}, function(err, users) {
            var userMap = {};
            var i=0;
            users.forEach(function(user) {
                console.log("User ID",user.id);
                userMap[`${i++}`] = {
                    "schemas": [
                        "urn:ietf:params:scim:schemas:core:1.0"
                    ],
                "id": `${user.id}`,
                "name": {
                    "familyName": `${user.lastname}`, 	
                    "givenName": `${user.firstname}`,
                    "formatted": `${user.firstname} ${user.lastname}`
                },
                "emails": {
                    "value": `${user.email}`,
                    "type": "work",
                    "primary": true
                }
                };
            });
        
            return res.json(
                {
                    userMap
                }
            );  
    });
    }
    
})

app.get('/scim/v2/api/users/:id',isAuthenticated, async(req,res,next)=>{
    if(mongoose.Types.ObjectId.isValid(req.params.id)){
        User.findById(req.params.id, function (err, doc){
            if(err) {
                return res.json("this",err);
            } else if(doc) {
                console.log(doc.id);
                return res.json({
                    "schemas": [
                        "urn:scim:schemas:core:1.0"
                    ],
                "id": `${doc.id}`,
                "userName" : `${doc.email}`,
                "name": {
                    "familyName": `${doc.lastname}`, 	
                    "givenName": `${doc.firstname}`,
                    "formatted": `${doc.firstname} ${doc.lastname}`
                },
                "emails": {
                    "value": `${doc.email}`,
                    "type": "work",
                    "primary": true
                }
                });
            } else {
                return res.status(404).json({success:false,data:"no data exist for this id"})
            }
        });
    } else {
            return res.status(404).json({success:"false",data:"Please provide correct id"});
        }
})

app.put('/scim/v2/api/users/:id',isAuthenticated, async(req, res)=> {
    console.log("req",req.body)
    console.log("id",req.params.id);
    User.findByIdAndUpdate(
        req.params.id,
        {
            "email": req.body.email,
            "firstname": req.body.firstname,
            "lastname": req.body.lastname
        },
        {new:true},
        function (err, response) {
            if (err) {
                return res.json({
                message: 'Database Update Failure'
              });
            }
            console.log("put--->",response.id)
            return res.json({
                "schemas": [
                    "urn:scim:schemas:core:1.0"
                ],
            "id": `${response.id}`,
            "userName" : `${response.email}`,
            "name": {
                "familyName": `${response.lastname}`, 	
                "givenName": `${response.firstname}`,
                "formatted": `${response.firstname} ${response.lastname}`
            },
            "emails": {
                "value": `${response.email}`,
                "type": "work",
                "primary": true
            }
            });
        }
    )
})

app.delete('/scim/v2/api/users/:id',isAuthenticated, async(req, res)=>{
    User.findByIdAndDelete(req.params.id, function (err, docs) {
        if (err){
            return res.json({"Error" : err})
        }
        else{
            return res.status(204).json({"Deleted": docs});
        }
    })
})

app.post('/scim/v2/api/users',isAuthenticated, async(req,res)=>{
    console.log(req.body)
    const {email, firstname, lastname, password : plainTextPassword} = req.body

    if(!email || typeof email !== 'string'){
        res.json({
            status : "Error",
            message : "Invalid Username"
        })
    }
    if(!firstname || typeof firstname !== 'string'){
        res.json({
            status : "Error",
            message : "Invalid Firstname"
        })
    }
    if(!lastname || typeof lastname !== 'string'){
        res.json({
            status : "Error",
            message : "Invalid Lastname"
        })
    }
    if(!plainTextPassword || typeof plainTextPassword !== 'string'){
        res.json({
            status : "Error",
            message : "Invalid Password"
        })
    }
    if(plainTextPassword.length<5){
        res.json({
            status : "Error",
            message : "Password too small, It must contains 8 digits"
        })
    }
    const password = await bcrypt.hash(plainTextPassword, 10)

    try{
        const response = await User.create({
            email,
            firstname,
            lastname,
            password
        })
        console.log("User Created ->",response)
    } catch(error){
        if(error.code === 11000){
            //dupliacte email error.
            return res.status(409).json({
                status : "Error",
                message : "Email already exists" 
            })
        }
    }
    res.status(201).json({ 
        "schemas": [
            "urn:scim:schemas:core:1.0"
        ],
    "userName" : `${email}`,
    "name": {
        "familyName": `${lastname}`, 	
        "givenName": `${firstname}`,
        "formatted": `${firstname} ${lastname}`
    },
    "emails": {
        "value": `${email}`,
        "type": "work",
        "primary": true
    }
    });
})

app.use((req,res,next)=>{
    res.status(400).json({
        error : "No such route exist"
    })
})

app.listen(9999,()=>{
    console.log('Server up at 9999')
})