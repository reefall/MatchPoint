const form = document.getElementById("matchForm"); //Hier wird das Formular ausgewählt
const matchOutput = document.getElementById("matchOutput"); //Hier wird die Liste der Matches ausgegeben

form.addEventListener("submit", function(event) { //Hier wird ein EventListener hinzugefügt, der auf das Absenden des Formulars reagiert
    event.preventDefault(); //damit die Seite nicht neu lädt

    const opponent = document.getElementById("opponent").value; //Hier wird der Wert des Gegners aus dem Formular ausgelesen
    const date = document.getElementById("date").value; //Hier wird der Wert des Datums aus dem Formular ausgelesen
    const result = document.getElementById("result").value; //Hier wird der Wert des Ergebnisses aus dem Formular ausgelesen
    const location = document.getElementById("location").value; //Hier wird der Wert des Spielorts aus dem Formular ausgelesen
    const comment = document.getElementById("comment").value; //Hier wird der Wert des Kommentars aus dem Formular ausgelesen

    const newMatch = document.createElement("li"); //Hier wird ein neues Listenelement erstellt, um die Match-Informationen anzuzeigen

    newMatch.innerHTML = ` //Hier wird der Inhalt des neuen Listenelements mit den Match-Informationen gefüllt
        <strong>${opponent}</strong><br> //Der Gegner wird fett dargestellt
        Datum: ${date}<br> // Das Datum wird angezeigt
        Ergebnis: ${result}<br> 
        Spielort: ${location}<br> 
        Kommentar: ${comment} 
    `;

    matchOutput.appendChild(newMatch); //Hier wird das neue Listenelement zur Liste der Matches hinzugefügt

    form.reset(); //Hier wird das Formular zurückgesetzt, damit die Eingabefelder leer sind
});