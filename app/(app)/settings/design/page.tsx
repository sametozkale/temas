import { getTranslations } from "next-intl/server";

import { EmptyState } from "@/components/empty-state";
import { EventChip } from "@/components/event-chip";
import { Building03Icon, Icon, PlusSignIcon } from "@/components/icons";
import { PageHeader } from "@/components/page-header";
import { PromptBar } from "@/components/prompt-bar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

/**
 * Developer reference: verifies tokens, fonts, patched shadcn variants and the
 * custom components against docs/01-design-system.md. Not linked from the nav.
 */
export default async function DesignSystemPage() {
  const t = await getTranslations("settings");

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={t("design_title")}
        description={t("design_description")}
        actions={
          <>
            <Button variant="pill" size="sm">
              Davet et
            </Button>
            <Button size="sm">
              <Icon icon={PlusSignIcon} size={16} data-icon="inline-start" />
              Yeni mülk
            </Button>
          </>
        }
      />

      <section className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Yaklaşan görüşmeler</CardTitle>
          </CardHeader>
          <CardContent className="divide-y">
            <EventChip
              tone="brand"
              time="10:30"
              title="Kadıköy 2+1 — Ahmet Yılmaz"
              meta="Bugün · Onaylandı"
            />
            <EventChip
              tone="tenant"
              time="17:00"
              title="Moda ofis — kiracı müsaitlik penceresi"
              meta="Salı / Perşembe"
            />
            <EventChip
              tone="agent"
              time="14:00"
              title="Bostancı depo — agent penceresi"
              meta="Hafta içi"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Rozetler ve durumlar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="brand">Müsait slot</Badge>
              <Badge variant="success">Onaylandı</Badge>
              <Badge variant="info">Shortlisted</Badge>
              <Badge variant="warning">Hatırlatıcı gecikti</Badge>
              <Badge variant="secondary">Draft</Badge>
              <Badge variant="outline">Archived</Badge>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="soft" size="sm">
                Soft
              </Button>
              <Button variant="ghost" size="sm">
                Ghost
              </Button>
              <Button variant="outline" size="sm">
                Outline
              </Button>
              <Button variant="destructive" size="sm">
                Sil
              </Button>
            </div>
            <Input placeholder="Mülk ara…" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </CardContent>
        </Card>
      </section>

      <section>
        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="inventory">Inventory</TabsTrigger>
            <TabsTrigger value="people">People</TabsTrigger>
            <TabsTrigger value="files">Files</TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="pt-6">
            <EmptyState
              icon={Building03Icon}
              title="Henüz mülk yok"
              description="İlk mülkünü ekleyerek başla."
              action={
                <Button variant="ghost" size="sm">
                  Mülk ekle
                </Button>
              }
            />
          </TabsContent>
          <TabsContent
            value="inventory"
            className="pt-6 text-sm text-muted-foreground"
          >
            Demirbaş listesi burada görünecek.
          </TabsContent>
          <TabsContent
            value="people"
            className="pt-6 text-sm text-muted-foreground"
          >
            Owner, kiracı ve adaylar burada görünecek.
          </TabsContent>
          <TabsContent
            value="files"
            className="pt-6 text-sm text-muted-foreground"
          >
            Dokümanlar burada görünecek.
          </TabsContent>
        </Tabs>
      </section>

      <div className="flex justify-center">
        <PromptBar
          suggestions={[
            "Eylül'de kaç viewing var?",
            "Depozitosu eksik mülkler",
          ]}
        />
      </div>
    </div>
  );
}
