const express = require("express");
const passport = require('passport');
const GoogleStrategy = require('passport-google-oidc');
const GitHubStrategy = require('passport-github2').Strategy;


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
  app.use(passport.initialize());
  app.use(passport.session());
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
    console.log("google profile", profile);
    cb(null, profile);
  }));
  passport.use(new GitHubStrategy({
    clientID: process.env['GITHUB_CLIENT_ID'],
    clientSecret: process.env['GITHUB_CLIENT_SECRET'],
    callbackURL: '/oauth2/redirect/github',
    scope: ['profile', "email"]
  }, (_, __, profile, cb) => {
    console.log("gh profile", profile);
    cb(null, profile);
  }));

  app.use(passport.authenticate('session'))
  app
    .get("/login", serveLoginPage)
    .post("/login", loginUser)
    .get("/login/google", passport.authenticate("google"))
    .get("/login/github", passport.authenticate("github"))

  app.get('/oauth2/redirect/google', passport.authenticate('google', {
    successRedirect: '/joinorhost',
    failureRedirect: '/login'
  }));
  app.get('/oauth2/redirect/github', passport.authenticate('github', {
    successRedirect: '/joinorhost',
    failureRedirect: '/login'
  }));

  app.post("/logout", logout);

  return app;
}

module.exports = { createAuthRouter };