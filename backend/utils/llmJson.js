// Shared JSON extraction for RunPod LLM responses. Every agent asks the model
// for "a single JSON object and nothing else", but smaller self-hosted models
// routinely wrap it in markdown fences, add comments/trailing commas, or get
// cut off mid-structure when a large response hits its max_tokens budget -
// all of which used to be handled by six near-identical copies of this logic
// scattered across the agents.

function cleanJsonString(str) {
  let cleaned = str;
  // 1. Strip multi-line comments
  cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, '');

  // 2. Strip single-line comments (ignoring http:// or https://)
  cleaned = cleaned.replace(/(?:^|[^:])\/\/.*$/gm, (match) => {
    if (match.trim().startsWith('//')) return '';
    const idx = match.indexOf('//');
    if (idx !== -1) return match.slice(0, idx);
    return match;
  });

  // 3. Strip trailing commas before closing braces/brackets
  cleaned = cleaned.replace(/,\s*([}\]])/g, '$1');

  return cleaned.trim();
}

// Best-effort repair for a response truncated mid-structure (the model hit
// its max_tokens budget before finishing the object) - walks the string once,
// tracking open strings/objects/arrays, and appends whatever closing
// characters are needed to make it parseable. Brackets/braces inside string
// literals are correctly ignored since we track `inString` as we go.
function closeUnterminatedJson(str) {
  let inString = false;
  let escapeNext = false;
  const stack = [];
  for (const ch of str) {
    if (escapeNext) {
      escapeNext = false;
      continue;
    }
    if (ch === '\\' && inString) {
      escapeNext = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (ch === '{' || ch === '[') stack.push(ch);
    else if (ch === '}' || ch === ']') stack.pop();
  }

  let repaired = str;
  if (inString) repaired += '"';
  for (let i = stack.length - 1; i >= 0; i -= 1) {
    repaired += stack[i] === '{' ? '}' : ']';
  }
  return repaired;
}

/**
 * Extracts and parses the single JSON object an agent asked the LLM for.
 * Throws a plain Error with `errorPrefix` on failure - callers should catch
 * it and rethrow as their own agent-specific error class if they have one.
 */
function extractJsonObject(rawText, errorPrefix = 'Agent returned invalid JSON') {
  let text = String(rawText || '').trim();
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch) text = fenceMatch[1].trim();

  const start = text.indexOf('{');
  if (start === -1) {
    throw new Error(`${errorPrefix}: no JSON object found.`);
  }

  // A clean response has a matching closing brace; a truncated one may not,
  // in which case we fall through to the repair pass below.
  const end = text.lastIndexOf('}');
  const candidate = end > start ? text.slice(start, end + 1) : text.slice(start);
  const cleaned = cleanJsonString(candidate);

  try {
    return JSON.parse(cleaned);
  } catch (firstErr) {
    try {
      return JSON.parse(cleanJsonString(closeUnterminatedJson(cleaned)));
    } catch (_secondErr) {
      throw new Error(`${errorPrefix}: ${firstErr.message}`);
    }
  }
}

module.exports = { extractJsonObject, cleanJsonString, closeUnterminatedJson };
