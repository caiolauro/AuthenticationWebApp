//jshint esversion:6
const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const mongoose = require("mongoose");
const encrypt = require("mongoose-encryption");

mongoose.connect("mongodb://localhost:27017/userDB");

userSchema = new mongoose.Schema({
    email: String,
    password: String
});

const secret = "Thisisourlittlesecret";

userSchema.plugin(encrypt, { secret: secret, encryptedFields: ['password'] });

User = mongoose.model("User", userSchema);

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

app.get("/", function (req, res) {
    res.render("home")
});
app.get("/secrets", function (req, res) {
    res.render("secrets")
});
app.get("/login", function (req, res) {
    res.render("login")
});
app.post("/login", function (req, res) {
    const userName = req.body.username;
    const userPassword = req.body.password;

    User.findOne({ email: userName })
        .then(function (foundUser) {
            console.log("User found.");
            if (!foundUser) {
                console.log("User not found.");
                res.redirect("/");
            }
            else {
                if (foundUser.password === userPassword) {
                    console.log("Password matches");
                    res.redirect("secrets");
                }
            }
        })
        .catch(function (err) {
            console.log(err);
            res.redirect("home");
        })

});
app.get("/register", function (req, res) {
    res.render("register")
});
app.post("/register", function (req, res) {
    const newuser = new User({
        email: req.body.username,
        password: req.body.password
    });
    newuser.save();
    res.redirect("/secrets");
});

app.listen(3000, function () {
    console.log("Running server on port 3000.")
});