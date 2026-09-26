/** Founder WhatsApp. Import only from Server Components so the number stays off other plans. */

export const SUPPORT_WHATSAPP_E164 = "+905432966909";

export const SUPPORT_WHATSAPP_DISPLAY = "+90 543 296 69 09";

export function supportWhatsappUrl() {
  const text = encodeURIComponent("Hi, I need help with Temas.");
  return `https://wa.me/${SUPPORT_WHATSAPP_E164.replace("+", "")}?text=${text}`;
}
