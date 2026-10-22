"""Change since the early 2000s: GSN against the 2000–2003 survey (DR-13, FR-50 to FR-53, C-6).

Only aggregates of the 2000–2003 file are kept: per society × cell n, mean and SD, and
summaries built from them. Its ratings are used as stored (DR-2). The 2023–2024 side reuses the
main grid's estimates and bootstrap replicates for the same sample; the 2000–2003 side resamples
its respondent keys (country + ResponseId) within each society, the same for every sample. A
difference's interval is the percentile interval of the replicate differences.

A society–cell comparison needs both waves; the one cell missing from the 2000–2003 file
(Israel, laugh × party) is left out of every summary that would use it.
"""

from dataclasses import dataclass

import numpy as np

from pipeline import bootstrap, cells
from pipeline.bootstrap import Replicates
from pipeline.cells import CellStats
from pipeline.ratings import CHANGE_BEHAVIORS, CHANGE_CELLS, RatingSet

SITUATIONS_PER_BEHAVIOR = CHANGE_CELLS // len(CHANGE_BEHAVIORS)


@dataclass(frozen=True, repr=False)
class Change:
    societies: tuple[str, ...]
    # Society × cell (S, 120)
    n0: np.ndarray
    mean0: np.ndarray
    sd0: np.ndarray
    n1: np.ndarray
    mean1: np.ndarray
    sd1: np.ndarray
    diff: np.ndarray  # NaN where either wave lacks the cell
    diff_lo: np.ndarray
    diff_hi: np.ndarray
    respondents0: np.ndarray  # (S,) 2000–2003 respondent keys per society
    # Global by cell (120,)
    cell_n_societies: np.ndarray
    cell_mean0: np.ndarray
    cell_mean1: np.ndarray
    cell_diff: np.ndarray
    cell_diff_lo: np.ndarray
    cell_diff_hi: np.ndarray
    # Behavior summaries over societies (12,), as in the paper's Table 1
    behavior_mean: np.ndarray
    behavior_lo: np.ndarray
    behavior_hi: np.ndarray
    behavior_sd: np.ndarray  # SD across societies
    behavior_increased: np.ndarray  # societies whose change is above 0
    behavior_n_societies: np.ndarray
    # Society summaries over cells (S,)
    society_diff: np.ndarray
    society_lo: np.ndarray
    society_hi: np.ndarray
    society_cells: np.ndarray

    def __repr__(self) -> str:
        return f"Change({len(self.societies)} societies × {self.n0.shape[1]} cells)"


def _by_behavior(diff: np.ndarray) -> np.ndarray:
    """Mean over each behavior's situations: (…, 120) -> (…, 12)."""
    shaped = diff.reshape(*diff.shape[:-1], len(CHANGE_BEHAVIORS), SITUATIONS_PER_BEHAVIOR)
    with bootstrap.quiet():
        result: np.ndarray = np.nanmean(shaped, axis=-1)
    return result


def compare(
    old: RatingSet,
    new_stats: CellStats,
    new_reps: Replicates,
    new_societies: tuple[str, ...],
    replicates: int,
) -> Change:
    """Compare the 2000–2003 ratings with a GSN sample for the societies `old` covers."""
    index = [new_societies.index(code) for code in old.societies]
    old_stats = cells.summarize(old)
    old_reps = bootstrap.resample(old, ("gelfand",), replicates)

    n1 = new_stats.n[index, :CHANGE_CELLS]
    mean1 = new_stats.mean[index, :CHANGE_CELLS]
    both = (old_stats.n > 0) & (n1 > 0)
    diff = np.where(both, mean1 - old_stats.mean, np.nan)
    rep_diff = np.where(both, new_reps.mean[:, index, :CHANGE_CELLS] - old_reps.mean, np.nan)
    diff_lo, diff_hi = bootstrap.interval(rep_diff)

    with bootstrap.quiet():
        cell_mean0 = np.nanmean(np.where(both, old_stats.mean, np.nan), axis=0)
        cell_mean1 = np.nanmean(np.where(both, mean1, np.nan), axis=0)
        cell_diff = np.nanmean(diff, axis=0)
        cell_lo, cell_hi = bootstrap.interval(np.nanmean(rep_diff, axis=1))

        per_society = _by_behavior(diff)  # (S, 12)
        rep_per_society = _by_behavior(rep_diff)  # (B, S, 12)
        behavior_mean = np.nanmean(per_society, axis=0)
        behavior_sd = np.nanstd(per_society, axis=0, ddof=1)
        behavior_lo, behavior_hi = bootstrap.interval(np.nanmean(rep_per_society, axis=1))

        society_diff = np.nanmean(diff, axis=1)
        society_lo, society_hi = bootstrap.interval(np.nanmean(rep_diff, axis=2))

    return Change(
        societies=old.societies,
        n0=old_stats.n,
        mean0=old_stats.mean,
        sd0=old_stats.sd,
        n1=n1,
        mean1=mean1,
        sd1=new_stats.sd[index, :CHANGE_CELLS],
        diff=diff,
        diff_lo=diff_lo,
        diff_hi=diff_hi,
        respondents0=old.respondents,
        cell_n_societies=both.sum(axis=0),
        cell_mean0=cell_mean0,
        cell_mean1=cell_mean1,
        cell_diff=cell_diff,
        cell_diff_lo=cell_lo,
        cell_diff_hi=cell_hi,
        behavior_mean=behavior_mean,
        behavior_lo=behavior_lo,
        behavior_hi=behavior_hi,
        behavior_sd=behavior_sd,
        behavior_increased=(per_society > 0).sum(axis=0),
        behavior_n_societies=np.isfinite(per_society).sum(axis=0),
        society_diff=society_diff,
        society_lo=society_lo,
        society_hi=society_hi,
        society_cells=both.sum(axis=1),
    )
