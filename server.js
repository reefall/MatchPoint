const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const app = express();
const PORT = 3000;

// JSON-Daten aus HTTP-Anfragen lesen
app.use(express.json());

// Dateien wie index.html, styles.css und script.js bereitstellen
app.use(express.static(__dirname));

// Verbindung zur SQLite-Datenbank
const db = new sqlite3.Database("./matchpoint.db", error => {
    if (error) {
        console.error("Fehler beim Öffnen der Datenbank:", error.message);
        return;
    }

    console.log("Verbindung zur SQLite-Datenbank hergestellt.");
});

// Tabelle automatisch erstellen
db.run(`
    CREATE TABLE IF NOT EXISTS matches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        opponent TEXT NOT NULL,
        date TEXT NOT NULL,
        ownLk REAL NOT NULL,
        opponentLk REAL NOT NULL,
        result TEXT NOT NULL,
        location TEXT,
        comment TEXT
    )
`);

// Test-Route
app.get("/api/test", (request, response) => {
    response.json({
        message: "Backend funktioniert"
    });
});

app.get("/api/matches", (request, response) => {
    const sql = "SELECT * FROM matches ORDER BY date DESC, id DESC";

    db.all(sql, [], (error, rows) => {
        if (error) {
            console.error("Fehler beim Abrufen der Matches:", error.message);

            response.status(500).json({
                error: "Matches konnten nicht abgerufen werden."
            });

            return;
        }

        response.json(rows);
    });
});

app.post("/api/matches", (request, response) => {
    const {
        opponent,
        date,
        ownLk,
        opponentLk,
        result,
        location,
        comment
    } = request.body;

    if (!opponent || !date || !ownLk || !opponentLk || !result) {
        response.status(400).json({
            error: "Pflichtfelder fehlen."
        });
        return;
    }

    const sql = `
        INSERT INTO matches (
            opponent,
            date,
            ownLk,
            opponentLk,
            result,
            location,
            comment
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
        opponent,
        date,
        ownLk,
        opponentLk,
        result,
        location || "",
        comment || ""
    ];

    db.run(sql, values, function(error) {
        if (error) {
            console.error("Fehler beim Speichern:", error.message);

            response.status(500).json({
                error: "Match konnte nicht gespeichert werden."
            });

            return;
        }

        response.status(201).json({
            id: this.lastID,
            opponent,
            date,
            ownLk,
            opponentLk,
            result,
            location: location || "",
            comment: comment || ""
        });
    });
});

app.put("/api/matches/:id", (request, response) => {
    const id = Number(request.params.id);

    const {
        opponent,
        date,
        ownLk,
        opponentLk,
        result,
        location,
        comment
    } = request.body;

    if (!id || !opponent || !date || !ownLk || !opponentLk || !result) {
        response.status(400).json({
            error: "Ungültige oder unvollständige Daten."
        });
        return;
    }

    const sql = `
        UPDATE matches
        SET
            opponent = ?,
            date = ?,
            ownLk = ?,
            opponentLk = ?,
            result = ?,
            location = ?,
            comment = ?
        WHERE id = ?
    `;

    const values = [
        opponent,
        date,
        ownLk,
        opponentLk,
        result,
        location || "",
        comment || "",
        id
    ];

    db.run(sql, values, function(error) {
        if (error) {
            console.error("Fehler beim Aktualisieren:", error.message);

            response.status(500).json({
                error: "Match konnte nicht aktualisiert werden."
            });

            return;
        }

        if (this.changes === 0) {
            response.status(404).json({
                error: "Match wurde nicht gefunden."
            });

            return;
        }

        response.json({
            id,
            opponent,
            date,
            ownLk,
            opponentLk,
            result,
            location: location || "",
            comment: comment || ""
        });
    });
});

app.delete("/api/matches/:id", (request, response) => {
    const id = Number(request.params.id);

    if (!id) {
        response.status(400).json({
            error: "Ungültige Match-ID."
        });
        return;
    }

    const sql = "DELETE FROM matches WHERE id = ?";

    db.run(sql, [id], function(error) {
        if (error) {
            console.error("Fehler beim Löschen:", error.message);

            response.status(500).json({
                error: "Match konnte nicht gelöscht werden."
            });

            return;
        }

        if (this.changes === 0) {
            response.status(404).json({
                error: "Match wurde nicht gefunden."
            });

            return;
        }

        response.json({
            message: "Match erfolgreich gelöscht."
        });
    });
});

// Server starten
app.listen(PORT, () => {
    console.log(`Server läuft auf http://localhost:${PORT}`);
});