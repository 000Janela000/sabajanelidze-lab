# build-log

Machine-written records of how this code was built. Nothing here is typed by hand.

- `checks.jsonl`: one line per local check run before a commit (`scripts/precommit.mjs`): when, who, which checks passed or failed, which files. Refused commits are recorded too.

The proof cards' "build chain" line is generated from this log and the git history (old folder names included, so the count survives a move). It links the CI checks of the commit the site is built from: CI is the independent check.
