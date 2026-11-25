// Aufbau:
// $.getJSON(...).done(handle...Reply) -> handle...Reply geht die Liste durch -> add...ToList pro Eintrag

// Hier merken wir uns die Kategorien, um bei Aufgaben den Namen anzeigen zu können
let kategorien = [];

// Hier merken wir uns die Aufgabe, die gerade im Formular bearbeitet wird.
// null = keine Aufgabe in Bearbeitung -> das Formular erfasst eine neue Aufgabe
let bearbeiteteAufgabe = null;

// Beim Öffnen der Seite zuerst die Kategorien laden (danach die Aufgaben).
// Das Script steht am Ende vom body, deshalb existieren alle HTML-Elemente schon.
$.getJSON("/api/kategorien")
    .done(handleKategorienReply)
    .fail(zeigeFehler);

// Zeigt eine Fehlermeldung an (z.B. Fehler aus der Business-Logik oder Server nicht erreichbar)
function zeigeFehler(xhr) {
    if (xhr.responseJSON) {
        alert("Fehler: " + xhr.responseJSON.detail);
    } else {
        alert("Fehler: " + xhr.statusText);
    }
}

// ---------- Kategorien (fix: Schule, Arbeit, Privat) ----------

// Füllt die Dropdowns (Formular und Filter) mit den Kategorien vom Server
function handleKategorienReply(data) {
    kategorien = data;
    // Erste Filter-Option "Alle" mit leerem Wert -> kein Kategorie-Filter
    $("#selFilterKategorie").append($("<option>").val("").text("Alle"));
    for (let i = 0; i < kategorien.length; i++) {
        let kategorie = kategorien[i];
        $("#selKategorie").append($("<option>").val(kategorie.id).text(kategorie.name));
        $("#selFilterKategorie").append($("<option>").val(kategorie.id).text(kategorie.name));
    }
    ladeAufgaben(); // erst jetzt, damit die Kategorienamen bekannt sind
}

function kategorieName(id) {
    for (let i = 0; i < kategorien.length; i++) {
        if (kategorien[i].id === id) {
            return kategorien[i].name;
        }
    }
    return "?";
}

// ---------- Aufgabenliste ----------

// Holt die Aufgaben per AJAX (HTTP-GET) vom REST-Service.
// Die Filter werden als Query-Parameter mitgeschickt, z.B. /api/aufgaben?kategorie_id=2&nur_offene=true
// -> gefiltert wird auf dem Server, nicht hier im JavaScript.
// Bei Erfolg wird handleAufgabenlisteReply aufgerufen, bei einem Fehler zeigeFehler.
function ladeAufgaben() {
    let parameter = {};
    // Nur gesetzte Filter mitschicken ("Alle" hat den leeren Wert "")
    if ($("#selFilterKategorie").val()) {
        parameter.kategorie_id = $("#selFilterKategorie").val();
    }
    if (document.getElementById("chkNurOffene").checked) {
        parameter.nur_offene = true;
    }
    // jQuery hängt das Objekt "parameter" automatisch als ?...&... an die URL an
    $.getJSON("/api/aufgaben", parameter)
        .done(handleAufgabenlisteReply)
        .fail(zeigeFehler);
}

// "aufgaben" ist das Array mit den Aufgaben-Objekten, das der Server als JSON geschickt hat.
// Zuerst wird die Tabelle geleert (sonst wären alte Zeilen doppelt da),
// danach wird jede Aufgabe als Zeile angehängt.
function handleAufgabenlisteReply(aufgaben) {
    $("#tblAufgabenliste tbody").empty();
    for (let i = 0; i < aufgaben.length; i++) {
        addAufgabeToList(aufgaben[i]);
    }
}

// Hängt eine Aufgabe als Zeile an die Tabelle an
function addAufgabeToList(aufgabe) {
    let checked = "";
    if (aufgabe.erledigt) {
        checked = " checked";
    }

    let newRow = $("<tr>");
    if (aufgabe.erledigt) {
        newRow.addClass("erledigt");
    }
    if (aufgabe.ueberfaellig) { // "ueberfaellig" berechnet der Server
        newRow.addClass("ueberfaellig");
    }

    newRow.append("<td><input type='checkbox' onclick='erledigtUmschalten(" + aufgabe.id + ")'" + checked + "></td>");
    // Texte mit .text() einfügen, damit HTML im Titel nicht ausgeführt wird
    newRow.append($("<td>").text(aufgabe.titel));
    newRow.append($("<td>").text(aufgabe.beschreibung)); // null ergibt bei .text() einen leeren Text
    newRow.append($("<td>").text(aufgabe.faellig_am)); // Format vom Server: "2026-12-07"
    newRow.append($("<td>").text(kategorieName(aufgabe.kategorie_id)));
    newRow.append("<td>"
        + "<button onclick='aufgabeAendern(" + aufgabe.id + ")'>Ändern</button> "
        + "<button onclick='aufgabeLoeschen(" + aufgabe.id + ")'>Löschen</button>"
        + "</td>");

    $("#tblAufgabenliste tbody").append(newRow);
}

