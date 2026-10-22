"""DuckDB access to the raw OSF files.

The raw files are respondent-level. Functions here build in-memory DuckDB tables and return only
aggregates. DuckDB's own error messages quote the offending CSV line, so every raw read goes
through `_run`, which re-raises with a scrubbed message (DR-16).

Conventions:
- Every column is read as text (`all_varchar`) and cast explicitly, so type sniffing on columns
  the pipeline never uses cannot fail a run.
- R writes missing values as the literal `NA`. Namibia's ISO2 code is also `NA`, which is one
  reason societies are keyed on `code` (ISO3, plus XKX for Kosovo and TTO for the pooled
  Caribbean) and `iso2` is never read.
"""

import re
from collections.abc import Sequence
from pathlib import Path

import duckdb

SITUATIONS = "gsn-situations-clean-long.csv"
CONTEXTS = "gsn-contexts-clean-long.csv"
GELFAND = "everyday-norms-2011-clean.csv"
ATTENTION_LIST = "imputed-ind-data-attention-check.csv"
PREREG_LIST = "individual-data-prereg.csv"

BEHAVIORS = (
    "argue", "laugh", "curse", "kiss", "cry", "sing", "talk", "flirt",
    "listen", "bargain", "readnewspaper", "eat", "rest", "shout", "usemphone",
)  # fmt: skip
SITUATIONS_IDS = (
    "funeral", "sidewalk", "library", "workplace", "job_interview",
    "restaurant", "public_park", "bus", "movies", "party",
)  # fmt: skip
CONTEXT_IDS = ("alone", "colleagues/classmates", "management/professors", "woman", "man")

# The nine Ind-Bind dilemma items; with `gender`, the complete-case variables of the paper's
# mixed models (data profile §4.3).
IND_BIND_ITEMS = (
    "harm_loyalty", "liberty_purity", "fair_authority", "harm_authority", "fair_purity",
    "liberty_loyalty", "fair_loyalty", "harm_purity", "liberty_authority",
)  # fmt: skip

_QUOTED = re.compile(r"'[^']*'|\"[^\"]*\"")


class RawDataError(Exception):
    """A raw-file read or check failed. The message never contains raw values."""


def scrub(message: str) -> str:
    """Reduce a DuckDB error to its first line, with quoted fragments masked.

    DuckDB appends the offending CSV line ("Original Line: ...") on later lines and quotes
    unconvertible values; neither may reach a log.
    """
    lines = message.strip().splitlines()
    first = lines[0] if lines else "unknown error"
    return _QUOTED.sub("'…'", first)[:300]


def _run(con: duckdb.DuckDBPyConnection, sql: str, context: str) -> None:
    try:
        con.execute(sql)
    except duckdb.Error as err:
        raise RawDataError(f"{context}: {type(err).__name__}: {scrub(str(err))}") from None


def _scalar_rows(
    con: duckdb.DuckDBPyConnection, sql: str, context: str
) -> list[tuple[object, ...]]:
    try:
        return con.execute(sql).fetchall()
    except duckdb.Error as err:
        raise RawDataError(f"{context}: {type(err).__name__}: {scrub(str(err))}") from None


def _csv(path: Path) -> str:
    quoted = str(path).replace("'", "''")
    return f"read_csv('{quoted}', header = true, all_varchar = true, nullstr = 'NA')"


def _sql_list(values: Sequence[str]) -> str:
    return ", ".join("'" + v.replace("'", "''") + "'" for v in values)


def connect() -> duckdb.DuckDBPyConnection:
    return duckdb.connect(":memory:")


