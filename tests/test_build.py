"""End to end on a synthetic population: outputs, privacy gate, determinism (§4.6, NFR-50)."""

import json
from pathlib import Path

import pytest
import synthetic
from synthetic import SENTINEL

from pipeline import build, cli, export, privacy

EXPECTED = {
    "manifest.json",
    "societies.json",
    *(f"{kind}-{s}.json" for kind in ("cells", "distributions", "global", "similarity",
                                      "contexts", "change") for s in ("all", "paper", "attention")),
}  # fmt: skip


@pytest.fixture(scope="module")
def raw_dir(tmp_path_factory: pytest.TempPathFactory) -> Path:
    return synthetic.write_population(tmp_path_factory.mktemp("raw"))


def run(raw_dir: Path, out: Path) -> None:
    build.run(raw_dir, out, replicates=40, checks=False)


@pytest.fixture(scope="module")
def built(raw_dir: Path, tmp_path_factory: pytest.TempPathFactory) -> Path:
    out = tmp_path_factory.mktemp("derived")
    (out / "README.md").write_text("kept\n")
    (out / "stale.json").write_text("{}\n")
    run(raw_dir, out)
    return out


def load(out: Path, name: str) -> dict[str, object]:
    doc: dict[str, object] = json.loads((out / name).read_text())
    return doc


def test_section_4_6_every_output_is_written_and_stale_files_go(built: Path) -> None:
    assert {p.name for p in built.iterdir()} == EXPECTED | {"README.md"}
    assert (built / "README.md").read_text() == "kept\n"


def test_dr9_dr16_outputs_pass_the_privacy_scan_and_hold_no_ids(built: Path) -> None:
    findings, checked = privacy.scan([built])
    assert (findings, checked) == ([], len(EXPECTED) + 1)
    for path in built.iterdir():
        assert SENTINEL not in path.read_text(), path.name


def test_nfr50_a_second_build_is_byte_identical(raw_dir: Path, built: Path, tmp_path: Path) -> None:
    run(raw_dir, tmp_path)
    for name in EXPECTED:
        assert (tmp_path / name).read_bytes() == (built / name).read_bytes(), name


def test_dr9_small_cells_are_suppressed_and_flagged(built: Path) -> None:
    cells = load(built, "cells-all.json")
    table = cells["cells"]
    societies = cells["societies"]["code"]  # type: ignore[index]
    assert societies == ["CHL", "JPN", "KWT"]
    kwt = slice(2 * 150, 3 * 150)
    status = table["status"][kwt]  # type: ignore[index]
    assert status.count(3) == 20  # kiss and flirt not asked (decision 8)
    assert set(status) - {3} == {1}  # 14 respondents: small sample (DR-9)
    assert table["n"][kwt].count(None) == 20  # type: ignore[index]


def test_dr12_contexts_exclude_ids_only_in_the_contexts_file(built: Path) -> None:
    contexts = load(built, "contexts-all.json")
    chile_argue_alone = contexts["cells"]["n"][0]  # type: ignore[index]
    assert chile_argue_alone == 30  # the contexts-only respondent is in no sample


def test_dr13_change_covers_only_overlapping_societies(built: Path) -> None:
    change = load(built, "change-all.json")
    assert change["societies"]["code"] == ["CHL", "JPN"]  # type: ignore[index]
    assert change["societies"]["n0"] == [15, 12]  # type: ignore[index]
    japan_laugh_party = 120 + 1 * 10 + 9
    assert change["cells"]["diff"][japan_laugh_party] is None  # type: ignore[index]
    assert change["source"] == export.CHANGE_SOURCE


def test_dr15_metadata_and_manifest(built: Path) -> None:
    societies = load(built, "societies.json")
    assert societies["societies"]["name"] == ["Chile", "Japan", "Kuwait"]  # type: ignore[index]
    paper = societies["samples"]["paper"]  # type: ignore[index]
    assert paper["n"] == [30, 24, None]  # Kuwait is outside the paper's sample
    manifest = load(built, "manifest.json")
    assert manifest["replicates"] == 40
    assert len(manifest["build_date"]) == 10  # type: ignore[arg-type]


def test_dr9_a_privacy_failure_writes_nothing(
    raw_dir: Path, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    (tmp_path / "keep.json").write_text("{}\n")
    original = export.similar

    def leaky(*args: object) -> dict[str, object]:
        doc = original(*args)  # type: ignore[arg-type]
        doc["site"] = "Somewhere_City"
        return doc

    monkeypatch.setattr(export, "similar", leaky)
    with pytest.raises(build.BuildError, match="privacy scan"):
        run(raw_dir, tmp_path)
    assert [p.name for p in tmp_path.iterdir()] == ["keep.json"]


def test_fr72_build_date_honours_source_date_epoch(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("SOURCE_DATE_EPOCH", "1761091200")
    assert build.build_date() == "2025-10-22"


def test_dr1_the_cli_build_stops_without_the_pinned_files(
    tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    out = tmp_path / "out"
    assert cli.main(["build", "--raw-dir", str(tmp_path), "--out", str(out)]) == 1
    assert "FAIL" in capsys.readouterr().err
    assert not out.exists()
