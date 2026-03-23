const STORAGE_KEY = "matchpoint_matches_v2";

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

let matches = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
let editIndex = null;

function saveMatches() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(matches));
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
    const pattern = /^(\d+:\d+)(\s+\d+:\d+)*$/;
    return pattern.test(result.trim());
}

function parseResult(result) {
    return result
        .trim()
        .split(/\s+/)
        .map(function(setString) {
            const [myGamesRaw, opponentGamesRaw] = setString.split(":");
            const myGames = parseInt(myGamesRaw, 10);
            const opponentGames = parseInt(opponentGamesRaw, 10);

            if (Number.isNaN(myGames) || Number.isNaN(opponentGames)) {
                return null;
            }

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
    return truncateToOneDecimal(value).toFixed(1).replace(".", ",");
}

function formatThreeDecimals(value) {
    return truncateToThreeDecimals(value).toFixed(3).replace(".", ",");
}

function formatSignedThreeDecimals(value) {
    const prefix = value > 0 ? "+" : "";
    return `${prefix}${formatThreeDecimals(value)}`;
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
    const [year, month, day] = dateString.split("-").map(Number);
    return year * 10000 + month * 100 + day;
}

function getSortedMatchesDesc() {
    return matches
        .map(function(match, index) {
            return { match, originalIndex: index };
        })
        .sort(function(a, b) {
            const dateDiff = dateSortValue(b.match.date) - dateSortValue(a.match.date);
            if (dateDiff !== 0) return dateDiff;
            return b.originalIndex - a.originalIndex;
        });
}

/* DTB-orientierte Formel */

function calculatePoints(d) {
    if (d <= -4) return 10;
    if (d > -4 && d <= -2) {
        return 1.25 * Math.pow(d, 3) + 15 * Math.pow(d, 2) + 60 * d + 90;
    }
    if (d > -2 && d <= 4) {
        return 15 * d + 50;
    }
    if (d > 4 && d <= 6) {
        return -3.75 * Math.pow(d, 2) + 45 * d - 10;
    }
    return 125;
}

function calculateHurdle(lk) {
    if (lk >= 10) {
        return 10 * (30 - lk);
    }

    return 10 * (30 - lk) + (6435 / 289) * ((20 * (5 - lk) / (Math.pow(lk, 2))) + 1);
}

function getAgeFactor(ageClass) {
    const factors = {
        "21": 1.0,
        "open": 1.0,
        "30": 0.90,
        "35": 0.85,
        "40": 0.80,
        "45": 0.75,
        "50": 0.70,
        "55": 0.65,
        "60": 0.60,
        "65": 0.55,
        "70": 0.50,
        "75": 0.45,
        "80": 0.40,
        "85": 0.35,
        "90": 0.30
    };

    return factors[ageClass] ?? 1.0;
}

function calculateMotivationSurcharge(weeksInactive) {
    const weeks = Number(weeksInactive) || 0;
    return weeks * 0.025;
}

function calculateMatchLkData(match) {
    const ownLk = parseLk(match.ownLk);
    const opponentLk = parseLk(match.opponentLk);
    const metrics = getMatchMetrics(match);

    const points = metrics.isWin ? calculatePoints(ownLk - opponentLk) : 0;
    const hurdle = calculateHurdle(ownLk);
    const ageFactor = getAgeFactor(match.ageClass);
    const teamFactor = match.teamMatch ? 1.10 : 1.0;
    const shortSetFactor = match.shortSets ? 0.75 : 1.0;
    const motivation = calculateMotivationSurcharge(match.weeksInactive);

    const rawImprovement = metrics.isWin ? ageFactor * teamFactor * shortSetFactor * (points / hurdle) : 0;
    const improvement = truncateToThreeDecimals(rawImprovement);

    const companionBefore = ownLk;
    let companionAfter = companionBefore - improvement + motivation;

    if (companionAfter < 1.5) companionAfter = 1.5;
    if (companionAfter > 25.0) companionAfter = 25.0;

    companionAfter = truncateToThreeDecimals(companionAfter);
    const richtwert = truncateToOneDecimal(companionAfter);

    return {
        ownLk,
        opponentLk,
        metrics,
        points: truncateToThreeDecimals(points),
        hurdle: truncateToThreeDecimals(hurdle),
        ageFactor,
        teamFactor,
        shortSetFactor,
        motivation: truncateToThreeDecimals(motivation),
        improvement,
        companionBefore: truncateToThreeDecimals(companionBefore),
        companionAfter,
        richtwert,
        isWin: metrics.isWin
    };
}

function getComputedHistoryChronological() {
    return matches
        .map(function(match, index) {
            return { match, originalIndex: index };
        })
        .sort(function(a, b) {
            const dateDiff = dateSortValue(a.match.date) - dateSortValue(b.match.date);
            if (dateDiff !== 0) return dateDiff;
            return a.originalIndex - b.originalIndex;
        })
        .map(function(item) {
            return {
                ...item,
                computed: calculateMatchLkData(item.match)
            };
        });
}

function renderChart(history) {
    if (!history.length) {
        lkChart.innerHTML = `
            <text x="500" y="160" text-anchor="middle" fill="#6B7280" font-size="16" font-family="Arial">
                Noch keine Daten für die LK-Kurve vorhanden.
            </text>
        `;
        chartSubline.textContent = "Die Kurve erscheint, sobald Matches gespeichert sind.";
        return;
    }

    const width = 1000;
    const height = 320;
    const padding = { top: 24, right: 30, bottom: 34, left: 56 };
    const plotWidth = width - padding.left - padding.right;
    const plotHeight = height - padding.top - padding.bottom;

    const values = history.map(entry => entry.computed.companionAfter);
    let minVal = Math.min(...values);
    let maxVal = Math.max(...values);

    if (maxVal === minVal) {
        maxVal += 0.5;
        minVal -= 0.5;
    }

    const getX = function(index) {
        if (history.length === 1) {
            return padding.left + plotWidth / 2;
        }
        return padding.left + (plotWidth * index) / (history.length - 1);
    };

    // niedriger = besser -> optisch höher darstellen
    const getY = function(value) {
        return padding.top + ((value - minVal) / (maxVal - minVal)) * plotHeight;
    };

    const points = history.map(function(entry, index) {
        return {
            x: getX(index),
            y: getY(entry.computed.companionAfter),
            value: entry.computed.companionAfter
        };
    });

    const linePoints = points.map(point => `${point.x},${point.y}`).join(" ");
    const areaPath = [
        `M ${points[0].x} ${padding.top + plotHeight}`,
        ...points.map(point => `L ${point.x} ${point.y}`),
        `L ${points[points.length - 1].x} ${padding.top + plotHeight}`,
        "Z"
    ].join(" ");

    const gridValues = [
        minVal,
        minVal + (maxVal - minVal) / 2,
        maxVal
    ];

    const gridLines = gridValues.map(function(value) {
        const y = getY(value);
        return `
            <line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" stroke="#E5E7EB" stroke-width="1" />
            <text x="${padding.left - 10}" y="${y + 4}" text-anchor="end" fill="#6B7280" font-size="12" font-family="Arial">
                ${formatOneDecimal(value)}
            </text>
        `;
    }).join("");

    const dots = points.map(function(point, index) {
        const isLast = index === points.length - 1;
        return `
            <circle cx="${point.x}" cy="${point.y}" r="${isLast ? 5 : 4}" fill="${isLast ? "#7CB342" : "#1F2D3D"}"></circle>
        `;
    }).join("");

    const lastPoint = points[points.length - 1];

    lkChart.innerHTML = `
        <defs>
            <linearGradient id="curveAreaGradient" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stop-color="rgba(124,179,66,0.30)"></stop>
                <stop offset="100%" stop-color="rgba(124,179,66,0.02)"></stop>
            </linearGradient>
        </defs>

        ${gridLines}

        <path d="${areaPath}" fill="url(#curveAreaGradient)"></path>
        <polyline points="${linePoints}" fill="none" stroke="#7CB342" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"></polyline>
        ${dots}

        <text x="${lastPoint.x}" y="${lastPoint.y - 14}" text-anchor="middle" fill="#1F2D3D" font-size="12" font-family="Arial" font-weight="700">
            ${formatOneDecimal(lastPoint.value)}
        </text>
    `;

    chartSubline.textContent = `Begleitwert-Verlauf über ${history.length} gespeicherte Matches.`;
}

function updateDashboard() {
    const historyChronological = getComputedHistoryChronological();
    const historyDesc = [...historyChronological].reverse();

    const total = historyChronological.length;
    const winCount = historyChronological.filter(entry => entry.computed.isWin).length;
    const lossCount = total - winCount;
    const rate = total > 0 ? Math.round((winCount / total) * 100) : 0;

    totalMatches.textContent = total;
    wins.textContent = winCount;
    losses.textContent = lossCount;
    winRate.textContent = `${rate}%`;
    winRateInline.textContent = `${rate}%`;
    winRateBar.style.width = `${rate}%`;

    if (!historyChronological.length) {
        currentLk.textContent = "24,0";
        bestLk.textContent = "24,0";
        currentCompanion.textContent = "24,000";
        peakCompanion.textContent = "24,000";
        lastImprovement.textContent = "0,000";
        avgOpponentLk.textContent = "-";
        recentSummary.textContent = "Noch keine Daten vorhanden.";
        recentForm.innerHTML = `<span class="formStateChip neutral">Keine Matches</span>`;
        renderChart([]);
        return;
    }

    const latest = historyDesc[0].computed;
    const bestCompanion = Math.min(...historyChronological.map(entry => entry.computed.companionAfter));
    const avgOpp = historyChronological.reduce((sum, entry) => sum + entry.computed.opponentLk, 0) / historyChronological.length;

    currentLk.textContent = formatOneDecimal(latest.richtwert);
    bestLk.textContent = formatOneDecimal(bestCompanion);
    currentCompanion.textContent = formatThreeDecimals(latest.companionAfter);
    peakCompanion.textContent = formatThreeDecimals(bestCompanion);
    lastImprovement.textContent = formatThreeDecimals(latest.improvement);
    avgOpponentLk.textContent = formatOneDecimal(avgOpp);

    const recentMatches = historyDesc.slice(0, 5);
    const recentWins = recentMatches.filter(entry => entry.computed.isWin).length;

    recentSummary.textContent = `${recentWins} Siege / ${recentMatches.length - recentWins} Niederlagen in den letzten ${recentMatches.length} Matches`;
    recentForm.innerHTML = recentMatches.map(function(entry) {
        return `<span class="formStateChip ${entry.computed.isWin ? "win" : "loss"}">${entry.computed.isWin ? "W" : "L"}</span>`;
    }).join("");

    renderChart(historyChronological);
}

function renderMatches() {
    matchOutput.innerHTML = "";

    const ordered = getComputedHistoryChronological().reverse();

    if (!ordered.length) {
        matchOutput.innerHTML = `<li class="emptyState">Noch keine Matches gespeichert.</li>`;
        updateDashboard();
        return;
    }

    ordered.forEach(function(entry) {
        const match = entry.match;
        const index = entry.originalIndex;
        const data = entry.computed;

        const statusClass = data.isWin ? "win" : "loss";
        const statusText = data.isWin ? "Sieg" : "Niederlage";

        const card = document.createElement("li");

        card.innerHTML = `
            <article class="matchCard">
                <div class="matchCardTop">
                    <div class="matchIdentity">
                        <h3>${escapeHtml(match.opponent)}</h3>
                        <p class="matchDate">${formatDate(match.date)}</p>
                    </div>

                    <div class="matchHeaderBadges">
                        <span class="statusBadge ${statusClass}">${statusText}</span>
                        <span class="scoreBadge">${escapeHtml(match.result)}</span>
                    </div>
                </div>

                <div class="matchMetaGrid">
                    <div class="metaItem">
                        <span class="metaLabel">Eigene LK</span>
                        <span class="metaValue">${formatOneDecimal(data.ownLk)}</span>
                    </div>

                    <div class="metaItem">
                        <span class="metaLabel">Gegner-LK</span>
                        <span class="metaValue">${formatOneDecimal(data.opponentLk)}</span>
                    </div>

                    <div class="metaItem">
                        <span class="metaLabel">Punkte P</span>
                        <span class="metaValue">${formatThreeDecimals(data.points)}</span>
                    </div>

                    <div class="metaItem">
                        <span class="metaLabel">Hürde H</span>
                        <span class="metaValue">${formatThreeDecimals(data.hurdle)}</span>
                    </div>

                    <div class="metaItem">
                        <span class="metaLabel">Altersfaktor</span>
                        <span class="metaValue">${data.ageFactor.toFixed(2).replace(".", ",")}</span>
                    </div>

                    <div class="metaItem">
                        <span class="metaLabel">Verbesserung</span>
                        <span class="metaValue">${formatThreeDecimals(data.improvement)} LK</span>
                    </div>

                    <div class="metaItem">
                        <span class="metaLabel">Begleitwert neu</span>
                        <span class="metaValue">${formatThreeDecimals(data.companionAfter)}</span>
                    </div>

                    <div class="metaItem">
                        <span class="metaLabel">Richtwert neu</span>
                        <span class="metaValue">${formatOneDecimal(data.richtwert)}</span>
                    </div>

                    <div class="metaItem">
                        <span class="metaLabel">Spielort</span>
                        <span class="metaValue">${escapeHtml(match.location || "Nicht angegeben")}</span>
                    </div>

                    <div class="metaItem">
                        <span class="metaLabel">Kommentar</span>
                        <span class="metaValue">${escapeHtml(match.comment || "Kein Kommentar")}</span>
                    </div>
                </div>

                <div class="matchCardActions">
                    <button class="editButton" data-index="${index}">Bearbeiten</button>
                    <button class="deleteButton" data-index="${index}">Löschen</button>
                </div>
            </article>
        `;

        matchOutput.appendChild(card);
    });

    document.querySelectorAll(".deleteButton").forEach(function(button) {
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

    document.querySelectorAll(".editButton").forEach(function(button) {
        button.addEventListener("click", function() {
            const index = Number(button.getAttribute("data-index"));
            const match = matches[index];

            document.getElementById("opponent").value = match.opponent;
            document.getElementById("date").value = match.date;
            document.getElementById("ownLk").value = String(match.ownLk).replace(".", ",");
            document.getElementById("opponentLk").value = String(match.opponentLk).replace(".", ",");
            document.getElementById("ageClass").value = match.ageClass;
            document.getElementById("result").value = match.result;
            document.getElementById("weeksInactive").value = match.weeksInactive;
            document.getElementById("location").value = match.location;
            document.getElementById("teamMatch").checked = Boolean(match.teamMatch);
            document.getElementById("shortSets").checked = Boolean(match.shortSets);
            document.getElementById("comment").value = match.comment;

            editIndex = index;
            submitButton.textContent = "Match aktualisieren";
            cancelEditButton.classList.remove("hidden");
            setFormMessage(`Bearbeite Match gegen ${match.opponent}.`, "info");

            window.scrollTo({
                top: form.offsetTop - 100,
                behavior: "smooth"
            });
        });
    });

    updateDashboard();
}

cancelEditButton.addEventListener("click", function() {
    form.reset();
    resetEditMode();
    setFormMessage("Bearbeitung abgebrochen.", "info");
});

form.addEventListener("submit", function(event) {
    event.preventDefault();

    const opponent = document.getElementById("opponent").value.trim();
    const date = document.getElementById("date").value;
    const ownLk = document.getElementById("ownLk").value.trim();
    const opponentLk = document.getElementById("opponentLk").value.trim();
    const ageClass = document.getElementById("ageClass").value;
    const result = document.getElementById("result").value.trim();
    const weeksInactive = document.getElementById("weeksInactive").value.trim();
    const location = document.getElementById("location").value.trim();
    const teamMatch = document.getElementById("teamMatch").checked;
    const shortSets = document.getElementById("shortSets").checked;
    const comment = document.getElementById("comment").value.trim();

    if (!isValidLk(ownLk)) {
        setFormMessage("Bitte gib eine gültige eigene LK zwischen 1,0 und 25,0 ein.", "error");
        document.getElementById("ownLk").focus();
        return;
    }

    if (!isValidLk(opponentLk)) {
        setFormMessage("Bitte gib eine gültige Gegner-LK zwischen 1,0 und 25,0 ein.", "error");
        document.getElementById("opponentLk").focus();
        return;
    }

    if (!isValidResult(result)) {
        setFormMessage("Bitte gib ein gültiges Ergebnis ein, z. B. 6:4 6:3", "error");
        document.getElementById("result").focus();
        return;
    }

    const match = {
        opponent,
        date,
        ownLk: normalizeCommaNumber(ownLk),
        opponentLk: normalizeCommaNumber(opponentLk),
        ageClass,
        result,
        weeksInactive: Number(weeksInactive || 0),
        location,
        teamMatch,
        shortSets,
        comment
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