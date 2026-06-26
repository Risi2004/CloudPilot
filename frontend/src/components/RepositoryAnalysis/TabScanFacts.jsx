import React from 'react';
import { FactBlock, FactSection, KeyValue, KeyValueGrid, TagList } from './FactDisplay';

function TabScanFacts({ result }) {
  const { facts, source } = result;

  return (
    <div className="tab-pane-content">
      <div className="tab-pane-header">
        <h3 className="tab-pane-title">Deterministic Scan Facts</h3>
        <p className="tab-pane-subtitle">
          Complete structured output from all 12 CloudPilot scanner detectors.
        </p>
      </div>

      <div className="fact-sections-grid">
        <FactSection title="Source">
          <KeyValueGrid>
            <KeyValue label="Input URL" value={source?.input} />
            <KeyValue label="Kind" value={source?.kind} />
            <KeyValue label="Clone method" value={source?.clone_method} />
            <KeyValue label="Branch" value={source?.default_branch} />
            <KeyValue label="Local path" value={source?.repo_path} />
          </KeyValueGrid>
        </FactSection>

        <FactSection title="Repository">
          <KeyValueGrid>
            <KeyValue label="Name" value={facts.repository?.name} />
            <KeyValue label="Files" value={facts.repository?.file_count} />
            <KeyValue label="Directories" value={facts.repository?.directory_count} />
            <KeyValue label="Monorepo" value={facts.repository?.is_monorepo ? 'Yes' : 'No'} />
            <KeyValue label="Git repo" value={facts.repository?.is_git_repository ? 'Yes' : 'No'} />
            <KeyValue label="Default branch" value={facts.repository?.default_branch} />
          </KeyValueGrid>
          <FactBlock label="Languages">
            <TagList
              items={(facts.repository?.languages || []).map((l) => `${l.name} (${l.file_count})`)}
            />
          </FactBlock>
          <FactBlock label="Monorepo indicators">
            <TagList items={facts.repository?.monorepo_indicators} empty="None" />
          </FactBlock>
        </FactSection>

        <FactSection title="Frameworks">
          <FactBlock label="Frontend">
            <TagList items={facts.frameworks?.frontend} />
          </FactBlock>
          <FactBlock label="Backend">
            <TagList items={facts.frameworks?.backend} />
          </FactBlock>
          {(facts.frameworks?.detected || []).length > 0 && (
            <div className="fact-list-stack">
              {facts.frameworks.detected.map((fw) => (
                <div key={fw.name} className="fact-list-item">
                  <strong>{fw.name}</strong>
                  <span className="fact-muted"> ({fw.category})</span>
                  {fw.evidence?.length > 0 && (
                    <div className="fact-muted">{fw.evidence.join(', ')}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </FactSection>

        <FactSection title="Runtime & Package Manager">
          <KeyValueGrid>
            <KeyValue label="Primary runtime" value={facts.runtime?.primary} />
            <KeyValue label="Package manager" value={facts.packageManager?.primary} />
          </KeyValueGrid>
          <FactBlock label="Runtimes">
            <TagList
              items={(facts.runtime?.runtimes || []).map(
                (r) => `${r.name}${r.version ? ` ${r.version}` : ''}`,
              )}
              empty="None"
            />
          </FactBlock>
          <FactBlock label="Version files">
            <TagList items={facts.runtime?.version_files} empty="None" />
          </FactBlock>
          <FactBlock label="Lock files">
            <TagList items={facts.packageManager?.lock_files} />
          </FactBlock>
          <FactBlock label="Managers">
            <TagList items={facts.packageManager?.managers} empty="None" />
          </FactBlock>
        </FactSection>

        <FactSection title="Dependencies">
          <FactBlock label={`Production (${facts.dependencies?.production?.length || 0})`}>
            <TagList items={facts.dependencies?.production} />
          </FactBlock>
          <FactBlock label={`Development (${facts.dependencies?.development?.length || 0})`}>
            <TagList items={facts.dependencies?.development} />
          </FactBlock>
          <FactBlock label="Source files">
            <TagList items={facts.dependencies?.source_files} empty="None" />
          </FactBlock>
          {facts.dependencies?.categories && (
            <KeyValueGrid>
              {Object.entries(facts.dependencies.categories).map(([key, values]) => (
                <div key={key}>
                  <span className="fact-k">{key}</span>
                  <TagList items={values} empty="—" />
                </div>
              ))}
            </KeyValueGrid>
          )}
        </FactSection>

        <FactSection title="Database">
          {(facts.database?.detected || []).length ? (
            <div className="fact-list-stack">
              {facts.database.detected.map((db) => (
                <div key={db.name} className="fact-list-item">
                  <strong>{db.name}</strong>
                  <span className="fact-muted"> ({db.category})</span>
                  {db.evidence?.length > 0 && (
                    <div className="fact-muted">{db.evidence.join(', ')}</div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <span className="fact-muted">None detected</span>
          )}
        </FactSection>

        <FactSection title="Environment">
          <FactBlock label="Template files">
            <TagList items={facts.environment?.template_files} empty="None" />
          </FactBlock>
          <FactBlock label={`Variables (${facts.environment?.variables?.length || 0})`}>
            <TagList items={facts.environment?.variables} empty="None" />
          </FactBlock>
        </FactSection>

        <FactSection title="Commands">
          <KeyValueGrid>
            <KeyValue label="Install" value={facts.commands?.install} />
            <KeyValue label="Build" value={facts.commands?.build} />
            <KeyValue label="Start" value={facts.commands?.start} />
            <KeyValue label="Dev" value={facts.commands?.dev} />
            <KeyValue label="Source" value={facts.commands?.source} />
          </KeyValueGrid>
        </FactSection>

        <FactSection title="Deployment">
          <FactBlock label="Platforms">
            <TagList items={facts.deployment?.detected_platforms} empty="None" />
          </FactBlock>
          {(facts.deployment?.files || []).length ? (
            <div className="fact-list-stack">
              {facts.deployment.files.map((file) => (
                <div key={file.path} className="fact-list-item">
                  <span className="env-var-key font-mono">{file.path}</span>
                  <span className="fact-muted"> ({file.type})</span>
                </div>
              ))}
            </div>
          ) : (
            <span className="fact-muted">No deployment files detected</span>
          )}
        </FactSection>

        <FactSection title="CI/CD">
          {(facts.cicd?.systems || []).length ? (
            facts.cicd.systems.map((system) => (
              <div key={system.name} className="fact-list-item">
                <strong>{system.name}</strong>
                <div className="fact-muted">{system.evidence_files?.join(', ')}</div>
              </div>
            ))
          ) : (
            <span className="fact-muted">None detected</span>
          )}
        </FactSection>

        <FactSection title="Architecture">
          <KeyValue label="Primary" value={facts.architecture?.primary} />
          <FactBlock label="Types">
            <TagList items={facts.architecture?.types} />
          </FactBlock>
          <FactBlock label="Folders">
            <TagList items={facts.architecture?.structure?.folders} />
          </FactBlock>
        </FactSection>

        <FactSection title="Health">
          <div className="health-flags">
            <span className={`fact-tag ${facts.health?.has_env_template ? 'positive' : ''}`}>
              Env template: {facts.health?.has_env_template ? 'yes' : 'no'}
            </span>
            <span className={`fact-tag ${facts.health?.has_build_command ? 'positive' : ''}`}>
              Build: {facts.health?.has_build_command ? 'yes' : 'no'}
            </span>
            <span className={`fact-tag ${facts.health?.has_start_command ? 'positive' : ''}`}>
              Start: {facts.health?.has_start_command ? 'yes' : 'no'}
            </span>
            <span className={`fact-tag ${facts.health?.has_dockerfile ? 'positive' : ''}`}>
              Dockerfile: {facts.health?.has_dockerfile ? 'yes' : 'no'}
            </span>
            <span className={`fact-tag ${facts.health?.has_lock_file ? 'positive' : ''}`}>
              Lock file: {facts.health?.has_lock_file ? 'yes' : 'no'}
            </span>
            <span className={`fact-tag ${facts.health?.has_deployment_files ? 'positive' : ''}`}>
              Deployment files: {facts.health?.has_deployment_files ? 'yes' : 'no'}
            </span>
          </div>
          <ul className="analysis-bullet-list" style={{ marginTop: '16px' }}>
            {(facts.health?.issues || []).map((issue) => (
              <li key={issue.code}>
                <strong>{issue.code}</strong>: {issue.message}
              </li>
            ))}
            {!facts.health?.issues?.length && <li className="muted">No health issues reported</li>}
          </ul>
        </FactSection>
      </div>
    </div>
  );
}

export default TabScanFacts;
