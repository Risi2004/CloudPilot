/**
 * Normalize and display helpers for RepositoryAnalysisResult payloads.
 */

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function displayNarrativeText(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return '';
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        return formatStructuredValue(JSON.parse(trimmed));
      } catch {
        return trimmed;
      }
    }
    return trimmed;
  }
  return formatStructuredValue(value);
}

export function formatStructuredValue(value) {
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) {
    return value.map((item) => (typeof item === 'string' ? item : JSON.stringify(item))).join(', ');
  }
  if (isPlainObject(value)) {
    return Object.entries(value)
      .map(([key, entry]) => {
        const formatted = typeof entry === 'object' ? JSON.stringify(entry) : String(entry);
        return `${key.replace(/_/g, ' ')}: ${formatted}`;
      })
      .join('\n');
  }
  return String(value);
}

export function coerceStringList(value) {
  if (!value) return [];
  if (typeof value === 'string') return value.trim() ? [value.trim()] : [];
  if (Array.isArray(value)) {
    return value.map((item) => (typeof item === 'string' ? item : JSON.stringify(item)));
  }
  if (isPlainObject(value)) {
    return Object.entries(value).map(([key, entry]) => `${key}: ${formatStructuredValue(entry)}`);
  }
  return [String(value)];
}

function coerceAnalysisField(value) {
  return displayNarrativeText(value);
}

export function buildFallbackAnalysis(facts, source) {
  const frameworks = [
    ...(facts?.frameworks?.frontend || []),
    ...(facts?.frameworks?.backend || []),
  ];
  const languages = (facts?.repository?.languages || []).map((l) => l.name).join(', ');
  const platforms = (facts?.deployment?.detected_platforms || []).join(', ');
  const healthIssues = (facts?.health?.issues || []).map((i) => i.message);
  const missingFromHealth = healthIssues.slice(0, 5);

  return {
    project_overview: [
      `Repository: ${source?.input || facts?.repository?.name || 'unknown'}`,
      `Files scanned: ${facts?.repository?.file_count ?? 0}`,
      languages ? `Languages: ${languages}` : null,
      frameworks.length ? `Frameworks: ${frameworks.join(', ')}` : 'No frameworks detected',
      facts?.architecture?.types?.length
        ? `Architecture: ${facts.architecture.types.join(', ')}`
        : null,
    ]
      .filter(Boolean)
      .join('. '),
    technology_stack_summary: [
      facts?.runtime?.primary ? `Runtime: ${facts.runtime.primary}` : null,
      facts?.packageManager?.primary ? `Package manager: ${facts.packageManager.primary}` : null,
      frameworks.length ? `Frameworks: ${frameworks.join(', ')}` : 'No frameworks detected',
      facts?.dependencies?.production?.length
        ? `Production dependencies: ${facts.dependencies.production.slice(0, 12).join(', ')}${facts.dependencies.production.length > 12 ? '…' : ''}`
        : null,
    ]
      .filter(Boolean)
      .join('. '),
    architecture_summary: [
      facts?.architecture?.primary ? `Primary: ${facts.architecture.primary}` : null,
      facts?.architecture?.types?.length ? `Types: ${facts.architecture.types.join(', ')}` : null,
      facts?.architecture?.structure?.folders?.length
        ? `Folders: ${facts.architecture.structure.folders.join(', ')}`
        : null,
    ]
      .filter(Boolean)
      .join('. ') || 'Architecture could not be classified from scan facts.',
    deployment_readiness: [
      facts?.commands?.build ? `Build: ${facts.commands.build}` : 'No build command detected',
      facts?.commands?.start ? `Start: ${facts.commands.start}` : 'No start command detected',
      facts?.health?.has_dockerfile ? 'Dockerfile present' : 'No Dockerfile',
      facts?.health?.has_env_template ? 'Env template present' : 'No env template',
      platforms ? `Platforms: ${platforms}` : 'No deployment platforms detected',
    ].join('. '),
    missing_configuration_files: missingFromHealth.filter((msg) =>
      /missing|not found|no .*(file|template|command)/i.test(msg),
    ),
    potential_deployment_issues: healthIssues,
    risks_before_deployment: (facts?.health?.issues || [])
      .filter((issue) => issue.severity === 'warning' || !issue.severity)
      .map((issue) => issue.message),
    recommended_deployment_strategy: [
      platforms ? `Detected platforms: ${platforms}` : 'No platform-specific deployment files detected',
      facts?.commands?.build ? `Build with: ${facts.commands.build}` : null,
      facts?.commands?.start ? `Run with: ${facts.commands.start}` : null,
      frameworks.includes('react') || frameworks.includes('next.js')
        ? 'Static or Node hosting may be appropriate for this frontend stack'
        : null,
    ]
      .filter(Boolean)
      .join('. '),
  };
}

export function normalizeAnalysisResult(payload) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Invalid analysis response from server.');
  }

  const facts = payload.facts || {};
  const source = payload.source || {};
  const rawAnalysis = payload.analysis || {};
  const fallback = buildFallbackAnalysis(facts, source);

  const analysis = {
    project_overview:
      coerceAnalysisField(rawAnalysis.project_overview) || fallback.project_overview,
    technology_stack_summary:
      coerceAnalysisField(rawAnalysis.technology_stack_summary) || fallback.technology_stack_summary,
    architecture_summary:
      coerceAnalysisField(rawAnalysis.architecture_summary) || fallback.architecture_summary,
    deployment_readiness:
      coerceAnalysisField(rawAnalysis.deployment_readiness) || fallback.deployment_readiness,
    recommended_deployment_strategy:
      coerceAnalysisField(rawAnalysis.recommended_deployment_strategy) ||
      fallback.recommended_deployment_strategy,
    missing_configuration_files: coerceStringList(rawAnalysis.missing_configuration_files).length
      ? coerceStringList(rawAnalysis.missing_configuration_files)
      : fallback.missing_configuration_files,
    potential_deployment_issues: coerceStringList(rawAnalysis.potential_deployment_issues).length
      ? coerceStringList(rawAnalysis.potential_deployment_issues)
      : fallback.potential_deployment_issues,
    risks_before_deployment: coerceStringList(rawAnalysis.risks_before_deployment).length
      ? coerceStringList(rawAnalysis.risks_before_deployment)
      : fallback.risks_before_deployment,
  };

  return { facts, analysis, source };
}
