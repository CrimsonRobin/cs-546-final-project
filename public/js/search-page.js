(async function () {
    const results = document.getElementById("results");
    const searchForm = document.getElementById("search");
    const searchBox = document.getElementById("search-box");
    const advancedCheckbox = document.getElementById("advanced");
    const advancedSettings = document.getElementById("advanced-settings")
    const radius = document.getElementById("radius");
    const latitude = document.getElementById("latitude");
    const longitude = document.getElementById("longitude");

    const REQUEST_URL = "/api/search";

    const error = (message) => {
        const error = document.createElement("p");
        error.className = "error";
        error.innerText = "Something went wrong fetching reviews. Try again?";
        results.appendChild(error);
    }

    const doRequest = async (url) => {
        const searching = document.createElement("p");
        searching.innerText = "Searching...";
        results.replaceChildren(searching);
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

    if (advancedCheckbox) {
        advancedCheckbox.checked = false;
        advancedCheckbox.addEventListener("click", () => advancedSettings.toggleAttribute("hidden"));
    }

    if (searchForm) {
        searchForm.addEventListener("submit", async (event) => {
            event.preventDefault();
            let searchQuery;
            try {
                searchQuery = parseNonEmptyString(searchBox.value, "Search term");
            } catch (e) {}
            let lat;
            let long;
            let rad;
            try {
                if (advancedCheckbox && advancedCheckbox.checked) {
                    lat = parseLatitude(parseNumber(latitude.value, "Latitude"));
                    long = parseLongtitude(parseNumber(longitude.value, "Longitude"));
                    rad = parseSearchRadius(parseNumber(radius.value, "Radius"));
                }
                if (lat === undefined ^ long === undefined) {
                    error("Invalid search: either latitude or longitude is not given!");
                }
            } catch (e) {
                error(`Invalid search: ${e.message}`);
                return;
            }
            if (advancedCheckbox.checked) {
                const params = new URLSearchParams({
                    latitude: lat,
                    longitude: long,
                    radius: rad,
                });
                if (searchQuery) {
                    params.append("searchTerm", searchQuery);
                }
                const query = params.toString();
                await doRequest(`${REQUEST_URL}?${query}`);
            } else {
                const params = new URLSearchParams();
                if (searchQuery) {
                    params.append("searchTerm", searchQuery);
                }
                navigator.geolocation.getCurrentPosition(
                    async (success) => {
                        const latitude = success.coords.latitude;
                        const longitude = success.coords.longitude;
                        params.append("latitude", latitude);
                        params.append("longitude", longitude);
                        const query = params.toString();
                        await doRequest(`${REQUEST_URL}$${query}`);
                    },
                    async (error) => {
                        const query = params.toString();
                        await doRequest(`${REQUEST_URL}$${query}`);
                    }
                );
            }
        })
    }


})();