"""Society metadata: names, places and per-sample facts (DR-15, FR-34, FR-71).

Facts are counts and shares over each society's respondents in a sample:
- respondents (null in the export when the society is not in the sample);
- the share flagged as students and the share with no student status, as stored in the GSN files
  (decision 11: the companion project's recode is not applied);
- interface languages used by at least 10 respondents, after merging variants of a language
  such as EN and EN-GB (decision 10), most used first;
- the fieldwork period as the first and last month in which at least 10 respondents started
  (decision 17), so no month describes fewer than 10 people. Months only, never timestamps.

UNDP, IMF and WVS covariates are not read (DR-15).
"""

from collections import defaultdict
from collections.abc import Sequence
from dataclasses import dataclass

import duckdb

from pipeline import cells, raw
from pipeline.reference import Reference, ReferenceDataError


@dataclass(frozen=True)
class Place:
    code: str
    name: str
    region: str
    lat: float
    lon: float


@dataclass(frozen=True)
class Facts:
    respondents: int
    student_share: float
    student_unknown: float
    first_month: str | None
    last_month: str | None
    languages: tuple[str, ...]


def places(con: duckdb.DuckDBPyConnection, ref: Reference) -> list[Place]:
    """Every society in the main file, by code, with its display name and map position."""
    sql = """
        SELECT r.code, min(r.region) AS region, min(p.lat) AS lat, min(p.lon) AS lon
        FROM respondents r JOIN places p USING (code) GROUP BY r.code ORDER BY r.code
    """
    result = []
    for code, region, lat, lon in raw.fetch_rows(con, sql, "society places"):
        code = str(code)
        fixed = ref.coordinates.get(code)
        if fixed is not None:
            lat, lon = fixed.lat, fixed.lon
        if lat is None or lon is None:
            raise ReferenceDataError(f"{code} has no map position; add one to societies.toml")
        society = ref.societies.get(code)
        if society is None:
            raise ReferenceDataError(f"{code} has no display name in societies.toml")
        result.append(Place(code, society.name, str(region), float(lat), float(lon)))
    return result


def facts(
    con: duckdb.DuckDBPyConnection, sample: str, codes: Sequence[str], ref: Reference
) -> dict[str, Facts]:
    """Facts for the societies of one sample (needs `membership` and `respondents`)."""
    members = f"SELECT r.* FROM respondents r JOIN membership m USING (rid) WHERE m.in_{sample}"
    counts = {
        str(code): (int(n), int(yes), int(unknown))
        for code, n, yes, unknown in raw.fetch_rows(
            con,
            f"""SELECT code, count(*) AS n, count(*) FILTER (WHERE student = 'yes') AS yes,
                       count(*) FILTER (WHERE student IS NULL) AS unknown
                FROM ({members}) GROUP BY code""",
            f"student counts ({sample})",
        )
    }
    months: dict[str, list[str]] = defaultdict(list)
    for code, month in raw.fetch_rows(
        con,
        f"""SELECT code, strftime(date_trunc('month', started_utc), '%Y-%m') AS month
            FROM ({members}) GROUP BY ALL HAVING count(*) >= {cells.MIN_N} ORDER BY ALL""",
        f"fieldwork months ({sample})",
    ):
        months[str(code)].append(str(month))
    used: dict[str, dict[str, int]] = defaultdict(lambda: defaultdict(int))
    for code, language, n in raw.fetch_rows(
        con,
        f"SELECT code, language, count(*) AS n FROM ({members}) GROUP BY ALL",
        f"interface languages ({sample})",
    ):
        used[str(code)][ref.language(str(language))] += int(n)

    result = {}
    for code in codes:
        n, yes, unknown = counts[code]
        spoken = sorted(
            ((-k, name) for name, k in used[code].items() if k >= cells.MIN_N),
        )
        result[code] = Facts(
            respondents=n,
            student_share=yes / n,
            student_unknown=unknown / n,
            first_month=months[code][0] if months[code] else None,
            last_month=months[code][-1] if months[code] else None,
            languages=tuple(name for _, name in spoken),
        )
    return result
