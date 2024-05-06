(function () {
  // validation functions copied from helpers.js
  const checkString = (str, varName = "string") => {
    if (typeof str === "undefined") {
      throw new Error(`${varName} is not given!`);
    }
    if (typeof str !== "string") {
      throw new Error(`${varName} is not a string!`);
    }
    str = str.trim();
    if (str.length <= 0) {
      throw new Error(`${varName} is empty!`);
    }
    return str;
  };

  const checkStringAndLength = (str, varName = "string", min, max) => {
    str = checkString(str, varName);
    if (typeof min === "number" && str.length < min) {
      throw new Error(`${varName} must be at least ${min} characters long!`);
    }
    if (typeof max === "number" && str.length > max) {
      throw new Error(`${varName} must be at most ${max} characters long!`);
    }
    return str;
  };

  const checkNoNumbers = (str, varName = "string") => {
    str = checkString(str);
    const numbers = /\d/g;
    if (numbers.test(str)) {
      throw new Error(`${varName} cannot contain numbers!`);
    }
    return str;
  };

  const checkName = (name, varName = "name") => {
    name = checkStringAndLength(name, varName, 2, 25);
    return checkNoNumbers(name, varName);
  };

  const checkUsername = (username, varName = "username") => {
    username = checkStringAndLength(username, varName, 5, 10);
    return checkNoNumbers(username, varName).toLowerCase();
  };

  const checkPassword = (password, varName = "password") => {
    password = checkStringAndLength(password, varName, 8);
    const whitespace = /\s/g;
    const uppercase = /[A-Z]/g;
    const number = /\d/g;
    const special = /[^A-Za-z\d]/g;
    if (whitespace.test(password)) {
      throw new Error(`${varName} cannot contain spaces!`);
    }
    if (!uppercase.test(password)) {
      throw new Error(`${varName} must contain a capital letter!`);
    }
    if (!number.test(password)) {
      throw new Error(`${varName} must contain a number!`);
    }
    if (!special.test(password)) {
      throw new Error(`${varName} must contain a special character!`);
    }
    return password;
  };
  const checkTheme = (theme, varName = "theme") => {
    return checkAllowedValue(theme, ["light", "dark"], varName, "theme");
  };

  const tryOrPushError = (fun, arr) => {
    try {
      return fun();
    } catch (e) {
      arr.push(e.message);
    }
  };

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
        checkUsername(username.value, "Username");
        checkPassword(password.value, "Password");
      } catch (e) {
        event.preventDefault();
        error = document.createElement("p");
        error.id = "error";
        error.className = "error";
        error.innerHTML = e.message;
        document.body.insertBefore(error, loginForm);
      }
    });
  }
  if (registerForm) {
    registerForm.addEventListener("submit", (event) => {
      let errorList = document.getElementById("error-list");
      if (errorList) {
        errorList.remove();
      }
      const firstName = document.getElementById("firstName");
      const lastName = document.getElementById("lastName");
      const username = document.getElementById("username");
      const password = document.getElementById("password");
      const confirmPassword = document.getElementById("confirmPassword");
      const themePreference = document.getElementById("themePreference");

      const errors = [];
      tryOrPushError(() => checkName(firstName.value, "First name"), errors);
      tryOrPushError(() => checkName(lastName.value, "Last name"), errors);
      tryOrPushError(() => checkUsername(username.value, "Username"), errors);
      tryOrPushError(() => checkPassword(password.value, "Password"), errors);
      tryOrPushError(
        () => checkString(confirmPassword.value, "Confirm password"),
        errors
      );
      if (confirmPassword.value !== password.value) {
        errors.push("Passwords do not match!");
      }
      tryOrPushError(() =>
        checkTheme(themePreference.value, "Theme preference")
      );
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
