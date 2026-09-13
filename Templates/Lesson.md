Leave this file completely empty below this line.

<!--
HOW TO USE THIS TEMPLATE

1. Copy this note to `Lessons/<Topic>.md`, then delete this comment and the
   first line, leaving the file COMPLETELY EMPTY.
2. Start your agent in the vault folder.
3. On pi, the FIRST thing you run — before sending any message to the agent:
       /md-log Lessons/<Topic>.md
   On agents without a mirroring command, just tell it which file to write to.
4. Now ask for the topic you want to study.

WHY THE FILE MUST BE EMPTY AND LINKED FIRST

When it links, md-log does a "backfill": if the session already has history it
rewrites the ENTIRE file with that history (a whole-file write, not an append).
Anything that was inside is lost. Link first, while there is no history, and it
writes nothing — so there is nothing to lose.

WHERE YOUR OWN NOTES GO

Not in this file. While it is linked, md-log rewrites it on every append and
your edits disappear.

Create a separate note, `Lessons/<Topic> - my notes.md`, and link back with
[[<Topic>]]. Writing in your own words what you just understood is the best
proof it landed connected instead of memorised, so it deserves its own place.
-->
