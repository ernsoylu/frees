"""Exercise both generator branches in scratch trees; never write product files."""
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[2]
with tempfile.TemporaryDirectory() as tmp:
    root = Path(tmp) / 'port'
    for item in ['web/scripts', 'web/src/docs/reference', 'crates/frees-core/src/components/library-data']:
        shutil.copytree(ROOT / item, root / item)
    for item in ['web/src/helpReference.ts', 'crates/frees-core/src/eval.rs', 'crates/frees-core/src/procedures.rs']:
        dest = root / item
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(ROOT / item, dest)
    manifest = root / 'web/src/docs/reference/function-manifest.json'
    original = manifest.read_bytes()
    results = []
    for branch in ['no-reference', 'java-reference']:
        reference = Path(tmp) / branch
        if branch == 'java-reference':
            for layer, files in [('core', ['parser/FunctionRegistry.java', 'ast/Evaluator.java', 'props/PropertyFunctions.java', 'props/SolidProperties.java']), ('web', ['api/ReplEvaluator.java'])]:
                for file in files:
                    p = reference / f'backend/{layer}/src/main/java/com/frees/backend' / file
                    p.parent.mkdir(parents=True, exist_ok=True)
                    p.write_text('// Minimal parser input to exercise branch control flow.\n')
        result = subprocess.run(['node', 'web/scripts/build-doc-manifest.mjs'], cwd=root,
                                env={**os.environ, 'FREES_HOME': str(reference)}, text=True, capture_output=True)
        data = json.loads(manifest.read_text())
        results.append(dict(branch=branch, exitCode=result.returncode, stdout=result.stdout,
                            stderr=result.stderr, derivedFrom=data.get('derivedFrom'),
                            coverage=data.get('coverage')))
        manifest.write_bytes(original)
    print(json.dumps(results, indent=2))
