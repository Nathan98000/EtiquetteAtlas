"""DR-6, DR-7, DR-8, DR-10 and FR-31 on synthetic ratings with known answers."""

import numpy as np
import pytest
import synthetic

from pipeline import bootstrap, cells, estimates
from pipeline.ratings import RatingSet


def simulated(
    means: list[float], respondents: int, cells_: int = 1, spread: float = 1.2, key: int = 0
) -> RatingSet:
    """Societies whose 1–6 ratings scatter around the given means (on the −2.5…2.5 scale)."""
    rng = np.random.default_rng(key)
    rows = []
    for s, m in enumerate(means):
        for r in range(respondents):
            for c in range(cells_):
                value = int(np.clip(np.rint(m + 3.5 + rng.normal(0, spread)), 1, 6))
                rows.append((s, r, c, value))
    codes = tuple(f"S{s:02d}" for s in range(len(means)))
    return synthetic.rating_set(codes, cells_, rows)


Estimated = tuple[estimates.GlobalCells, estimates.SocietyCells]


def run(rs: RatingSet, replicates: int = 400) -> Estimated:
    stats = cells.summarize(rs)
    return estimates.estimate(stats, bootstrap.resample(rs, ("test",), replicates))


def test_dr7_the_global_mean_weights_societies_equally() -> None:
    rows = [(0, r, 0, 6) for r in range(50)] + [(1, r, 0, 1) for r in range(5)]
    g, _ = run(synthetic.rating_set(("AAA", "BBB"), 1, rows), replicates=50)
    assert g.mean[0] == 0.0  # (2.5 + −2.5) / 2, not weighted toward the 50 respondents
    assert (g.n_societies[0], g.n[0]) == (2, 55)


def test_dr8_tau_is_the_method_of_moments_estimate() -> None:
    means = np.array([[0.5], [-0.5], [1.5]])
    se2 = np.array([[0.04], [0.04], [0.10]])
    expected = np.var(means, ddof=1) - 0.06
    assert estimates.method_of_moments(means, se2, axis=0)[0] == pytest.approx(expected)
    assert estimates.method_of_moments(means * 0, se2, axis=0)[0] == 0.0  # floored at 0


def test_dr8_identical_societies_have_no_disagreement_and_shrink_fully() -> None:
    rows = [(s, r, 0, r % 6 + 1) for s in range(4) for r in range(30)]
    g, sc = run(synthetic.rating_set(("A", "B", "C", "D"), 1, rows))
    assert g.tau[0] == 0.0
    assert g.sd_between[0] == 0.0
    assert np.all(sc.weight == 0.0)
    assert np.allclose(sc.shrunk, g.mean[0])
    assert np.all(sc.shrunk_half > 0)  # the global mean's own uncertainty remains


def test_decision15_the_corrected_tau_interval_contains_the_estimate() -> None:
    # Small true disagreement and noisy societies: replicates without the second correction
    # centre on the raw spread of society means, above τ.
    means = [float(m) for m in np.linspace(-0.15, 0.15, 30)]
    rs = simulated(means, respondents=20, key=3)
    stats = cells.summarize(rs)
    reps = bootstrap.resample(rs, ("tau",), 1000)
    g, _ = estimates.estimate(stats, reps)
    assert g.tau_lo[0] <= g.tau[0] <= g.tau_hi[0]
    naive = np.sqrt(np.maximum(0, np.nanvar(reps.mean, axis=1, ddof=1) - reps.se2_mean))
    assert np.median(naive[:, 0]) > g.tau[0] + 0.02
    assert g.sd_between[0] > g.tau[0]


def test_dr6_shrinkage_weight_and_estimate_by_formula() -> None:
    rs = simulated([-1.0, 0.0, 1.0, 0.5], respondents=40, key=1)
    stats = cells.summarize(rs)
    g, sc = run(rs)
    se2 = cells.pooled_variance(stats)[0] / stats.n[:, 0]
    tau2 = g.tau[0] ** 2
    weight = tau2 / (tau2 + se2)
    assert sc.weight[:, 0] == pytest.approx(weight)
    raw = stats.mean[:, 0]
    assert sc.shrunk[:, 0] == pytest.approx(weight * raw + (1 - weight) * g.mean[0])
    # Shrinkage pulls toward the global mean, never past it.
    assert np.all(np.abs(sc.shrunk[:, 0] - g.mean[0]) <= np.abs(raw - g.mean[0]))


