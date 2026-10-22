"""DR-14: most similar societies by correlated fingerprints."""

import numpy as np
import pytest

from pipeline import similarity


def test_dr14_societies_are_ranked_by_descending_correlation() -> None:
    rng = np.random.default_rng(0)
    base = rng.normal(size=150)
    noise = rng.normal(size=(4, 150))
    fingerprints = np.vstack([base, base + 0.1 * noise[0], base + 1.0 * noise[1], -base])
    usable = np.ones_like(fingerprints, dtype=bool)
    ranked = similarity.most_similar(fingerprints, usable, top=3)
    assert [m.other for m in ranked[0]] == [1, 2, 3]
    assert ranked[0][0].r == pytest.approx(similarity.pearson(base, fingerprints[1]))
    assert ranked[0][-1].r == pytest.approx(-1.0)
    assert {m.shared for m in ranked[0]} == {150}


def test_dr14_pairs_need_at_least_120_shared_publishable_cells() -> None:
    rng = np.random.default_rng(1)
    fingerprints = rng.normal(size=(3, 150))
    usable = np.ones((3, 150), dtype=bool)
    usable[2, :31] = False  # society 2 can publish only 119 cells
    ranked = similarity.most_similar(fingerprints, usable)
    assert [m.other for m in ranked[0]] == [1]
    assert ranked[2] == []
    usable[2, 30] = True  # 120 is enough
    assert len(similarity.most_similar(fingerprints, usable)[2]) == 2


def test_dr14_ties_go_to_the_lower_index_and_constant_profiles_are_skipped() -> None:
    a = np.arange(150, dtype=float)
    fingerprints = np.vstack([a, a * 2, a * 3, np.zeros(150)])
    ranked = similarity.most_similar(fingerprints, np.ones((4, 150), dtype=bool))
    assert [m.other for m in ranked[0]] == [1, 2]
    assert ranked[3] == []
