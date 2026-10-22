"""Respondent-level ratings of one sample, as integer arrays for the estimators.

A `RatingSet` exists only in memory: it is never written, logged or printed, and its `repr` gives
counts only, so a failing test or traceback cannot show a rating (DR-16). Respondents appear as
dense indices within their society, never as IDs.

Grids are behavior-major: cell = behavior index × width + situation (or context) index, in the
SRS order of `raw.BEHAVIORS`, `raw.SITUATIONS_IDS` and `raw.CONTEXT_IDS`.
"""

from collections.abc import Sequence
from dataclasses import dataclass

import duckdb
import numpy as np

from pipeline import raw

SITUATION_CELLS = len(raw.BEHAVIORS) * len(raw.SITUATIONS_IDS)  # 150
CONTEXT_CELLS = len(raw.BEHAVIORS) * len(raw.CONTEXT_IDS)  # 75
# The 2000–2003 survey shares the first 12 behaviors, so its cells are the first 120 (DR-13).
CHANGE_BEHAVIORS = raw.BEHAVIORS[:12]
CHANGE_CELLS = len(CHANGE_BEHAVIORS) * len(raw.SITUATIONS_IDS)  # 120

# Respondent gender (main file), coded for `RatingSet.group`.
GENDERS = ("Woman", "Man", "Other")
GENDER_MISSING = len(GENDERS)


@dataclass(frozen=True, repr=False)
class RatingSet:
    societies: tuple[str, ...]  # society codes, in index order
    cells: int
    respondents: np.ndarray  # (S,) respondents per society: the bootstrap's resampling units
    society: np.ndarray  # (R,) society index of each rating
    respondent: np.ndarray  # (R,) respondent index within its society
    cell: np.ndarray  # (R,) cell index
    value: np.ndarray  # (R,) response on the 1–6 scale
    group: np.ndarray  # (R,) respondent group (gender code for contexts; otherwise 0)

    def __repr__(self) -> str:
        return (
            f"RatingSet({len(self.societies)} societies, {self.cells} cells, "
            f"{self.value.size} ratings)"
        )

    def subset(self, keep: np.ndarray) -> "RatingSet":
        """Keep some ratings. Respondent numbering and counts stay the same, so a bootstrap of
        the subset draws the same respondents as one of the whole set."""
        return RatingSet(
            self.societies,
            self.cells,
            self.respondents,
            self.society[keep],
            self.respondent[keep],
            self.cell[keep],
            self.value[keep],
            self.group[keep],
        )


def _list(values: Sequence[str]) -> str:
    return "[" + ", ".join("'" + v.replace("'", "''") + "'" for v in values) + "]"


def _fetch(
    con: duckdb.DuckDBPyConnection, sql: str, societies: Sequence[str], cells: int, context: str
) -> RatingSet:
    """`sql` returns si (society index), ri (respondent index), cell, value (1–6) and grp."""
    cols = raw.fetch_arrays(con, sql, context)
    society = cols["si"].astype(np.int64)
    respondent = cols["ri"].astype(np.int64)
    respondents = np.zeros(len(societies), dtype=np.int64)
    np.maximum.at(respondents, society, respondent + 1)
    return RatingSet(
        tuple(societies),
        cells,
        respondents,
        society,
        respondent,
        cols["cell"].astype(np.int64),
        cols["value"].astype(np.int64),
        cols["grp"].astype(np.int64),
    )


def situations(con: duckdb.DuckDBPyConnection, sample: str, societies: Sequence[str]) -> RatingSet:
    """Main-file ratings of one sample on the 150-cell grid (needs `membership`)."""
    width = len(raw.SITUATIONS_IDS)
    sql = f"""
        SELECT list_position({_list(societies)}, m.code) - 1 AS si,
               dense_rank() OVER (PARTITION BY m.code ORDER BY r.rid) - 1 AS ri,
               (list_position({_list(raw.BEHAVIORS)}, r.behavior) - 1) * {width}
                 + list_position({_list(raw.SITUATIONS_IDS)}, r.situation) - 1 AS cell,
               CAST(r.rating + 3.5 AS INTEGER) AS value,
               0 AS grp
        FROM ratings r JOIN membership m USING (rid)
        WHERE m.in_{sample}
    """
    return _fetch(con, sql, societies, SITUATION_CELLS, f"situation ratings ({sample})")


def contexts(con: duckdb.DuckDBPyConnection, sample: str, societies: Sequence[str]) -> RatingSet:
    """Contexts-file ratings of one sample on the 75-cell grid (DR-12).

    Sample membership comes from the main file, so a respondent in the contexts file only is in
    no sample. Society and gender come from the main file too; `group` is the gender code.
    """
    width = len(raw.CONTEXT_IDS)
    genders = _list(GENDERS)
    sql = f"""
        SELECT list_position({_list(societies)}, m.code) - 1 AS si,
               dense_rank() OVER (PARTITION BY m.code ORDER BY c.rid) - 1 AS ri,
               (list_position({_list(raw.BEHAVIORS)}, c.behavior) - 1) * {width}
                 + list_position({_list(raw.CONTEXT_IDS)}, c.context) - 1 AS cell,
               CAST(c.rating + 3.5 AS INTEGER) AS value,
               coalesce(list_position({genders}, p.gender) - 1, {GENDER_MISSING}) AS grp
        FROM context_ratings c JOIN membership m USING (rid) JOIN respondents p USING (rid)
        WHERE m.in_{sample}
    """
    return _fetch(con, sql, societies, CONTEXT_CELLS, f"context ratings ({sample})")


def gelfand(con: duckdb.DuckDBPyConnection, societies: Sequence[str]) -> RatingSet:
    """2000–2003 ratings of the given societies on the 120 shared cells (DR-13, C-6).

    The file has no `code`, so societies are joined on `country`. Its respondent key is
    `country` + `ResponseId`; a key with two ratings of a cell counts both, and the bootstrap
    resamples keys (decision 13).
    """
    width = len(raw.SITUATIONS_IDS)
    sql = f"""
        WITH codes AS (SELECT DISTINCT country, code FROM respondents)
        SELECT list_position({_list(societies)}, k.code) - 1 AS si,
               dense_rank() OVER (PARTITION BY k.code ORDER BY g.rid_in_country) - 1 AS ri,
               (list_position({_list(CHANGE_BEHAVIORS)}, g.behavior) - 1) * {width}
                 + list_position({_list(raw.SITUATIONS_IDS)}, g.situation) - 1 AS cell,
               CAST(g.rating + 3.5 AS INTEGER) AS value,
               0 AS grp
        FROM gelfand_ratings g JOIN codes k USING (country)
        WHERE list_contains({_list(societies)}, k.code)
    """
    return _fetch(con, sql, societies, CHANGE_CELLS, "2000–2003 ratings")
