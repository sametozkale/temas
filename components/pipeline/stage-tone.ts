export function stageToneDot(color: string | null) {
  switch (color) {
    case "brand":
      return "bg-brand";
    case "success":
      return "bg-success";
    case "warning":
      return "bg-warning";
    case "info":
      return "bg-info";
    case "destructive":
      return "bg-destructive";
    default:
      return "bg-muted-foreground/40";
  }
}
