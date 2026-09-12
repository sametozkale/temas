# 07 — Cursor Rules Kurulum Rehberi

> Bu dosyadaki içerikler `.cursor/rules/` altına aşağıdaki dosya adlarıyla bölüştürülerek kopyalanır.
> Cursor bu kuralları her chat'te otomatik yükler (alwaysApply) ya da dosya desenine göre (globs).

---

## DOSYA: `.cursor/rules/project.md`

```markdown
---
description: Proje bağlamı — her zaman uygula
alwaysApply: true
---

Bu repo "Havn": emlakçılar için AI-native property management platformu.
Tek doğruluk kaynakları:
- docs/00-prd.md (ürün), docs/01-design-system.md (UI), docs/02-architecture.md (stack & yapı),
- docs/03-database-schema.md (DB), docs/04-slot-engine.md (takvim mantığı), docs/05-ai-features.md (AI).

Kurallar:
- Yeni feature'a başlamadan ilgili docs md'sini oku; docs ile çelişen kod yazma. Gerekirse önce docs'u güncellemeyi öner.
- Stack dışına çıkma: Next.js App Router, TypeScript strict, Tailwind v4, shadcn/ui (patch'li), Drizzle, Supabase, Inngest, Vercel AI SDK.
- Server state: React Query YOK — Server Components + Server Actions. Client state: useState/zustand sadece gerektiğinde.
- Her mutasyon Server Action'da zod ile valide edilir; `requireAbility()` yetki kontrolü atlanmaz.
- Kod İngilizce; kullanıcıya görünen metinler Türkçe (i18n key'leri üzerinden).
- Migration'lar asla editlenmez; şema değişikliği = yeni drizzle migration.
```

---

## DOSYA: `.cursor/rules/ui.md`

```markdown
---
description: UI/stil kuralları — component ve sayfa dosyalarında uygula
globs: ["components/**", "app/**"]
alwaysApply: false
---

Tasarım dili: docs/01-design-system.md (Granola benchmark). Altın kurallar:
1. shadow-lg/md yasak; ayrım hairline border (`border`) ile. İzinli tek gölge: prompt-bar'daki 1px'lik subtle shadow.
2. Emoji yasak — her zaman Hugeicons, `components/icons.ts` re-export'u üzerinden. Doğrudan @hugeicons importu yok.
3. Sayfa başlıkları serif: `font-serif` (Newsreader). UI metni Inter. tracking-tight başlıklarda.
4. Ekranda tek primary button; diğerleri variant="soft" | "ghost" | "outline". Üst sağ aksiyonlar pill.
5. Renkler sadece CSS token'larından (bg-secondary, text-muted-foreground, bg-brand-soft vb.). Hex literal yasak.
6. Boş durumlar <EmptyState>; yükleme <Skeleton>; toast sonner soft variant.
7. Radius: token (kart 10px, dialog 16px, pill full). rounded-md/lg rastgele kullanılmaz.
8. Liste/satır ayrımları divide-y; kart içi padding p-4/p-5; section aralığı space-y-6/8.
9. Yeni UI bileşeni üretirken önce components/ui'da muadili var mı bak; varsa patch'leme, extend et.
10. Responsive: mobilde sidebar sheet; tablolar yatay scroll-wrap; touch target ≥40px.
```

---

## DOSYA: `.cursor/rules/slots.md`

```markdown
---
description: Slot engine kuralları — lib/slots ve takvim kodunda uygula
globs: ["lib/slots/**", "inngest/**", "app/(public)/b/**"]
alwaysApply: false
---

- lib/slots saf fonksiyonlardır: DB importu, fetch, Date.now() doğrudan çağrısı YASAK (now parametre olarak gelir).
- Zaman: her zaman UTC sakla/hesapla; timezone çevirisi yalnızca sınırda (expandRRule çıkışı ve render).
- Yarı-açık aralık konvansiyonu: [start, end). 17:00 bitişi 17:00 başlangıcını kapsamaz.
- Değişiklik TDD: önce docs/04-slot-engine.md §5 senaryolarından test, sonra implementasyon.
- Materyalizasyon idempotent olmalı: aynı input iki kez → aynı diff (boş ikinci diff).
- booked/blocked slotlar asla silinmez; pencere küçülürse 'blocked' + agent uyarısı.
- Bu klasöre dokunan her task sonunda: `npm run test -- lib/slots` çalıştır, sonucu raporla.
```

---

## DOSYA: `.cursor/rules/ai.md`

```markdown
---
description: AI katmanı kuralları
globs: ["lib/ai/**", "app/api/ai/**"]
alwaysApply: false
---

- Prompt'lar koda gömülmez; lib/ai/prompts/*.md dosyalarından yüklenir.
- AI yazma işlemi yapmaz (v1): tool set salt-okur. Draft/contract çıktıları insan onayı olmadan gönderilmez/export edilmez.
- Her AI çağrısı: workspace scope filtresi zorunlu (RLS'e ek olarak uygulama katmanında da).
- Structured çıktı gereken yerde generateObject + zod; serbest metinde streamText.
- Model seçimi sadece lib/ai/models.ts üzerinden; endpoint'lere model adı hardcode edilmez.
- Contract akışında disclaimer_acknowledged=false iken export butonu disabled kalır — UI'da ve server'da.
```

---

## DOSYA: `.cursor/rules/db.md`

```markdown
---
description: Veritabanı kuralları
globs: ["lib/db/**", "drizzle/**"]
alwaysApply: false
---

- docs/03-database-schema.md tek kaynak; tablo eklerken önce oraya yaz, sonra schema'ya işle.
- RLS her yeni tabloda zorunlu; public token erişimi SECURITY DEFINER fonksiyonlarla, geniş anon policy yasak.
- Sorgular Drizzle ile; ham SQL sadece pgvector/RPC için.
- N+1 yasak: liste sorgularında join/CTE; sayfalama cursor-based (keyset).
- Soft delete: deleted_at set edilir; sorgularda default filtre. activity_log asla güncellenmez/silinmez.
```

---

## Kurulum Adımları (özet)

1. Yukarıdaki 5 dosyayı `.cursor/rules/` altına oluştur.
2. Cursor Settings → Rules'ta dosyaların tanındığını doğrula.
3. İlk chat: "rules/project.md kurallarını onayla ve docs/06-roadmap.md FAZ 0'a başla" — kuralların yüklendiğini burada test et (Cursor yanıtında token/kurallara atıf yapmalı).
4. Rules değiştirirse: yeni chat açmadan önce kuralları yeniden yükletmek için chat'te "kuralları yeniden oku" de.
