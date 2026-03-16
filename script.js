const form = document.getElementById("matchForm");
const matchOutput = document.getElementById("matchOutput");

const totalMatches = document.getElementById("totalMatches");
const wins = document.getElementById("wins");
const losses = document.getElementById("losses");
const winRate = document.getElementById("winRate");
const winRateInline = document.getElementById("winRateInline");
const winRateBar = document.getElementById("winRateBar");

const currentStreak = document.getElementById("currentStreak");
const bestStreak = document.getElementById("bestStreak");
const setRecord = document.getElementById("setRecord");
const gameRecord = document.getElementById("gameRecord");
const avgGamesWon = document.getElementById("avgGamesWon");
const avgGamesLost = document.getElementById("avgGamesLost");
const recentForm = document.getElementById("recentForm");
const recentSummary = document.getElementById("recentSummary");

const submitButton = document.getElementById("submitButton");
const cancelEditButton = document.getElementById("cancelEditButton");
const formMessage = document.getElementById("formMessage");

let matches = JSON.parse(localStorage.getItem("matches")) || [];
let editIndex = null;

function saveMatches() {
    localStorage.setItem("matches", JSON.stringify(matches));
}

function setFormMessage(message, type = "info") {
    formMessage.textContent = message;
    formMessage.className = `formMessage ${type}`;
}

function resetEditMode() {
    editIndex = null;
    submitButton.textContent = "Match speichern";
    cancelEditButton.classList.add("hidden");
}

function dateSortValue(dateString) {
    if (!dateString) return 0;

    const parts = dateString.split("-").map(Number);
    if (parts.length !== 3) return 0;

    const [year, month, day] = parts;
    return year * 10000 + month * 100 + day;
}

function formatDate(dateString) {
    if (!dateString) return "-";

    const parts = dateString.split("-");
    if (parts.length !== 3) return dateString;

    return `${parts[2]}.${parts[1]}.${parts[0]}`;
}

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, function(char) {
        const entityMap = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            "\"": "&quot;",
            "'": "&#039;"
        };
        return entityMap[char];
    });
}

function isValidResult(result) {
    const pattern = /^(\d+:\d+)(\s+\d+:\d+)*$/;
    return pattern.test(result.trim());
}

function parseResult(result) {
    return result
        .trim()
        .split(/\s+/)
        .map(function(setScore) {
            const scores = setScore.split(":");

            if (scores.length !== 2) return null;

            const myGames = parseInt(scores[0], 10);
            const opponentGames = parseInt(scores[1], 10);

            if (Number.isNaN(myGames) || Number.isNaN(opponentGames)) return null;

            return {
                myGames: myGames,
                opponentGames: opponentGames
            };
        })
        .filter(Boolean);
}

function getMatchMetrics(match) {
    const sets = parseResult(match.result);
    let wonSets = 0;
    let lostSets = 0;
    let wonGames = 0;
    let lostGames = 0;

    sets.forEach(function(setData) {
        wonGames += setData.myGames;
        lostGames += setData.opponentGames;

        if (setData.myGames > setData.opponentGames) {
            wonSets++;
        } else if (setData.myGames < setData.opponentGames) {
            lostSets++;
        }
    });

    return {
        wonSets: wonSets,
        lostSets: lostSets,
        wonGames: wonGames,
        lostGames: lostGames,
        isWin: wonSets > lostSets
    };
}

function getSortedMatchesDesc() {
    return matches
        .map(function(match, index) {
            return {
                match: match,
                originalIndex: index
            };
        })
        .sort(function(a, b) {
            const dateDiff = dateSortValue(b.match.date) - dateSortValue(a.match.date);

            if (dateDiff !== 0) {
                return dateDiff;
            }

            return b.originalIndex - a.originalIndex;
        });
}

