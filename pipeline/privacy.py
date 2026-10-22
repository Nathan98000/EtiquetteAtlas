"""Privacy gate for derived outputs (DR-9, DR-16, C-5).

Every file under `data/derived/` must pass before it is committed or published. The scan fails on:

- a forbidden field name anywhere (DR-16), matched case-insensitively and ignoring `_`, `-` and
  spaces, so `ResponseId`, `response_id` and `RESPONSE-ID` all count;
- a group size below 10 (DR-9). Group sizes are fields named `n`, `n0`, `n_*`, `*_n`,
  `respondents`, `*_respondents`, `count` or `*_count`, and every number under such a key.
  Null means suppressed and passes; 0 fails, so encode "not in this sample" as null;
- response counts `c1`–`c6` (DR-4) on a row without a group size of at least 10: they are
  published only inside cells of at least 10 respondents;
- strings that look like Qualtrics response IDs or second-precision timestamps.

Findings name the file, the field and how many values failed, never the values themselves.
"""

import csv
import json
import re
import sys
from collections import Counter
from collections.abc import Iterable, Sequence
from dataclasses import dataclass
from pathlib import Path

MIN_GROUP_SIZE = 10  # DR-9

FORBIDDEN_FIELDS = frozenset(
    {
        "responseid",
        "startdate",
        "enddate",
        "duration",
        "durationinseconds",
        "progress",
        "beliefgodorig",
        "site",
        "countrycarib",
        "age",
        "agesc",  # exact age, rescaled: (age − mean) / 10
    }
)
# Counts of things other than respondents; each entry needs a reason.
NOT_RESPONDENT_COUNTS = frozenset(
    {
        "n_societies",  # societies contributing to a global estimate (FR-13)
        "n_cells",  # cells two societies share in the similarity score (DR-14)
    }
)
_GROUP_SIZE = re.compile(r"^(n|n\d+|n_.+|.+_n|respondents|.+_respondents|count|.+_count)$")
_CATEGORY_COUNT = re.compile(r"^(c|count_|n_)[1-6]$")
_RESPONSE_ID = re.compile(r"(?<![A-Za-z0-9])R_[A-Za-z0-9]{15}(?![A-Za-z0-9])")
_TIMESTAMP = re.compile(r"\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}")
_TEXT_SUFFIXES = {".md", ".txt"}
_IGNORED_NAMES = {".gitkeep", ".DS_Store"}

Scalar = str | int | float | bool | None


@dataclass(frozen=True, order=True)
class Finding:
    file: str
    field: str
    problem: str
    count: int = 1


def normalize(name: str) -> str:
    return re.sub(r"[\s_\-]", "", name).lower()


def is_forbidden(name: str) -> bool:
    return normalize(name) in FORBIDDEN_FIELDS


def is_category_count(name: str) -> bool:
    return bool(_CATEGORY_COUNT.match(name.lower()))


def is_group_size(name: str) -> bool:
    lowered = name.lower()
    if lowered in NOT_RESPONDENT_COUNTS or is_category_count(lowered):
        return False
    return bool(_GROUP_SIZE.match(lowered))


