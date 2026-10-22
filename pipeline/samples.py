"""Rebuild the GSN samples and cross-check them against the authors' respondent lists (DR-3).

Sample rules follow SRS §4.4 and data profile §4.3. Society membership is keyed on `code`.
Only counts leave this module; respondent IDs stay inside DuckDB.
"""

import sys
from dataclasses import dataclass
from pathlib import Path

import pandas as pd
import pandera.pandas as pa

from pipeline import raw, sources

KUWAIT = "KWT"
# Dropped by the authors from the attention-check sample (SRS §4.4): Benin and Mauritius for
# face-to-face administration, the others for having fewer than 20 passers.
ATTENTION_EXCLUDED = {
    "BEN": "Benin",
    "MUS": "Mauritius",
    "CAF": "Central African Republic",
    "MNG": "Mongolia",
    "PER": "Peru",
    "TCD": "Chad",
    "ETH": "Ethiopia",
    "SOM": "Somalia",
    "DZA": "Algeria",
    "NAM": "Namibia",
}
# Codes whose society is easy to mis-key (SRS §4.4, kickoff §4.4).
KNOWN_CODES = {**ATTENTION_EXCLUDED, KUWAIT: "Kuwait", "XKX": "Kosovo", "TTO": "Caribbean"}
REGION_SOCIETIES = {"Africa": 16, "Asia": 22, "Latin America": 14, "West": 38}

# The authors' R filter `StartDate <= as.POSIXct("2024-03-01")` ran in Stockholm time (UTC+1 in
# winter), so the cutoff is 2024-02-29 23:00:00 UTC, inclusive.
PAPER_CUTOFF_UTC = "2024-02-29 23:00:00"


@dataclass(frozen=True)
class Sample:
    key: str
    label: str
    rule: str  # SQL predicate over the `respondents` table
    respondents: int  # expected counts, reproduced exactly or the run stops (DR-3)
    societies: int
    ratings: int


_ALL = "n_ratings > 0"
_PAPER = f"{_ALL} AND started_utc <= TIMESTAMP '{PAPER_CUTOFF_UTC}' AND code <> '{KUWAIT}'"
_EXCLUDED = ", ".join(f"'{c}'" for c in ATTENTION_EXCLUDED)
_ATTENTION = f"{_ALL} AND att_check_commit = 1 AND code NOT IN ({_EXCLUDED})"

ALL_DATA = Sample("all", "All data", _ALL, 25_422, 90, 833_930)
PAPER = Sample("paper", "Paper's sample", _PAPER, 18_656, 71, 578_411)
ATTENTION = Sample("attention", "Attention check", _ATTENTION, 15_599, 80, 515_162)
# The paper's mixed-model sample: the paper's sample restricted to complete cases on gender and
# the nine Ind-Bind items. Not a site toggle; rebuilt only as a cross-check.
COMPLETE_CASE = Sample(
    "complete_case", "Complete case", f"{_PAPER} AND complete_case", 17_288, 71, 547_170
)

SITE_SAMPLES = (ALL_DATA, PAPER, ATTENTION)
CHECKED_SAMPLES = (*SITE_SAMPLES, COMPLETE_CASE)
CROSS_CHECKS = ((COMPLETE_CASE, raw.PREREG_LIST), (ATTENTION, raw.ATTENTION_LIST))


@dataclass(frozen=True)
class Counts:
    respondents: int
    societies: int
    ratings: int


@dataclass(frozen=True)
class CrossCheck:
    sample: Sample
    file: str
    shared: int
    only_pipeline: int
    only_file: int

    @property
    def ok(self) -> bool:
        return self.only_pipeline == 0 and self.only_file == 0


@dataclass(frozen=True)
class Rebuild:
    counts: dict[str, Counts]
    cross_checks: list[CrossCheck]
    societies: pd.DataFrame  # one row per society: code, country, region, n_<sample>


SOCIETY_SCHEMA = pa.DataFrameSchema(
    {
        "code": pa.Column(str, pa.Check.str_matches(r"^[A-Z]{3}$"), unique=True),
        "country": pa.Column(str, unique=True),
        "region": pa.Column(str, pa.Check.isin(list(REGION_SOCIETIES))),
        **{f"n_{s.key}": pa.Column(int, pa.Check.ge(0)) for s in CHECKED_SAMPLES},
    },
    checks=[
        pa.Check(lambda df: df["n_paper"] <= df["n_all"], error="paper sample within all data"),
        pa.Check(lambda df: df["n_attention"] <= df["n_all"], error="attention within all data"),
        pa.Check(
            lambda df: df["n_complete_case"] <= df["n_paper"], error="complete case within paper"
        ),
    ],
    strict=True,
    coerce=True,
)


