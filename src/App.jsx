import { useMemo, useState } from 'react';
import Papa from 'papaparse';
import corpusCsv from '../corpus.csv?raw';

// Fallback topics for records that do not have exported Zotero tags.
const tagRules = [
  {
    name: 'RAG & retrieval',
    match: /\b(rag|retrieval|retriever|knowledge base)\b/i,
  },
  {
    name: 'Code generation',
    match: /\b(code generation|code-generation|codegen|scientific code|coding agent)\b/i,
  },
  {
    name: 'AI code review',
    match: /\b(code review|code-review|copilot|code quality|code changes)\b/i,
  },
  {
    name: 'AI & software work',
    match: /\b(software engineer|software developer|programming|programmers|coding after coders|replace software)\b/i,
  },
  {
    name: 'LLM foundations',
    match: /\b(large language model|\bllm\b|stochastic parrots|bert|chatgpt)\b/i,
  },
  {
    name: 'Research & society',
    match: /\b(research software|fairness|accountability|environmental|risks associated|ai-driven research)\b/i,
  },
];

// Zotero exports authors as "Family, Given; Family, Given".
function parseAuthors(authorText) {
  return String(authorText ?? '')
    .split(';')
    .map((author) => {
      const [family, ...given] = author.split(',').map((part) => part.trim());
      return { family, given: given.join(', ') };
    })
    .filter((author) => author.family || author.given);
}

// Zotero stores multiple tags in a semicolon-delimited cell.
function parseTags(value) {
  return String(value ?? '').split(';').map((tag) => tag.trim()).filter(Boolean);
}

// Normalize the CSV columns used by the interface into a consistent reference shape.
const corpus = Papa.parse(corpusCsv, { header: true, skipEmptyLines: 'greedy' }).data
  .filter((row) => row.Key || row.Title)
  .map((row) => ({
    id: row.Key || row.Title,
    type: row['Item Type'] || row.Type || '',
    title: row.Title || '',
    abstract: row['Abstract Note'] || '',
    'container-title': row['Publication Title'] || row['Journal Abbreviation'] || row['Conference Name'] || '',
    URL: row.Url || '',
    DOI: row.DOI || '',
    issued: row['Publication Year'] ? { 'date-parts': [[row['Publication Year']]] } : undefined,
    author: parseAuthors(row.Author),
    tags: [...new Set([...parseTags(row['Manual Tags']), ...parseTags(row['Automatic Tags'])])],
  }));

/** Prefer exported tags; infer fallback topics from bibliographic text only when none exist. */
function getTags(item) {
  if (Array.isArray(item.tags) && item.tags.length > 0) {
    return item.tags.map((tag) => typeof tag === 'string' ? tag : tag.tag).filter(Boolean);
  }

  const searchableText = `${item.title ?? ''} ${item.abstract ?? ''} ${item['container-title'] ?? ''}`;
  return tagRules.filter((rule) => rule.match.test(searchableText)).map((rule) => rule.name);
}

function getAuthors(item) {
  return (item.author ?? [])
    .map((author) => [author.given, author.family].filter(Boolean).join(' '))
    .filter(Boolean)
    .join(', ') || 'Author not listed';
}

function getYear(item) {
  return item.issued?.['date-parts']?.[0]?.[0] ?? 'Year unknown';
}

