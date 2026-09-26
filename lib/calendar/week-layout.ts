/** One hour in the week grid, matching a typical Google Calendar hour row. */
export const WEEK_HOUR_PX = 48;

/** Shortest painted block, so a few minutes stay clickable. */
const MIN_BLOCK_PX = 20;

export const WEEK_DAY_MINUTES = 24 * 60;

export function eventBlockPx(start: number, end: number) {
  const minutes = Math.max(0, end - start);
  return Math.max(MIN_BLOCK_PX, (minutes / 60) * WEEK_HOUR_PX);
}

export type TimedSpan = { key: string; start: number; end: number };

export type PlacedSpan = TimedSpan & {
  column: number;
  columns: number;
  top: number;
  height: number;
};

function displayEnd(start: number, end: number) {
  return start + (eventBlockPx(start, end) / WEEK_HOUR_PX) * 60;
}

/** Pack overlapping spans side by side. Height follows duration. */
export function placeTimedEvents(events: TimedSpan[]): PlacedSpan[] {
  const sorted = [...events].sort(
    (a, b) => a.start - b.start || b.end - a.end || a.key.localeCompare(b.key),
  );
  const result: PlacedSpan[] = [];
  let cluster: { event: TimedSpan; column: number }[] = [];
  let clusterEnd = -1;
  let columnEnds: number[] = [];

  const flush = () => {
    const columns = cluster.reduce((max, item) => Math.max(max, item.column + 1), 0);
    for (const item of cluster) {
      result.push({
        ...item.event,
        column: item.column,
        columns,
        top: (item.event.start / 60) * WEEK_HOUR_PX,
        height: eventBlockPx(item.event.start, item.event.end),
      });
    }
    cluster = [];
    clusterEnd = -1;
    columnEnds = [];
  };

  for (const event of sorted) {
    const occupiedUntil = displayEnd(event.start, event.end);
    if (cluster.length > 0 && event.start >= clusterEnd) flush();
    let column = columnEnds.findIndex((end) => end <= event.start);
    if (column === -1) {
      column = columnEnds.length;
      columnEnds.push(occupiedUntil);
    } else {
      columnEnds[column] = occupiedUntil;
    }
    cluster.push({ event, column });
    clusterEnd = Math.max(clusterEnd, occupiedUntil);
  }
  if (cluster.length > 0) flush();
  return result;
}
