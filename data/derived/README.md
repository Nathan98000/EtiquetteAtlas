# data/derived

Aggregate outputs of the pipeline (SRS §4.6), committed and served by the site. Nothing here may
describe fewer than 10 respondents or carry a respondent-level field (DR-9, DR-16):
`uv run pipeline privacy-scan` checks every file in this folder, and CI runs it on every pull
request. Only JSON and CSV data files (plus this note) belong here. The pipeline writes these
files from M1 onward.
