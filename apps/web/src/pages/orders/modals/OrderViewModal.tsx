import React, { useState, useEffect } from 'react';
import { ShoppingCart, Plus, CheckCircle, XCircle, Package } from 'lucide-react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { ComboBox } from '../../../components/ui/ComboBox';
import { Textarea } from '../../../components/ui/FormFields';
import { itemsService } from '../../../services/itemsService';
import { formatDateTime, orderStatusLabel, orderStatusColor, aidColor } from '../../../utils';
import type { Order, Item, StudentProfile, ReviewOrderDto } from '../../../types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const CLOTHING_SIZES = ['PP', 'P', 'M', 'G', 'GG', 'GGG'];
const SHOE_SIZES = ['33','34','35','36','37','38','39','40','41','42','43','44','45'];

function getSizeOptions(item?: Item) {
  if (!item || item.sizeType === 'none') return null;
  const sizes = item.sizeType === 'clothing' ? CLOTHING_SIZES : SHOE_SIZES;
  return sizes.map((s) => ({ value: s, label: s }));
}

const itemsFetchFn = async ({ search, pageIndex, pageSize }: { search: string; pageIndex: number; pageSize: number }) => {
  const res = await itemsService.list({ name: search || undefined, pageIndex, pageSize, isActive: true });
  return { data: res.data.map((i) => ({ value: String(i.id), label: i.name, ...i })), total: res.total };
};

// ─── StudentInfoPanel ─────────────────────────────────────────────────────────

