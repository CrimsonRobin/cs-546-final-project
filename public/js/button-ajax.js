(function () {
    const addReviewButton = document.getElementById("add-review");
    const addReviewDialog = document.getElementById("add-review-dialog");
    if (addReviewButton) {
        addReviewButton.addEventListener("click", (event) => {
            addReviewDialog.showModal();
        })
    }
    // const replyButtons = document.getElementsByClassName("reply");

    const likeDislikeButtons = document.getElementsByClassName("like-dislike");
    [...likeDislikeButtons].map((div) => {
        const like = div.getElementsByClassName("like")[0];
        const dislike = div.getElementsByClassName("dislike")[0];
        const likes = div.getElementsByClassName("like-num")[0];
        const dislikes = div.getElementsByClassName("dislike-num")[0];
        if (like && dislike) {
            const id = div.dataset._id;
            if (id) {
                like.addEventListener("click", async (event) => {
                    const res = await fetch(`/api/review/${id}/like`, {method: "POST" });
                    like.classList.toggle("selected");
                    // in case the other one was selected
                    dislike.classList.remove("selected");
                });
                dislike.addEventListener("click", async (event) => {
                    const res = await fetch(`/api/review/${id}/dislike`, {method: "POST"});
                    like.classList.toggle("selected");
                    // in case the other one was selected
                    like.classList.remove("selected");
                });
            }
        }
    });
})();