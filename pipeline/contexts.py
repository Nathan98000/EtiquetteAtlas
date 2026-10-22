"""Audience and actor-gender aggregates (DR-12, FR-40 to FR-42).

The contexts file crosses the 15 behaviors with five contexts: three audiences (alone,
colleagues/classmates, management/professors) and two actor genders (a woman, a man). They are
summarized per society and globally, and globally by respondent gender (women and men; the
"Other / prefer not to answer" group and missing answers are left out, decision 18). Global
values are unweighted means of society means, as for the main grid (DR-7).

Respondents are resampled within societies with their own seed stream. The gender splits draw
the same respondents as the whole sample, because a subset keeps the respondent numbering.
"""

from dataclasses import dataclass

import numpy as np

from pipeline import bootstrap, cells, raw
from pipeline.bootstrap import Replicates
from pipeline.cells import CellStats
from pipeline.ratings import GENDERS, RatingSet

SPLIT_GENDERS = ("Woman", "Man")


@dataclass(frozen=True, repr=False)
class Summary:
    """Per-cell (…, C) values: per society (S, C) or global (C,)."""

    n: np.ndarray
    mean: np.ndarray
    lo: np.ndarray
    hi: np.ndarray
    share: np.ndarray

    def __repr__(self) -> str:
        return f"{type(self).__name__}({'×'.join(map(str, self.n.shape))})"


@dataclass(frozen=True, repr=False)
class GlobalSummary(Summary):
    n_societies: np.ndarray


@dataclass(frozen=True, repr=False)
class ContextAggregates:
    societies: Summary  # (S, 75)
    status: np.ndarray  # (S, 75) cell status codes (DR-9, decision 8)
    overall: GlobalSummary  # (75,)
    by_gender: dict[str, GlobalSummary]  # gender -> (75,)

    def __repr__(self) -> str:
        return f"ContextAggregates({self.status.shape[0]} societies)"


def global_summary(stats: CellStats, reps: Replicates) -> GlobalSummary:
    with bootstrap.quiet():
        mean = np.nanmean(stats.mean, axis=0)
        share = np.nanmean(stats.share, axis=0)
        lo, hi = bootstrap.interval(np.nanmean(reps.mean, axis=1))
    return GlobalSummary(stats.n.sum(axis=0), mean, lo, hi, share, (stats.n > 0).sum(axis=0))


def aggregate(ratings: RatingSet, sample: str, replicates: int) -> ContextAggregates:
    key = ("contexts", sample)
    stats = cells.summarize(ratings)
    reps = bootstrap.resample(ratings, key, replicates)
    lo, hi = bootstrap.interval(reps.mean)
    by_gender = {}
    for gender in SPLIT_GENDERS:
        subset = ratings.subset(ratings.group == GENDERS.index(gender))
        sub_stats = cells.summarize(subset)
        by_gender[gender] = global_summary(sub_stats, bootstrap.resample(subset, key, replicates))
    return ContextAggregates(
        societies=Summary(stats.n, stats.mean, lo, hi, stats.share),
        status=cells.status(stats.n, behaviors=len(raw.BEHAVIORS)),
        overall=global_summary(stats, reps),
        by_gender=by_gender,
    )
