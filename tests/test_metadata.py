"""DR-15: society names, places and per-sample facts from synthetic respondents."""

from pathlib import Path

import duckdb
import pytest
import synthetic
from synthetic import NA, person

from pipeline import metadata, raw, reference, samples


def load(raw_dir: Path, people: tuple[synthetic.Person, ...]) -> duckdb.DuckDBPyConnection:
    synthetic.write_situations(raw_dir, people)
    con = raw.connect()
    raw.load_situations(con, raw_dir)
    samples.add_membership(con)
    return con


def chileans(n: int, start: str, **kw: object) -> list[synthetic.Person]:
    return [person(f"{start}-{i}", "CHL", "Chile", "Latin America", start, **kw) for i in range(n)]


def test_dr15_places_use_reviewed_names_and_kosovo_coordinates(tmp_path: Path) -> None:
    con = load(tmp_path, synthetic.PEOPLE)
    places = {p.code: p for p in metadata.places(con, reference.load_reference())}
    assert sorted(places) == ["DEU", "KWT", "NAM", "TTO", "USA", "XKX"]
    assert (places["XKX"].lat, places["XKX"].lon) == (42.6, 20.9)
    assert places["TTO"].name == "Caribbean"
    assert places["DEU"].region == "West"


def test_dr15_a_society_without_a_position_or_name_stops_the_build(tmp_path: Path) -> None:
    ref = reference.load_reference()
    con = load(tmp_path, synthetic.PEOPLE)
    no_kosovo = reference.Reference(ref.societies, {}, ref.languages)
    with pytest.raises(reference.ReferenceDataError, match="XKX has no map position"):
        metadata.places(con, no_kosovo)
    no_names = reference.Reference({}, ref.coordinates, ref.languages)
    with pytest.raises(reference.ReferenceDataError, match="no display name"):
        metadata.places(con, no_names)


def test_decision17_fieldwork_months_need_ten_starters(tmp_path: Path) -> None:
    people = (
        chileans(3, "2023-09-30T10:00:00Z")  # too few to name September
        + chileans(10, "2023-10-02T10:00:00Z")
        + chileans(12, "2023-12-15T10:00:00Z")
        + chileans(9, "2024-01-05T10:00:00Z")  # too few to name January
    )
    con = load(tmp_path, tuple(people))
    facts = metadata.facts(con, "all", ["CHL"], reference.load_reference())["CHL"]
    assert (facts.first_month, facts.last_month) == ("2023-10", "2023-12")
    assert facts.respondents == 34


def test_decision10_languages_merge_variants_before_the_ten_respondent_rule(
    tmp_path: Path,
) -> None:
    start = "2023-10-02T10:00:00Z"
    people = []
    for language, n in (("EN", 6), ("EN-GB", 5), ("ES", 20), ("DE", 9)):
        people += [
            person(f"{language}{i}", "CHL", "Chile", "Latin America", start, language=language)
            for i in range(n)
        ]
    con = load(tmp_path, tuple(people))
    facts = metadata.facts(con, "all", ["CHL"], reference.load_reference())["CHL"]
    assert facts.languages == ("Spanish", "English")  # 20, then 6 + 5; German's 9 left out


def test_decision11_student_shares_are_as_stored(tmp_path: Path) -> None:
    start = "2023-10-02T10:00:00Z"

    def chilean(name: str, student: str) -> synthetic.Person:
        return person(name, "CHL", "Chile", "Latin America", start, student=student)

    people = [chilean(f"s{i}", "yes") for i in range(6)]
    people += [chilean(f"n{i}", "no") for i in range(3)] + [chilean("u", NA)]
    con = load(tmp_path, tuple(people))
    facts = metadata.facts(con, "all", ["CHL"], reference.load_reference())["CHL"]
    assert (facts.student_share, facts.student_unknown) == (0.6, 0.1)
