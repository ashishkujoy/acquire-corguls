const getJoinForm = () => document.querySelector("#join-form");
const getMessageElement = () => document.querySelector("#message");

const requestJoinGame = (userData, id = 0) => {
  return fetch(`/lobby/${id}/players`, {
    method: "POST",
    body: JSON.stringify(userData),
    headers: { "content-type": "application/json" },
  });
};

const joinGame = res => {
  if (res.redirected) {
    window.location.assign(res.url);
    return;
  }

  res.json().then(({ error }) => {
    const message = getMessageElement();
    message.classList.add("error");
    message.innerText = error;
  });
};

const login = ({ username }) => {
  return fetch("/login", {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({ username }),
  });
};

const visitJoinOrHost = () => {
  window.location.assign("/joinorhost");
}

const setupJoinForm = () => {
  const joinFrom = getJoinForm();
  joinFrom.onsubmit = event => {
    event.preventDefault();
    const userData = Object.fromEntries(new FormData(joinFrom));
    joinFrom.reset();
    login(userData).then(visitJoinOrHost).catch(console.error);
  };
};

const main = () => {
  setupJoinForm();
};

window.onload = main;
