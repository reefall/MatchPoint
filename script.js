const form = document.getElementById("matchForm");
const matchOutput = document.getElementById("matchOutput");
const totalMatches = document.getElementById("totalMatches");
const wins = document.getElementById("wins");
const losses = document.getElementById("losses");
const winRate = document.getElementById("winRate");
const currentLk = document.getElementById("currentLk");
const bestLk = document.getElementById("bestLk");
const winRateInline = document.getElementById("winRateInline");
const winRateBar = document.getElementById("winRateBar");
const currentCompanion = document.getElementById("currentCompanion");
const peakCompanion = document.getElementById("peakCompanion");
const lastImprovement = document.getElementById("lastImprovement");
const avgOpponentLk = document.getElementById("avgOpponentLk");
const lkChart = document.getElementById("lkChart");
const chartSubline = document.getElementById("chartSubline");
const recentForm = document.getElementById("recentForm");
const recentSummary = document.getElementById("recentSummary");
const submitButton = document.getElementById("submitButton");
const cancelEditButton = document.getElementById("cancelEditButton");
const formMessage = document.getElementById("formMessage");

let matches = [];
let editId = null;

async function loadMatches() {
    try {
        const response = await fetch("/api/matches");

        if (!response.ok) {
            throw new Error("Matches konnten nicht geladen werden.");
        }

        matches = await response.json();
        renderMatches();
    } catch (error) {
        console.error(error);
        setFormMessage(
            "Die Matches konnten nicht vom Server geladen werden.",
            "error"
        );
    }
}

function normalizeCommaNumber(value) {
    return String(value).trim().replace(",", ".");
}

function parseLk(value) {
    return parseFloat(normalizeCommaNumber(value));
}

function isValidLk(value) {
    const lk = parseLk(value);
    return Number.isFinite(lk) && lk >= 1 && lk <= 25;
}

function isValidResult(result) {
    return /^(\d+:\d+)(\s+\d+:\d+)*$/.test(result.trim());
}

