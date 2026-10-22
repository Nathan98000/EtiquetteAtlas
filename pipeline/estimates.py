"""Global cell means, disagreement, shrinkage and centering (DR-6, DR-7, DR-8, DR-10, FR-31).

Every society with at least one rating of a cell counts toward that cell's global mean, τ and
shrinkage target, as in the paper, even when its own estimate is too small to publish
(decision 1). The bootstrap treats the set of societies as fixed: intervals reflect sampling of
respondents within societies, not the choice of societies.

- Global mean (DR-7): the unweighted mean of society means.
- τ (DR-8): τ² = max(0, var of society means − mean SE²), the method of moments. SE² is the
  cell's pooled within-society variance over n (decision 2). Its interval is a percentile
  interval of replicates corrected for noise twice: once for the sampling noise already in the
  data and once for the noise the resampling adds (decision 15). Without the second correction
  the replicates centre on the raw variance of society means, not on τ².
- Shrinkage (DR-6): weight = τ² / (τ² + SE²); shrunken = weight × mean + (1 − weight) × global.
  Its interval is empirical Bayes: ± z √(weight × SE² + (1 − weight)² × var(global)), where
  var(global) comes from the bootstrap (decision 3). It ignores the uncertainty in τ itself.
- Centering (DR-10): a society's offset is its mean deviation from the global cell means over
  the cells it has (decision 4); centered = estimate − offset. The site subtracts the offsets.
- Notable cells (FR-31): +1 or −1 when the percentile interval of (society − global mean)
  excludes 0 above or below.
"""

from dataclasses import dataclass

import numpy as np

from pipeline import bootstrap, cells
from pipeline.bootstrap import Replicates
from pipeline.cells import CellStats

Z = 1.959963984540054  # standard normal 97.5th percentile


@dataclass(frozen=True, repr=False)
class GlobalCells:
    """Per-cell (C,) summaries over societies."""

    n_societies: np.ndarray
    n: np.ndarray  # respondents rating the cell, over all societies
    mean: np.ndarray
    mean_lo: np.ndarray
    mean_hi: np.ndarray
    share: np.ndarray  # unweighted mean of society shares of 4–6 (DR-11, decision 5)
    tau: np.ndarray
    tau_lo: np.ndarray
    tau_hi: np.ndarray
    sd_between: np.ndarray  # raw SD of society means
    centered_mean: np.ndarray
    centered_tau: np.ndarray
    centered_tau_lo: np.ndarray
    centered_tau_hi: np.ndarray
    centered_sd_between: np.ndarray

    def __repr__(self) -> str:
        return f"GlobalCells({self.mean.size} cells)"


@dataclass(frozen=True, repr=False)
class SocietyCells:
    """Per society × cell (S, C) estimates beyond the raw summaries, plus offsets (S,)."""

    lo: np.ndarray  # percentile interval of the raw mean
    hi: np.ndarray
    weight: np.ndarray
    shrunk: np.ndarray
    shrunk_half: np.ndarray  # half-width of the empirical-Bayes interval
    notable: np.ndarray  # FR-31: +1 looser, −1 stricter, 0 neither
    offset: np.ndarray  # DR-10, raw estimates
    offset_shrunk: np.ndarray  # DR-10, shrunken estimates

    def __repr__(self) -> str:
        return f"SocietyCells({self.lo.shape[0]} societies × {self.lo.shape[1]} cells)"


def method_of_moments(means: np.ndarray, se2: np.ndarray, axis: int) -> np.ndarray:
    """τ² = max(0, var of means − mean SE²), ignoring NaN (societies without the cell)."""
    with bootstrap.quiet():
        tau2: np.ndarray = np.maximum(
            0.0, np.nanvar(means, axis=axis, ddof=1) - np.nanmean(se2, axis=axis)
        )
    return tau2


