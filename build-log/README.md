# build-log

Machine-written records of how this code was built. Nothing here is typed by hand.

- `checks.jsonl`: one line per local check run before a commit (`scripts/precommit.mjs`): when, who, which checks passed or failed, which files. Refused commits are recorded too.

The proof cards' "build chain" line is generated from this log, the git history and the CI runs.
