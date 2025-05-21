const getPlayerSection = () => document.querySelector("#players");
const getMessageElement = () => document.querySelector("#message");
const getAnimationSection = () => document.querySelector("#animation");
const getStartBtn = () => document.querySelector("#start-btn");

const getLobbyStatus = (id) => {
  return fetch(`/lobby/${id}/status`).then(res => res.json());
};

const renderPlayer = (username, playerElement) => {
  const playerNameElement = playerElement.querySelector(".name");
  playerElement.classList.add("joined");
  playerNameElement.innerText = username;
};

const renderPlayers = players => {
  const playerSection = getPlayerSection();
  players.forEach(({ username }, index) => {
    const playerElement = playerSection.children[index];
    renderPlayer(username, playerElement);
  });
};

const redirectToGame = (gameId) => {
  window.location.assign(`/game/${gameId}`);
};

const isHost = (host, self) => self.username === host.username;

const renderStartBtn = ({ host, isPossibleToStartGame }, self) => {
  const startButton = getStartBtn();
  if (isHost(host, self)) {
    startButton.classList.remove("hide");
    startButton.classList.add("disable-click");
  }

  if (isPossibleToStartGame) startButton.classList.remove("disable-click");
};

const gameHasStarted = ({ isPossibleToStartGame, hasExpired }) => {
  return isPossibleToStartGame && hasExpired;
};

const updateLobbyPeriodically = (user) => {
  setInterval(() => {
    const lobbyId = window.location.pathname.split("/").pop();
    getLobbyStatus(lobbyId).then(status => updateLobby(status, user));
  }, 5000);
};

const keepLobbyUpdated = () => {
  const interval = 1000;
  updateLobby();
  setInterval(updateLobby, interval);
};

const animate = () => {
  const animationSection = getAnimationSection();
  let dots = 0;
  setInterval(() => {
    dots = (dots % 3) + 1;
    animationSection.innerText = ".".repeat(dots);
  }, 500);
};

const startGame = () => {
  const gameId = window.location.pathname.split("/").pop();
  return fetch(`/game/${gameId}/start`, { method: "POST" }).then(res => {
    if (res.status === 200) {
      redirectToGame(gameId);
    }
  });
};

const setUpStartButton = () => {
  const startBtn = getStartBtn();
  startBtn.onclick = () => {
    startGame();
  };
};

const updateLobby = (status, user) => {
  renderPlayers(status.players);
  renderStartBtn(status, user);
  if (gameHasStarted(status)) redirectToGame(status.id);
}


const keepLobbyUpdatedOnEvent = (user) => {
  const socket = io();
  const lobbyId = window.location.pathname.split("/").pop();
  socket.emit("joinlobby", { lobbyId });
  socket.on("lobbyupdate", (status) => {
    updateLobby(status, user);
  });
}

const main = async () => {
  const res = await fetch("/user");
  const user = await res.json();
  animate();
  keepLobbyUpdatedOnEvent(user);
  updateLobbyPeriodically(user);
  setUpStartButton();
};

window.onload = main;

