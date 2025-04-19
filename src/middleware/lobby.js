const authorizeLobbyMember = (req, res, next) => {
  const lobby = req.app.context.lobbyManager.findById(0);
  const { players } = lobby.status();
  const { username } = req.cookies;
  const isUser = player => player.username === username;

  if (!players.find(isUser)) {
    res.redirect("/");
    return;
  }

  next();
};

module.exports = { authorizeLobbyMember };