class _Scan:
    def __init__(self, file: str) -> None:
        self.file = file
        self.hits: Counter[tuple[str, str]] = Counter()

    def flag(self, field: str, problem: str) -> None:
        self.hits[(field, problem)] += 1

    def findings(self) -> list[Finding]:
        return [Finding(self.file, f, p, n) for (f, p), n in sorted(self.hits.items())]

    def key(self, key: str, path: str) -> None:
        if is_forbidden(key):
            self.flag(path, "forbidden field (DR-16)")
        self.text(key, path)

    def text(self, value: str, path: str) -> None:
        if _RESPONSE_ID.search(value):
            self.flag(path, "value shaped like a respondent ID (DR-16)")
        if _TIMESTAMP.search(value):
            self.flag(path, "timestamp with seconds; publish dates only (DR-16)")

    def group_size(self, value: Scalar, path: str) -> None:
        if value is None:
            return
        if isinstance(value, bool) or not isinstance(value, int | float):
            self.flag(path, "count is not a number")
        elif value < MIN_GROUP_SIZE:
            self.flag(path, f"count below {MIN_GROUP_SIZE} (DR-9)")

    def rows(self, rows: Iterable[dict[str, Scalar]], paths: dict[str, str]) -> None:
        """Check records whose fields share a row, e.g. a cell's `n` and its `c1`–`c6`."""
        for row in rows:
            sizes = []
            for name, value in row.items():
                path = paths[name]
                if isinstance(value, str):
                    self.text(value, path)
                if is_group_size(name):
                    self.group_size(value, path)
                    if isinstance(value, int | float) and not isinstance(value, bool):
                        sizes.append(value)
            covered = bool(sizes) and min(sizes) >= MIN_GROUP_SIZE
            for name, value in row.items():
                if is_category_count(name) and value is not None and not covered:
                    self.flag(
                        paths[name],
                        f"response count without a group size of at least {MIN_GROUP_SIZE} "
                        "in the same row (DR-9)",
                    )

    def json(self, node: object, path: str = "$", counting: bool = False) -> None:
        if isinstance(node, dict):
            for key in node:
                self.key(str(key), f"{path}.{key}")
            scalars = {k: v for k, v in node.items() if _is_scalar(v)}
            columns = {
                k: v
                for k, v in node.items()
                if isinstance(v, list) and v and all(_is_scalar(x) for x in v)
            }
            if counting:  # everything numeric under a count-like key is a group size
                for k, v in scalars.items():
                    self.group_size(v, f"{path}.{k}")
                for k, values in columns.items():
                    for v in values:
                        self.group_size(v, f"{path}.{k}[*]")
            else:
                self.rows([scalars], {k: f"{path}.{k}" for k in scalars})
                if len({len(v) for v in columns.values()}) == 1:  # a columnar table
                    paths = {k: f"{path}.{k}[*]" for k in columns}
                    self.rows(
                        (
                            dict(zip(columns, r, strict=True))
                            for r in zip(*columns.values(), strict=True)
                        ),
                        paths,
                    )
                else:
                    for k, values in columns.items():
                        self.rows(({k: v} for v in values), {k: f"{path}.{k}[*]"})
            for k, v in node.items():
                if isinstance(v, dict) or (isinstance(v, list) and k not in columns):
                    self.json(v, f"{path}.{k}", counting or is_group_size(str(k)))
        elif isinstance(node, list):
            for item in node:
                self.json(item, f"{path}[*]", counting)
        elif isinstance(node, str):
            self.text(node, path)
        elif counting and isinstance(node, int | float):
            self.group_size(node, path)


def _is_scalar(value: object) -> bool:
    return value is None or isinstance(value, str | int | float | bool)


def _csv_value(text: str) -> Scalar:
    if text.strip() in {"", "NA", "null", "NaN"}:
        return None
    try:
        return float(text)
    except ValueError:
        return text


def scan_file(path: Path, label: str | None = None) -> list[Finding]:
    name = label or str(path)
    scan = _Scan(name)
    suffix = path.suffix.lower()
    try:
        if suffix == ".json":
            scan.json(json.loads(path.read_text(encoding="utf-8")))
        elif suffix == ".csv":
            with path.open(newline="", encoding="utf-8") as f:
                reader = csv.reader(f)
                header = next(reader, [])
                for column in header:
                    scan.key(column, column)
                scan.rows(
                    (
                        {h: _csv_value(v) for h, v in zip(header, line, strict=False)}
                        for line in reader
                    ),
                    {h: h for h in header},
                )
        elif suffix in _TEXT_SUFFIXES:
            scan.text(path.read_text(encoding="utf-8"), "text")
        else:
            return [Finding(name, "-", "unsupported file type; derived data must be JSON or CSV")]
    except (UnicodeDecodeError, json.JSONDecodeError, csv.Error) as err:
        return [Finding(name, "-", f"unreadable: {type(err).__name__}")]
    return scan.findings()


def scan(targets: Sequence[Path]) -> tuple[list[Finding], int]:
    """Scan files and folders; return the findings and the number of files checked."""
    findings: list[Finding] = []
    checked = 0
    for target in targets:
        if not target.exists():
            findings.append(Finding(str(target), "-", "path not found"))
            continue
        files = sorted(p for p in target.rglob("*") if p.is_file()) if target.is_dir() else [target]
        for file in files:
            if file.name in _IGNORED_NAMES:
                continue
            checked += 1
            findings += scan_file(file)
    return findings, checked


def main(targets: Sequence[Path]) -> int:
    findings, checked = scan(targets)
    where = ", ".join(str(t) for t in targets)
    if not findings:
        print(f"privacy-scan: ok, {checked} file(s) checked in {where}")
        return 0
    for f in findings:
        plural = f"{f.count} values: " if f.count > 1 else ""
        print(f"FAIL {f.file}  {f.field}  {plural}{f.problem}", file=sys.stderr)
    print(f"privacy-scan: {len(findings)} problem(s) in {checked} file(s)", file=sys.stderr)
    return 1
