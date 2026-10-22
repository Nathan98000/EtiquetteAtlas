"""DR-15 and NFR-51: the hand-reviewed reference files load and check consistently."""

from pathlib import Path

import pytest

from pipeline import raw, reference


def test_dr15_every_society_has_a_unique_display_name() -> None:
    ref = reference.load_reference()
    assert len(ref.societies) == 90
    assert ref.societies["CHN"].name == "Mainland China"  # the authors' relabels (SRS §4.4)
    assert ref.societies["SOM"].name == "Somaliland"
    assert ref.societies["TTO"].country == "Caribbean"
    assert ref.societies["NAM"].country == "Namibia"


def test_dr15_kosovo_gets_hand_added_coordinates() -> None:
    xkx = reference.load_reference().coordinates["XKX"]
    assert (41.8 < xkx.lat < 43.3, 20.0 < xkx.lon < 21.8) == (True, True)


def test_dr15_language_variants_share_a_name() -> None:
    ref = reference.load_reference()
    assert ref.language("EN") == ref.language("EN-GB") == "English"
    assert ref.language("PT") == ref.language("PT-BR") == "Portuguese"
    with pytest.raises(reference.ReferenceDataError, match="'XX' has no name"):
        ref.language("XX")


def test_dr15_check_societies_reports_missing_mismatched_and_extra_codes() -> None:
    ref = reference.load_reference()
    found = {c: s.country for c, s in ref.societies.items()}
    assert ref.check_societies(found) == []
    found["CHN"] = "China (PRC)"
    found["ZZZ"] = "Atlantis"
    del found["USA"]
    assert ref.check_societies(found) == [
        "ZZZ is in the GSN files but not in societies.toml",
        "CHN: societies.toml says 'China', the GSN files say 'China (PRC)'",
        "USA is in societies.toml but not in the GSN files",
    ]
    assert len(ref.check_societies(found, complete=False)) == 2


def test_dr15_duplicate_display_names_are_rejected(tmp_path: Path) -> None:
    path = tmp_path / "societies.toml"
    path.write_text(
        '[societies]\nAAA = { country = "A", name = "Same" }\n'
        'BBB = { country = "B", name = "Same" }\n[languages]\n'
    )
    with pytest.raises(reference.ReferenceDataError, match="share a display name"):
        reference.load_reference(path)


def test_nfr51_table1_covers_the_twelve_overlapping_behaviors() -> None:
    published = reference.load_published()
    behaviors = [row.behavior for row in published.table1]
    assert sorted(behaviors) == sorted(raw.BEHAVIORS[:12])
    # Every printed percentage is a whole number of the 22 societies.
    for row in published.table1:
        count = round(row.increased * published.table1_societies / 100)
        assert round(100 * count / published.table1_societies, 1) == row.increased
