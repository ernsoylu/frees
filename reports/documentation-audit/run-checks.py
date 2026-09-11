"""Rebuild CLI first; run from repo root after measure.cjs. Smoke checks, not numerical validation."""
import concurrent.futures, csv, json, pathlib, subprocess
OUT = pathlib.Path(__file__).resolve().parent

def check(example):
    try:
        result = subprocess.run(['target/release/frees-cli', 'solve', '--request', '{}'], input=example['text'], text=True, capture_output=True, timeout=10)
        data = json.loads(result.stdout)
        return dict(id=example['id'], source=example['source'], status='success' if data.get('success') else 'rejected', detail=str(data.get('error') or data.get('message') or '')[:1000])
    except subprocess.TimeoutExpired:
        return dict(id=example['id'], source=example['source'], status='timeout', detail='10-second per-document audit budget; not a solver correctness failure')
    except (ValueError, OSError) as error:
        return dict(id=example['id'], source=example['source'], status='harness-error', detail=str(error))

if __name__ == '__main__':
    examples = json.loads((OUT / 'run-candidates.json').read_text())
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        rows = list(pool.map(check, examples))
    with (OUT / 'execution.csv').open('w') as f:
        writer = csv.DictWriter(f, fieldnames=['id','source','status','detail'])
        writer.writeheader(); writer.writerows(rows)
    print({status: sum(r['status'] == status for r in rows) for status in ['success','rejected','timeout','harness-error']})
