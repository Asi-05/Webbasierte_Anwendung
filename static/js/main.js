// Aufbau:
// $.getJSON(...).done(handle...Reply) -> handle...Reply geht die Liste durch -> add...ToList pro Eintrag

// Hier merken wir uns die Kategorien, um bei Aufgaben den Namen anzeigen zu können
let kategorien = [];

// Hier merken wir uns die Aufgabe, die gerade im Formular bearbeitet wird.
// null = keine Aufgabe in Bearbeitung -> das Formular erfasst eine neue Aufgabe
let bearbeiteteAufgabe = null;

// Beim Öffnen der Seite zuerst die Kategorien laden (danach die Aufgaben)
$(document).ready(function() {
    $.getJSON("/api/kategorien")
        .done(handleKategorienReply)
        .fail(zeigeFehler);
});

// Zeigt eine Fehlermeldung an (z.B. Fehler aus der Business-Logik oder Server nicht erreichbar)
function zeigeFehler(xhr) {
    alert("Fehler: " + (xhr.responseJSON ? xhr.responseJSON.detail : xhr.statusText));
}

// Hilfsfunktion: sendet JSON an den Server (für POST, PUT, DELETE).
// $.getJSON kann nur GET, deshalb hier $.ajax mit der passenden HTTP-Methode.
function sendeAnfrage(methode, url, daten) {
    return $.ajax({
        url: url,
        type: methode,
        contentType: "application/json",
        data: daten ? JSON.stringify(daten) : undefined
    }).fail(zeigeFehler);
}

// ---------- Kategorien (fix: Schule, Arbeit, Privat) ----------

// Füllt die Dropdowns (Formular und Filter) mit den Kategorien vom Server
function handleKategorienReply(data) {
    kategorien = data;
    $("#selKategorie").empty();
    $("#selFilterKategorie").empty();
    // Erste Filter-Option "Alle" mit leerem Wert -> kein Kategorie-Filter
    $("#selFilterKategorie").append($("<option>").val("").text("Alle"));
    for (let kategorie of kategorien) {
        $("#selKategorie").append($("<option>").val(kategorie.id).text(kategorie.name));
        $("#selFilterKategorie").append($("<option>").val(kategorie.id).text(kategorie.name));
    }
    ladeAufgaben(); // erst jetzt, damit die Kategorienamen bekannt sind
}

function kategorieName(id) {
    for (let kategorie of kategorien) {
        if (kategorie.id === id) {
            return kategorie.name;
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
    if ($("#chkNurOffene").is(":checked")) {
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
    for (let aufgabe of aufgaben) {
        addAufgabeToList(aufgabe);
    }
}

// Hängt eine Aufgabe als Zeile an die Tabelle an
function addAufgabeToList(aufgabe) {
    let checked = aufgabe.erledigt ? " checked" : "";

    let newRow = $("<tr>");
    newRow.toggleClass("erledigt", aufgabe.erledigt);
    newRow.toggleClass("ueberfaellig", aufgabe.ueberfaellig); // "ueberfaellig" berechnet der Server
    // Die Zeile, die gerade im Formular bearbeitet wird, hervorheben
    newRow.toggleClass("inBearbeitung", bearbeiteteAufgabe !== null && bearbeiteteAufgabe.id === aufgabe.id);

    newRow.append("<td><input type='checkbox' onClick='javascript:erledigtUmschalten(" + aufgabe.id + ")'" + checked + "></td>");
    // Texte mit .text() einfügen, damit HTML im Titel nicht ausgeführt wird
    newRow.append($("<td>").text(aufgabe.titel));
    newRow.append($("<td>").text(aufgabe.beschreibung || ""));
    newRow.append($("<td>").text(formatiereDatum(aufgabe.faellig_am)));
    newRow.append($("<td>").text(kategorieName(aufgabe.kategorie_id)));
    newRow.append("<td>"
        + "<button onClick='javascript:aufgabeAendern(" + aufgabe.id + ")'>Ändern</button> "
        + "<button onClick='javascript:aufgabeLoeschen(" + aufgabe.id + ")'>Löschen</button>"
        + "</td>");

    $("#tblAufgabenliste tbody").append(newRow);
}

// Wandelt "2026-12-07" (Format vom Server) in "07.12.2026" um
function formatiereDatum(datum) {
    if (!datum) {
        return "";
    }
    return datum.split("-").reverse().join(".");
}

// ---------- Aufgabe erstellen oder ändern (gleiches Formular) ----------

// Wird vom Button "Aufgabe speichern" / "Änderung speichern" aufgerufen (onClick in index.html).
// Keine Aufgabe in Bearbeitung -> POST (neue Aufgabe), sonst PUT (bestehende Aufgabe ändern).
function aufgabeSpeichern() {
    let aufgabe = {
        titel: $("#inpTitel").val(),
        beschreibung: $("#inpBeschreibung").val() || null,
        faellig_am: $("#inpFaellig").val() || null, // leeres Feld -> kein Datum
        kategorie_id: parseInt($("#selKategorie").val())
    };

    if (bearbeiteteAufgabe === null) {
        sendeAnfrage("POST", "/api/aufgabe", aufgabe).done(bearbeitungBeenden);
    } else {
        // "erledigt" steht nicht im Formular -> Wert der bearbeiteten Aufgabe übernehmen,
        // sonst würde PUT (ersetzt die ganze Aufgabe) ihn auf false zurücksetzen
        aufgabe.erledigt = bearbeiteteAufgabe.erledigt;
        sendeAnfrage("PUT", "/api/aufgabe/" + bearbeiteteAufgabe.id, aufgabe).done(bearbeitungBeenden);
    }
}

// Leert das Formular, beendet den Bearbeitungsmodus und lädt die Liste neu.
// Wird nach erfolgreichem Speichern aufgerufen und direkt vom Button "Abbrechen" (onClick in index.html).
function bearbeitungBeenden() {
    bearbeiteteAufgabe = null;
    $("#inpTitel").val("");
    $("#inpBeschreibung").val("");
    $("#inpFaellig").val("");
    $("#btnSpeichern").text("Aufgabe speichern");
    $("#btnAbbrechen").hide();
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
    $("#inpBeschreibung").val(aufgabe.beschreibung || "");
    $("#inpFaellig").val(aufgabe.faellig_am || ""); // Format "2026-12-07" passt direkt ins Datumsfeld
    $("#selKategorie").val(aufgabe.kategorie_id);
    $("#btnSpeichern").text("Änderung speichern");
    $("#btnAbbrechen").show();
    ladeAufgaben(); // neu zeichnen, damit die bearbeitete Zeile hervorgehoben wird
}

function erledigtUmschalten(id) {
    $.getJSON("/api/aufgabe/" + id)
        .done(handleErledigtReply)
        .fail(zeigeFehler);
}

function handleErledigtReply(aufgabe) {
    aufgabe.erledigt = !aufgabe.erledigt;
    sendeAnfrage("PUT", "/api/aufgabe/" + aufgabe.id, aufgabe).done(ladeAufgaben);
}

function aufgabeLoeschen(id) {
    sendeAnfrage("DELETE", "/api/aufgabe/" + id).done(ladeAufgaben);
}
