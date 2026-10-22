"""Checks against the real OSF files (skipped without them). Assertions compare counts only."""

import re
import subprocess
from pathlib import Path

import pytest

from pipeline import paths, raw, samples

pytestmark = pytest.mark.needs_raw

RECODED_SCALE = {-2.5, -1.5, -0.5, 0.5, 1.5, 2.5}


def test_dr3_samples_reproduce_the_paper(raw_dir: Path) -> None:
    result = samples.rebuild(raw_dir)
    for s in samples.CHECKED_SAMPLES:
        c = result.counts[s.key]
        assert (c.respondents, c.societies, c.ratings) == (s.respondents, s.societies, s.ratings)
    for x in result.cross_checks:
        assert (x.only_pipeline, x.only_file) == (0, 0), x.file
        assert x.shared == x.sample.respondents
    assert samples.check_regions(result.societies) == []


def test_dr3_the_nineteen_societies_outside_the_papers_sample(raw_dir: Path) -> None:
    societies = samples.rebuild(raw_dir).societies
    assert int((societies["n_paper"] == 0).sum()) == 19  # SRS §4.4
    assert int((societies["n_attention"] == 0).sum()) == 10


def test_dr2_gsn_ratings_are_recoded(raw_dir: Path) -> None:
    con = raw.connect()
    raw.load_situations(con, raw_dir)
    raw.load_contexts(con, raw_dir)
    for table, rows in (("ratings", 833_930), ("context_ratings", 417_304)):
        values = {v for (v,) in con.execute(f"SELECT DISTINCT rating FROM {table}").fetchall()}
        assert values == RECODED_SCALE, table
        ((n,),) = con.execute(f"SELECT count(*) FROM {table}").fetchall()
        assert n == rows, table


def test_dr2_gelfand_file_is_used_as_stored(raw_dir: Path) -> None:
    con = raw.connect()
    raw.load_situations(con, raw_dir)
    raw.load_gelfand(con, raw_dir)
    values = {v for (v,) in con.execute("SELECT DISTINCT rating FROM gelfand_ratings").fetchall()}
    assert values == RECODED_SCALE
    ((rows, countries, unmatched),) = con.execute(
        """
        SELECT count(*), count(DISTINCT country),
               count(DISTINCT country) FILTER (
                   WHERE country NOT IN (SELECT country FROM respondents))
        FROM gelfand_ratings
        """
    ).fetchall()
    assert (rows, countries, unmatched) == (647_466, 26, 0)


def _tracked_texts() -> list[tuple[str, str]]:
    listing = subprocess.run(
        ["git", "ls-files", "-z"], cwd=paths.REPO_ROOT, capture_output=True, check=False
    )
    if listing.returncode != 0:
        pytest.skip("not a git checkout")
    listed = listing.stdout.decode()
    texts = []
    for name in filter(None, listed.split("\0")):
        path = paths.REPO_ROOT / name
        if path.is_file():
            texts.append((name, path.read_bytes().decode("utf-8", errors="ignore")))
    return texts


def test_dr16_tracked_files_hold_no_respondent_values(raw_dir: Path) -> None:
    """No tracked file contains a ResponseId, a site name, a start or end time or free text."""
    con = raw.connect()
    csv = f"read_csv('{raw_dir / raw.SITUATIONS}', header = true, all_varchar = true)"

    def distinct(column: str) -> set[str]:
        rows = con.execute(f"SELECT DISTINCT {column} FROM {csv} WHERE {column} <> 'NA'")
        return {v for (v,) in rows.fetchall()}

    ids = distinct("ResponseId")
    times = distinct("StartDate") | distinct("EndDate")
    # Sites named after a whole society (e.g. "Jamaica") would match ordinary prose.
    sites = {s for s in distinct("site") if re.search(r"[_\d]", s)}
    free_text = {t for t in distinct("belief_god_orig") if len(t) >= 20}
    assert (len(ids), len(sites) > 50, len(times) > 40_000) == (25_422, True, True)

    problems = []
    for name, text in _tracked_texts():
        tokens = set(re.findall(r"[A-Za-z0-9_]+", text))
        stamps = set(re.findall(r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z", text))
        hits = {
            "respondent IDs": len(tokens & ids),
            "site names": len(tokens & sites)
            + sum(s in text for s in sites if not s.isidentifier()),
            "start/end times": len(stamps & times),
            "free-text answers": sum(t in text for t in free_text),
        }
        problems += [f"{name}: {n} {kind}" for kind, n in hits.items() if n]
    assert problems == []
