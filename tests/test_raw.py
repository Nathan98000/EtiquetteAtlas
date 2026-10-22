"""The main-file loader's respondent and society fields (DR-15) and their schema checks."""

from pathlib import Path

import duckdb
import pytest
import synthetic
from synthetic import NA, person

from pipeline import raw


def load(raw_dir: Path) -> duckdb.DuckDBPyConnection:
    con = raw.connect()
    raw.load_situations(con, raw_dir)
    return con


def test_dr15_respondents_carry_gender_student_status_and_language(tmp_path: Path) -> None:
    people = (
        person("a", "USA", "United States", "West", "2023-10-01T09:00:00Z", language="ES"),
        person("b", "USA", "United States", "West", "2023-10-01T09:00:00Z", student=NA),
        person("c", "USA", "United States", "West", "2023-10-01T09:00:00Z", gender="Man"),
    )
    synthetic.write_situations(tmp_path, people)
    sql = """
        SELECT count(*) FILTER (WHERE gender = 'Woman'), count(*) FILTER (WHERE gender = 'Man'),
               count(*) FILTER (WHERE student = 'yes'), count(*) FILTER (WHERE student IS NULL),
               count(*) FILTER (WHERE language = 'ES')
        FROM respondents"""
    rows = load(tmp_path).execute(sql).fetchall()
    assert rows == [(2, 1, 2, 1, 1)]


def test_dr15_places_hold_one_position_per_society_and_none_for_kosovo(tmp_path: Path) -> None:
    synthetic.write_situations(tmp_path)
    con = load(tmp_path)
    ((societies, located),) = con.execute(
        "SELECT count(*), count(lat) FROM places WHERE lat IS NULL = (lon IS NULL)"
    ).fetchall()
    assert (societies, located) == (6, 5)
    ((xkx,),) = con.execute("SELECT lat FROM places WHERE code = 'XKX'").fetchall()
    assert xkx is None


def test_dr15_varying_coordinates_and_unknown_genders_stop_the_run(tmp_path: Path) -> None:
    people = (
        person("a", "USA", "United States", "West", "2023-10-01T09:00:00Z", gender="Robot"),
        person("b", "USA", "United States", "West", "2023-10-01T09:00:00Z", student="maybe"),
    )
    synthetic.write_situations(tmp_path, people)
    rows = (tmp_path / raw.SITUATIONS).read_text().splitlines()
    rows[-1] = ",".join([*rows[-1].split(",")[:-2], "10", "10"])
    (tmp_path / raw.SITUATIONS).write_text("\n".join(rows) + "\n")
    with pytest.raises(raw.RawDataError) as caught:
        load(tmp_path)
    message = str(caught.value)
    assert "1 genders other than Woman, Man or Other" in message
    assert "1 student values other than yes or no" in message
    assert "1 societies whose coordinates vary between rows" in message
