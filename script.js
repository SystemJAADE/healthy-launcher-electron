const remote = require("electron").remote;

const closeAppBtn = document.querySelector(".close-link");

closeAppBtn.addEventListener("click", (event) => {
  event.preventDefault();
  window.close();
});
