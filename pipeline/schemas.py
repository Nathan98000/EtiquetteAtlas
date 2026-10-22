"""pandera schemas for every published table (§4.6, NFR-51).

Each schema checks one columnar table of a document after rounding, i.e. exactly what is
written. Failures name the table and the failed checks, never the values.
"""

from collections.abc import Callable
from typing import cast

import pandas as pd
import pandera.pandas as pa

from pipeline import cells
from pipeline.export import Doc

MAX_SCORE = 2.5


def _whole(series: pd.Series) -> pd.Series:
    return series.isna() | (series == series.round())


def score() -> pa.Column:
    return pa.Column(float, pa.Check.in_range(-MAX_SCORE, MAX_SCORE), nullable=True, coerce=True)


def difference() -> pa.Column:
    return pa.Column(float, pa.Check.in_range(-5.0, 5.0), nullable=True, coerce=True)


def spread() -> pa.Column:  # SDs, τ and interval offsets
    return pa.Column(float, pa.Check.in_range(0.0, 5.0), nullable=True, coerce=True)


def group_size() -> pa.Column:  # respondents: at least 10 or null (DR-9)
    checks = [pa.Check.ge(cells.MIN_N), pa.Check(_whole, error="whole number")]
    return pa.Column(float, checks, nullable=True, coerce=True)


def count(minimum: int = 0) -> pa.Column:
    checks = [pa.Check.ge(minimum), pa.Check(_whole, error="whole number")]
    return pa.Column(float, checks, nullable=True, coerce=True)


def percent() -> pa.Column:
    checks = [pa.Check.in_range(0, 100), pa.Check(_whole, error="whole number")]
    return pa.Column(float, checks, nullable=True, coerce=True)


def code() -> pa.Column:
    return pa.Column(str, pa.Check.str_matches(r"^[A-Z]{3}$"), coerce=True)


def _null_with(anchor: str, *columns: str) -> pa.Check:
    """Every listed column is null exactly where `anchor` is null (DR-9 suppression)."""

    def check(df: pd.DataFrame) -> bool:
        return all((df[c].isna() == df[anchor].isna()).all() for c in columns)

    return pa.Check(check, error=f"{', '.join(columns)} null exactly where {anchor} is null")


def _suppressed_status(df: pd.DataFrame) -> bool:
    return bool(((df["status"] >= cells.TOO_FEW) == df["n"].isna()).all())


SUPPRESSED = pa.Check(_suppressed_status, error="n is null exactly for too-few or not-asked cells")
STATUS = pa.Column(int, pa.Check.isin([cells.OK, cells.SMALL, cells.TOO_FEW, cells.NOT_ASKED]))

