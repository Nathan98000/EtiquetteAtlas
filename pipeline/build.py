"""`pipeline build`: verify, rebuild the samples, estimate, validate and export (§4.6).

Order of work, stopping at the first failure without touching `data/derived/`:
1. verify the raw files against their pinned MD5s (DR-1);
2. rebuild the samples and their cross-checks (DR-3);
3. estimate everything for each site sample (DR-4 to DR-15);
4. check the published values and row counts (NFR-51, §4.6);
5. write every document to a staging folder, check each table's schema and run the privacy scan
   on the folder (DR-9, DR-16);
6. replace the outputs in `data/derived/` and report their sizes (NFR-1).
"""

import gzip
import os
import shutil
import subprocess
import sys
import tempfile
from collections.abc import Sequence
from dataclasses import dataclass
from datetime import UTC, date, datetime
from pathlib import Path

import duckdb
import numpy as np

from pipeline import (
    __version__,
    bootstrap,
    cells,
    change,
    contexts,
    estimates,
    export,
    metadata,
    paths,
    privacy,
    ratings,
    raw,
    reference,
    samples,
    schemas,
    similarity,
    sources,
    validate,
)
from pipeline.export import Doc

KEEP = {"README.md"}  # hand-written files in data/derived/ that a build leaves alone
DATA_BUDGET = 300_000  # NFR-1: compressed data on a route's first load


class BuildError(Exception):
    """The build stopped. Nothing in the output folder was changed."""


@dataclass(frozen=True, repr=False)
class SampleOutputs:
    key: str
    societies: tuple[str, ...]
    stats: cells.CellStats
    status: np.ndarray
    global_cells: estimates.GlobalCells
    society_cells: estimates.SocietyCells
    matches: list[list[similarity.Match]]
    contexts: contexts.ContextAggregates
    change: change.Change


def _codes(con: duckdb.DuckDBPyConnection, sql: str, context: str) -> tuple[str, ...]:
    return tuple(str(code) for (code,) in raw.fetch_rows(con, sql, context))


def estimate_sample(con: duckdb.DuckDBPyConnection, key: str, replicates: int) -> SampleOutputs:
    codes = _codes(
        con,
        f"SELECT DISTINCT code FROM membership WHERE in_{key} ORDER BY code",
        f"societies ({key})",
    )
    main = ratings.situations(con, key, codes)
    stats = cells.summarize(main)
    reps = bootstrap.resample(main, ("cells", key), replicates)
    global_cells, society_cells = estimates.estimate(stats, reps)
    fingerprint = society_cells.shrunk - global_cells.mean[None, :]
    matches = similarity.most_similar(fingerprint, stats.n >= cells.MIN_N)
    context = contexts.aggregate(ratings.contexts(con, key, codes), key, replicates)
    overlap = _codes(
        con,
        f"""SELECT DISTINCT code FROM membership
            WHERE in_{key} AND code IN (
                SELECT code FROM respondents
                WHERE country IN (SELECT DISTINCT country FROM gelfand_ratings))
            ORDER BY code""",
        f"2000–2003 societies ({key})",
    )
    compared = change.compare(ratings.gelfand(con, overlap), stats, reps, codes, replicates)
    return SampleOutputs(
        key=key,
        societies=codes,
        stats=stats,
        status=cells.status(stats.n, len(raw.BEHAVIORS)),
        global_cells=global_cells,
        society_cells=society_cells,
        matches=matches,
        contexts=context,
        change=compared,
    )


def build_date() -> str:
    """The date the outputs are stamped with (FR-72), stable across reruns (NFR-50).

    `SOURCE_DATE_EPOCH` wins; otherwise the date of the last commit that changed the pipeline
    or its dependencies, so rebuilding the same code on another day gives the same bytes.
    """
    epoch = os.environ.get("SOURCE_DATE_EPOCH")
    if epoch:
        return datetime.fromtimestamp(int(epoch), UTC).date().isoformat()
    try:
        out = subprocess.run(
            ["git", "log", "-1", "--format=%cs", "--", "pipeline", "pyproject.toml", "uv.lock"],
            cwd=paths.REPO_ROOT,
            capture_output=True,
            text=True,
            check=True,
        ).stdout.strip()
    except (OSError, subprocess.CalledProcessError):
        out = ""
    if out:
        return out
    print("warning: no git history; stamping today's date", file=sys.stderr)
    return date.today().isoformat()


