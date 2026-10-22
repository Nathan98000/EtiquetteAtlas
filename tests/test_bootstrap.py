"""DR-5 and NFR-50: the respondent bootstrap on synthetic ratings with known answers."""

import numpy as np
import pytest
import synthetic

from pipeline import bootstrap, cells


def test_dr5_weights_resample_every_respondent_slot() -> None:
    w = bootstrap.weights(7, 500, bootstrap.generator("test"))
    assert w.shape == (500, 7)
    assert set(w.sum(axis=1).tolist()) == {7.0}
    assert np.array_equal(w, np.round(w))
    assert 0.3 < (w == 0).mean() < 0.4  # about (1 − 1/7)^7 of slots are not drawn


def test_nfr50_draws_depend_only_on_the_seed_and_key() -> None:
    a = bootstrap.weights(5, 10, bootstrap.generator("cells", "all", "CHL"))
    b = bootstrap.weights(5, 10, bootstrap.generator("cells", "all", "CHL"))
    c = bootstrap.weights(5, 10, bootstrap.generator("cells", "all", "PER"))
    d = bootstrap.weights(5, 10, bootstrap.generator("cells", "all", "CHL", seed=1))
    assert np.array_equal(a, b)
    assert not np.array_equal(a, c)
    assert not np.array_equal(a, d)


def two_cell_rows(society: int, respondents: int) -> list[tuple[int, int, int, int]]:
    """Each respondent gives the same answer in both cells: 1, 2, …, 6, 1, …"""
    return [(society, r, c, r % 6 + 1) for r in range(respondents) for c in (0, 1)]


def test_dr5_a_respondents_ratings_move_together() -> None:
    rs = synthetic.rating_set(("AAA",), 2, two_cell_rows(0, 40))
    reps = bootstrap.resample(rs, ("test",), replicates=200)
    assert np.array_equal(reps.mean[:, 0, 0], reps.mean[:, 0, 1])
    assert reps.mean[:, 0, 0].std() > 0


def test_nfr50_a_society_draws_the_same_with_or_without_other_societies() -> None:
    alone = synthetic.rating_set(("BBB",), 2, two_cell_rows(0, 30))
    both = synthetic.rating_set(("AAA", "BBB"), 2, two_cell_rows(0, 12) + two_cell_rows(1, 30))
    a = bootstrap.resample(alone, ("test",), replicates=50)
    b = bootstrap.resample(both, ("test",), replicates=50)
    assert np.array_equal(a.mean[:, 0], b.mean[:, 1])


def test_dr5_replicate_means_are_exact_weighted_means() -> None:
    rows = [(0, r, 0, v) for r, v in enumerate([1, 2, 2, 5, 6])]
    rs = synthetic.rating_set(("AAA",), 1, rows)
    reps = bootstrap.resample(rs, ("exact",), replicates=20)
    w = bootstrap.weights(5, 20, bootstrap.generator("exact", "AAA"))
    expected = (w @ np.array([1, 2, 2, 5, 6])) / 5 - 3.5
    assert np.array_equal(reps.mean[:, 0, 0], expected)


def test_dr5_unanimous_cells_have_a_zero_width_interval() -> None:
    rs = synthetic.rating_set(("AAA",), 1, [(0, r, 0, 1) for r in range(15)])
    lo, hi = bootstrap.interval(bootstrap.resample(rs, ("test",), replicates=100).mean)
    assert (lo[0, 0], hi[0, 0]) == (-2.5, -2.5)


def test_dr5_interval_matches_the_normal_approximation_for_a_large_sample() -> None:
    rows = [(0, r, 0, r % 6 + 1) for r in range(600)]
    rs = synthetic.rating_set(("AAA",), 1, rows)
    stats = cells.summarize(rs)
    lo, hi = bootstrap.interval(bootstrap.resample(rs, ("normal",)).mean)
    half = 1.96 * stats.sd[0, 0] / np.sqrt(600)
    assert (hi[0, 0] - lo[0, 0]) / 2 == pytest.approx(half, rel=0.1)
    assert (lo[0, 0] + hi[0, 0]) / 2 == pytest.approx(stats.mean[0, 0], abs=0.02)


def test_dr13_a_key_that_rates_a_cell_twice_counts_both_ratings() -> None:
    rows = [(0, 0, 0, 1), (0, 0, 0, 3), (0, 1, 0, 5)]
    rs = synthetic.rating_set(("AAA",), 1, rows)
    assert cells.summarize(rs).n[0, 0] == 3
    reps = bootstrap.resample(rs, ("dup",), replicates=30)
    w = bootstrap.weights(2, 30, bootstrap.generator("dup", "AAA"))
    expected = (w[:, 0] * 4 + w[:, 1] * 5) / (w[:, 0] * 2 + w[:, 1]) - 3.5
    with np.errstate(invalid="ignore"):
        assert np.allclose(reps.mean[:, 0, 0], expected, equal_nan=True)


def test_dr5_replicates_track_pooled_variance_and_mean_inverse_n() -> None:
    rows = [(0, r, 0, 1 + (r % 2) * 2) for r in range(10)] + [(1, r, 0, 4) for r in range(5)]
    rs = synthetic.rating_set(("AAA", "BBB"), 1, rows)
    reps = bootstrap.resample(rs, ("se",), replicates=400)
    observed = cells.pooled_variance(cells.summarize(rs))[0]
    assert np.nanmean(reps.pooled_variance[:, 0]) == pytest.approx(observed, rel=0.15)
    assert np.nanmean(reps.inverse_n[:, 0]) == pytest.approx((1 / 10 + 1 / 5) / 2)
    assert repr(reps) == "Replicates(400×2×1)"
