# Ostfriesischer Freiheitsmarsch – Streckenkarte

Interaktive Next.js-Streckenkarte mit geschütztem Adminbereich, editierbaren
Knotenpunkten, Routenverwaltung, OpenAI-Assistent und Vercel-Blob-Speicherung.

## Lokale Entwicklung

```bash
npm install
npm run dev
npm run build
```

## Vercel-Konfiguration

Das GitHub-Repository wird mit dem Preset **Next.js** und dem Root-Verzeichnis
`./` importiert. Für die dauerhafte Speicherung muss ein Vercel-Blob-Speicher
mit dem Projekt verbunden sein. Vercel stellt danach
`BLOB_READ_WRITE_TOKEN` automatisch bereit.

### Umgebungsvariablen

- `ADMIN_PASSWORD`: Passwort für den Adminbereich
- `ADMIN_SESSION_SECRET`: zufälliges Geheimnis für die Sitzungssignatur
- `BLOB_READ_WRITE_TOKEN`: wird von Vercel Blob gesetzt
- `OPENAI_API_KEY`: optional für den KI-Assistenten
- `OPENAI_MODEL`: optional, Standard ist `gpt-5.6-sol`

Ohne Blob-Token wird die Karte mit den offiziellen Standarddaten angezeigt.
Speichernde Admin-Aktionen benötigen den verbundenen Blob-Speicher.

## Befehle

- `npm run dev`: lokale Entwicklung
- `npm run build`: Produktions-Build
- `npm test`: Quell- und Routendaten prüfen
- `npm run lint`: Codeprüfung

## Dokumentation

- [Next.js](https://nextjs.org/docs)
- [Vercel Blob](https://vercel.com/docs/storage/vercel-blob)
