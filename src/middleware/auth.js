const USE_SIMPLE_AUTH = process.env.USE_SIMPLE_AUTH === "true";

const authorize = (req, res, next) => {
  if (USE_SIMPLE_AUTH) {
    // Simple auth: check for username cookie
    if (!req.cookies.username) {
      res.redirect("/login");
      return;
    }
  } else {
    // OAuth auth: check if authenticated
    if (!req.isAuthenticated()) {
      res.redirect("/login");
      return;
    }
  }

  next();
};

module.exports = { authorize };
