"""Turn estimates into the published JSON documents (§4.6, HR-4, NFR-50).

Conventions shared by every file (documented for the site in data/derived/README.md):
- Tables are columnar: an object of equal-length arrays, one entry per row, so the privacy scan
  sees each row's `n` beside its other values.
- Dense grids: a society × cell table has one row per society and cell, society-major, in the
  order of its `societies.code` and `grid` arrays, so row i is society i // cells, cell
  i % cells. Absent or suppressed rows hold null.
- Suppression (DR-9): every value of a row whose n is below 10 is null, except its status.
- Intervals are offsets from their estimate: [x − x_minus, x + x_plus], or x ± x_pm.
- Scores, offsets, SDs and correlations are rounded to 2 decimals, shares to whole percents,
  coordinates to 2 decimals. Negative zero is written as 0.
"""

import json
from collections.abc import Sequence

import numpy as np

from pipeline import cells, raw
from pipeline.change import Change
from pipeline.contexts import ContextAggregates, GlobalSummary
from pipeline.estimates import GlobalCells, SocietyCells
from pipeline.metadata import Facts, Place
from pipeline.ratings import CHANGE_BEHAVIORS
from pipeline.similarity import Match

Column = list[object]
Table = dict[str, Column]
Doc = dict[str, object]

DIGITS = 2
CHANGE_SOURCE = (
    "2000–2003: Gelfand et al. (2011), Science 332:1100–1104, from the GSN deposit "
    "(OSF sh4rb); society–cell aggregates only"
)


def numbers(values: np.ndarray, keep: np.ndarray | None = None, digits: int = DIGITS) -> Column:
    """Round to `digits`; NaN, infinite or not kept -> null; −0.0 -> 0.0."""
    a = np.asarray(values, dtype=np.float64)
    ok = np.isfinite(a) if keep is None else np.isfinite(a) & keep
    rounded = np.round(np.where(ok, a, 0.0), digits) + 0.0
    return [float(x) if k else None for x, k in zip(rounded.ravel(), ok.ravel(), strict=True)]


def integers(values: np.ndarray, keep: np.ndarray | None = None) -> Column:
    a = np.asarray(values)
    ok = np.ones(a.shape, dtype=bool) if keep is None else keep
    finite = np.isfinite(a.astype(np.float64)) & ok
    return [int(x) if k else None for x, k in zip(a.ravel(), finite.ravel(), strict=True)]


def percents(shares: np.ndarray, keep: np.ndarray | None = None) -> Column:
    return integers(np.round(np.asarray(shares, dtype=np.float64) * 100), keep)


def offsets(
    estimate: np.ndarray, lo: np.ndarray, hi: np.ndarray, keep: np.ndarray
) -> tuple[Column, Column]:
    """Interval bounds as non-negative distances below and above the estimate."""
    minus = np.maximum(estimate - lo, 0.0)
    plus = np.maximum(hi - estimate, 0.0)
    return numbers(minus, keep), numbers(plus, keep)


def encode(doc: Doc) -> bytes:
    """Minified JSON with sorted keys: identical documents give identical bytes (NFR-50)."""
    text = json.dumps(
        doc, sort_keys=True, separators=(",", ":"), ensure_ascii=False, allow_nan=False
    )
    return (text + "\n").encode("utf-8")


def grid() -> Doc:
    return {"behaviors": list(raw.BEHAVIORS), "situations": list(raw.SITUATIONS_IDS)}


def cell_estimates(
    sample: str,
    societies: Sequence[str],
    stats: cells.CellStats,
    status: np.ndarray,
    sc: SocietyCells,
) -> Doc:
    """`cells-<sample>.json`: society × cell estimates (DR-4 to DR-6, DR-9 to DR-11, FR-31)."""
    keep = stats.n >= cells.MIN_N
    mean = stats.mean
    mean_minus, mean_plus = offsets(mean, sc.lo, sc.hi, keep)
    return {
        "sample": sample,
        "grid": grid(),
        "societies": {
            "code": list(societies),
            "offset": numbers(sc.offset),
            "offset_shrunk": numbers(sc.offset_shrunk),
        },
        "cells": {
            "n": integers(stats.n, keep),
            "mean": numbers(mean, keep),
            "mean_minus": mean_minus,
            "mean_plus": mean_plus,
            "shrunk": numbers(sc.shrunk, keep),
            "shrunk_pm": numbers(sc.shrunk_half, keep),
            "share": percents(stats.share, keep),
            "status": integers(status),
            "notable": integers(sc.notable, keep),
        },
    }


