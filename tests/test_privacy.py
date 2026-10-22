"""DR-9 and DR-16: the privacy gate on small synthetic outputs."""

import json
from pathlib import Path

import pytest

from pipeline import cli, paths, privacy
from pipeline.privacy import Finding

# Built at runtime so no ID-shaped literal sits in the repository.
FAKE_ID = "R_" + "Synthetic0000ID"


def scan_json(tmp_path: Path, doc: object) -> list[Finding]:
    path = tmp_path / "out.json"
    path.write_text(json.dumps(doc))
    return privacy.scan_file(path, "out.json")


def problems(findings: list[Finding]) -> set[tuple[str, str]]:
    return {(f.field, f.problem) for f in findings}


FORBIDDEN = "forbidden field (DR-16)"
SMALL = "count below 10 (DR-9)"
UNCOVERED = "response count without a group size of at least 10 in the same row (DR-9)"


def test_dr9_clean_records_and_columnar_tables_pass(tmp_path: Path) -> None:
    records = [
        {"code": "CHL", "behavior": "kiss", "situation": "funeral", "n": 54, "mean": -1.2,
         "c1": 20, "c2": 9, "c3": 0, "c4": 3, "c5": 2, "c6": 20, "small_sample": False},
        {"code": "MNG", "behavior": "kiss", "situation": "funeral", "n": None, "mean": None,
         "c1": None, "c2": None, "c3": None, "c4": None, "c5": None, "c6": None},
    ]  # fmt: skip
    columnar = {
        "meta": {"sample": "all", "built": "2026-10-22", "n_societies": 3},
        "columns": {"code": ["CHL", "MNG"], "n": [54, None], "c6": [1, None]},
    }
    assert scan_json(tmp_path, records) == []
    assert scan_json(tmp_path, columnar) == []


@pytest.mark.parametrize(
    "name",
    [
        "ResponseId", "responseId", "Response_ID", "response-id", "STARTDATE", "EndDate",
        "Duration__in_seconds_", "Duration", "progress", "belief_god_orig", "site", "Site",
        "country_carib", "age", "Age", "age_sc",
    ],
)  # fmt: skip
def test_dr16_forbidden_fields_fail_wherever_they_appear(tmp_path: Path, name: str) -> None:
    assert problems(scan_json(tmp_path, [{name: "x"}])) == {(f"$[*].{name}", FORBIDDEN)}
    assert (f"$.a.b.{name}", FORBIDDEN) in problems(scan_json(tmp_path, {"a": {"b": {name: 1}}}))
    assert (f"$.{name}", FORBIDDEN) in problems(scan_json(tmp_path, {name: [1, 2]}))
    csv_file = tmp_path / "out.csv"
    csv_file.write_text(f"code,{name}\nCHL,1\n")
    assert (name, FORBIDDEN) in problems(privacy.scan_file(csv_file, "out.csv"))


@pytest.mark.parametrize("name", ["mean_age", "age_band", "website", "stage", "n_sites", "agency"])
def test_dr16_look_alike_names_are_allowed(tmp_path: Path, name: str) -> None:
    assert scan_json(tmp_path, [{name: 25}]) == []


@pytest.mark.parametrize(
    "name", ["n", "N", "n_respondents", "respondents", "n0", "wave0_n", "count", "n_ratings"]
)
@pytest.mark.parametrize(
    ("value", "problem"),
    [(9, SMALL), (0, SMALL), (9.5, SMALL), (True, "count is not a number"),
     ("54", "count is not a number"), (10, None), (217, None), (None, None)],
)  # fmt: skip
def test_dr9_group_sizes_must_be_null_or_at_least_10(
    tmp_path: Path, name: str, value: object, problem: str | None
) -> None:
    expected = {(f"$[*].{name}", problem)} if problem else set()
    assert problems(scan_json(tmp_path, [{name: value}])) == expected


def test_dr9_counts_of_things_other_than_people_are_exempt(tmp_path: Path) -> None:
    assert scan_json(tmp_path, [{"n_societies": 3, "n_cells": 4}]) == []


