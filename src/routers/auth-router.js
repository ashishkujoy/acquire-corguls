const express = require("express");
const passport = require('passport');
const GoogleStrategy = require('passport-google-oidc');
const session = require('express-session');

const loginUser = (req, res) => {
  const { username } = req.body;
  res.cookie("username", username);
  res.redirect("/joinorhost");
}

const logout = (req, res, next) => {
  req.logout(function (err) {
    if (err) { return next(err); }
    res.redirect('/login');
  });
}

const serveLoginPage = (_, res) => {
  res.sendFile("login.html", { root: "pages" });
}

const createAuthRouter = () => {
  const app = express();
  app.use(session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: false,
  }));
  passport.serializeUser(function (user, cb) {
    process.nextTick(function () {
      cb(null, {
        id: user.id,
        username: user.displayName,
      });
    });
  });

  passport.deserializeUser(function (user, cb) {
    process.nextTick(function () {
      return cb(null, user);
    });
  });
  passport.use(new GoogleStrategy({
    clientID: process.env['GOOGLE_CLIENT_ID'],
    clientSecret: process.env['GOOGLE_CLIENT_SECRET'],
    callbackURL: '/oauth2/redirect/google',
    scope: ['profile', "email"]
  }, (_, profile, cb) => {
    console.log("profile", profile);
    cb(null, profile);
  }))
  app.use(passport.authenticate('session'))
  app
    .get("/login", serveLoginPage)
    .post("/login", loginUser)
    .get("/login/google", passport.authenticate("google"))

  app.get('/oauth2/redirect/google', passport.authenticate('google', {
    successRedirect: '/joinorhost',
    failureRedirect: '/login'
  }));

  app.post("/logout", logout);

  return app;
}

module.exports = { createAuthRouter };