def offsets(means: np.ndarray, global_mean: np.ndarray) -> np.ndarray:
    """Each society's mean deviation from the global cell means over the cells it has (DR-10).

    `means` is (…, S, C) and `global_mean` (…, C); returns (…, S).
    """
    with bootstrap.quiet():
        result: np.ndarray = np.nanmean(means - global_mean[..., None, :], axis=-1)
    return result


def estimate(stats: CellStats, reps: Replicates) -> tuple[GlobalCells, SocietyCells]:
    mean = stats.mean  # (S, C), NaN where a society has no rating of the cell
    with np.errstate(invalid="ignore", divide="ignore"):
        se2 = np.where(stats.n > 0, cells.pooled_variance(stats)[None, :] / stats.n, np.nan)
    with bootstrap.quiet():
        g = np.nanmean(mean, axis=0)
        se2_mean = np.nanmean(se2, axis=0)
        g_rep = np.nanmean(reps.mean, axis=1)  # (B, C)
        var_g = np.nanvar(g_rep, axis=0, ddof=1)
        share = np.nanmean(stats.share, axis=0)
        sd_between = np.nanstd(mean, axis=0, ddof=1)

    tau2 = method_of_moments(mean, se2, axis=0)
    tau_lo, tau_hi = _tau_interval(reps.mean, reps.se2_mean, se2_mean)
    mean_lo, mean_hi = bootstrap.interval(g_rep)

    with np.errstate(invalid="ignore", divide="ignore"):
        weight = np.where(tau2 + se2 > 0, tau2 / (tau2 + se2), 0.0)
    weight = np.where(stats.n > 0, weight, np.nan)
    shrunk = weight * mean + (1 - weight) * g
    shrunk_half = Z * np.sqrt(weight * se2 + (1 - weight) ** 2 * var_g)

    lo, hi = bootstrap.interval(reps.mean)
    d_lo, d_hi = bootstrap.interval(reps.mean - g_rep[:, None, :])
    notable = np.where(d_lo > 0, 1, np.where(d_hi < 0, -1, 0))

    offset = offsets(mean, g)
    centered = mean - offset[:, None]
    rep_offset = offsets(reps.mean, g_rep)  # (B, S)
    centered_rep = reps.mean - rep_offset[:, :, None]
    with bootstrap.quiet():
        centered_g = np.nanmean(centered, axis=0)
        centered_sd = np.nanstd(centered, axis=0, ddof=1)
    c_lo, c_hi = _tau_interval(centered_rep, reps.se2_mean, se2_mean)
    del centered_rep

    global_cells = GlobalCells(
        n_societies=(stats.n > 0).sum(axis=0),
        n=stats.n.sum(axis=0),
        mean=g,
        mean_lo=mean_lo,
        mean_hi=mean_hi,
        share=share,
        tau=np.sqrt(tau2),
        tau_lo=tau_lo,
        tau_hi=tau_hi,
        sd_between=sd_between,
        centered_mean=centered_g,
        centered_tau=np.sqrt(method_of_moments(centered, se2, axis=0)),
        centered_tau_lo=c_lo,
        centered_tau_hi=c_hi,
        centered_sd_between=centered_sd,
    )
    society_cells = SocietyCells(
        lo=lo,
        hi=hi,
        weight=weight,
        shrunk=shrunk,
        shrunk_half=shrunk_half,
        notable=notable,
        offset=offset,
        offset_shrunk=offsets(shrunk, g),
    )
    return global_cells, society_cells


def _tau_interval(
    rep_means: np.ndarray, rep_se2_mean: np.ndarray, se2_mean: np.ndarray
) -> tuple[np.ndarray, np.ndarray]:
    """Percentile interval of τ from (B, S, C) replicate means, corrected for noise twice."""
    with bootstrap.quiet():
        spread = np.nanvar(rep_means, axis=1, ddof=1)  # (B, C)
    tau2 = np.maximum(0.0, spread - rep_se2_mean - se2_mean[None, :])
    return bootstrap.interval(np.sqrt(tau2))
