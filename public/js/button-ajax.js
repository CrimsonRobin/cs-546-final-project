(function () {
    const addReviewButton = document.getElementById("add-review");
    if (addReviewButton) {
        addReviewButton.addEventListener("click", )
    }
    const likeDislikeButtons = document.getElementsByClassName("like-dislike");
    likeDislikeButtons.map((div) => {
        const like = div.getElementsByClassName("like")[0];
        const dislike = div.getElementsByClassName("dislike")[0];
        const score = div.getElementsByClassName("score")[0];
        if (like && dislike) {
            like.addEventListener("click", (event) => {
                if (like.classList.contains("selected")) {
                    // undo like
                } else {
                    // execute like
                }
                // in case the other one was selected
                dislike.classList.remove("selected");
            });
            dislike.addEventListener("click", (event) => {
                if (like.classList.contains("selected")) {
                    // undo dislike
                } else {
                    // execute dislike
                }
                // in case the other one was selected
                like.classList.remove("selected");
            });
        }
    });
})();