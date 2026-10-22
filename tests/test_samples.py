"""DR-2 and DR-3 on synthetic respondents: sample rules, recoding, keying and cross-checks."""

from pathlib import Path

import pytest
import synthetic
from synthetic import NA, SENTINEL, person

from pipeline import raw, samples
from pipeline.samples import Counts


@pytest.fixture
def raw_dir(tmp_path: Path) -> Path:
    return synthetic.write_all(tmp_path / "raw")


def test_dr3_sample_rules(raw_dir: Path) -> None:
    counts = samples.rebuild(raw_dir).counts
    # All data: everyone with at least one rating ("none" has only missing ratings).
    assert counts["all"] == Counts(respondents=7, societies=6, ratings=11)
    # Paper's sample: started at or before 2024-02-29 23:00 UTC, Kuwait excluded.
    assert counts["paper"] == Counts(respondents=3, societies=3, ratings=6)
    # Attention check: att_check_commit == 1, minus the ten excluded societies (here Namibia).
    assert counts["attention"] == Counts(respondents=5, societies=5, ratings=7)
    # Complete case: the paper's sample with gender and all nine Ind-Bind items present.
    assert counts["complete_case"] == Counts(respondents=1, societies=1, ratings=3)


def test_dr3_societies_are_keyed_on_code(raw_dir: Path) -> None:
    societies = samples.rebuild(raw_dir).societies.set_index("code")
    assert list(societies.index) == ["DEU", "KWT", "NAM", "TTO", "USA", "XKX"]
    # Namibia and Kosovo both have iso2 "NA" in the file; neither is lost or merged.
    assert societies.loc["NAM", "country"] == "Namibia"
    assert societies.loc["XKX", "country"] == "Kosovo"
    assert societies.loc["TTO", "country"] == "Caribbean"
    # Kuwait is out of the paper's sample but stays in the attention-check sample.
    assert (societies.at["KWT", "n_paper"], societies.at["KWT", "n_attention"]) == (0, 1)
    assert (societies.at["NAM", "n_all"], societies.at["NAM", "n_attention"]) == (1, 0)


def test_dr2_ratings_are_recoded_to_the_paper_scale(raw_dir: Path) -> None:
    con = raw.connect()
    raw.load_situations(con, raw_dir)
    values = con.execute(
        "SELECT rating FROM ratings WHERE rid = ? ORDER BY rating", [synthetic.rid("cut")]
    ).fetchall()
    assert [v for (v,) in values] == [-2.5, 0.5, 2.5]


def test_dr3_cross_checks_match(raw_dir: Path) -> None:
    checks = samples.rebuild(raw_dir).cross_checks
    assert [(x.shared, x.only_pipeline, x.only_file, x.ok) for x in checks] == [
        (1, 0, 0, True),
        (5, 0, 0, True),
    ]


def test_dr3_cross_checks_count_differences(raw_dir: Path) -> None:
    ids = [*synthetic.ATTENTION_IDS[:-1], synthetic.rid("stranger")]
    synthetic.write_id_list(raw_dir, raw.ATTENTION_LIST, ids)
    attention = samples.rebuild(raw_dir).cross_checks[1]
    assert (attention.shared, attention.only_pipeline, attention.only_file) == (4, 1, 1)
    assert not attention.ok