def load_situations(con: duckdb.DuckDBPyConnection, raw_dir: Path) -> None:
    """Build `respondents` (one row per ResponseId), `ratings` and `places` from the main file.

    `ratings.rating` is recoded as rating − 3.5, giving −2.5 to +2.5 (DR-2). `places` holds each
    society's map position (`Latitude_average`, `Longitude_average`), which is society-level.
    """
    items = ", ".join(IND_BIND_ITEMS)
    _run(
        con,
        f"""
        CREATE TEMP TABLE situation_rows AS
        SELECT ResponseId AS rid, code, country, region, StartDate AS start_text,
               att_check_commit, gender, student, UserLanguage AS language,
               Latitude_average AS lat_text, Longitude_average AS lon_text,
               {items}, behavior, situation, rating AS rating_text
        FROM {_csv(raw_dir / SITUATIONS)}
        """,
        f"reading {SITUATIONS}",
    )
    _check_situation_rows(con)
    complete = " AND ".join(f"{c} IS NOT NULL" for c in ("gender", *IND_BIND_ITEMS))
    _run(
        con,
        f"""
        CREATE TABLE ratings AS
        SELECT rid, code, behavior, situation, CAST(rating_text AS DOUBLE) - 3.5 AS rating
        FROM situation_rows
        WHERE rating_text IS NOT NULL;

        CREATE TABLE respondents AS
        SELECT rid,
               min(code) AS code,
               min(country) AS country,
               min(region) AS region,
               min(strptime(start_text, '%Y-%m-%dT%H:%M:%SZ')) AS started_utc,
               min(CAST(att_check_commit AS INTEGER)) AS att_check_commit,
               bool_and({complete}) AS complete_case,
               count(rating_text) AS n_ratings,
               min(gender) AS gender,
               min(student) AS student,
               min(language) AS language
        FROM situation_rows
        GROUP BY rid;

        CREATE TABLE places AS
        SELECT code, min(CAST(lat_text AS DOUBLE)) AS lat, min(CAST(lon_text AS DOUBLE)) AS lon
        FROM situation_rows
        GROUP BY code;

        DROP TABLE situation_rows;
        """,
        f"building tables from {SITUATIONS}",
    )


def _check_situation_rows(con: duckdb.DuckDBPyConnection) -> None:
    """Schema checks on the main file, reported as counts only (NFR-51)."""
    constant = (
        "code", "country", "region", "start_text", "att_check_commit", "gender", "student",
        "language",
    )  # fmt: skip
    per_respondent = ", ".join(
        f"count(DISTINCT coalesce({c}, '<missing>')) AS k_{c}" for c in constant
    )
    checks = {
        "ratings outside 1-6": """
            SELECT count(*) FROM situation_rows
            WHERE rating_text IS NOT NULL
              AND (TRY_CAST(rating_text AS DOUBLE) IS NULL
                   OR TRY_CAST(rating_text AS DOUBLE) NOT IN (1, 2, 3, 4, 5, 6))""",
        "unknown behavior IDs": f"""
            SELECT count(*) FROM situation_rows
            WHERE behavior IS NULL OR behavior NOT IN ({_sql_list(BEHAVIORS)})""",
        "unknown situation IDs": f"""
            SELECT count(*) FROM situation_rows
            WHERE situation IS NULL OR situation NOT IN ({_sql_list(SITUATIONS_IDS)})""",
        "society codes not three capital letters": """
            SELECT count(*) FROM situation_rows
            WHERE code IS NULL OR NOT regexp_full_match(code, '[A-Z]{3}')""",
        "missing respondent IDs": "SELECT count(*) FROM situation_rows WHERE rid IS NULL",
        "unparseable start times": """
            SELECT count(*) FROM situation_rows
            WHERE try_strptime(start_text, '%Y-%m-%dT%H:%M:%SZ') IS NULL""",
        "att_check_commit not 0/1": """
            SELECT count(*) FROM situation_rows
            WHERE att_check_commit IS NULL OR att_check_commit NOT IN ('0', '1')""",
        "respondents whose attributes vary between rows": f"""
            SELECT count(*) FROM (
                SELECT {per_respondent} FROM situation_rows GROUP BY rid
            ) WHERE greatest({", ".join(f"k_{c}" for c in constant)}) > 1""",
        "genders other than Woman, Man or Other": """
            SELECT count(*) FROM situation_rows
            WHERE gender IS NOT NULL AND gender NOT IN ('Woman', 'Man', 'Other')""",
        "student values other than yes or no": """
            SELECT count(*) FROM situation_rows
            WHERE student IS NOT NULL AND student NOT IN ('yes', 'no')""",
        "missing interface languages": "SELECT count(*) FROM situation_rows WHERE language IS NULL",
        "unparseable or partial coordinates": """
            SELECT count(*) FROM situation_rows
            WHERE (lat_text IS NULL) <> (lon_text IS NULL)
               OR (lat_text IS NOT NULL AND (TRY_CAST(lat_text AS DOUBLE) IS NULL
                                             OR TRY_CAST(lon_text AS DOUBLE) IS NULL))""",
        "societies whose coordinates vary between rows": """
            SELECT count(*) FROM (
                SELECT code FROM situation_rows GROUP BY code
                HAVING count(DISTINCT coalesce(lat_text, '<missing>')) > 1
                    OR count(DISTINCT coalesce(lon_text, '<missing>')) > 1)""",
        "codes mapped to several countries, or countries to several codes": """
            SELECT (SELECT count(*) FROM (SELECT code FROM situation_rows GROUP BY code
                                          HAVING count(DISTINCT country) > 1))
                 + (SELECT count(*) FROM (SELECT country FROM situation_rows GROUP BY country
                                          HAVING count(DISTINCT code) > 1))""",
    }
    _fail_on_nonzero(con, checks, SITUATIONS)


