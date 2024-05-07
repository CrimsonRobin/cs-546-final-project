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
    likeDislikeButtons.map((div) => {
        const like = div.getElementsByClassName("like")[0];
        const dislike = div.getElementsByClassName("dislike")[0];
        const score = div.getElementsByClassName("score")[0];
        if (like && dislike) {
            const id = div.dataset._id;
            if (id) {
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
        }
    });
})();