def distributions(sample: str, societies: Sequence[str], stats: cells.CellStats) -> Doc:
    """`distributions-<sample>.json`: n, SD and response counts c1–c6 (DR-4, FR-61, NFR-3)."""
    keep = stats.n >= cells.MIN_N
    counts = {f"c{k + 1}": integers(stats.counts[..., k], keep) for k in range(6)}
    return {
        "sample": sample,
        "grid": grid(),
        "societies": {"code": list(societies)},
        "cells": {"n": integers(stats.n, keep), "sd": numbers(stats.sd, keep), **counts},
    }


def global_cells(sample: str, g: GlobalCells) -> Doc:
    """`global-<sample>.json`: one row per cell (DR-7, DR-8, DR-10, DR-11)."""
    keep = g.n_societies > 0
    mean_minus, mean_plus = offsets(g.mean, g.mean_lo, g.mean_hi, keep)
    tau_minus, tau_plus = offsets(g.tau, g.tau_lo, g.tau_hi, keep)
    c_minus, c_plus = offsets(g.centered_tau, g.centered_tau_lo, g.centered_tau_hi, keep)
    return {
        "sample": sample,
        "grid": grid(),
        "cells": {
            "n_societies": integers(g.n_societies, keep),
            "n": integers(g.n, keep),
            "mean": numbers(g.mean, keep),
            "mean_minus": mean_minus,
            "mean_plus": mean_plus,
            "share": percents(g.share, keep),
            "tau": numbers(g.tau, keep),
            "tau_minus": tau_minus,
            "tau_plus": tau_plus,
            "sd_between": numbers(g.sd_between, keep),
            "centered_mean": numbers(g.centered_mean, keep),
            "centered_tau": numbers(g.centered_tau, keep),
            "centered_tau_minus": c_minus,
            "centered_tau_plus": c_plus,
            "centered_sd_between": numbers(g.centered_sd_between, keep),
        },
    }


def similar(sample: str, societies: Sequence[str], matches: list[list[Match]]) -> Doc:
    """`similarity-<sample>.json`: up to five most similar societies each (DR-14, FR-32)."""
    rows = [(s, rank, m) for s, ms in enumerate(matches) for rank, m in enumerate(ms, start=1)]
    return {
        "sample": sample,
        "pairs": {
            "code": [societies[s] for s, _, _ in rows],
            "rank": [rank for _, rank, _ in rows],
            "other": [societies[m.other] for _, _, m in rows],
            "r": numbers(np.array([m.r for _, _, m in rows])),
            "n_cells": [m.shared for _, _, m in rows],
        },
    }


def _summary(summary: GlobalSummary, keep: np.ndarray) -> Table:
    minus, plus = offsets(summary.mean, summary.lo, summary.hi, keep)
    return {
        "n_societies": integers(summary.n_societies, keep),
        "n": integers(summary.n, keep),
        "mean": numbers(summary.mean, keep),
        "mean_minus": minus,
        "mean_plus": plus,
        "share": percents(summary.share, keep),
    }


def context_aggregates(sample: str, societies: Sequence[str], agg: ContextAggregates) -> Doc:
    """`contexts-<sample>.json`: audiences and actor gender (DR-12, FR-40 to FR-42)."""
    s = agg.societies
    keep = s.n >= cells.MIN_N
    minus, plus = offsets(s.mean, s.lo, s.hi, keep)
    overall_keep = agg.overall.n >= cells.MIN_N
    genders = list(agg.by_gender)
    split = [_summary(agg.by_gender[g], agg.by_gender[g].n >= cells.MIN_N) for g in genders]
    by_gender: Table = {"gender": [g for g in genders for _ in range(agg.overall.n.size)]}
    for name in split[0]:
        by_gender[name] = [x for part in split for x in part[name]]
    return {
        "sample": sample,
        "grid": {"behaviors": list(raw.BEHAVIORS), "contexts": list(raw.CONTEXT_IDS)},
        "societies": {"code": list(societies)},
        "cells": {
            "n": integers(s.n, keep),
            "mean": numbers(s.mean, keep),
            "mean_minus": minus,
            "mean_plus": plus,
            "share": percents(s.share, keep),
            "status": integers(agg.status),
        },
        "global": _summary(agg.overall, overall_keep),
        "by_gender": by_gender,
    }