CELLS = pa.DataFrameSchema(
    {
        "n": group_size(),
        "mean": score(),
        "mean_minus": spread(),
        "mean_plus": spread(),
        "shrunk": score(),
        "shrunk_pm": spread(),
        "share": percent(),
        "status": STATUS,
        "notable": pa.Column(float, pa.Check.isin([-1, 0, 1]), nullable=True, coerce=True),
        "notable_centered": pa.Column(float, pa.Check.isin([-1, 0, 1]), nullable=True, coerce=True),
    },
    checks=[
        SUPPRESSED,
        _null_with(
            "n",
            "mean",
            "mean_minus",
            "mean_plus",
            "shrunk",
            "shrunk_pm",
            "share",
            "notable",
            "notable_centered",
        ),
    ],
    strict=True,
)
DISTRIBUTIONS = pa.DataFrameSchema(
    {"n": group_size(), "sd": spread(), **{f"c{k}": count() for k in range(1, 7)}},
    checks=[
        _null_with("n", *(f"c{k}" for k in range(1, 7))),
        pa.Check(
            lambda df: bool(
                (df[[f"c{k}" for k in range(1, 7)]].sum(axis=1) == df["n"].fillna(0)).all()
            ),
            error="c1-c6 add up to n",
        ),
    ],
    strict=True,
)
GLOBAL = pa.DataFrameSchema(
    {
        "n_societies": count(1),
        "n": group_size(),
        "mean": score(),
        "mean_minus": spread(),
        "mean_plus": spread(),
        "share": percent(),
        "tau": spread(),
        "tau_minus": spread(),
        "tau_plus": spread(),
        "sd_between": spread(),
        "centered_mean": score(),
        "centered_tau": spread(),
        "centered_tau_minus": spread(),
        "centered_tau_plus": spread(),
        "centered_sd_between": spread(),
    },
    strict=True,
)
SOCIETY_OFFSETS = pa.DataFrameSchema(
    {"code": code(), "offset": difference(), "offset_shrunk": difference()},
    unique=["code"],
    strict=True,
)
CODES = pa.DataFrameSchema({"code": code()}, unique=["code"], strict=True)
PAIRS = pa.DataFrameSchema(
    {
        "code": code(),
        "rank": pa.Column(int, pa.Check.in_range(1, 5)),
        "other": code(),
        "r": pa.Column(float, pa.Check.in_range(-1.0, 1.0)),
        "n_cells": pa.Column(int, pa.Check.in_range(120, 150)),
    },
    checks=[pa.Check(lambda df: bool((df["code"] != df["other"]).all()), error="no self-pairs")],
    unique=["code", "rank"],
    strict=True,
)
SUMMARY = {
    "n_societies": count(1),
    "n": group_size(),
    "mean": score(),
    "mean_minus": spread(),
    "mean_plus": spread(),
    "share": percent(),
}
CONTEXT_CELLS = pa.DataFrameSchema(
    {
        "n": group_size(),
        "mean": score(),
        "mean_minus": spread(),
        "mean_plus": spread(),
        "share": percent(),
        "status": STATUS,
    },
    checks=[SUPPRESSED, _null_with("n", "mean", "mean_minus", "mean_plus", "share")],
    strict=True,
)
CONTEXT_GLOBAL = pa.DataFrameSchema(SUMMARY, strict=True)
CONTEXT_GENDER = pa.DataFrameSchema(
    {"gender": pa.Column(str, pa.Check.isin(["Woman", "Man"])), **SUMMARY}, strict=True
)
CHANGE_SOCIETIES = pa.DataFrameSchema(
    {
        "code": code(),
        "n0": group_size(),
        "diff": difference(),
        "diff_minus": spread(),
        "diff_plus": spread(),
        "n_cells": count(1),
    },
    unique=["code"],
    strict=True,
)
CHANGE_CELLS = pa.DataFrameSchema(
    {
        "n0": group_size(),
        "mean0": score(),
        "sd0": spread(),
        "n1": group_size(),
        "mean1": score(),
        "sd1": spread(),
        "diff": difference(),
        "diff_minus": spread(),
        "diff_plus": spread(),
    },
    checks=[_null_with("n0", "n1", "mean0", "mean1", "diff", "diff_minus", "diff_plus")],
    strict=True,
)
CHANGE_GLOBAL = pa.DataFrameSchema(
    {
        "n_societies": count(1),
        "mean0": score(),
        "mean1": score(),
        "diff": difference(),
        "diff_minus": spread(),
        "diff_plus": spread(),
    },
    strict=True,
)
CHANGE_BEHAVIORS = pa.DataFrameSchema(
    {
        "behavior": pa.Column(str),
        "n_societies": count(1),
        "mean": difference(),
        "mean_minus": spread(),
        "mean_plus": spread(),
        "sd": spread(),
        "increased": count(),
    },
    strict=True,
)
PLACES = pa.DataFrameSchema(
    {
        "code": code(),
        "name": pa.Column(str),
        "region": pa.Column(str, pa.Check.isin(["Africa", "Asia", "Latin America", "West"])),
        "lat": pa.Column(float, pa.Check.in_range(-90, 90)),
        "lon": pa.Column(float, pa.Check.in_range(-180, 180)),
    },
    unique=["code", "name"],
    strict=True,
)
MONTH = r"^\d{4}-(0[1-9]|1[0-2])$"
FACTS = pa.DataFrameSchema(
    {
        "code": code(),
        "n": group_size(),
        "student_share": percent(),
        "student_unknown": percent(),
        "first_month": pa.Column(str, pa.Check.str_matches(MONTH), nullable=True),
        "last_month": pa.Column(str, pa.Check.str_matches(MONTH), nullable=True),
        "languages": pa.Column(object, nullable=True),
    },
    checks=[
        _null_with("n", "student_share", "student_unknown"),
        pa.Check(
            lambda df: bool((df["first_month"].fillna("") <= df["last_month"].fillna("")).all()),
            error="first month not after last month",
        ),
    ],
    unique=["code"],
    strict=True,
)

Tables = dict[str, pa.DataFrameSchema]
CELL_FILES: Tables = {"societies": SOCIETY_OFFSETS, "cells": CELLS}
FILE_SCHEMAS: dict[str, Callable[[Doc], Tables]] = {
    "cells": lambda doc: CELL_FILES,
    "distributions": lambda doc: {"societies": CODES, "cells": DISTRIBUTIONS},
    "global": lambda doc: {"cells": GLOBAL},
    "similarity": lambda doc: {"pairs": PAIRS},
    "contexts": lambda doc: {
        "societies": CODES,
        "cells": CONTEXT_CELLS,
        "global": CONTEXT_GLOBAL,
        "by_gender": CONTEXT_GENDER,
    },
    "change": lambda doc: {
        "societies": CHANGE_SOCIETIES,
        "cells": CHANGE_CELLS,
        "global": CHANGE_GLOBAL,
        "behaviors": CHANGE_BEHAVIORS,
    },
    "societies": lambda doc: {
        "societies": PLACES,
        **{f"samples.{k}": FACTS for k in cast(Doc, doc["samples"])},
    },
}


class SchemaError(Exception):
    """A published table failed its schema. The message names checks, never values."""


def _table(doc: Doc, path: str) -> pd.DataFrame:
    node = doc
    for part in path.split("."):
        node = cast(Doc, node[part])
    return pd.DataFrame(node)


def validate(kind: str, doc: Doc) -> None:
    """Validate every table of a document of the given kind (the file name before '-')."""
    problems = []
    for path, schema in FILE_SCHEMAS[kind](doc).items():
        try:
            schema.validate(_table(doc, path), lazy=True)
        except pa.errors.SchemaErrors as err:
            cases = zip(err.failure_cases["column"], err.failure_cases["check"], strict=True)
            failed = sorted({f"{column}: {check}" for column, check in cases})
            problems.append(f"{kind}.{path}: " + "; ".join(failed))
    if problems:
        raise SchemaError("; ".join(problems))