function App() {
  const [activeTag, setActiveTag] = useState('All references');
  const [search, setSearch] = useState('');
  const taggedItems = useMemo(() => corpus.map((item) => ({ ...item, explorerTags: getTags(item) })), []);
  const tagCounts = useMemo(() => {
    const counts = new Map();
    taggedItems.forEach((item) => item.explorerTags.forEach((tag) => counts.set(tag, (counts.get(tag) ?? 0) + 1)));
    return [...counts.entries()].sort((first, second) => first[0].localeCompare(second[0]));
  }, [taggedItems]);
  const visibleItems = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return taggedItems.filter((item) => {
      const matchesTag = activeTag === 'All references' || item.explorerTags.includes(activeTag);
      const haystack = [item.title, item.abstract, item['container-title'], getAuthors(item), ...item.explorerTags]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase();
      return matchesTag && (!query || haystack.includes(query));
    });
  }, [activeTag, search, taggedItems]);
  const [selectedId, setSelectedId] = useState(taggedItems[0]?.id);
  const selectedItem = visibleItems.find((item) => item.id === selectedId) ?? visibleItems[0];

  function selectTag(tag) {
    setActiveTag(tag);
    const firstMatch = tag === 'All references'
      ? taggedItems[0]
      : taggedItems.find((item) => item.explorerTags.includes(tag));
    setSelectedId(firstMatch?.id);
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="wordmark" href="#top" aria-label="Fieldnotes home">
          <span className="wordmark-mark" aria-hidden="true">F.</span>
          <span>FIELDNOTES <small>AI CORPUS</small></span>
        </a>
        <div className="topbar-meta"><span className="status-dot" /> LOCAL LIBRARY <span className="meta-divider">/</span> {corpus.length} ITEMS</div>
      </header>

      <section className="intro" id="top">
        <div className="intro-kicker">A READING MAP FOR ARTIFICIAL INTELLIGENCE</div>
        <h1>Ideas, connected.</h1>
        <p>Browse the research and writing shaping how we build, use, and think about AI.</p>
      </section>

      <div className="workspace">
        <aside className="tag-rail" aria-label="Filter references by topic">
          <div className="rail-heading"><span>TOPICS</span><span className="rail-count">{tagCounts.length.toString().padStart(2, '0')}</span></div>
          <button className={`tag-option ${activeTag === 'All references' ? 'is-active' : ''}`} onClick={() => selectTag('All references')}>
            <span className="tag-name">All references</span><span className="tag-count">{corpus.length}</span>
          </button>
          <div className="tag-list">
            {tagCounts.map(([tag, count], index) => (
              <button key={tag} className={`tag-option ${activeTag === tag ? 'is-active' : ''}`} onClick={() => selectTag(tag)}>
                <span className="tag-index">{String(index + 1).padStart(2, '0')}</span>
                <span className="tag-name">{tag}</span><span className="tag-count">{count}</span>
              </button>
            ))}
          </div>
          <p className="tag-note">Source tags are used when available. Untagged items receive suggested topics.</p>
        </aside>

        <section className="results-panel" aria-label="References">
          <div className="results-toolbar">
            <div>
              <div className="section-eyebrow">YOUR LIBRARY</div>
              <h2>{activeTag}</h2>
            </div>
            <label className="search-box">
              <span className="search-icon" aria-hidden="true">⌕</span>
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search references" aria-label="Search references" />
              {search && <button className="clear-search" onClick={() => setSearch('')} aria-label="Clear search">×</button>}
            </label>
          </div>
          <div className="result-count">SHOWING <strong>{visibleItems.length}</strong> OF {corpus.length} REFERENCES</div>
          <div className="reference-list">
            {visibleItems.map((item, index) => (
              <button key={item.id} className={`reference-row ${selectedItem?.id === item.id ? 'is-selected' : ''}`} onClick={() => setSelectedId(item.id)}>
                <span className="row-number">{String(index + 1).padStart(2, '0')}</span>
                <span className="row-content">
                  <span className="row-meta">{getYear(item)} <i>·</i> {item['container-title'] ?? item.type ?? 'Reference'}</span>
                  <span className="row-title">{item.title ?? 'Untitled reference'}</span>
                  <span className="row-tags">{item.explorerTags.map((tag) => <span key={tag}>{tag}</span>)}</span>
                </span>
                <span className="row-arrow" aria-hidden="true">↗</span>
              </button>
            ))}
            {visibleItems.length === 0 && <div className="empty-state"><span className="empty-mark">∅</span><strong>No references found</strong><span>Try another search or topic.</span></div>}
          </div>
        </section>

        <aside className="detail-panel" aria-label="Selected reference">
          {selectedItem ? (
            <>
              <div className="detail-topline"><span>REFERENCE NOTE</span><span>{getYear(selectedItem)}</span></div>
              <div className="detail-type">{selectedItem.type?.replaceAll('-', ' ') ?? 'Reference'}</div>
              <h2>{selectedItem.title ?? 'Untitled reference'}</h2>
              <div className="detail-authors">{getAuthors(selectedItem)}</div>
              <div className="detail-rule" />
              <div className="detail-label">ABSTRACT</div>
              <p className="detail-abstract">{selectedItem.abstract || 'No abstract is available for this reference.'}</p>
              <div className="detail-label detail-topics-label">TOPICS</div>
              <div className="detail-tags">
                {selectedItem.explorerTags.length ? selectedItem.explorerTags.map((tag) => <button key={tag} onClick={() => selectTag(tag)}>{tag}<span>↗</span></button>) : <span className="no-topics">No suggested topics</span>}
              </div>
              <div className="detail-footer">
                <span>{selectedItem.DOI ? `DOI ${selectedItem.DOI}` : selectedItem['container-title'] ?? 'Source details'}</span>
                {selectedItem.URL && <a href={selectedItem.URL} target="_blank" rel="noreferrer">OPEN SOURCE <span>↗</span></a>}
              </div>
            </>
          ) : (
            <div className="detail-empty"><span>01 / NOTE</span><p>Select a reference to see its details.</p></div>
          )}
        </aside>
      </div>
      <footer className="page-footer"><span>FIELDNOTES / 2026</span><span>READ WIDELY. CONNECT THE DOTS.</span></footer>
    </main>
  );
}

export default App;