function updateStats() {
    const orderedDesc = getSortedMatchesDesc();
    const chronological = [...orderedDesc].reverse();

    let winCount = 0;
    let lossCount = 0;
    let totalSetsWon = 0;
    let totalSetsLost = 0;
    let totalGamesWon = 0;
    let totalGamesLost = 0;

    orderedDesc.forEach(function(item) {
        const metrics = getMatchMetrics(item.match);

        totalSetsWon += metrics.wonSets;
        totalSetsLost += metrics.lostSets;
        totalGamesWon += metrics.wonGames;
        totalGamesLost += metrics.lostGames;

        if (metrics.isWin) {
            winCount++;
        } else {
            lossCount++;
        }
    });

    totalMatches.textContent = matches.length;
    wins.textContent = winCount;
    losses.textContent = lossCount;

    const rate = matches.length > 0 ? Math.round((winCount / matches.length) * 100) : 0;
    winRate.textContent = `${rate}%`;
    winRateInline.textContent = `${rate}%`;
    winRateBar.style.width = `${rate}%`;

    if (orderedDesc.length === 0) {
        currentStreak.textContent = "-";
        bestStreak.textContent = "-";
        setRecord.textContent = "0:0";
        gameRecord.textContent = "0:0";
        avgGamesWon.textContent = "0.0";
        avgGamesLost.textContent = "0.0";
        recentSummary.textContent = "Noch keine Daten vorhanden.";
        recentForm.innerHTML = `<span class="formStateChip neutral">Keine Matches</span>`;
        return;
    }

    const firstOutcome = getMatchMetrics(orderedDesc[0].match).isWin;
    let streakCount = 0;

    for (const item of orderedDesc) {
        const sameOutcome = getMatchMetrics(item.match).isWin === firstOutcome;

        if (sameOutcome) {
            streakCount++;
        } else {
            break;
        }
    }

    currentStreak.textContent = `${firstOutcome ? "W" : "L"}${streakCount}`;

    let bestWinStreak = 0;
    let runningWinStreak = 0;

    chronological.forEach(function(item) {
        const metrics = getMatchMetrics(item.match);

        if (metrics.isWin) {
            runningWinStreak++;
            bestWinStreak = Math.max(bestWinStreak, runningWinStreak);
        } else {
            runningWinStreak = 0;
        }
    });

    bestStreak.textContent = bestWinStreak > 0 ? `W${bestWinStreak}` : "-";
    setRecord.textContent = `${totalSetsWon}:${totalSetsLost}`;
    gameRecord.textContent = `${totalGamesWon}:${totalGamesLost}`;
    avgGamesWon.textContent = matches.length > 0 ? (totalGamesWon / matches.length).toFixed(1) : "0.0";
    avgGamesLost.textContent = matches.length > 0 ? (totalGamesLost / matches.length).toFixed(1) : "0.0";

    const recentMatches = orderedDesc.slice(0, 5);
    let recentWins = 0;

    recentForm.innerHTML = recentMatches.map(function(item) {
        const metrics = getMatchMetrics(item.match);

        if (metrics.isWin) {
            recentWins++;
        }

        return `<span class="formStateChip ${metrics.isWin ? "win" : "loss"}">${metrics.isWin ? "W" : "L"}</span>`;
    }).join("");

    recentSummary.textContent = `${recentWins} Siege / ${recentMatches.length - recentWins} Niederlagen in den letzten ${recentMatches.length} Matches`;
}

