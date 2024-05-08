const getLoginForm = () => {
    return document.getElementById("signin-form");
};

const getRegisterForm = () => {
    return document.getElementById("signup-form");
};

const onLoginFormSubmit = (event) => {
    let errorList = document.getElementById("error-list");
    errorList.replaceChildren();

    let usernameElement = document.getElementById("username");
    let passwordElement = document.getElementById("password");

    const errors = [];
    const username = tryCatchChain(errors, () => parseUsername(usernameElement.value));

    if (errors.length !== 0) {
        event.preventDefault();
        errors.map((e) => {
            const li = document.createElement("li");
            li.innerHTML = e.message;
            errorList.appendChild(li);
        });
    }
};

const onRegisterFormSubmit = (event) => {
    let errorList = document.getElementById("error-list");
    errorList.replaceChildren();
    // TODO: any of these could be a null dereference
    const usernameElement = document.getElementById("username");
    const passwordElement = document.getElementById("password");
    const confirmPasswordElement = document.getElementById("confirmPassword");

    const errors = [];
    const username = tryCatchChain(errors, () => parseUsername(usernameElement.value));
    const password = tryCatchChain(errors, () => parsePassword(passwordElement.value));
    const confirmPassword = tryCatchChain(errors, () => parseNonEmptyString(confirmPasswordElement.value, "Confirm password"));
    if (confirmPasswordElement.value !== passwordElement.value) {
        errors.push(new Error("Passwords do not match!"));
    }
    if (errors.length !== 0) {
        event.preventDefault();
        errors.map((e) => {
            const li = document.createElement("li");
            li.innerHTML = e.message;
            errorList.appendChild(li);
        });
    }
};

(function () {
    const loginForm = getLoginForm();
    if (!isNullOrUndefined(loginForm)) {
        loginForm.addEventListener("submit", (event) => onLoginFormSubmit(event));
    }

    const registerForm = getRegisterForm();
    if (!isNullOrUndefined(registerForm)) {
        registerForm.addEventListener("submit", (event) => onRegisterFormSubmit(event));
    }
})();
