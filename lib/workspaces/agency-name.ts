export function workspaceAgencyName(workspace: {
  name: string;
  legalName?: string | null;
}) {
  const legal = workspace.legalName?.trim();
  return legal || workspace.name;
}