def _fail_on_nonzero(con: duckdb.DuckDBPyConnection, checks: dict[str, str], file: str) -> None:
    problems = []
    for label, sql in checks.items():
        ((count,),) = _scalar_rows(con, sql, f"checking {file}")
        if count:
            problems.append(f"{count:,} {label}")
    if problems:
        raise RawDataError(f"{file} failed schema checks: " + "; ".join(problems))


def load_contexts(con: duckdb.DuckDBPyConnection, raw_dir: Path) -> None:
    """Build `context_ratings` from the contexts file, recoded as rating − 3.5 (DR-2).

    The contexts file has no `code` column; join on `country` to the main file's societies.
    """
    _run(
        con,
        f"""
        CREATE TEMP TABLE context_rows AS
        SELECT ResponseId AS rid, country, behavior, context, rating AS rating_text
        FROM {_csv(raw_dir / CONTEXTS)}
        """,
        f"reading {CONTEXTS}",
    )
    checks = {
        "ratings outside 1-6": """
            SELECT count(*) FROM context_rows
            WHERE rating_text IS NOT NULL
              AND (TRY_CAST(rating_text AS DOUBLE) IS NULL
                   OR TRY_CAST(rating_text AS DOUBLE) NOT IN (1, 2, 3, 4, 5, 6))""",
        "unknown behavior IDs": f"""
            SELECT count(*) FROM context_rows
            WHERE behavior IS NULL OR behavior NOT IN ({_sql_list(BEHAVIORS)})""",
        "unknown context IDs": f"""
            SELECT count(*) FROM context_rows
            WHERE context IS NULL OR context NOT IN ({_sql_list(CONTEXT_IDS)})""",
    }
    _fail_on_nonzero(con, checks, CONTEXTS)
    _run(
        con,
        """
        CREATE TABLE context_ratings AS
        SELECT rid, country, behavior, context, CAST(rating_text AS DOUBLE) - 3.5 AS rating
        FROM context_rows
        WHERE rating_text IS NOT NULL;
        DROP TABLE context_rows;
        """,
        f"building tables from {CONTEXTS}",
    )


def load_gelfand(con: duckdb.DuckDBPyConnection, raw_dir: Path) -> None:
    """Build `gelfand_ratings` from the 2000–2003 file, used as stored (DR-2, C-6).

    The file is already on the −2.5 to +2.5 scale and has no `code` column; its `ResponseId`
    is unique only within `country`.
    """
    _run(
        con,
        f"""
        CREATE TEMP TABLE gelfand_rows AS
        SELECT country, ResponseId AS rid_in_country, behavior, situation, rating AS rating_text
        FROM {_csv(raw_dir / GELFAND)}
        """,
        f"reading {GELFAND}",
    )
    checks = {
        "ratings off the recoded scale": """
            SELECT count(*) FROM gelfand_rows
            WHERE TRY_CAST(rating_text AS DOUBLE) IS NULL
               OR TRY_CAST(rating_text AS DOUBLE) NOT IN (-2.5, -1.5, -0.5, 0.5, 1.5, 2.5)""",
        "unknown behavior IDs": f"""
            SELECT count(*) FROM gelfand_rows
            WHERE behavior IS NULL OR behavior NOT IN ({_sql_list(BEHAVIORS)})""",
        "unknown situation IDs": f"""
            SELECT count(*) FROM gelfand_rows
            WHERE situation IS NULL OR situation NOT IN ({_sql_list(SITUATIONS_IDS)})""",
    }
    _fail_on_nonzero(con, checks, GELFAND)
    _run(
        con,
        """
        CREATE TABLE gelfand_ratings AS
        SELECT country, rid_in_country, behavior, situation, CAST(rating_text AS DOUBLE) AS rating
        FROM gelfand_rows;
        DROP TABLE gelfand_rows;
        """,
        f"building tables from {GELFAND}",
    )


def load_id_list(con: duckdb.DuckDBPyConnection, raw_dir: Path, file: str, table: str) -> None:
    """Load the `ResponseId` column of a respondent-list file into `table(rid)`."""
    _run(
        con,
        f"CREATE TABLE {table} AS SELECT ResponseId AS rid FROM {_csv(raw_dir / file)}",
        f"reading {file}",
    )
    checks = {
        "missing respondent IDs": f"SELECT count(*) FROM {table} WHERE rid IS NULL",
        "duplicate respondent IDs": f"SELECT count(*) - count(DISTINCT rid) FROM {table}",
    }
    _fail_on_nonzero(con, checks, file)