def test_dr9_every_number_under_a_count_key_is_a_group_size(tmp_path: Path) -> None:
    doc = {"code": "DZA", "respondents": {"all": 55, "paper": 0, "attention": None}}
    assert problems(scan_json(tmp_path, doc)) == {("$.respondents.paper", SMALL)}


@pytest.mark.parametrize(
    ("row", "expected"),
    [
        ({"n": 54, "c1": 2}, set()),
        ({"n": 9, "c1": 2}, {("$[*].n", SMALL), ("$[*].c1", UNCOVERED)}),
        ({"n": None, "c1": 2}, {("$[*].c1", UNCOVERED)}),
        ({"c1": 2}, {("$[*].c1", UNCOVERED)}),
        ({"n": None, "c1": None}, set()),
        ({"n_respondents": 40, "count_6": 1}, set()),
    ],
)
def test_dr9_response_counts_need_a_group_size_of_10_in_the_same_row(
    tmp_path: Path, row: dict[str, object], expected: set[tuple[str, str]]
) -> None:
    assert problems(scan_json(tmp_path, [row])) == expected


def test_dr9_columnar_rows_are_checked_together(tmp_path: Path) -> None:
    doc = {"n": [54, 9], "c1": [2, 2]}
    assert problems(scan_json(tmp_path, doc)) == {("$.n[*]", SMALL), ("$.c1[*]", UNCOVERED)}


def test_dr9_csv_rows(tmp_path: Path) -> None:
    path = tmp_path / "cells.csv"
    path.write_text("code,n,c1,mean\nCHL,54,2,0.5\nMNG,,,\nNAM,7,1,0.1\n")
    assert problems(privacy.scan_file(path, "cells.csv")) == {("n", SMALL), ("c1", UNCOVERED)}


def test_dr16_identifier_and_timestamp_shaped_values_fail(tmp_path: Path) -> None:
    doc = {
        "a": FAKE_ID,
        FAKE_ID: 1,
        "when": "2001-02-03T04:05:06Z",
        "rows": [{"note": f"see {FAKE_ID}"}],
        "date_only": "2024-03-01",
    }
    found = problems(scan_json(tmp_path, doc))
    assert found == {
        ("$.a", "value shaped like a respondent ID (DR-16)"),
        (f"$.{FAKE_ID}", "value shaped like a respondent ID (DR-16)"),
        ("$.when", "timestamp with seconds; publish dates only (DR-16)"),
        ("$.rows[*].note", "value shaped like a respondent ID (DR-16)"),
    }
    notes = tmp_path / "notes.md"
    notes.write_text(f"Leaked {FAKE_ID}\n")
    assert len(privacy.scan_file(notes)) == 1


def test_dr16_reports_never_include_the_offending_values(
    tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    (tmp_path / "x.json").write_text(json.dumps([{"n": 3.14159, "label": FAKE_ID}]))
    assert privacy.main([tmp_path]) == 1
    err = capsys.readouterr().err
    assert "count below 10" in err
    assert "3.14159" not in err
    assert FAKE_ID not in err


def test_unsupported_unreadable_and_missing_paths_fail(tmp_path: Path) -> None:
    (tmp_path / "cells.parquet").write_bytes(b"PAR1")
    (tmp_path / "broken.json").write_text("{")
    (tmp_path / ".gitkeep").write_text("")
    (tmp_path / ".DS_Store").write_bytes(b"\0\1")
    findings, checked = privacy.scan([tmp_path, tmp_path / "missing"])
    assert checked == 2
    assert {f.problem for f in findings} == {
        "unsupported file type; derived data must be JSON or CSV",
        "unreadable: JSONDecodeError",
        "path not found",
    }


def test_cli_exit_codes(tmp_path: Path) -> None:
    assert cli.main(["privacy-scan", str(tmp_path)]) == 0
    (tmp_path / "bad.json").write_text(json.dumps({"site": "x"}))
    assert cli.main(["privacy-scan", str(tmp_path)]) == 1


def test_committed_derived_outputs_pass() -> None:
    assert privacy.main([paths.DERIVED_DIR]) == 0
