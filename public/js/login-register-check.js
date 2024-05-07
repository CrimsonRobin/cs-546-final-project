(function () {
  const loginForm = document.getElementById("signin-form");
  const registerForm = document.getElementById("signup-form");
  if (loginForm) {
    loginForm.addEventListener("submit", (event) => {
      let error = document.getElementById("error");
      if (error) {
        error.remove();
      }
      const username = document.getElementById("username");
      const password = document.getElementById("password");

      try {
        parseUsername(username.value, "Username");
        parsePassword(password.value, "Password");
      } catch (e) {
        event.preventDefault();
        error = document.createElement("p");
        error.id = "error";
        error.className = "error";
        error.innerHTML = e.message;
        loginForm.appendChild(error);
      }
    });
  }
  if (registerForm) {
    registerForm.addEventListener("submit", (event) => {
      let errorList = document.getElementById("error-list");
      if (errorList) {
        errorList.remove();
      }
      const username = document.getElementById("username");
      const password = document.getElementById("password");
      const confirmPassword = document.getElementById("confirmPassword");

      const errors = [];
      tryCatchChain(errors, () => checkUsername(username.value, "Username"));
      tryCatchChain(errors, () => checkPassword(password.value, "Password"));
      tryCatchChain(errors, () => checkString(confirmPassword.value, "Confirm password"));
      if (confirmPassword.value !== password.value) {
        errors.push(new Error("Passwords do not match!"));
      }
      if (errors.length !== 0) {
        event.preventDefault();
        errorList = document.createElement("ul");
        errorList.id = "error-list";
        errorList.className = "error";
        document.body.insertBefore(errorList, registerForm);
        for (const error of errors) {
          let li = document.createElement("li");
          li.innerHTML = error;
          li.className = "error";
          errorList.appendChild(li);
        }
      }
    });
  }
})();
