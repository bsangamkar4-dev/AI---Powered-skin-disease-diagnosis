export const formatActivityTime = (timestamp, now = Date.now()) => {
  const activityDate = new Date(timestamp);
  const activityTime = activityDate.getTime();

  if (!Number.isFinite(activityTime)) return "Time unavailable";

  const elapsed = now - activityTime;
  if (elapsed < 0) {
    return activityDate.toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }
  if (elapsed < 60_000) return "Just now";

  const minutes = Math.floor(elapsed / 60_000);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  if (hours < 48) return "Yesterday";

  return activityDate.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};