def manifest(replicates: int, counts: dict[str, tuple[int, int]], label: dict[str, str]) -> Doc:
    """`manifest.json`: inputs and settings behind the outputs (FR-72). Dates only."""
    return {
        "pipeline_version": __version__,
        "build_date": build_date(),
        "seed": bootstrap.SEED,
        "replicates": replicates,
        "interval_level": bootstrap.LEVEL,
        "min_group_size": cells.MIN_N,
        "small_sample_below": cells.SMALL_N,
        "sources": [
            {"name": s.name, "url": s.url, "md5": s.md5, "osf_version": s.osf_version}
            for s in sources.load_manifest()
        ],
        "samples": {
            key: {"label": label[key], "respondents": n, "societies": k}
            for key, (n, k) in counts.items()
        },
    }


def documents(
    outputs: Sequence[SampleOutputs],
    places: Sequence[metadata.Place],
    facts: dict[str, dict[str, metadata.Facts]],
    manifest_doc: Doc,
) -> dict[str, Doc]:
    docs: dict[str, Doc] = {
        "manifest.json": manifest_doc,
        "societies.json": export.society_metadata(places, facts),
    }
    for o in outputs:
        docs[f"cells-{o.key}.json"] = export.cell_estimates(
            o.key, o.societies, o.stats, o.status, o.society_cells
        )
        docs[f"distributions-{o.key}.json"] = export.distributions(o.key, o.societies, o.stats)
        docs[f"global-{o.key}.json"] = export.global_cells(o.key, o.global_cells)
        docs[f"similarity-{o.key}.json"] = export.similar(o.key, o.societies, o.matches)
        docs[f"contexts-{o.key}.json"] = export.context_aggregates(o.key, o.societies, o.contexts)
        docs[f"change-{o.key}.json"] = export.change(o.key, o.change)
    return docs


def write(docs: dict[str, Doc], out_dir: Path) -> dict[str, tuple[int, int]]:
    """Validate, stage, privacy-scan, then replace the outputs. Returns raw and gzip sizes."""
    out_dir.mkdir(parents=True, exist_ok=True)
    staging = Path(tempfile.mkdtemp(prefix=".staging-", dir=out_dir.parent))
    try:
        sizes = {}
        for name, doc in sorted(docs.items()):
            kind = name.removesuffix(".json").split("-")[0]
            if kind != "manifest":
                schemas.validate(kind, doc)
            data = export.encode(doc)
            (staging / name).write_bytes(data)
            sizes[name] = (len(data), len(gzip.compress(data, compresslevel=9, mtime=0)))
        findings, _ = privacy.scan([staging])
        if findings:
            for f in findings:
                print(f"FAIL {f.file}  {f.field}  {f.problem}", file=sys.stderr)
            raise BuildError(f"privacy scan: {len(findings)} problem(s); nothing written")
        for stale in out_dir.iterdir():
            if stale.is_file() and stale.name not in KEEP and stale.name not in docs:
                stale.unlink()
        for name in docs:
            os.replace(staging / name, out_dir / name)
        return sizes
    finally:
        shutil.rmtree(staging, ignore_errors=True)


