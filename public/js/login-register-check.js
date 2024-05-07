const getLoginForm = () =>
{
    return document.getElementById("signin-form");
};

const getRegisterForm = () =>
{
    return document.getElementById("signup-form");
};

const onLoginFormSubmit = (event) =>
{
    let error = document.getElementById("error");
    if (error)
    {
        error.remove();
    }
    let usernameElement = document.getElementById("username");
    let passwordElement = document.getElementById("password");

    if (isNullOrUndefined(usernameElement) || isNullOrUndefined(passwordElement))
    {

    }
    else
    {
        const errors = [];
        const username = tryCatchChain(errors, () => parseUsername(usernameElement.value));
        const password = tryCatchChain(errors, () => parsePassword(passwordElement.value));

        if (errors.length > 0)
        {
            event.preventDefault();
            error = document.createElement("p");
            error.id = "error";
            error.className = "error";
            // error.innerHTML = e.message;
            getLoginForm().appendChild(error);
        }
    }
};

const onRegisterFormSubmit = (event) =>
{
    let errorList = document.getElementById("error-list");
    if (isNullOrUndefined(errorList))
    {
        errorList.remove();
    }
    // TODO: any of these could be a null dereference
    const usernameElement = document.getElementById("username");
    const passwordElement = document.getElementById("password");
    const confirmPasswordElement = document.getElementById("confirmPassword");

    if (isNullOrUndefined(usernameElement)
        || isNullOrUndefined(passwordElement)
        || isNullOrUndefined(confirmPasswordElement))
    {
        // TODO
    }
    else
    {
        const errors = [];
        const username = tryCatchChain(errors, () => parseUsername(usernameElement.value));
        const password = tryCatchChain(errors, () => parsePassword(passwordElement.value));
        const confirmPassword = tryCatchChain(errors, () => parseNonEmptyString(confirmPasswordElement.value, "Confirm password"));
        if (confirmPassword !== password)
        {
            errors.push(new Error("Passwords do not match!"));
        }
        if (errors.length !== 0)
        {
            event.preventDefault();
            errorList = document.createElement("ul");
            errorList.id = "error-list";
            errorList.className = "error";
            document.body.insertBefore(errorList, getRegisterForm());
            for (const error of errors)
            {
                let li = document.createElement("li");
                li.innerHTML = error;
                li.className = "error";
                errorList.appendChild(li);
            }
        }
    }
};

(function ()
{
    const loginForm = getLoginForm();
    if (!isNullOrUndefined(loginForm))
    {
        loginForm.addEventListener("submit", (event) => onLoginFormSubmit(event));
    }

    const registerForm = getRegisterForm();
    if (!isNullOrUndefined(registerForm))
    {
        registerForm.addEventListener("submit", (event) => onRegisterFormSubmit(event));
    }
})();
