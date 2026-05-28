import React from 'react';
import { TruckIcon, Pencil, Trash2, XCircle, CheckCircle } from 'lucide-react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { formatDateTime, shipmentStatusLabel, shipmentStatusColor } from '../../../utils';
import type { Shipment } from '../../../types';

interface ShipmentViewModalProps {
  shipment:      Shipment | null;
  onClose:       () => void;
  onEdit:        (s: Shipment) => void;
  onDelete:      (s: Shipment) => void;
  onCancel:      (id: number) => void;
  onComplete:    (s: Shipment) => void;
  cancelLoading: boolean;
}

export const ShipmentViewModal: React.FC<ShipmentViewModalProps> = ({
  shipment, onClose, onEdit, onDelete, onCancel, onComplete, cancelLoading,
}) => (
  <Modal
    open={!!shipment}
    onClose={onClose}
    title={`Remessa #${shipment?.id}`}
    subtitle={shipment ? formatDateTime(shipment.createdAt) : ''}
    icon={<TruckIcon size={18} />}
    maxWidth="lg"
    footer={shipment?.status === 'open' ? <>
      <Button variant="secondary" icon={<Pencil size={14} />} onClick={() => onEdit(shipment!)}>Editar</Button>
      <button
        title="Excluir remessa"
        onClick={() => onDelete(shipment!)}
        className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 border border-gray-200 transition-colors"
      >
        <Trash2 size={15} />
      </button>
      <Button variant="danger" icon={<XCircle size={15} />} loading={cancelLoading} onClick={() => onCancel(shipment!.id)}>
        Cancelar
      </Button>
      <Button variant="success" icon={<CheckCircle size={15} />} onClick={() => onComplete(shipment!)}>
        Finalizar
      </Button>
    </> : null}
  >
    {shipment && (
      <div className="space-y-4">
        <Badge className={shipmentStatusColor[shipment.status]} dot>
          {shipmentStatusLabel[shipment.status]}
        </Badge>

        {shipment.notes && (
          <p className="text-sm text-gray-500 bg-gray-50 px-4 py-3 rounded-xl">{shipment.notes}</p>
        )}

        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="table-header text-left">Item</th>
                <th className="table-header text-left">Variação</th>
                <th className="table-header text-left">Tamanho</th>
                <th className="table-header text-right">Qtd.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {shipment.items?.map((item) => (
                <tr key={item.id}>
                  <td className="table-cell">{item.item?.name}</td>
                  <td className="table-cell text-gray-400">{item.variation?.description ?? '—'}</td>
                  <td className="table-cell text-gray-400">{item.size === 'none' ? '—' : item.size}</td>
                  <td className="table-cell text-right font-mono">{item.quantity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )}
  </Modal>
);