def report_sizes(sizes: dict[str, tuple[int, int]], keys: Sequence[str]) -> None:
    print(f"\n{'File':<28}{'bytes':>10}{'gzip':>10}")
    for name, (size, packed) in sorted(sizes.items()):
        print(f"{name:<28}{size:>10,}{packed:>10,}")
    shared = sizes["societies.json"][1]
    for key in keys:
        total = sum(packed for name, (_, packed) in sizes.items() if name.endswith(f"-{key}.json"))
        print(f"all files for {key}: {(total + shared) / 1000:,.0f} KB gzip")
    # NFR-1: the heaviest first loads (map outlines come on top for the drill-down).
    core = shared + sizes["global-all.json"][1] + sizes["cells-all.json"][1]
    quiz = core + sizes["distributions-all.json"][1]
    for label, value in (("matrix and drill-down", core), ("quiz with a society", quiz)):
        verdict = "ok" if value <= DATA_BUDGET else "OVER BUDGET"
        print(f"first load, {label}: {value / 1000:,.0f} of {DATA_BUDGET / 1000:,.0f} KB {verdict}")


def run(
    raw_dir: Path,
    out_dir: Path = paths.DERIVED_DIR,
    *,
    replicates: int = bootstrap.REPLICATES,
    checks: bool = True,
) -> None:
    """Build every output. `checks=False` skips the checks that need the real OSF files."""
    if checks:
        for source in sources.load_manifest():
            sources.verify(source, raw_dir)  # DR-1
        print("Raw files match their pinned checksums (DR-1)")
    con = raw.connect()
    raw.load_situations(con, raw_dir)
    raw.load_contexts(con, raw_dir)
    raw.load_gelfand(con, raw_dir)
    samples.add_membership(con)
    ref = reference.load_reference()
    found = dict(raw.fetch_rows(con, "SELECT DISTINCT code, country FROM respondents", "codes"))
    problems = ref.check_societies(found, complete=checks)
    if checks and not samples.report(samples.count(con, raw_dir)):
        raise BuildError("sample counts do not reproduce the paper (DR-3)")
    keys = [s.key for s in samples.SITE_SAMPLES]
    counts: dict[str, tuple[int, int]] = {}  # respondents, societies
    outputs = []
    for s in samples.SITE_SAMPLES:
        sql = f"SELECT count(*), count(DISTINCT code) FROM membership WHERE in_{s.key}"
        ((n, k),) = raw.fetch_rows(con, sql, f"sample size ({s.key})")
        counts[s.key] = (int(n), int(k))
        print(f"\nEstimating {s.label}: {k} societies, {replicates:,} replicates")
        outputs.append(estimate_sample(con, s.key, replicates))
    places = metadata.places(con, ref)
    facts = {o.key: metadata.facts(con, o.key, o.societies, ref) for o in outputs}
    con.close()

    by_key = {o.key: o for o in outputs}
    if checks:
        pub = reference.load_published()
        paper = by_key[pub.table1_sample]
        problems += validate.published_values(paper.stats, paper.change, pub)
        problems += validate.row_counts(
            by_key["all"].stats,
            by_key["all"].contexts.societies.n,
            {o.key: o.change for o in outputs},
        )
        for o in outputs:
            problems += validate.not_asked(o.status, o.societies, 10, f"cells ({o.key})")
            problems += validate.not_asked(o.contexts.status, o.societies, 5, f"contexts ({o.key})")
        print("\nTable 1 (paper's sample): behavior, mean change (SD), societies increased")
        for row in validate.table1(paper.change):
            print(
                f"  {row.behavior:<14}{row.mean:>6.2f} ({row.sd:.2f})"
                f"  {row.increased}/{row.societies}"
            )
    if problems:
        for p in problems:
            print(f"FAIL {p}", file=sys.stderr)
        raise BuildError(f"{len(problems)} validation problem(s) (NFR-51)")

    labels = {s.key: s.label for s in samples.SITE_SAMPLES}
    docs = documents(outputs, places, facts, manifest(replicates, counts, labels))
    sizes = write(docs, out_dir)
    print(f"\nWrote {len(docs)} files to {out_dir}; privacy scan ok (DR-9, DR-16)")
    report_sizes(sizes, keys)


def main(raw_dir: Path, out_dir: Path) -> int:
    try:
        run(raw_dir, out_dir)
    except (
        BuildError,
        sources.SourceError,
        raw.RawDataError,
        reference.ReferenceDataError,
        schemas.SchemaError,
    ) as err:
        print(f"FAIL {err}", file=sys.stderr)
        return 1
    return 0
