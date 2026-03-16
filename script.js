const form = document.getElementById("matchForm");
const matchOutput = document.getElementById("matchOutput");
const totalMatches = document.getElementById("totalMatches");
const wins = document.getElementById("wins");
const losses = document.getElementById("losses");
const winRate = document.getElementById("winRate");

let matches = JSON.parse(localStorage.getItem("matches")) || [];
let editIndex = null;

function updateStats() {
    let winCount = 0;
    let lossCount = 0;

    matches.forEach(function(match) {
        const sets = match.result.trim().split(" ");
        let wonSets = 0;
        let lostSets = 0;

        sets.forEach(function(setScore) {
            const scores = setScore.split(":");

            if (scores.length === 2) {
                const myGames = parseInt(scores[0]);
                const opponentGames = parseInt(scores[1]);

                if (myGames > opponentGames) {
                    wonSets++;
                } else if (myGames < opponentGames) {
                    lostSets++;
                }
            }
        });

        if (wonSets > lostSets) {
            winCount++;
        } else if (lostSets > wonSets) {
            lossCount++;
        }
    });

    totalMatches.textContent = matches.length;
    wins.textContent = winCount;
    losses.textContent = lossCount;

    let rate = 0;

    if (matches.length > 0) {
        rate = Math.round((winCount / matches.length) * 100);
    }

    winRate.textContent = rate + "%";
}

function renderMatches() {
    matchOutput.innerHTML = "";

    if (matches.length === 0) {
        matchOutput.innerHTML = `<li class="emptyState">Noch keine Matches gespeichert.</li>`;
        updateStats();
        return;
    }

    matches.forEach(function(match, index) {
        const newMatch = document.createElement("li");

        newMatch.innerHTML = `
            <div class="matchCard">
                <div class="matchCardHeader">
                    <h3 class="matchOpponent">${match.opponent}</h3>
                    <span class="matchResult">${match.result}</span>
                </div>

                <div class="matchCardBody">
                    <div class="matchInfoRow">
                        <span class="matchLabel">Datum</span>
                        <span class="matchValue">${match.date}</span>
                    </div>

                    <div class="matchInfoRow">
                        <span class="matchLabel">Spielort</span>
                        <span class="matchValue">${match.location || "-"}</span>
                    </div>

                    <div class="matchInfoRow commentRow">
                        <span class="matchLabel">Kommentar</span>
                        <span class="matchValue">${match.comment || "-"}</span>
                    </div>
                </div>

                <div class="matchCardActions">
                    <button class="editButton" data-index="${index}">Bearbeiten</button>
                    <button class="deleteButton" data-index="${index}">Löschen</button>
                </div>
            </div>
        `;

        matchOutput.appendChild(newMatch);
    });

    const deleteButtons = document.querySelectorAll(".deleteButton");
    deleteButtons.forEach(function(button) {
        button.addEventListener("click", function() {
            const index = button.getAttribute("data-index");
            matches.splice(index, 1);
            localStorage.setItem("matches", JSON.stringify(matches));
            renderMatches();
        });
    });

    const editButtons = document.querySelectorAll(".editButton");
    editButtons.forEach(function(button) {
        button.addEventListener("click", function() {
            const index = button.getAttribute("data-index");
            const match = matches[index];

            document.getElementById("opponent").value = match.opponent;
            document.getElementById("date").value = match.date;
            document.getElementById("result").value = match.result;
            document.getElementById("location").value = match.location;
            document.getElementById("comment").value = match.comment;

            editIndex = index;
        });
    });

    updateStats();
}

form.addEventListener("submit", function(event) {
    event.preventDefault();

    const match = {
        opponent: document.getElementById("opponent").value,
        date: document.getElementById("date").value,
        result: document.getElementById("result").value,
        location: document.getElementById("location").value,
        comment: document.getElementById("comment").value
    };

    if (editIndex === null) {
        matches.push(match);
    } else {
        matches[editIndex] = match;
        editIndex = null;
    }

    localStorage.setItem("matches", JSON.stringify(matches));
    form.reset();
    renderMatches();
});

renderMatches();