def change(sample: str, ch: Change) -> Doc:
    """`change-<sample>.json`: GSN against 2000–2003 aggregates (DR-13, FR-50 to FR-53, C-6)."""
    keep = (ch.n0 >= cells.MIN_N) & (ch.n1 >= cells.MIN_N)
    d_minus, d_plus = offsets(ch.diff, ch.diff_lo, ch.diff_hi, keep)
    cell_keep = ch.cell_n_societies > 0
    c_minus, c_plus = offsets(ch.cell_diff, ch.cell_diff_lo, ch.cell_diff_hi, cell_keep)
    b_keep = ch.behavior_n_societies > 0
    b_minus, b_plus = offsets(ch.behavior_mean, ch.behavior_lo, ch.behavior_hi, b_keep)
    s_keep = ch.society_cells > 0
    s_minus, s_plus = offsets(ch.society_diff, ch.society_lo, ch.society_hi, s_keep)
    return {
        "sample": sample,
        "source": CHANGE_SOURCE,
        "grid": {"behaviors": list(CHANGE_BEHAVIORS), "situations": list(raw.SITUATIONS_IDS)},
        "societies": {
            "code": list(ch.societies),
            "n0": integers(ch.respondents0),
            "diff": numbers(ch.society_diff, s_keep),
            "diff_minus": s_minus,
            "diff_plus": s_plus,
            "n_cells": integers(ch.society_cells),
        },
        "cells": {
            "n0": integers(ch.n0, keep),
            "mean0": numbers(ch.mean0, keep),
            "sd0": numbers(ch.sd0, keep),
            "n1": integers(ch.n1, keep),
            "mean1": numbers(ch.mean1, keep),
            "sd1": numbers(ch.sd1, keep),
            "diff": numbers(ch.diff, keep),
            "diff_minus": d_minus,
            "diff_plus": d_plus,
        },
        "global": {
            "n_societies": integers(ch.cell_n_societies, cell_keep),
            "mean0": numbers(ch.cell_mean0, cell_keep),
            "mean1": numbers(ch.cell_mean1, cell_keep),
            "diff": numbers(ch.cell_diff, cell_keep),
            "diff_minus": c_minus,
            "diff_plus": c_plus,
        },
        "behaviors": {
            "behavior": list(CHANGE_BEHAVIORS),
            "n_societies": integers(ch.behavior_n_societies, b_keep),
            "mean": numbers(ch.behavior_mean, b_keep),
            "mean_minus": b_minus,
            "mean_plus": b_plus,
            "sd": numbers(ch.behavior_sd, b_keep),
            "increased": integers(ch.behavior_increased, b_keep),
        },
    }


def society_metadata(places: Sequence[Place], facts: dict[str, dict[str, Facts]]) -> Doc:
    """`societies.json`: names, places and per-sample facts (DR-15, FR-34, FR-71)."""
    codes = [p.code for p in places]
    per_sample: Doc = {}
    for sample, by_code in facts.items():
        rows = [by_code.get(c) for c in codes]
        per_sample[sample] = {
            "code": codes,
            "n": [f.respondents if f else None for f in rows],
            "student_share": [round(100 * f.student_share) if f else None for f in rows],
            "student_unknown": [round(100 * f.student_unknown) if f else None for f in rows],
            "first_month": [f.first_month if f else None for f in rows],
            "last_month": [f.last_month if f else None for f in rows],
            "languages": [list(f.languages) if f else None for f in rows],
        }
    return {
        "societies": {
            "code": codes,
            "name": [p.name for p in places],
            "region": [p.region for p in places],
            "lat": numbers(np.array([p.lat for p in places])),
            "lon": numbers(np.array([p.lon for p in places])),
        },
        "samples": per_sample,
    }
