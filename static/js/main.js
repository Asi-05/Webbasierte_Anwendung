// Hier merken wir uns die Kategorien, um bei Aufgaben den Namen anzeigen zu können
let kategorien = [];

// Zeigt eine Fehlermeldung an (z.B. Fehler aus der Business-Logik oder Server nicht erreichbar)
function zeigeFehler(xhr) {
    alert("Fehler: " + (xhr.responseJSON ? xhr.responseJSON.detail : xhr.statusText));
}

// Hilfsfunktion: sendet JSON an den Server (für POST, PUT, DELETE)
function sendeAnfrage(methode, url, daten) {
    return $.ajax({
        url: url,
        type: methode,
        contentType: "application/json",
        data: daten ? JSON.stringify(daten) : undefined
    }).fail(zeigeFehler);
}

// ---------- Kategorien (fix: Schule, Arbeit, Privat) ----------

function ladeKategorien() {
    $.getJSON("/api/kategorien")
        .done(function(data) {
            kategorien = data;
            let select = $("#kategorieSelect").empty();
            for (let k of data) {
                select.append($("<option>").val(k.id).text(k.name));
            }
            ladeAufgaben(); // erst jetzt, damit die Kategorienamen bekannt sind
        })
        .fail(zeigeFehler);
}

// ---------- Aufgaben ----------

function kategorieName(id) {
    for (let k of kategorien) {
        if (k.id === id) {
            return k.name;
        }
    }
    return "?";
}

function ladeAufgaben() {
    $.getJSON("/api/aufgaben")
        .done(function(data) {
            let tbody = $("#aufgabeTable tbody").empty();
            for (let a of data) {
                tbody.append(erstelleZeile(a));
            }
        })
        .fail(zeigeFehler);
}

// Baut eine Tabellenzeile für eine Aufgabe
function erstelleZeile(a) {
    let checkbox = $("<input type='checkbox'>").prop("checked", a.erledigt);
    checkbox.change(function() {
        a.erledigt = this.checked;
        sendeAnfrage("PUT", "/api/aufgaben/" + a.id, a).done(ladeAufgaben);
    });

    let aendernBtn = $("<button>").text("Ändern").click(function() {
        aufgabeAendern(a);
    });
    let loeschenBtn = $("<button>").text("Löschen").click(function() {
        aufgabeLoeschen(a);
    });

    let zeile = $("<tr>").toggleClass("erledigt", a.erledigt);
    zeile.append($("<td>").append(checkbox));
    zeile.append($("<td>").text(a.titel));
    zeile.append($("<td>").text(a.beschreibung || ""));
    zeile.append($("<td>").text(kategorieName(a.kategorie_id)));
    zeile.append($("<td>").append(aendernBtn).append(loeschenBtn));
    return zeile;
}

function aufgabeAendern(a) {
    let neuerTitel = prompt("Neuer Titel:", a.titel);
    if (neuerTitel) {
        a.titel = neuerTitel;
        sendeAnfrage("PUT", "/api/aufgaben/" + a.id, a).done(ladeAufgaben);
    }
}

function aufgabeLoeschen(a) {
    sendeAnfrage("DELETE", "/api/aufgaben/" + a.id).done(ladeAufgaben);
}

// Formular absenden -> neue Aufgabe speichern
// (Der Browser prüft vorher das "required"-Feld, d.h. ohne Titel wird gar nicht gesendet)
$("#aufgabeForm").submit(function(event) {
    event.preventDefault(); // verhindert, dass die Seite neu geladen wird

    let neueAufgabe = {
        titel: $("#titelInput").val(),
        beschreibung: $("#beschreibungInput").val() || null,
        kategorie_id: parseInt($("#kategorieSelect").val())
    };
    sendeAnfrage("POST", "/api/aufgaben", neueAufgabe).done(function() {
        $("#titelInput").val("");
        $("#beschreibungInput").val("");
        ladeAufgaben();
    });
});

// Beim Öffnen der Seite alles laden
$(document).ready(ladeKategorien);
