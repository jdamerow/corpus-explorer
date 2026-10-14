# AI Corpus Explorer

A small React app for browsing the references in `corpus.csv` by tag. It shows a searchable reference list and the selected item's bibliographic details.

## Run locally

```sh
npm install
npm run dev
```

Vite prints the local URL after the server starts. Create a production build with `npm run build`, or serve that build locally with `npm run preview`.

## Data format

The app reads `corpus.csv` as a Zotero CSV export. It maps the key, item type, title, abstract, publication, URL, DOI, publication year, author, and tag columns into the reference shape used by the interface. Authors and tags are expected to be separated by semicolons in their respective cells.

Manual and automatic Zotero tags are combined and deduplicated. When an item has no exported tags, the app suggests topics by matching a small set of regular expressions against its title, abstract, and publication title. These suggestions are app-side fallbacks; the CSV is not modified.

The corpus is imported into the frontend bundle, so changes to `corpus.csv` require a reload or rebuild.

## Contributing

Contributions are welcome. If you know of a useful reference to add, feel free to open an issue with a suggestion for a new reference. If you'd like to improve the explorer or the corpus, please open a pull request.