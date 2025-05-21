const joinLobby = async (id) => {
  const res = await fetch(`/lobby/${id}/players`, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({ id })
  });

  window.location.assign(`/lobby/${id}`);
}

const renderLobby = (lobby) => {
  const lobbies = document.querySelector("#join-section");
  const lobbyTemplate = document.querySelector("#room").content.cloneNode(true);

  const lobbyName = lobbyTemplate.querySelector(".room-name");
  lobbyName.textContent = lobby.name;
  const joinLobbyBtn = lobbyTemplate.querySelector(".join-room-btn");
  joinLobbyBtn.onclick = () => {
    joinLobbyBtn.disabled = true;
    joinLobbyBtn.classList.add("click-disabled");
    joinLobby(lobby.id);
  }

  lobbies.appendChild(lobbyTemplate);
}

const renderLobbies = (lobbies) => {

  lobbies.forEach(lobby => renderLobby(lobby));
}

const showExistingRooms = async () => {
  console.log("About to show available lobbies");

  const res = await fetch("/lobby/available");
  const lobbies = await res.json();

  renderLobbies(lobbies);
}

const setupCreateNewRoom = () => {
  const form = document.querySelector("#create-room-form");
  form.onsubmit = async (event) => {
    event.preventDefault()
    const formData = new FormData(event.target);
    const res = await fetch("/lobby/create", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({ name: formData.get("name") })
    });

    const body = await res.json();
    window.location.assign(`/lobby/${body.id}`);
  }
}

const setup = () => {
  setupCreateNewRoom();
  showExistingRooms()
}

window.onload = setup;