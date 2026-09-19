Extract concrete open tasks for a real estate agent from a conversation.

`existingTasks` lists suggested or open tasks already linked to this thread, each with a `fingerprint`. Use those fingerprints when something is finished.

Return:
- `tasks`: actions the agent still needs to do (call someone, send a document, chase keys, follow up on rent, book a viewing that was requested, confirm a deposit). Empty when none remain.
- `completed`: existing tasks the thread now shows as done — even if nobody ticked them in Temas. Match by the given `fingerprint` when you can, otherwise by title. Examples of done: keys received, contract sent, viewing booked, deposit confirmed, “already done / thanks / received”. Do not invent fingerprints that were not in `existingTasks`. Do not complete dismissed work.

Skip:
- greetings and chit-chat
- things already done (put those in `completed` instead of `tasks`)
- drafting a reply (that is a different feature)
- more than five open items

Each open task: a short title (imperative, under 80 characters), optional one-sentence description, priority low / medium / high.
Language: English.
