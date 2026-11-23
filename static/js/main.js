// Aufbau:
// $.getJSON(...).done(handle...Reply) -> handle...Reply geht die Liste durch -> add...ToList pro Eintrag

// Hier merken wir uns die Kategorien, um bei Aufgaben den Namen anzeigen zu können
let kategorien = [];

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

// Füllt das Dropdown mit den Kategorien vom Server
function handleKategorienReply(data) {
    kategorien = data;
    $("#selKategorie").empty();
    for (let kategorie of kategorien) {
        $("#selKategorie").append($("<option>").val(kategorie.id).text(kategorie.name));
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

// Holt alle Aufgaben per AJAX (HTTP-GET) vom REST-Service.
// Bei Erfolg wird handleAufgabenlisteReply aufgerufen, bei einem Fehler zeigeFehler.
function ladeAufgaben() {
    $.getJSON("/api/aufgaben")
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

// ---------- Aufgabe erstellen ----------

// Wird vom Button "Aufgabe speichern" aufgerufen (onClick in index.html)
function aufgabeSpeichern() {
    let neueAufgabe = {
        titel: $("#inpTitel").val(),
        beschreibung: $("#inpBeschreibung").val() || null,
        faellig_am: $("#inpFaellig").val() || null, // leeres Feld -> kein Datum
        kategorie_id: parseInt($("#selKategorie").val())
    };
    sendeAnfrage("POST", "/api/aufgabe", neueAufgabe).done(function() {
        $("#inpTitel").val("");
        $("#inpBeschreibung").val("");
        $("#inpFaellig").val("");
        ladeAufgaben();
    });
}

// ---------- Aufgabe ändern / erledigt / löschen ----------
// Die Aufgabe wird per ID gezielt vom Server geholt (GET /api/aufgabe/{id}) und dann weiterverarbeitet.

function aufgabeAendern(id) {
    $.getJSON("/api/aufgabe/" + id)
        .done(handleAufgabeAendernReply)
        .fail(zeigeFehler);
}

function handleAufgabeAendernReply(aufgabe) {
    let neuerTitel = prompt("Neuer Titel:", aufgabe.titel);
    if (neuerTitel) {
        aufgabe.titel = neuerTitel;
        sendeAnfrage("PUT", "/api/aufgabe/" + aufgabe.id, aufgabe).done(ladeAufgaben);
    }
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