function parseResult(result) {
    return result
        .trim()
        .split(/\s+/)
        .map(setString => {
            const [myGames, opponentGames] = setString
                .split(":")
                .map(Number);

            if (
                Number.isNaN(myGames) ||
                Number.isNaN(opponentGames)
            ) {
                return null;
            }

            return {
                myGames,
                opponentGames
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

    sets.forEach(setData => {
        wonGames += setData.myGames;
        lostGames += setData.opponentGames;

        if (setData.myGames > setData.opponentGames) {
            wonSets++;
        } else if (setData.myGames < setData.opponentGames) {
            lostSets++;
        }
    });

    return {
        wonSets,
        lostSets,
        wonGames,
        lostGames,
        isWin: wonSets > lostSets
    };
}

function truncateToOneDecimal(value) {
    return Math.floor(value * 10) / 10;
}

function truncateToThreeDecimals(value) {
    return Math.floor(value * 1000) / 1000;
}

function formatOneDecimal(value) {
    return truncateToOneDecimal(value)
        .toFixed(1)
        .replace(".", ",");
}

function formatThreeDecimals(value) {
    return truncateToThreeDecimals(value)
        .toFixed(3)
        .replace(".", ",");
}

function formatDate(dateString) {
    if (!dateString) {
        return "-";
    }

    const parts = dateString.split("-");

    if (parts.length === 3) {
        return `${parts[2]}.${parts[1]}.${parts[0]}`;
    }

    return dateString;
}

function escapeHtml(value) {
    const entityMap = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "\"": "&quot;",
        "'": "&#039;"
    };

    return String(value ?? "").replace(
        /[&<>"']/g,
        character => entityMap[character]
    );
}

function setFormMessage(message, type = "info") {
    formMessage.textContent = message;
    formMessage.className = `formMessage ${type}`;
}

function resetEditMode() {
    editId = null;
    submitButton.textContent = "Match speichern";
    cancelEditButton.classList.add("hidden");
}

function dateSortValue(dateString) {
    if (!dateString) {
        return 0;
    }

    const [year, month, day] = dateString
        .split("-")
        .map(Number);

    return year * 10000 + month * 100 + day;
}

function calculatePoints(difference) {
    if (difference <= -4) {
        return 10;
    }

    if (difference <= -2) {
        return (
            1.25 * difference ** 3 +
            15 * difference ** 2 +
            60 * difference +
            90
        );
    }

    if (difference <= 4) {
        return 15 * difference + 50;
    }

    if (difference <= 6) {
        return (
            -3.75 * difference ** 2 +
            45 * difference -
            10
        );
    }

    return 125;
}

function calculateHurdle(lk) {
    if (lk >= 10) {
        return 10 * (30 - lk);
    }

    return (
        10 * (30 - lk) +
        (6435 / 289) *
        ((20 * (5 - lk) / (lk ** 2)) + 1)
    );
}

function calculateMatchLkData(match) {
    const ownLk = parseLk(match.ownLk);
    const opponentLk = parseLk(match.opponentLk);
    const metrics = getMatchMetrics(match);

    const points = metrics.isWin
        ? calculatePoints(ownLk - opponentLk)
        : 0;

    const hurdle = calculateHurdle(ownLk);

    const improvement = truncateToThreeDecimals(
        metrics.isWin ? points / hurdle : 0
    );

    let companionAfter = ownLk - improvement;

    if (companionAfter < 1.5) {
        companionAfter = 1.5;
    }

    if (companionAfter > 25) {
        companionAfter = 25;
    }

    companionAfter = truncateToThreeDecimals(companionAfter);

    return {
        ownLk,
        opponentLk,
        metrics,
        points: truncateToThreeDecimals(points),
        hurdle: truncateToThreeDecimals(hurdle),
        improvement,
        companionAfter,
        richtwert: truncateToOneDecimal(companionAfter),
        isWin: metrics.isWin
    };
}

function getComputedHistoryChronological() {
    return matches
        .map(match => ({
            match,
            computed: calculateMatchLkData(match)
        }))
        .sort((a, b) => {
            const dateDifference =
                dateSortValue(a.match.date) -
                dateSortValue(b.match.date);

            if (dateDifference !== 0) {
                return dateDifference;
            }

            return Number(a.match.id) - Number(b.match.id);
        });
}

function renderChart(history) {
    if (!history.length) {
        lkChart.innerHTML = `
            <text
                x="500"
                y="160"
                text-anchor="middle"
                fill="#6B7280"
                font-size="16"
                font-family="Arial"
            >
                Noch keine Daten für die LK-Kurve vorhanden.
            </text>
        `;

        chartSubline.textContent =
            "Die Kurve erscheint, sobald Matches gespeichert sind.";

        return;
    }

    const width = 1000;
    const height = 320;

    const padding = {
        top: 24,
        right: 30,
        bottom: 34,
        left: 56
    };

    const plotWidth =
        width - padding.left - padding.right;

    const plotHeight =
        height - padding.top - padding.bottom;

    const values = history.map(
        entry => entry.computed.companionAfter
    );

    let minValue = Math.min(...values);
    let maxValue = Math.max(...values);

    if (minValue === maxValue) {
        minValue -= 0.5;
        maxValue += 0.5;
    }

    function getX(index) {
        if (history.length === 1) {
            return padding.left + plotWidth / 2;
        }

        return (
            padding.left +
            (plotWidth * index) / (history.length - 1)
        );
    }

    function getY(value) {
        return (
            padding.top +
            ((value - minValue) /
                (maxValue - minValue)) *
            plotHeight
        );
    }

    const points = history.map((entry, index) => ({
        x: getX(index),
        y: getY(entry.computed.companionAfter),
        value: entry.computed.companionAfter
    }));

    const linePoints = points
        .map(point => `${point.x},${point.y}`)
        .join(" ");

    const areaPath = [
        `M ${points[0].x} ${padding.top + plotHeight}`,
        ...points.map(
            point => `L ${point.x} ${point.y}`
        ),
        `L ${points[points.length - 1].x} ${padding.top + plotHeight}`,
        "Z"
    ].join(" ");

    const gridValues = [
        minValue,
        minValue + (maxValue - minValue) / 2,
        maxValue
    ];

    const gridLines = gridValues
        .map(value => {
            const y = getY(value);

            return `
                <line
                    x1="${padding.left}"
                    y1="${y}"
                    x2="${width - padding.right}"
                    y2="${y}"
                    stroke="#E5E7EB"
                    stroke-width="1"
                />

                <text
                    x="${padding.left - 10}"
                    y="${y + 4}"
                    text-anchor="end"
                    fill="#6B7280"
                    font-size="12"
                    font-family="Arial"
                >
                    ${formatOneDecimal(value)}
                </text>
            `;
        })
        .join("");

    const dots = points
        .map((point, index) => {
            const isLastPoint =
                index === points.length - 1;

            return `
                <circle
                    cx="${point.x}"
                    cy="${point.y}"
                    r="${isLastPoint ? 5 : 4}"
                    fill="${isLastPoint ? "#7CB342" : "#1F2D3D"}"
                ></circle>
            `;
        })
        .join("");

    const lastPoint = points[points.length - 1];

    lkChart.innerHTML = `
        <defs>
            <linearGradient
                id="curveAreaGradient"
                x1="0"
                x2="0"
                y1="0"
                y2="1"
            >
                <stop
                    offset="0%"
                    stop-color="rgba(124,179,66,0.30)"
                ></stop>

                <stop
                    offset="100%"
                    stop-color="rgba(124,179,66,0.02)"
                ></stop>
            </linearGradient>
        </defs>

        ${gridLines}

        <path
            d="${areaPath}"
            fill="url(#curveAreaGradient)"
        ></path>

        <polyline
            points="${linePoints}"
            fill="none"
            stroke="#7CB342"
            stroke-width="4"
            stroke-linecap="round"
            stroke-linejoin="round"
        ></polyline>

        ${dots}

        <text
            x="${lastPoint.x}"
            y="${lastPoint.y - 14}"
            text-anchor="middle"
            fill="#1F2D3D"
            font-size="12"
            font-family="Arial"
            font-weight="700"
        >
            ${formatOneDecimal(lastPoint.value)}
        </text>
    `;

    chartSubline.textContent =
        `Begleitwert-Verlauf über ${history.length} gespeicherte Matches.`;
}

function updateDashboard() {
    const historyChronological =
        getComputedHistoryChronological();

    const historyDescending = [
        ...historyChronological
    ].reverse();

    const total = historyChronological.length;

    const winCount = historyChronological.filter(
        entry => entry.computed.isWin
    ).length;

    const lossCount = total - winCount;

    const rate = total
        ? Math.round((winCount / total) * 100)
        : 0;

    totalMatches.textContent = total;
    wins.textContent = winCount;
    losses.textContent = lossCount;
    winRate.textContent = `${rate}%`;
    winRateInline.textContent = `${rate}%`;
    winRateBar.style.width = `${rate}%`;

    if (!total) {
        currentLk.textContent = "24,0";
        bestLk.textContent = "24,0";
        currentCompanion.textContent = "24,000";
        peakCompanion.textContent = "24,000";
        lastImprovement.textContent = "0,000";
        avgOpponentLk.textContent = "-";
        recentSummary.textContent = "Noch keine Daten vorhanden.";

        recentForm.innerHTML = `
            <span class="formStateChip neutral">
                Keine Matches
            </span>
        `;

        renderChart([]);
        return;
    }

    const latest = historyDescending[0].computed;

    const bestCompanionValue = Math.min(
        ...historyChronological.map(
            entry => entry.computed.companionAfter
        )
    );

    const averageOpponentLk =
        historyChronological.reduce(
            (sum, entry) =>
                sum + entry.computed.opponentLk,
            0
        ) / total;

    const recentMatches =
        historyDescending.slice(0, 5);

    const recentWins = recentMatches.filter(
        entry => entry.computed.isWin
    ).length;

    currentLk.textContent =
        formatOneDecimal(latest.richtwert);

    bestLk.textContent =
        formatOneDecimal(bestCompanionValue);

    currentCompanion.textContent =
        formatThreeDecimals(latest.companionAfter);

    peakCompanion.textContent =
        formatThreeDecimals(bestCompanionValue);

    lastImprovement.textContent =
        formatThreeDecimals(latest.improvement);

    avgOpponentLk.textContent =
        formatOneDecimal(averageOpponentLk);

    recentSummary.textContent =
        `${recentWins} Siege / ${
            recentMatches.length - recentWins
        } Niederlagen in den letzten ${
            recentMatches.length
        } Matches`;

    recentForm.innerHTML = recentMatches
        .map(entry => {
            const stateClass =
                entry.computed.isWin
                    ? "win"
                    : "loss";

            const stateText =
                entry.computed.isWin
                    ? "W"
                    : "L";

            return `
                <span class="formStateChip ${stateClass}">
                    ${stateText}
                </span>
            `;
        })
        .join("");

    renderChart(historyChronological);
}

function renderMatches() {
    matchOutput.innerHTML = "";

    const ordered =
        getComputedHistoryChronological().reverse();

    if (!ordered.length) {
        matchOutput.innerHTML = `
            <li class="emptyState">
                Noch keine Matches gespeichert.
            </li>
        `;

        updateDashboard();
        return;
    }

    ordered.forEach(entry => {
        const match = entry.match;
        const data = entry.computed;

        const statusClass =
            data.isWin ? "win" : "loss";

        const statusText =
            data.isWin ? "Sieg" : "Niederlage";

        const card = document.createElement("li");

        card.innerHTML = `
            <article class="matchCard">
                <div class="matchCardTop">
                    <div class="matchIdentity">
                        <h3>${escapeHtml(match.opponent)}</h3>
                        <p class="matchDate">
                            ${formatDate(match.date)}
                        </p>
                    </div>

                    <div class="matchHeaderBadges">
                        <span class="statusBadge ${statusClass}">
                            ${statusText}
                        </span>

                        <span class="scoreBadge">
                            ${escapeHtml(match.result)}
                        </span>
                    </div>
                </div>

                <div class="matchMetaGrid">
                    <div class="metaItem">
                        <span class="metaLabel">Eigene LK</span>
                        <span class="metaValue">
                            ${formatOneDecimal(data.ownLk)}
                        </span>
                    </div>

                    <div class="metaItem">
                        <span class="metaLabel">Gegner-LK</span>
                        <span class="metaValue">
                            ${formatOneDecimal(data.opponentLk)}
                        </span>
                    </div>

                    <div class="metaItem">
                        <span class="metaLabel">Punkte P</span>
                        <span class="metaValue">
                            ${formatThreeDecimals(data.points)}
                        </span>
                    </div>

                    <div class="metaItem">
                        <span class="metaLabel">Verbesserung</span>
                        <span class="metaValue">
                            ${formatThreeDecimals(data.improvement)} LK
                        </span>
                    </div>

                    <div class="metaItem">
                        <span class="metaLabel">Spielort</span>
                        <span class="metaValue">
                            ${escapeHtml(
                                match.location || "Nicht angegeben"
                            )}
                        </span>
                    </div>

                    <div class="metaItem">
                        <span class="metaLabel">Kommentar</span>
                        <span class="metaValue">
                            ${escapeHtml(
                                match.comment || "Kein Kommentar"
                            )}
                        </span>
                    </div>
                </div>

                <div class="matchCardActions">
                    <button
                        class="editButton"
                        data-id="${match.id}"
                    >
                        Bearbeiten
                    </button>

                    <button
                        class="deleteButton"
                        data-id="${match.id}"
                    >
                        Löschen
                    </button>
                </div>
            </article>
        `;

        matchOutput.appendChild(card);
    });

    addEditButtonEvents();
    addDeleteButtonEvents();
    updateDashboard();
}

function addEditButtonEvents() {
    const editButtons =
        document.querySelectorAll(".editButton");

    editButtons.forEach(button => {
        button.addEventListener("click", () => {
            const id = Number(button.dataset.id);

            const match = matches.find(
                item => Number(item.id) === id
            );

            if (!match) {
                setFormMessage(
                    "Das Match wurde nicht gefunden.",
                    "error"
                );
                return;
            }

            document.getElementById("opponent").value =
                match.opponent;

            document.getElementById("date").value =
                match.date;

            document.getElementById("ownLk").value =
                String(match.ownLk).replace(".", ",");

            document.getElementById("opponentLk").value =
                String(match.opponentLk).replace(".", ",");

            document.getElementById("result").value =
                match.result;

            document.getElementById("location").value =
                match.location || "";

            document.getElementById("comment").value =
                match.comment || "";

            editId = id;

            submitButton.textContent =
                "Match aktualisieren";

            cancelEditButton.classList.remove("hidden");

            setFormMessage(
                `Bearbeite Match gegen ${match.opponent}.`,
                "info"
            );

            window.scrollTo({
                top: form.offsetTop - 100,
                behavior: "smooth"
            });
        });
    });
}

function addDeleteButtonEvents() {
    const deleteButtons =
        document.querySelectorAll(".deleteButton");

    deleteButtons.forEach(button => {
        button.addEventListener("click", async () => {
            const id = Number(button.dataset.id);

            try {
                const response = await fetch(
                    `/api/matches/${id}`,
                    {
                        method: "DELETE"
                    }
                );

                if (!response.ok) {
                    throw new Error(
                        "Match konnte nicht gelöscht werden."
                    );
                }

                if (editId === id) {
                    form.reset();
                    resetEditMode();
                }

                setFormMessage(
                    "Match erfolgreich gelöscht.",
                    "success"
                );

                await loadMatches();
            } catch (error) {
                console.error(error);

                setFormMessage(
                    "Das Match konnte noch nicht gelöscht werden.",
                    "error"
                );
            }
        });
    });
}

cancelEditButton.addEventListener("click", () => {
    form.reset();
    resetEditMode();

    setFormMessage(
        "Bearbeitung abgebrochen.",
        "info"
    );
});

form.addEventListener("submit", async event => {
    event.preventDefault();

    const opponent =
        document.getElementById("opponent")
            .value
            .trim();

    const date =
        document.getElementById("date").value;

    const ownLk =
        document.getElementById("ownLk")
            .value
            .trim();

    const opponentLk =
        document.getElementById("opponentLk")
            .value
            .trim();

    const result =
        document.getElementById("result")
            .value
            .trim();

    const location =
        document.getElementById("location")
            .value
            .trim();

    const comment =
        document.getElementById("comment")
            .value
            .trim();

    if (!isValidLk(ownLk)) {
        setFormMessage(
            "Bitte gib eine gültige eigene LK zwischen 1,0 und 25,0 ein.",
            "error"
        );

        document.getElementById("ownLk").focus();
        return;
    }

    if (!isValidLk(opponentLk)) {
        setFormMessage(
            "Bitte gib eine gültige Gegner-LK zwischen 1,0 und 25,0 ein.",
            "error"
        );

        document.getElementById("opponentLk").focus();
        return;
    }

    if (!isValidResult(result)) {
        setFormMessage(
            "Bitte gib ein gültiges Ergebnis ein, zum Beispiel 6:4 6:3.",
            "error"
        );

        document.getElementById("result").focus();
        return;
    }

    const match = {
        opponent,
        date,
        ownLk: Number(normalizeCommaNumber(ownLk)),
        opponentLk: Number(
            normalizeCommaNumber(opponentLk)
        ),
        result,
        location,
        comment
    };

    try {
        let response;

        if (editId === null) {
            response = await fetch("/api/matches", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(match)
            });
        } else {
            response = await fetch(
                `/api/matches/${editId}`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(match)
                }
            );
        }

        if (!response.ok) {
            const errorData = await response
                .json()
                .catch(() => ({}));

            throw new Error(
                errorData.error ||
                "Das Match konnte nicht gespeichert werden."
            );
        }

        const successMessage =
            editId === null
                ? "Match erfolgreich gespeichert."
                : "Match erfolgreich aktualisiert.";

        form.reset();
        resetEditMode();

        setFormMessage(
            successMessage,
            "success"
        );

        await loadMatches();
    } catch (error) {
        console.error(error);

        setFormMessage(
            error.message ||
            "Das Match konnte nicht gespeichert werden.",
            "error"
        );
    }
});

loadMatches();