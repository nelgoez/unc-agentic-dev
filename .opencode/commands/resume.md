---
description: Resume last session from a module context — loads PROGRESS.md and ROADMAP.md
agent: plan
---

You are resuming a previously interrupted session for the module `$ARGUMENTS`.

Step 1: Load the current state by reading these files in order:

@.context/$ARGUMENTS/PROGRESS.md

If PROGRESS.md does not exist, read instead:
@.context/$ARGUMENTS/ROADMAP.md

Step 2: After loading the context, tell me:

- What module we are working on
- Which task was active
- What the next action is
- Any blockers or open decisions

Step 3: If the next action is clear, offer to continue implementation.

Step 4: If no module context exists, read @.context/unc-overview.md and suggest what to work on next.

Skip missing files gracefully — do not error.