// ---------- Aufgabe erstellen oder ändern (gleiches Formular) ----------

// Wird vom Button "Aufgabe speichern" / "Änderung speichern" aufgerufen (onClick in index.html).
// Keine Aufgabe in Bearbeitung -> POST (neue Aufgabe), sonst PUT (bestehende Aufgabe ändern).
function aufgabeSpeichern() {
    let aufgabe = {
        titel: $("#inpTitel").val(),
        beschreibung: $("#inpBeschreibung").val(),
        faellig_am: null, // leeres Feld -> kein Datum (der Server versteht "" nicht als Datum)
        kategorie_id: $("#selKategorie").val() // "2" wandelt FastAPI selbst in die Zahl 2 um
    };
    if ($("#inpFaellig").val()) {
        aufgabe.faellig_am = $("#inpFaellig").val();
    }

    // Neue Aufgabe -> POST, Aufgabe in Bearbeitung -> PUT
    let url = "/api/aufgabe";
    let methode = "POST";
    if (bearbeiteteAufgabe !== null) {
        url = "/api/aufgabe/" + bearbeiteteAufgabe.id;
        methode = "PUT";
        // "erledigt" steht nicht im Formular -> Wert der bearbeiteten Aufgabe übernehmen,
        // sonst würde PUT (ersetzt die ganze Aufgabe) ihn auf false zurücksetzen
        aufgabe.erledigt = bearbeiteteAufgabe.erledigt;
    }

    // $.getJSON kann nur GET, deshalb hier $.ajax mit der passenden HTTP-Methode.
    // JSON.stringify wandelt das Objekt in JSON-Text um (nötig wegen contentType "application/json").
    $.ajax({
        url: url,
        type: methode,
        contentType: "application/json",
        data: JSON.stringify(aufgabe),
        success: bearbeitungBeenden,
        error: zeigeFehler
    });
}

// Leert das Formular, beendet den Bearbeitungsmodus und lädt die Liste neu.
// Wird nach erfolgreichem Speichern aufgerufen und nach dem Löschen der bearbeiteten Aufgabe.
function bearbeitungBeenden() {
    bearbeiteteAufgabe = null;
    $("#inpTitel").val("");
    $("#inpBeschreibung").val("");
    $("#inpFaellig").val("");
    $("#btnSpeichern").text("Aufgabe speichern");
    ladeAufgaben();
}

// ---------- Aufgabe ändern / erledigt / löschen ----------
// Die Aufgabe wird per ID gezielt vom Server geholt (GET /api/aufgabe/{id}) und dann weiterverarbeitet.

function aufgabeAendern(id) {
    $.getJSON("/api/aufgabe/" + id)
        .done(handleAufgabeAendernReply)
        .fail(zeigeFehler);
}

// Füllt das Formular mit der Aufgabe vom Server und schaltet in den Bearbeitungsmodus.
// Gespeichert wird erst, wenn man auf "Änderung speichern" klickt (aufgabeSpeichern).
function handleAufgabeAendernReply(aufgabe) {
    bearbeiteteAufgabe = aufgabe;
    $("#inpTitel").val(aufgabe.titel);
    $("#inpBeschreibung").val(aufgabe.beschreibung); // null ergibt bei .val() ein leeres Feld
    $("#inpFaellig").val(aufgabe.faellig_am); // Format "2026-12-07" passt direkt ins Datumsfeld
    $("#selKategorie").val(aufgabe.kategorie_id);
    $("#btnSpeichern").text("Änderung speichern");
}

function erledigtUmschalten(id) {
    $.getJSON("/api/aufgabe/" + id)
        .done(handleErledigtReply)
        .fail(zeigeFehler);
}

function handleErledigtReply(aufgabe) {
    aufgabe.erledigt = !aufgabe.erledigt;
    $.ajax({
        url: "/api/aufgabe/" + aufgabe.id,
        type: "PUT",
        contentType: "application/json",
        data: JSON.stringify(aufgabe),
        success: ladeAufgaben,
        error: zeigeFehler
    });
}

function aufgabeLoeschen(id) {
    if (!confirm("Aufgabe wirklich löschen?")) {
        return;
    }
    $.ajax({
        url: "/api/aufgabe/" + id,
        type: "DELETE",
        success: function() {
            // Wurde genau die Aufgabe gelöscht, die im Formular bearbeitet wird -> Formular leeren.
            // Sonst nur die Liste neu laden (eine andere Aufgabe bleibt in Bearbeitung).
            if (bearbeiteteAufgabe !== null && bearbeiteteAufgabe.id === id) {
                bearbeitungBeenden();
            } else {
                ladeAufgaben();
            }
        },
        error: zeigeFehler
    });
}
