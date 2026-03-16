const form = document.getElementById("matchForm");
const matchOutput = document.getElementById("matchOutput");

let matches = JSON.parse(localStorage.getItem("matches")) || [];
let editIndex = null;

function renderMatches() {
    matchOutput.innerHTML = "";

    matches.forEach(function(match, index) {
        const newMatch = document.createElement("li");

        newMatch.innerHTML = `
            <strong>${match.opponent}</strong><br>
            Datum: ${match.date}<br>
            Ergebnis: ${match.result}<br>
            Spielort: ${match.location}<br>
            Kommentar: ${match.comment}<br><br>
            <button class="editButton" data-index="${index}">Bearbeiten</button>
            <button class="deleteButton" data-index="${index}">Löschen</button>
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