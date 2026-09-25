/** Case-fold that treats Turkish I/İ as the same letter. */
function fold(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

export function conversationMatchesSearch(
  item: {
    subject: string | null;
    contactName: string | null;
    contactEmail: string | null;
  },
  query: string,
) {
  const needle = fold(query.trim());
  if (!needle) return true;
  return [item.subject, item.contactName, item.contactEmail].some((value) =>
    value ? fold(value).includes(needle) : false,
  );
}
