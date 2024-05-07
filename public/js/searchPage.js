(async function () {
    const results = document.getElementById("results");
    const searchForm = document.getElementById("search");
    const REQUEST_URL = "/api/search";

    const error = (message) => {
        const error = document.createElement("p");
        error.className = "error";
        error.innerText = "Something went wrong fetching reviews. Try again?";
        results.appendChild(error);
    }

    const doRequest = async (url) => {
        results.replaceChildren();
        const request = await fetch(url);
        if (request) {
            results.innerHTML = await request.text();
        } else {
            error("Something went wrong fetching reviews :(");
        }
    }

    if (results) {
        navigator.geolocation.getCurrentPosition(
            async (success) => {
                const latitude = success.coords.latitude;
                const longitude = success.coords.longitude;
                await doRequest(`${REQUEST_URL}?latitude=${latitude}&longitude=${longitude}`);
            },
            async (error) => {
                await doRequest(`${REQUEST_URL}}`);
            }
        );
    }

    if (searchForm) {
        searchForm.on("submit", (event) => {
            event.preventDefault();

        })
    }


})();