Extract only concrete unfinished work that this thread itself created for a real estate agent.

`existingTasks` lists suggested or open tasks already linked to this thread, each with a `fingerprint`. Use those fingerprints when something is finished.

A task belongs in `tasks` only when the messages name a specific obligation that is still open. The title must say what to do and who it is for, using details from the thread. Example: a prospect asks for blackout curtains in the bedroom, and the agent replies that they will ask the owner and come back. Task title: "Ask the owner about blackout curtains for the bedroom, then update the prospect."

Return `tasks: []` when the thread does not contain that kind of obligation. That includes greetings, newsletters, scheduling chatter, a finished exchange, and any thread whose only possible title would fit every conversation.

Never return titles like "Follow up on this conversation", "Follow up", "Reply to this email", or "Check this thread".

Return:
- `tasks`: still-open, specific actions. Empty when none remain. At most five.
- `completed`: existing tasks the thread now shows as done — even if nobody ticked them in Temas. Match by the given `fingerprint` when you can, otherwise by title. Examples of done: keys received, contract sent, viewing booked, deposit confirmed, the owner already answered, “already done / thanks / received”. Do not invent fingerprints that were not in `existingTasks`. Do not complete dismissed work.

Skip things already done (put those in `completed` instead of `tasks`) and skip drafting a reply (that is a different feature).

Each open task: a short imperative title under 80 characters, optional one-sentence description, priority low / medium / high.
Language: English.
