import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { FileImage, Package, Pencil, Plus, QrCode, Sparkles, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AdStudioDialog } from "@/components/gram3d/ad-studio-dialog";
import { CatalogDialog } from "@/components/gram3d/catalog-dialog";
import { LabelDialog } from "@/components/gram3d/label-dialog";
import { OrderDialog } from "@/components/gram3d/order-dialog";
import { PageHeader } from "@/components/gram3d/page-header";
import { PartDialog } from "@/components/gram3d/part-dialog";
import { realizedProfit } from "@/lib/gram3d/calc";
import type { LabelInput } from "@/lib/gram3d/canvas";
import { formatMoney } from "@/lib/gram3d/format";
import { CARE, materialFamily, partQrText } from "@/lib/gram3d/labels";
import { actions, useAppState } from "@/lib/gram3d/store";
import type { OrderStatus, ReadyPart } from "@/lib/gram3d/types";

export const Route = createFileRoute("/pecas")({
  validateSearch: (s: Record<string, unknown>): { anuncio?: string } =>
    typeof s['anuncio'] === "string" ? { anuncio: s['anuncio'] } : {},
  head: () => ({
    meta: [
      { title: "Peças & Vendas — Gram3D" },
      { name: "description", content: "Stock de peças prontas e encomendas de clientes com lucro realizado." },
      { property: "og:title", content: "Peças & Vendas — Gram3D" },
      { property: "og:description", content: "Gere peças prontas a vender e encomendas de clientes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PartsPage,
});

const STATUS: { id: OrderStatus; label: string }[] = [
  { id: "pending", label: "Pendente" },
  { id: "printing", label: "A Imprimir" },
  { id: "ready", label: "Pronta" },
  { id: "delivered", label: "Entregue" },
];

function PartsPage() {
  const { parts, orders, sales, settings, profile } = useAppState();
  const [editing, setEditing] = useState<ReadyPart | "new" | null>(null);
  const [orderOpen, setOrderOpen] = useState(false);
  const [adPart, setAdPart] = useState<ReadyPart | null>(null);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [qr, setQr] = useState<LabelInput | null>(null);
  const { anuncio } = Route.useSearch();
  const navigate = useNavigate();
  useEffect(() => {
    if (!anuncio) return;
    const part = parts.find((p) => p.id === anuncio);
    if (part) setAdPart(part);
    navigate({ to: "/pecas", search: {}, replace: true });
  }, [anuncio, parts, navigate]);
  const clientLabel = (p: ReadyPart): LabelInput => ({
    heading: profile.brandName || "Gram3D",
    title: p.name,
    subtitle: `Impresso em 3D · ${p.material}`,
    lines: CARE[materialFamily(p.material)],
    footer: profile.contact ? `Contacto: ${profile.contact}` : undefined,
    qrText: partQrText(p, profile.brandName || "Gram3D", profile.contact),
  });
  const fmt = (v: number) => formatMoney(v, settings.currency);

  return (
    <>
      <PageHeader
        eyebrow="Vendas"
        title="Peças & Vendas"
        description={`Lucro realizado: ${fmt(realizedProfit(sales))}`}
      />
      <Tabs defaultValue="stock">
        <TabsList className="mb-4">
          <TabsTrigger value="stock">Stock de Peças Prontas</TabsTrigger>
          <TabsTrigger value="orders">Encomendas de Clientes</TabsTrigger>
        </TabsList>

        <TabsContent value="stock">
          <div className="mb-3 flex flex-wrap justify-end gap-2">
            <Button size="sm" variant="outline" onClick={() => setCatalogOpen(true)} disabled={parts.length === 0}>
              <FileImage /> Catálogo WhatsApp
            </Button>
            <Button size="sm" onClick={() => setEditing("new")}>
              <Plus /> Nova peça
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {parts.map((p) => (
              <div key={p.id} className="panel overflow-hidden">
                <div className="grid aspect-square place-items-center bg-surface">
                  {p.photo ? (
                    <img src={p.photo} alt={p.name} loading="lazy" className="size-full object-cover" />
                  ) : (
                    <Package className="size-8 text-muted-foreground" />
                  )}
                </div>
                <div className="flex items-start gap-2 p-4">
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{p.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {p.material} · {p.quantity} em stock
                    </div>
                    <div className="mt-1 font-semibold tabular text-gradient-primary">{fmt(p.unitPrice)}</div>
                  </div>
                  <Button size="icon" variant="ghost" aria-label={`Editar ${p.name}`} onClick={() => setEditing(p)}>
                    <Pencil />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={`Remover ${p.name}`}
                    className="text-muted-foreground"
                    onClick={() => confirm(`Remover ${p.name}?`) && actions.removePart(p.id)}
                  >
                    <Trash2 />
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2 px-4 pb-4">
                  <Button size="sm" className="bg-gradient-primary shadow-glow hover:opacity-90" onClick={() => setAdPart(p)}>
                    <Sparkles /> Criar Anúncio
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setQr(clientLabel(p))}>
                    <QrCode /> QR Cliente
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="orders">
          <div className="mb-3 flex justify-end">
            <Button size="sm" onClick={() => setOrderOpen(true)}>
              <Plus /> Nova encomenda
            </Button>
          </div>
          <div className="panel divide-y divide-border">
            {orders.length === 0 && <div className="p-8 text-center text-sm text-muted-foreground">Sem encomendas.</div>}
            {orders.map((o) => (
              <div key={o.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{o.client}</div>
                  <div className="text-xs text-muted-foreground">
                    {o.partName} ×{o.quantity} · entrega {o.dueDate}
                  </div>
                </div>
                <div className="font-semibold tabular">{fmt(o.total)}</div>
                <Select
                  value={o.status}
                  disabled={o.status === "delivered"}
                  onValueChange={(v) => actions.setOrderStatus(o.id, v as OrderStatus)}
                >
                  <SelectTrigger className="h-9 w-36" aria-label={`Estado de ${o.client}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <PartDialog part={editing} onClose={() => setEditing(null)} />
      <OrderDialog open={orderOpen} onOpenChange={setOrderOpen} />
      <AdStudioDialog part={adPart} onClose={() => setAdPart(null)} />
      <CatalogDialog open={catalogOpen} onOpenChange={setCatalogOpen} />
      <LabelDialog
        title="QR Cliente"
        description="Etiqueta para entregar com a peça: cuidados do material e o teu contacto."
        label={qr}
        onClose={() => setQr(null)}
      />
    </>
  );
}
