"""The full build against the real OSF files (skipped without them). Assertions compare counts
and published aggregates only, never respondent rows (DR-16)."""

from pathlib import Path

import pytest

from pipeline import build, cells, paths, reference, validate

pytestmark = pytest.mark.needs_raw


@pytest.fixture(scope="module")
def outputs(raw_dir: Path) -> dict[str, build.SampleOutputs]:
    con = build.load(raw_dir)
    # Counts and point estimates do not depend on the number of replicates.
    result = {key: build.estimate_sample(con, key, replicates=20) for key in ("all", "paper")}
    con.close()
    return result


def test_section_4_6_society_cells_under_all_data(outputs: dict[str, build.SampleOutputs]) -> None:
    n = outputs["all"].stats.n
    status = outputs["all"].status
    assert int((n > 0).sum()) == 13_468
    assert int(((n > 0) & (n < 10)).sum()) == 376  # DR-9
    assert int((status == cells.NOT_ASKED).sum()) == 30  # Kuwait 20, Saudi Arabia 10
    assert n.shape == (90, 150)


def test_section_4_6_context_rows(outputs: dict[str, build.SampleOutputs]) -> None:
    assert int((outputs["all"].contexts.societies.n > 0).sum()) == 6_735


def test_section_4_6_change_rows(outputs: dict[str, build.SampleOutputs]) -> None:
    for key, rows, societies in (("all", 3_119, 26), ("paper", 2_639, 22)):
        ch = outputs[key].change
        assert int(((ch.n0 > 0) & (ch.n1 > 0)).sum()) == rows, key
        assert len(ch.societies) == societies, key


def test_nfr51_the_papers_published_values_reproduce(
    outputs: dict[str, build.SampleOutputs],
) -> None:
    paper = outputs["paper"]
    pub = reference.load_published()
    assert validate.published_values(paper.stats, paper.change, pub) == []


def test_decision8_only_kuwait_and_saudi_arabia_have_not_asked_cells(
    outputs: dict[str, build.SampleOutputs],
) -> None:
    o = outputs["all"]
    assert validate.not_asked(o.status, o.societies, 10, "cells") == []
    assert validate.not_asked(o.contexts.status, o.societies, 5, "contexts") == []


def test_decision7_similarity_omits_societies_without_120_publishable_cells(
    outputs: dict[str, build.SampleOutputs],
) -> None:
    listed = sum(1 for m in outputs["all"].matches if m)
    assert listed == 87  # all but Mongolia, Namibia and Ethiopia


def test_nfr50_at8_a_build_reproduces_the_committed_outputs(raw_dir: Path, tmp_path: Path) -> None:
    build.run(raw_dir, tmp_path)
    committed = sorted(p.name for p in paths.DERIVED_DIR.iterdir() if p.suffix == ".json")
    assert sorted(p.name for p in tmp_path.iterdir()) == committed
    changed = [
        n for n in committed if (tmp_path / n).read_bytes() != (paths.DERIVED_DIR / n).read_bytes()
    ]
    assert changed == []
