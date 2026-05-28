import React from 'react';
import { Settings2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/FormFields';
import type { StockEntry } from '../../../types';

interface StockMinModalProps {
  entry:   StockEntry | null;
  onClose: () => void;
  onSave:  (entry: StockEntry, minimum: number) => void;
  loading: boolean;
}

const FORM_ID = 'stock-min-modal-form';

export const StockMinModal: React.FC<StockMinModalProps> = ({ entry, onClose, onSave, loading }) => {
  const { register, handleSubmit, reset } = useForm<{ minimum: number }>({
    values: { minimum: entry?.minimumQuantity ?? 0 },
  });

  const handleClose = () => { reset(); onClose(); };

  const subtitle = entry
    ? `${entry.item?.name}${entry.variation?.description ? ` — ${entry.variation.description}` : ''}${entry.size && entry.size !== 'none' ? ` (${entry.size})` : ''}`
    : '';

  return (
    <Modal
      open={!!entry}
      onClose={handleClose}
      title="Editar Estoque Mínimo"
      subtitle={subtitle}
      icon={<Settings2 size={18} />}
      maxWidth="sm"
      footer={<>
        <Button type="button" variant="secondary" onClick={handleClose}>Cancelar</Button>
        <Button type="submit" form={FORM_ID} loading={loading}>Salvar</Button>
      </>}
    >
      <form
        id={FORM_ID}
        onSubmit={handleSubmit((d) => entry && onSave(entry, d.minimum))}
        className="space-y-4"
      >
        <div className="flex gap-4 p-3 bg-gray-50 rounded-xl text-sm">
          <div>
            <p className="text-xs text-gray-400">Atual</p>
            <p className="font-bold text-gray-800">{entry?.availableQuantity} un.</p>
          </div>
          <div className="w-px bg-gray-200" />
          <div>
            <p className="text-xs text-gray-400">Mínimo atual</p>
            <p className="font-bold text-gray-800">{entry?.minimumQuantity} un.</p>
          </div>
        </div>

        <Input
          label="Novo Mínimo"
          type="number"
          min={0}
          {...register('minimum', { valueAsNumber: true })}
        />
      </form>
    </Modal>
  );
};
