const logRequest = (req, _res, next) => {
  console.log("Requet is >", req.method, req.url);
  next();
};

module.exports = { logRequest };