def test_dr6_smaller_societies_shrink_more() -> None:
    rows = [(0, r, 0, r % 2 * 5 + 1) for r in range(200)]  # mean 0, n 200
    rows += [(1, r, 0, 6 if r % 3 else 1) for r in range(12)]  # high mean, n 12
    rows += [(2, r, 0, 6 if r % 3 else 1) for r in range(120)]  # same mean, n 120
    rows += [(3, r, 0, 1 if r % 3 else 6) for r in range(60)]
    _, sc = run(synthetic.rating_set(("A", "B", "C", "D"), 1, rows))
    assert sc.weight[1, 0] < sc.weight[2, 0] < sc.weight[0, 0]


def test_decision3_the_interval_is_empirical_bayes() -> None:
    rs = simulated([-1.0, 0.0, 1.0, 0.5, -0.3], respondents=25, key=2)
    stats = cells.summarize(rs)
    reps = bootstrap.resample(rs, ("eb",), 400)
    _, sc = estimates.estimate(stats, reps)
    se2 = cells.pooled_variance(stats)[0] / stats.n[:, 0]
    var_g = np.var(np.nanmean(reps.mean, axis=1)[:, 0], ddof=1)
    w = sc.weight[:, 0]
    expected = estimates.Z * np.sqrt(w * se2 + (1 - w) ** 2 * var_g)
    assert sc.shrunk_half[:, 0] == pytest.approx(expected)


def test_dr5_the_raw_interval_brackets_the_mean() -> None:
    rs = simulated([-1.0, 0.5, 1.0], respondents=50, cells_=3, key=4)
    _, sc = run(rs)
    stats = cells.summarize(rs)
    assert np.all(sc.lo <= stats.mean)
    assert np.all(stats.mean <= sc.hi)


def test_dr10_offsets_equal_the_srs_formula_for_complete_societies() -> None:
    means = np.array([[1.0, 2.0, 0.0], [0.0, 0.5, -0.5], [-1.0, 0.0, -2.0]])
    g = means.mean(axis=0)
    offset = estimates.offsets(means, g)
    # DR-10: subtract the society's mean over all cells and add back the overall mean.
    srs = means - means.mean(axis=1, keepdims=True) + means.mean()
    assert means - offset[:, None] == pytest.approx(srs)


def test_decision4_offsets_use_only_the_cells_a_society_has() -> None:
    means = np.array([[1.0, 2.0, 0.0], [0.0, 0.5, np.nan]])
    g = np.array([0.5, 1.0, 0.0])
    assert estimates.offsets(means, g).tolist() == [0.5, -0.5]


def test_fr31_cells_far_from_the_global_mean_are_notable() -> None:
    rs = simulated([-1.5, 0.0, 0.0, 0.0, 1.5], respondents=60, key=5)
    _, sc = run(rs)
    assert sc.notable[:, 0].tolist()[0] == -1
    assert sc.notable[:, 0].tolist()[-1] == 1


def test_dr10_centered_values_remove_scale_use() -> None:
    # Society B rates every cell exactly one point higher than A: centering removes the gap.
    rows = []
    for c in range(3):
        for r in range(40):
            v = 1 + (r + 2 * c) % 4
            rows += [(0, r, c, v), (1, r, c, v + 1)]
    g, sc = run(synthetic.rating_set(("A", "B"), 3, rows))
    assert sc.offset.tolist() == pytest.approx([-0.5, 0.5])
    assert g.centered_sd_between == pytest.approx([0.0, 0.0, 0.0])
    assert np.all(g.sd_between > 0.5)


def test_decision24_centered_notable_ignores_scale_use() -> None:
    # B rates every cell one point higher than A: notable on the raw scale, not once centered.
    rows = []
    for c in range(3):
        for r in range(40):
            v = 1 + (r + 2 * c) % 4
            rows += [(0, r, c, v), (1, r, c, v + 1)]
    _, sc = run(synthetic.rating_set(("A", "B"), 3, rows))
    assert sc.notable.tolist() == [[-1, -1, -1], [1, 1, 1]]
    assert sc.notable_centered.tolist() == [[0, 0, 0], [0, 0, 0]]


def test_dr16_estimate_reprs_show_shapes_only() -> None:
    g, sc = run(simulated([0.0, 1.0], respondents=10), replicates=10)
    assert repr(g) == "GlobalCells(1 cells)"
    assert repr(sc) == "SocietyCells(2 societies × 1 cells)"
