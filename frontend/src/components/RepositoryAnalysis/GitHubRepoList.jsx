import React, { useMemo, useState } from 'react';
import githubIcon from '../../assets/github.svg';
import { formatRepoUpdatedAt } from '../../services/github';
import './GitHubRepoList.css';

function matchesSearch(repo, query) {
  const haystack = [
    repo.fullName,
    repo.name,
    repo.description,
    repo.language,
    repo.defaultBranch,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return haystack.includes(query);
}

function GitHubRepoList({ repos, loading, onSelectRepo }) {
  const [search, setSearch] = useState('');

  const filteredRepos = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return repos || [];
    return (repos || []).filter((repo) => matchesSearch(repo, query));
  }, [repos, search]);

  if (loading) {
    return (
      <div className="github-repo-panel">
        <div className="github-repo-panel-header">
          <h2 className="github-repo-panel-title">Your GitHub Repositories</h2>
        </div>
        <p className="github-repo-loading">Loading repositories…</p>
      </div>
    );
  }

  if (!repos?.length) {
    return (
      <div className="github-repo-panel">
        <div className="github-repo-panel-header">
          <h2 className="github-repo-panel-title">Your GitHub Repositories</h2>
        </div>
        <p className="github-repo-empty">No repositories found on your GitHub account.</p>
      </div>
    );
  }

  return (
    <div className="github-repo-panel">
      <div className="github-repo-panel-header">
        <h2 className="github-repo-panel-title">Your GitHub Repositories</h2>
        <span className="github-repo-count">
          {search.trim() ? `${filteredRepos.length} of ${repos.length}` : `${repos.length} repos`}
        </span>
      </div>

      <div className="github-repo-search">
        <span className="github-repo-search-icon" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
        </span>
        <input
          type="search"
          className="github-repo-search-input"
          placeholder="Search by name, description, or language…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search repositories"
        />
        {search && (
          <button
            type="button"
            className="github-repo-search-clear"
            onClick={() => setSearch('')}
            aria-label="Clear search"
          >
            Clear
          </button>
        )}
      </div>

      <div className="github-repo-scroll">
        {filteredRepos.length === 0 ? (
          <p className="github-repo-empty">No repositories match &ldquo;{search.trim()}&rdquo;.</p>
        ) : (
          filteredRepos.map((repo) => (
            <button
              key={repo.id}
              type="button"
              className="github-repo-row"
              onClick={() => onSelectRepo(repo.htmlUrl)}
            >
              <div className="github-repo-row-main">
                <img src={githubIcon} alt="" className="github-repo-icon" />
                <div className="github-repo-details">
                  <span className="github-repo-name">{repo.fullName}</span>
                  {repo.description && (
                    <span className="github-repo-description">{repo.description}</span>
                  )}
                  <div className="github-repo-meta">
                    <span>{repo.defaultBranch}</span>
                    {repo.language && <span>{repo.language}</span>}
                    <span>Updated {formatRepoUpdatedAt(repo.updatedAt)}</span>
                    {repo.private && <span className="github-repo-private">Private</span>}
                  </div>
                </div>
              </div>
              <span className="github-repo-analyze">Analyze</span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

export default GitHubRepoList;
