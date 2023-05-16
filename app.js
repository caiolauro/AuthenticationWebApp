//jshint esversion:6
require('dotenv').config()
const express = require("express");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const session = require('express-session')
const bodyParser = require("body-parser");
const app = express();
const mongoose = require("mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');
const findOrCreatePlugin = require('mongoose-findorcreate');

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({
    secret: 'Our little secret.',
    resave: false,
    saveUninitialized: false,
    secure: process.env.NODE_ENV === 'production', // Set to true only in production
}));
app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/userDB");
//mongoose.set("useCreateIndex", true);

userSchema = new mongoose.Schema({
    username: String,
    password: String,
    googleId: String,
    secret: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser((user, done) => {
    done(null, typeof user === 'string' ? user : JSON.stringify(user));
});
passport.deserializeUser((user, done) => {
    done(null, {
        provider: user.provider,
        id: user.provider_id
    });
});

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
},
    function (accessToken, refreshToken, profile, cb) {
        // console.log(profile);
        User.findOrCreate({ googleId: profile.id }, function (err, user) {
            return cb(err, user);
        });
    }
));

app.get("/", function (req, res) {
    res.render("home");
});

app.get("/auth/google",
    passport.authenticate("google", { scope: ["profile"] })
);

app.get("/auth/google/secrets",
    passport.authenticate("google", { failureRedirect: "/login" }),
    function (req, res) {
        res.redirect("/secrets");
    }
);

app.get("/secrets", function (req, res) {
    User.find({ "secret": { $ne: null } })
        .then(function (foundUsers) {
            res.render("secrets", { usersWithSecrets: foundUsers });
        });
});

app.get("/submit", function (req, res) {
    if (req.isAuthenticated()) {
        res.render("submit");
    } else {
        res.redirect("/login");
    }
});

app.post("/submit", function (req, res) {
    const submittedSecret = req.body.secret;
    const userId = JSON.parse(req.session.passport.user)._id;
    console.log(userId);
    User.findById(userId)
        .then(function (foundUser) {
            foundUser.secret = submittedSecret;
            foundUser.save();
            res.redirect("/")
        })
        .catch(function (err) {
            console.log(err);
            res.redirect("/login")
        })
});

app.get("/login", function (req, res) {
    res.render("login");
});

app.post("/login", function (req, res) {
    const user = User({
        username: req.body.username,
        password: req.body.password
    });
    req.login(user, function (err) {
        if (err) {
            console.log(err);
        } else {
            passport.authenticate("local")(req, res, function () {
                res.redirect("/secrets");
            });
        }
    });
});

app.get("/register", function (req, res) {
    res.render("register");
});

app.post("/register", function (req, res) {
    User.register({ username: req.body.username }, req.body.password, function (err, user) {
        if (err) {
            console.log(err);
            res.redirect("/register");
        } else {
            console.log(user);
            passport.authenticate("local")(req, res, function () {
                //console.log(res);
                res.redirect("/secrets");
            });
        }
    });
});

app.get("/logout", function (req, res) {
    req.logout(function () {
        console.log("User logged out.");
    });
    res.redirect("/");
});

app.listen(3000, function () {
    console.log("Running server on port 3000.")
});