function StudentInfoPanel({ profile }: { profile: StudentProfile }) {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Dados do Aluno</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1.5 text-xs">
        {profile.registrationNumber && (
          <div><span className="text-gray-400 block">Matrícula</span><span className="font-mono font-medium text-gray-700">{profile.registrationNumber}</span></div>
        )}
        {profile.campus && (
          <div><span className="text-gray-400 block">Campus</span><span className="font-medium text-gray-700">{profile.campus}</span></div>
        )}
        {profile.educationLevel && (
          <div><span className="text-gray-400 block">Nível</span><span className="font-medium text-gray-700">{profile.educationLevel}</span></div>
        )}
        {profile.course && (
          <div className="col-span-2 sm:col-span-3"><span className="text-gray-400 block">Curso</span><span className="font-medium text-gray-700">{profile.course}</span></div>
        )}
        {profile.modality && (
          <div><span className="text-gray-400 block">Modalidade</span><span className="font-medium text-gray-700">{profile.modality}</span></div>
        )}
        {profile.mealTypes && (
          <div><span className="text-gray-400 block">Refeição</span><span className="font-medium text-gray-700">{profile.mealTypes}</span></div>
        )}
      </div>
      {profile.aids?.length ? (
        <div className="mt-2 flex flex-wrap gap-1">
          {profile.aids.map((aid) => (
            <span key={aid} className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${aidColor(aid)}`}>
              {aid.replace(' (VC)', '')}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

type ReviewLine = {
  orderItemId: number;
  approved: boolean;
  approvedQuantity: number;
  requestedQuantity: number;
  itemName: string;
  variationName: string;
  size: string;
};

type AddLine = { itemId: string; variationId: string; size: string; quantity: number };

interface OrderViewModalProps {
  order:          Order | null;
  isAdmin:        boolean;
  onClose:        () => void;
  onReview:       (dto: ReviewOrderDto) => void;
  onDeliver:      (order: Order) => void;
  reviewLoading:  boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const OrderViewModal: React.FC<OrderViewModalProps> = ({
  order, isAdmin, onClose, onReview, onDeliver, reviewLoading,
}) => {
  const [reviewLines, setReviewLines] = useState<ReviewLine[]>([]);
  const [reviewNotes, setReviewNotes] = useState('');
  const [addLines, setAddLines]       = useState<AddLine[]>([]);
  const [addSel, setAddSel]           = useState<(Item | undefined)[]>([]);

  useEffect(() => {
    if (order?.status === 'pending' && isAdmin) {
      setReviewLines(
        order.items.map((i) => ({
          orderItemId:       Number(i.id),
          approved:          true,
          approvedQuantity:  i.requestedQuantity,
          requestedQuantity: i.requestedQuantity,
          itemName:          i.item?.name ?? `Item #${i.itemId}`,
          variationName:     i.variation?.description ?? '',
          size:              i.size,
        })),
      );
      setReviewNotes('');
      setAddLines([]);
      setAddSel([]);
    }
  }, [order?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleApprove = () => {
    if (!order) return;
    onReview({
      status:     'approved',
      adminNotes: reviewNotes || undefined,
      items: reviewLines.map((l) => ({
        orderItemId:      Number(l.orderItemId),
        approvedQuantity: l.approved ? l.approvedQuantity : 0,
      })),
      newItems: addLines
        .filter((l) => !!l.itemId)
        .map((l) => ({
          itemId:           Number(l.itemId),
          variationId:      l.variationId ? Number(l.variationId) : undefined,
          size:             l.size || 'none',
          approvedQuantity: l.quantity,
        })),
    });
  };

  const handleReject = () => {
    if (!order) return;
    onReview({ status: 'rejected', adminNotes: reviewNotes || undefined });
  };

  const isPending  = order?.status === 'pending';
  const isApproved = order?.status === 'approved';

  return (
    <Modal
      open={!!order}
      onClose={onClose}
      title={`Pedido #${order?.id}`}
      subtitle={`${order?.user?.name} — ${order ? formatDateTime(order.createdAt) : ''}`}
      icon={<ShoppingCart size={18} />}
      maxWidth="2xl"
      footer={
        order && isAdmin ? (
          isPending ? <>
            <Button variant="danger" icon={<XCircle size={15} />} loading={reviewLoading} onClick={handleReject}>
              Recusar
            </Button>
            <Button variant="success" icon={<CheckCircle size={15} />} loading={reviewLoading} onClick={handleApprove}>
              Aprovar Pedido
            </Button>
          </> : isApproved ? (
            <Button variant="success" icon={<Package size={15} />} onClick={() => onDeliver(order)}>
              Marcar como Entregue
            </Button>
          ) : null
        ) : null
      }
    >
      {order && (
        <div className="space-y-4">
          <Badge className={orderStatusColor[order.status]} dot>
            {orderStatusLabel[order.status]}
          </Badge>

          {isAdmin && order.user?.studentProfile && (
            <StudentInfoPanel profile={order.user.studentProfile} />
          )}

          {/* ── Editable review (admin, pending) ───────────────────────────── */}
          {isAdmin && isPending ? (
            <>
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="table-header text-left">Item</th>
                      <th className="table-header text-left">Var.</th>
                      <th className="table-header text-center">Tam.</th>
                      <th className="table-header text-right">Solicit.</th>
                      <th className="table-header text-right">Aprovar</th>
                      <th className="table-header text-center w-14">Ativo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {reviewLines.map((line, idx) => (
                      <tr key={line.orderItemId} className={!line.approved ? 'opacity-40' : ''}>
                        <td className="table-cell text-sm">{line.itemName}</td>
                        <td className="table-cell text-gray-400 text-xs">{line.variationName || '—'}</td>
                        <td className="table-cell text-center text-gray-400 text-xs">{line.size === 'none' ? '—' : line.size}</td>
                        <td className="table-cell text-right font-mono text-sm">{line.requestedQuantity}</td>
                        <td className="table-cell text-right">
                          <input
                            type="number" min={1} disabled={!line.approved} value={line.approvedQuantity}
                            onChange={(e) => setReviewLines((prev) =>
                              prev.map((l, i) => i === idx ? { ...l, approvedQuantity: Math.max(1, Number(e.target.value)) } : l)
                            )}
                            className="w-16 text-right border border-gray-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 disabled:opacity-40 disabled:bg-gray-50"
                          />
                        </td>
                        <td className="table-cell text-center">
                          <button
                            type="button"
                            onClick={() => setReviewLines((prev) =>
                              prev.map((l, i) => i === idx ? { ...l, approved: !l.approved } : l)
                            )}
                            className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ${line.approved ? 'bg-blue-600' : 'bg-gray-200'}`}
                          >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ${line.approved ? 'translate-x-4' : 'translate-x-0'}`} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {addLines.length > 0 && (
                <div className="border border-blue-100 bg-blue-50/40 rounded-xl p-3 space-y-2">
                  <p className="text-xs font-semibold text-blue-600 mb-1">Itens adicionados pelo administrador</p>
                  <div className="grid grid-cols-12 gap-2 px-0.5">
                    <p className="col-span-4 text-xs text-gray-400">Item</p>
                    <p className="col-span-3 text-xs text-gray-400">Variação</p>
                    <p className="col-span-2 text-xs text-gray-400">Tamanho</p>
                    <p className="col-span-2 text-xs text-gray-400">Qtd.</p>
                    <div className="col-span-1" />
                  </div>
                  {addLines.map((line, idx) => {
                    const selItem  = addSel[idx];
                    const sizeOpts = getSizeOptions(selItem);
                    return (
                      <div key={idx} className="grid grid-cols-12 gap-2 items-start">
                        <div className="col-span-4">
                          <ComboBox
                            fetchFn={itemsFetchFn} queryKey={`rev-add-${idx}`} value={line.itemId} placeholder="Item..."
                            onChange={(val, opt) => {
                              setAddLines((p) => p.map((l, i) => i === idx ? { ...l, itemId: val, variationId: '', size: '' } : l));
                              setAddSel((p) => { const n = [...p]; n[idx] = opt as unknown as Item; return n; });
                            }}
                          />
                        </div>
                        <div className="col-span-3">
                          {selItem?.hasVariations ? (
                            <ComboBox
                              options={selItem.variations?.filter((v) => v.isActive).map((v) => ({ value: String(v.id), label: v.description })) ?? []}
                              value={line.variationId} clearable={false} placeholder="Variação..."
                              onChange={(val) => setAddLines((p) => p.map((l, i) => i === idx ? { ...l, variationId: val } : l))}
                            />
                          ) : (
                            <div className="h-[42px] flex items-center px-3 text-xs text-gray-400 bg-gray-50 rounded-xl border border-gray-200">{selItem ? 'Sem variação' : '—'}</div>
                          )}
                        </div>
                        <div className="col-span-2">
                          {sizeOpts ? (
                            <ComboBox
                              options={sizeOpts} value={line.size} clearable={false} placeholder="Tamanho..."
                              onChange={(val) => setAddLines((p) => p.map((l, i) => i === idx ? { ...l, size: val } : l))}
                            />
                          ) : (
                            <div className="h-[42px] flex items-center px-3 text-xs text-gray-400 bg-gray-50 rounded-xl border border-gray-200">{selItem ? 'Sem tam.' : '—'}</div>
                          )}
                        </div>
                        <div className="col-span-2">
                          <input
                            type="number" min={1} placeholder="0" value={line.quantity}
                            onChange={(e) => setAddLines((p) => p.map((l, i) => i === idx ? { ...l, quantity: Math.max(1, Number(e.target.value)) } : l))}
                            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                          />
                        </div>
                        <div className="col-span-1">
                          <button type="button"
                            onClick={() => { setAddLines((p) => p.filter((_, i) => i !== idx)); setAddSel((p) => p.filter((_, i) => i !== idx)); }}
                            className="w-9 h-[42px] flex items-center justify-center text-red-400 hover:bg-red-50 rounded-xl transition-colors">
                            ×
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <Button type="button" variant="secondary" size="sm" icon={<Plus size={13} />}
                onClick={() => { setAddLines((p) => [...p, { itemId: '', variationId: '', size: '', quantity: 1 }]); setAddSel((p) => [...p, undefined]); }}>
                Adicionar Item
              </Button>

              <Textarea
                label="Observações"
                placeholder="Observações para o aluno (opcional)..."
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
              />
            </>
          ) : (
            /* ── Read-only (non-pending) ───────────────────────────────────── */
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="table-header text-left">Item</th>
                    <th className="table-header text-left">Variação</th>
                    <th className="table-header text-left">Tamanho</th>
                    <th className="table-header text-right">Solicitado</th>
                    <th className="table-header text-right">Aprovado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {order.items?.map((item) => (
                    <tr key={item.id}>
                      <td className="table-cell">{item.item?.name}</td>
                      <td className="table-cell text-gray-400">{item.variation?.description ?? '—'}</td>
                      <td className="table-cell text-gray-400">{item.size === 'none' ? '—' : item.size}</td>
                      <td className="table-cell text-right font-mono">{item.requestedQuantity || '—'}</td>
                      <td className="table-cell text-right font-mono">
                        {item.approvedQuantity != null
                          ? item.approvedQuantity === 0
                            ? <span className="text-red-400 text-xs">Não aprovado</span>
                            : item.approvedQuantity
                          : <span className="text-gray-300">—</span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {order.adminNotes && (
            <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-sm text-amber-800">
              <p className="text-xs font-semibold text-amber-500 mb-0.5">Observações do administrador</p>
              {order.adminNotes}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};
