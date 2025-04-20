const authorizeLobbyMember = (req, res, next) => {
  const { id } = req.params;
  const lobby = req.app.context.lobbyManager.findById(id);

  if (!lobby) {
    res.status(404);
    return res.json({ message: `Game/Lobby Not Found ${id}` });
  }
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
