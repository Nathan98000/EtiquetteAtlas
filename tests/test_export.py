"""§4.6, HR-4 and NFR-50: rounding, encoding and schema checks of published documents."""

import json

import numpy as np
import pytest

from pipeline import cells, export, schemas


def test_nfr50_numbers_round_and_blank_consistently() -> None:
    values = np.array([0.125, -0.004, np.nan, 1.0 / 3, -2.5, np.inf])
    assert export.numbers(values) == [0.12, 0.0, None, 0.33, -2.5, None]
    assert str(export.numbers(np.array([-0.001]))[0]) == "0.0"  # never "-0.0"
    keep = np.array([True, False, True, True, True, True])
    assert export.numbers(values, keep)[1] is None


def test_dr9_integers_and_percents_are_blanked_where_not_kept() -> None:
    n = np.array([5, 12, 40])
    keep = n >= cells.MIN_N
    assert export.integers(n, keep) == [None, 12, 40]
    assert export.percents(np.array([0.555, 0.5, np.nan])) == [56, 50, None]


def test_intervals_are_offsets_from_the_estimate() -> None:
    minus, plus = export.offsets(
        np.array([0.5, 0.5]), np.array([0.2, 0.6]), np.array([0.9, 0.7]), np.ones(2, bool)
    )
    assert (minus, plus) == ([0.3, 0.0], [0.4, 0.2])  # a bound above the estimate gives 0


def test_nfr50_encoding_sorts_keys_and_refuses_nan() -> None:
    assert export.encode({"b": [1, None], "a": "–"}) == '{"a":"–","b":[1,null]}\n'.encode()
    with pytest.raises(ValueError, match="Out of range float"):
        export.encode({"x": float("nan")})


def cells_doc(**overrides: list[object]) -> dict[str, object]:
    table: dict[str, list[object]] = {
        "n": [40, 12, None, None],
        "mean": [0.5, -1.0, None, None],
        "mean_minus": [0.2, 0.4, None, None],
        "mean_plus": [0.2, 0.3, None, None],
        "shrunk": [0.45, -0.8, None, None],
        "shrunk_pm": [0.2, 0.3, None, None],
        "share": [60, 20, None, None],
        "status": [cells.OK, cells.SMALL, cells.TOO_FEW, cells.NOT_ASKED],
        "notable": [1, 0, None, None],
    }
    table.update(overrides)
    return {
        "sample": "all",
        "societies": {"code": ["AAA"], "offset": [0.1], "offset_shrunk": [0.05]},
        "cells": table,
    }


def test_section_4_6_a_valid_cells_document_passes_its_schema() -> None:
    schemas.validate("cells", cells_doc())


@pytest.mark.parametrize(
    ("override", "message"),
    [
        ({"n": [40, 9, None, None]}, "n: greater_than_or_equal_to(10)"),
        ({"mean": [0.5, -3.0, None, None]}, "mean: in_range(-2.5, 2.5)"),
        ({"share": [60, 20, 5, None]}, "null exactly where n is null"),
        ({"status": [cells.OK, cells.TOO_FEW, cells.TOO_FEW, cells.NOT_ASKED]}, "too-few"),
        ({"mean_minus": [-0.1, 0.4, None, None]}, "mean_minus: in_range(0.0, 5.0)"),
    ],
)
def test_section_4_6_schema_failures_name_the_check_not_the_value(
    override: dict[str, list[object]], message: str
) -> None:
    with pytest.raises(schemas.SchemaError, match=r"cells\.cells") as caught:
        schemas.validate("cells", cells_doc(**override))
    assert message in str(caught.value)
    assert "-3.0" not in str(caught.value)


def test_section_4_6_unexpected_columns_fail() -> None:
    with pytest.raises(schemas.SchemaError):
        schemas.validate("cells", cells_doc(extra=[1, 2, 3, 4]))


def test_dr4_distributions_must_add_up_to_n() -> None:
    doc = {
        "societies": {"code": ["AAA"]},
        "cells": {"n": [12], "sd": [1.0], **{f"c{k}": [2] for k in range(1, 7)}},
    }
    schemas.validate("distributions", doc)
    doc["cells"]["c6"] = [3]  # type: ignore[index]
    with pytest.raises(schemas.SchemaError, match="add up to n"):
        schemas.validate("distributions", doc)


def test_dr16_documents_have_no_forbidden_fields() -> None:
    names = json.dumps(cells_doc())
    assert all(f not in names.lower() for f in ("responseid", "startdate", '"site"', '"age"'))