function renderMatches() {
    matchOutput.innerHTML = "";

    const orderedDesc = getSortedMatchesDesc();

    if (orderedDesc.length === 0) {
        matchOutput.innerHTML = `<li class="emptyState">Noch keine Matches gespeichert.</li>`;
        updateStats();
        return;
    }

    orderedDesc.forEach(function(item) {
        const match = item.match;
        const index = item.originalIndex;
        const metrics = getMatchMetrics(match);

        const statusClass = metrics.isWin ? "win" : "loss";
        const statusText = metrics.isWin ? "Sieg" : "Niederlage";

        const safeOpponent = escapeHtml(match.opponent);
        const safeLocation = escapeHtml(match.location || "Nicht angegeben");
        const safeComment = escapeHtml(match.comment || "Kein Kommentar");
        const safeResult = escapeHtml(match.result);

        const newMatch = document.createElement("li");

        newMatch.innerHTML = `
            <article class="matchCard">
                <div class="matchCardTop">
                    <div class="matchIdentity">
                        <h3>${safeOpponent}</h3>
                        <p class="matchDate">${formatDate(match.date)}</p>
                    </div>

                    <div class="matchHeaderBadges">
                        <span class="statusBadge ${statusClass}">${statusText}</span>
                        <span class="scoreBadge">${safeResult}</span>
                    </div>
                </div>

                <div class="matchMetaGrid">
                    <div class="metaItem">
                        <span class="metaLabel">Satzbilanz</span>
                        <span class="metaValue">${metrics.wonSets}:${metrics.lostSets}</span>
                    </div>

                    <div class="metaItem">
                        <span class="metaLabel">Spielbilanz</span>
                        <span class="metaValue">${metrics.wonGames}:${metrics.lostGames}</span>
                    </div>

                    <div class="metaItem">
                        <span class="metaLabel">Spielort</span>
                        <span class="metaValue">${safeLocation}</span>
                    </div>

                    <div class="metaItem">
                        <span class="metaLabel">Kommentar</span>
                        <span class="metaValue">${safeComment}</span>
                    </div>
                </div>

                <div class="matchCardActions">
                    <button class="editButton" data-index="${index}">Bearbeiten</button>
                    <button class="deleteButton" data-index="${index}">Löschen</button>
                </div>
            </article>
        `;

        matchOutput.appendChild(newMatch);
    });

    const deleteButtons = document.querySelectorAll(".deleteButton");
    deleteButtons.forEach(function(button) {
        button.addEventListener("click", function() {
            const index = Number(button.getAttribute("data-index"));

            if (editIndex !== null) {
                if (editIndex === index) {
                    form.reset();
                    resetEditMode();
                    setFormMessage("Bearbeitung wurde zurückgesetzt, weil das Match gelöscht wurde.", "info");
                } else if (editIndex > index) {
                    editIndex = editIndex - 1;
                }
            }

            matches.splice(index, 1);
            saveMatches();
            renderMatches();
        });
    });

    const editButtons = document.querySelectorAll(".editButton");
    editButtons.forEach(function(button) {
        button.addEventListener("click", function() {
            const index = Number(button.getAttribute("data-index"));
            const match = matches[index];

            document.getElementById("opponent").value = match.opponent;
            document.getElementById("date").value = match.date;
            document.getElementById("result").value = match.result;
            document.getElementById("location").value = match.location;
            document.getElementById("comment").value = match.comment;

            editIndex = index;
            submitButton.textContent = "Match aktualisieren";
            cancelEditButton.classList.remove("hidden");
            setFormMessage(`Bearbeite Match gegen ${match.opponent}.`, "info");

            window.scrollTo({
                top: form.offsetTop - 120,
                behavior: "smooth"
            });
        });
    });

    updateStats();
}

cancelEditButton.addEventListener("click", function() {
    form.reset();
    resetEditMode();
    setFormMessage("Bearbeitung abgebrochen.", "info");
});

form.addEventListener("submit", function(event) {
    event.preventDefault();

    const opponentValue = document.getElementById("opponent").value.trim();
    const dateValue = document.getElementById("date").value;
    const resultValue = document.getElementById("result").value.trim();
    const locationValue = document.getElementById("location").value.trim();
    const commentValue = document.getElementById("comment").value.trim();

    if (!isValidResult(resultValue)) {
        setFormMessage("Bitte gib ein gültiges Ergebnis ein, zum Beispiel: 6:4 6:3", "error");
        document.getElementById("result").focus();
        return;
    }

    const match = {
        opponent: opponentValue,
        date: dateValue,
        result: resultValue,
        location: locationValue,
        comment: commentValue
    };

    if (editIndex === null) {
        matches.push(match);
        setFormMessage("Match erfolgreich gespeichert.", "success");
    } else {
        matches[editIndex] = match;
        setFormMessage("Match erfolgreich aktualisiert.", "success");
    }

    saveMatches();
    form.reset();
    resetEditMode();
    renderMatches();
});

renderMatches();