import { advanceHorizon } from "./functions/advance-horizon";
import { applicantSummaryJob, embedPropertyJob } from "./functions/embed";
import { inboxSync, inboxSyncCron } from "./functions/inbox-sync";
import { materializeSlots } from "./functions/materialize-slots";

export const inngestFunctions = [
  materializeSlots,
  advanceHorizon,
  inboxSync,
  inboxSyncCron,
  embedPropertyJob,
  applicantSummaryJob,
];