def test_dr3_report_fails_on_counts_that_differ_from_the_paper(
    raw_dir: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    assert samples.report(samples.rebuild(raw_dir)) is False
    out = capsys.readouterr().out
    assert "MISMATCH (expected 25,422 / 90 / 833,930)" in out
    assert SENTINEL not in out  # DR-16: counts only, never respondent IDs


def test_dr3_cli_stops_when_the_raw_files_are_not_the_pinned_ones(
    raw_dir: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    assert samples.main(raw_dir) == 1
    assert "FAIL" in capsys.readouterr().err


def test_dr3_mis_keyed_society_codes_stop_the_run(tmp_path: Path) -> None:
    people = (person("x", "NAM", "Nambia", "Africa", "2023-10-01T09:00:00Z"),)
    synthetic.write_situations(tmp_path, people)
    synthetic.write_id_list(tmp_path, raw.PREREG_LIST, [])
    synthetic.write_id_list(tmp_path, raw.ATTENTION_LIST, [])
    with pytest.raises(raw.RawDataError, match="society code NAM is 'Nambia'"):
        samples.rebuild(tmp_path)


def test_dr16_schema_failures_report_counts_not_values(tmp_path: Path) -> None:
    people = (
        person("a", "USA", "United States", "West", "2023-10-01T09:00:00Z", ratings=("7", NA)),
        person("b", "USA", "United States", "West", f"{SENTINEL}-time"),
    )
    synthetic.write_situations(tmp_path, people)
    with pytest.raises(raw.RawDataError) as caught:
        raw.load_situations(raw.connect(), tmp_path)
    message = str(caught.value)
    assert "1 ratings outside 1-6" in message
    assert "1 unparseable start times" in message
    assert SENTINEL not in message


def test_dr16_duckdb_errors_are_scrubbed(tmp_path: Path) -> None:
    synthetic.write_situations(tmp_path)
    with (tmp_path / raw.SITUATIONS).open("a") as f:
        f.write(f'"{SENTINEL}-unterminated,quote\n')
    with pytest.raises(raw.RawDataError) as caught:
        raw.load_situations(raw.connect(), tmp_path)
    assert SENTINEL not in str(caught.value)


def test_dr16_scrub_keeps_only_the_first_line_and_masks_quotes() -> None:
    message = (
        "Conversion Error: could not convert string 'R_secret' to DOUBLE\n"
        "Original Line: R_secret,2023-07-14T00:00:00Z,Somewhere_City"
    )
    assert raw.scrub(message) == "Conversion Error: could not convert string '…' to DOUBLE"


def write_contexts(raw_dir: Path, rows: list[tuple[str, str, str]]) -> None:
    lines = ["ResponseId,country,behavior,context,rating"]
    lines += [f"{synthetic.rid('c')},Chile,{b},{c},{r}" for b, c, r in rows]
    (raw_dir / raw.CONTEXTS).write_text("\n".join(lines) + "\n")


def test_dr2_contexts_are_recoded(tmp_path: Path) -> None:
    write_contexts(tmp_path, [("argue", "alone", "1"), ("eat", "man", "6"), ("sing", "woman", NA)])
    con = raw.connect()
    raw.load_contexts(con, tmp_path)
    values = con.execute("SELECT rating FROM context_ratings ORDER BY rating").fetchall()
    assert [v for (v,) in values] == [-2.5, 2.5]


def test_dr2_contexts_reject_unknown_contexts(tmp_path: Path) -> None:
    write_contexts(tmp_path, [("argue", "boss", "3")])
    with pytest.raises(raw.RawDataError, match="1 unknown context IDs"):
        raw.load_contexts(raw.connect(), tmp_path)


def write_gelfand(raw_dir: Path, ratings: list[str]) -> None:
    lines = ["country,ResponseId,age,woman,rating,behavior,situation,time"]
    lines += [f"Japan,{i},30,1,{r},eat,party,0" for i, r in enumerate(ratings, start=1)]
    (raw_dir / raw.GELFAND).write_text("\n".join(lines) + "\n")


def test_dr2_gelfand_ratings_are_used_as_stored(tmp_path: Path) -> None:
    write_gelfand(tmp_path, ["-2.5", "0.5", "2.5"])
    con = raw.connect()
    raw.load_gelfand(con, tmp_path)
    values = con.execute("SELECT rating FROM gelfand_ratings ORDER BY rating").fetchall()
    assert [v for (v,) in values] == [-2.5, 0.5, 2.5]


def test_dr2_gelfand_rejects_unrecoded_ratings(tmp_path: Path) -> None:
    write_gelfand(tmp_path, ["3", "6"])
    with pytest.raises(raw.RawDataError, match="2 ratings off the recoded scale"):
        raw.load_gelfand(raw.connect(), tmp_path)