def rebuild(raw_dir: Path) -> Rebuild:
    """Load the main file and the respondent lists, then count every sample."""
    con = raw.connect()
    raw.load_situations(con, raw_dir)
    flags = ", ".join(f"({s.rule}) AS in_{s.key}" for s in CHECKED_SAMPLES)
    con.execute(f"CREATE TABLE membership AS SELECT rid, code, n_ratings, {flags} FROM respondents")

    counts = {}
    for s in CHECKED_SAMPLES:
        ((respondents, societies, ratings),) = con.execute(
            f"""SELECT count(*), count(DISTINCT code), coalesce(sum(n_ratings), 0)
                FROM membership WHERE in_{s.key}"""
        ).fetchall()
        counts[s.key] = Counts(int(respondents), int(societies), int(ratings))

    cross_checks = []
    for s, file in CROSS_CHECKS:
        table = f"list_{s.key}"
        raw.load_id_list(con, raw_dir, file, table)
        ((shared, only_pipeline, only_file),) = con.execute(
            f"""
            SELECT count(*) FILTER (WHERE m.rid IS NOT NULL AND l.rid IS NOT NULL),
                   count(*) FILTER (WHERE l.rid IS NULL),
                   count(*) FILTER (WHERE m.rid IS NULL)
            FROM (SELECT rid FROM membership WHERE in_{s.key}) m
            FULL OUTER JOIN {table} l ON m.rid = l.rid
            """
        ).fetchall()
        cross_checks.append(CrossCheck(s, file, int(shared), int(only_pipeline), int(only_file)))

    sums = ", ".join(f"count(*) FILTER (WHERE in_{s.key}) AS n_{s.key}" for s in CHECKED_SAMPLES)
    societies = con.execute(
        f"""
        SELECT m.code, min(r.country) AS country, min(r.region) AS region, {sums}
        FROM membership m JOIN respondents r USING (rid)
        GROUP BY m.code
        HAVING count(*) FILTER (WHERE in_all) > 0
        ORDER BY m.code
        """
    ).df()
    con.close()
    return Rebuild(counts, cross_checks, validate_societies(societies))


def validate_societies(societies: pd.DataFrame) -> pd.DataFrame:
    """Schema-check the per-society counts and the society keys the samples depend on."""
    try:
        validated = SOCIETY_SCHEMA.validate(societies, lazy=True)
    except pa.errors.SchemaErrors as err:
        failed = sorted({str(c) for c in err.failure_cases["check"]})
        raise raw.RawDataError("society table failed schema checks: " + "; ".join(failed)) from None
    names = dict(zip(validated["code"], validated["country"], strict=True))
    for code, expected in KNOWN_CODES.items():
        if code in names and names[code] != expected:
            raise raw.RawDataError(f"society code {code} is {names[code]!r}, expected {expected!r}")
    return validated


def check_regions(societies: pd.DataFrame) -> list[str]:
    """Societies per region must match the authors' grouping (SRS §4.4)."""
    found = societies.groupby("region")["code"].count().to_dict()
    return [
        f"{region}: {found.get(region, 0)} societies, expected {n}"
        for region, n in REGION_SOCIETIES.items()
        if found.get(region, 0) != n
    ]


def report(result: Rebuild) -> bool:
    """Print counts and cross-checks against the expected values; True when all match."""
    ok = True
    print(f"{'Sample':<20}{'respondents':>12}{'societies':>11}{'ratings':>10}")
    for s in CHECKED_SAMPLES:
        c = result.counts[s.key]
        matches = (c.respondents, c.societies, c.ratings) == (s.respondents, s.societies, s.ratings)
        ok &= matches
        verdict = (
            "ok"
            if matches
            else (f"MISMATCH (expected {s.respondents:,} / {s.societies} / {s.ratings:,})")
        )
        print(f"{s.label:<20}{c.respondents:>12,}{c.societies:>11}{c.ratings:>10,}   {verdict}")
    print("\nCross-checks against the authors' respondent lists")
    for x in result.cross_checks:
        ok &= x.ok
        print(
            f"{x.sample.label} vs {x.file}: {x.shared:,} shared, {x.only_pipeline:,} only in the "
            f"pipeline, {x.only_file:,} only in the file   {'ok' if x.ok else 'MISMATCH'}"
        )
    region_problems = check_regions(result.societies)
    ok &= not region_problems
    regions = ", ".join(f"{r} {n}" for r, n in REGION_SOCIETIES.items())
    print(f"\nRegions ({regions}): {'ok' if not region_problems else '; '.join(region_problems)}")
    return ok


def main(raw_dir: Path) -> int:
    try:
        for source in sources.load_manifest():
            sources.verify(source, raw_dir)  # DR-1: stop on any mismatch
        result = rebuild(raw_dir)
    except (sources.SourceError, raw.RawDataError) as err:
        print(f"FAIL {err}", file=sys.stderr)
        return 1
    if report(result):
        return 0
    print("\nFAIL sample counts do not reproduce the paper (DR-3)", file=sys.stderr)
    return 1
