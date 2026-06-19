import re

with open("sources.txt", "r") as f:
    content = f.read()

# Each row starts with a `│` and fields are separated by `│`.
# We want to reconstruct titles that span multiple lines.
rows = []
current_id = None
current_title_parts = []
current_type = None

for line in content.splitlines():
    if not line.startswith("│"):
        continue
    # Split by │
    parts = [p.strip() for p in line.split("│")][1:-1]
    if len(parts) < 4:
        continue
    id_val = parts[0]
    title_val = parts[1]
    type_val = parts[2]
    
    if id_val: # New entry
        if current_id:
            rows.append((current_id, " ".join(current_title_parts), current_type))
        current_id = id_val
        current_title_parts = [title_val]
        current_type = type_val
    else: # Continuation of previous title
        if title_val:
            current_title_parts.append(title_val)

if current_id:
    rows.append((current_id, " ".join(current_title_parts), current_type))

for id_val, title, type_val in sorted(rows, key=lambda x: x[1]):
    print(f"{id_val} | {type_val} | {title}")
