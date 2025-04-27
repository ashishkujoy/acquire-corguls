export const loginUser = (req, res) => {
  const { username } = req.body;
  res.cookie("username", username);
  res.redirect("/joinorhost");
}

export const logout = (req, res) => {
  res.cookie("username", "", { maxAge: 0 });
  res.cookie("lobbyId", "", { maxAge: 0 });
  res.redirect("/");
}