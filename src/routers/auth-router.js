const express = require("express");
const passport = require("passport");

const USE_SIMPLE_AUTH = process.env.USE_SIMPLE_AUTH === "true";

const loginUser = (req, res) => {
  const { username } = req.body;
  if (!username || username.trim() === "") {
    return res.status(400).json({ error: "Username is required" });
  }

  res.cookie("username", username.trim());
  res.redirect("/joinorhost");
};

const logout = (req, res, next) => {
  if (USE_SIMPLE_AUTH) {
    res.clearCookie("username");
    res.redirect("/login");
  } else {
    req.logout(function (err) {
      if (err) { return next(err); }
      res.redirect("/login");
    });
  }
};

const serveLoginPage = (_, res) => {
  res.sendFile("login.html", { root: "pages" });
};

const getAuthConfig = (_, res) => {
  res.json({
    useSimpleAuth: true,
    hasGoogle: !USE_SIMPLE_AUTH && !!process.env["GOOGLE_CLIENT_ID"],
    hasGitHub: !USE_SIMPLE_AUTH && !!process.env["GITHUB_CLIENT_ID"]
  });
};

const setupGoogleStrategy = () => {
  if (!process.env["GOOGLE_CLIENT_ID"] || !process.env["GOOGLE_CLIENT_SECRET"]) {
    return;
  }

  const GoogleStrategy = require("passport-google-oidc");
  passport.use(new GoogleStrategy({
    clientID: process.env["GOOGLE_CLIENT_ID"],
    clientSecret: process.env["GOOGLE_CLIENT_SECRET"],
    callbackURL: "/oauth2/redirect/google",
    scope: ["profile", "email"]
  }, (_, profile, cb) => {
    console.log("google profile", profile);
    cb(null, profile);
  }));
};

const setupGitHubStrategy = () => {
  if (!process.env["GITHUB_CLIENT_ID"] || !process.env["GITHUB_CLIENT_SECRET"]) {
    return;
  }

  const GitHubStrategy = require("passport-github2").Strategy;
  passport.use(new GitHubStrategy({
    clientID: process.env["GITHUB_CLIENT_ID"],
    clientSecret: process.env["GITHUB_CLIENT_SECRET"],
    callbackURL: "/oauth2/redirect/github",
    scope: ["profile", "email"]
  }, (_, __, profile, cb) => {
    console.log("gh profile", profile);
    cb(null, profile);
  }));
};

const setupOAuthStrategies = () => {
  setupGoogleStrategy();
  setupGitHubStrategy();
};

const setupPassportConfig = (app) => {
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

  setupOAuthStrategies();
  app.use(passport.authenticate("session"));
};

const addOAuthRoutes = (app) => {
  if (process.env["GOOGLE_CLIENT_ID"]) {
    app.get("/login/google", passport.authenticate("google"));
    app.get("/oauth2/redirect/google", passport.authenticate("google", {
      successRedirect: "/joinorhost",
      failureRedirect: "/login"
    }));
  }

  if (process.env["GITHUB_CLIENT_ID"]) {
    app.get("/login/github", passport.authenticate("github"));
    app.get("/oauth2/redirect/github", passport.authenticate("github", {
      successRedirect: "/joinorhost",
      failureRedirect: "/login"
    }));
  }
};

const createAuthRouter = () => {
  const app = express();

  if (!USE_SIMPLE_AUTH) {
    setupPassportConfig(app);
  }

  // Common routes
  app
    .get("/login", serveLoginPage)
    .get("/auth-config", getAuthConfig)
    .post("/login", loginUser)
    .post("/logout", logout);

  if (!USE_SIMPLE_AUTH) {
    addOAuthRoutes(app);
  }

  return app;
};

module.exports = { createAuthRouter };