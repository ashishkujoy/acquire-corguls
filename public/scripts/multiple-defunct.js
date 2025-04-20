import { resolveTie } from "/scripts/tie-resolver.js";

const confirmDefunct = defunct => {
  const gameId = window.location.pathname.split("/").pop();
  fetch(`/game/${gameId}/merger/confirm-defunct`, {
    method: "POST",
    body: JSON.stringify({ defunct }),
    headers: {
      "content-type": "application/json",
    },
  });
};

const createCorpIcon = corp => {
  return ["div", "", { class: `corp-icon ${corp} conflict` }];
};

export const selectDefunct = ({ turns }, activityConsole) => {
  resolveTie(turns, activityConsole, "Select defunct", confirmDefunct);
};
