const fs = require('fs');
const path = require('path');

const routesDir = path.resolve('C:/Users/natha/.gemini/antigravity-ide/scratch/Nafex-Hub/artifacts/api-server/src/routes');

const validationImport = "import { validateBody, validateQuery } from \"../lib/validation\";";

function processFile(file) {
  let content = fs.readFileSync(file, 'utf-8');
  // Ensure validation import present
  if (!content.includes('validateBody') && !content.includes('validateQuery')) {
    const lines = content.split('\n');
    // Insert after other imports (simplistic: after last import line)
    let lastImportIdx = -1;
    lines.forEach((ln, idx) => { if (ln.trim().startsWith('import')) lastImportIdx = idx; });
    lines.splice(lastImportIdx + 1, 0, validationImport);
    content = lines.join('\n');
  }
  // Replace safeParse occurrences
  const safeParseRegex = /\s*const\s+(?:body|params|parsed)\s*=\s*([A-Za-z0-9_]+)\.safeParse\((req\.body|req\.params)\);\s*\n\s*if\s*\(!\1\.success\)\s*{[^}]*}\s*/g;
  // This regex is simplistic; we'll handle manually below.
  // For each occurrence of "const X = Schema.safeParse(req.body)" pattern
  const bodyParseRegex = /const\s+(\w+)\s*=\s*([A-Za-z0-9_]+)\.safeParse\(req\.body\);\s*\n\s*if\s*\(!\1\.success\)\s*{[^}]*}/g;
  content = content.replace(bodyParseRegex, (match, varName, schema) => {
    // Insert middleware placeholder; actual route definition will be handled separately.
    return `// Validation middleware injected elsewhere for ${schema}`;
  });
  // Similar for params
  const paramsParseRegex = /const\s+(\w+)\s*=\s*([A-Za-z0-9_]+)\.safeParse\(req\.params\);\s*\n\s*if\s*\(!\1\.success\)\s*{[^}]*}/g;
  content = content.replace(paramsParseRegex, (match, varName, schema) => {
    return `// Validation middleware injected elsewhere for ${schema}`;
  });

  // Write back
  fs.writeFileSync(file, content, 'utf-8');
}

fs.readdirSync(routesDir).forEach(file => {
  if (file.endsWith('.ts')) {
    processFile(path.join(routesDir, file));
  }
});
