import React, { useState, useRef } from 'react';
import { Upload, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { usersService } from '../../../services/index';
import { useToast } from '../../../components/ui/Toast';
import type { ImportValidationResult, ImportResult } from '../../../types';

type ImportStep = 'idle' | 'validating' | 'validated' | 'importing' | 'done';

interface UserImportModalProps {
  open:    boolean;
  onClose: () => void;
}

export const UserImportModal: React.FC<UserImportModalProps> = ({ open, onClose }) => {
  const qc   = useQueryClient();
  const toast = useToast();

  const [step, setStep]                     = useState<ImportStep>('idle');
  const [file, setFile]                     = useState<File | null>(null);
  const [validationResult, setValidation]   = useState<ImportValidationResult | null>(null);
  const [importResult, setImportResult]     = useState<ImportResult | null>(null);
  const fileInputRef                        = useRef<HTMLInputElement>(null);

  const stepNum = step === 'idle' || step === 'validating' ? 1
    : step === 'validated' ? 2 : 3;

  const handleClose = () => {
    setStep('idle');
    setFile(null);
    setValidation(null);
    setImportResult(null);
    onClose();
  };

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setStep('validating');
    setValidation(null);
    try {
      const result = await usersService.validateImport(selected);
      setValidation(result);
      setStep('validated');
    } catch {
      toast.error('Erro ao validar planilha.');
      setStep('idle');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleConfirmImport() {
    if (!file) return;
    setStep('importing');
    try {
      const result = await usersService.bulkImport(file);
      setImportResult(result);
      setStep('done');
      qc.invalidateQueries({ queryKey: ['users'] });
    } catch {
      toast.error('Erro ao importar planilha.');
      setStep('validated');
    }
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Importar Alunos"
      subtitle="Importe uma planilha para cadastrar alunos em massa"
      icon={<Upload size={18} />}
      maxWidth="xl"
      footer={
        stepNum === 2 && validationResult ? <>
          <Button type="button" variant="secondary" onClick={() => { setStep('idle'); setFile(null); setValidation(null); }}>
            Trocar arquivo
          </Button>
          <Button type="button" onClick={handleConfirmImport} disabled={validationResult.validRows === 0}>
            Importar {validationResult.validRows} aluno(s)
          </Button>
        </> : stepNum === 3 && step === 'done' ? (
          <Button type="button" onClick={handleClose}>Fechar</Button>
        ) : null
      }
    >
      <div className="space-y-5">
        {/* Step indicator */}
        <div className="flex items-center justify-center">
          {[
            { n: 1, label: 'Arquivo' },
            { n: 2, label: 'Validação' },
            { n: 3, label: 'Importação' },
          ].map(({ n, label }, i) => (
            <React.Fragment key={n}>
              <div className="flex flex-col items-center gap-1.5">
                <div className={[
                  'w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all',
                  n < stepNum  ? 'bg-blue-600 border-blue-600 text-white' :
                  n === stepNum ? 'border-blue-500 text-blue-600 bg-blue-50' :
                                   'border-gray-200 text-gray-300 bg-white',
                ].join(' ')}>
                  {n < stepNum ? <CheckCircle2 size={14} /> : n}
                </div>
                <span className={`text-[10px] font-medium ${n <= stepNum ? 'text-blue-600' : 'text-gray-300'}`}>{label}</span>
              </div>
              {i < 2 && (
                <div className={`h-0.5 flex-1 mb-5 mx-2 transition-all ${n < stepNum ? 'bg-blue-600' : 'bg-gray-200'}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Etapa 1 */}
        {stepNum === 1 && (
          <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-xl py-12 gap-3">
            <Upload size={36} className={step === 'validating' ? 'text-blue-400 animate-bounce' : 'text-gray-300'} />
            <p className="text-sm text-gray-500">
              Selecione o arquivo <span className="font-semibold">.xlsx</span> ou <span className="font-semibold">.xls</span>
            </p>
            {file && step === 'validating' && (
              <p className="text-xs text-blue-500 font-medium">{file.name}</p>
            )}
            <Button type="button" variant="secondary" loading={step === 'validating'} onClick={() => fileInputRef.current?.click()}>
              {step === 'validating' ? 'Validando...' : 'Selecionar Arquivo'}
            </Button>
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileSelect} />
          </div>
        )}

        {/* Etapa 2 */}
        {stepNum === 2 && validationResult && (
          <>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-gray-800">{validationResult.totalRows}</p>
                <p className="text-xs text-gray-400 mt-0.5">Total de linhas</p>
              </div>
              <div className="bg-emerald-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-emerald-600">{validationResult.validRows}</p>
                <p className="text-xs text-gray-400 mt-0.5">Válidas</p>
              </div>
              <div className={`${validationResult.errorRows > 0 ? 'bg-red-50' : 'bg-emerald-50'} rounded-xl p-3 text-center`}>
                <p className={`text-2xl font-bold ${validationResult.errorRows > 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                  {validationResult.errorRows}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">Com erros</p>
              </div>
            </div>

            {validationResult.valid ? (
              <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-4 py-3 rounded-xl text-sm font-medium">
                <CheckCircle2 size={16} />
                Planilha válida! Todas as linhas podem ser importadas.
              </div>
            ) : (
              <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-4 py-3 rounded-xl text-sm font-medium">
                <AlertTriangle size={16} />
                {validationResult.errorRows} linha(s) com erros. As linhas válidas ainda podem ser importadas.
              </div>
            )}

            {validationResult.errors.length > 0 && (
              <div className="border border-red-100 rounded-xl overflow-hidden max-h-52 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-red-50 sticky top-0">
                    <tr>
                      <th className="table-header text-left w-14">Linha</th>
                      <th className="table-header text-left w-40">Campo</th>
                      <th className="table-header text-left">Erro</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-red-50">
                    {validationResult.errors.map((err, i) => (
                      <tr key={i} className="bg-white">
                        <td className="table-cell font-mono text-gray-400">{err.row}</td>
                        <td className="table-cell font-medium text-gray-600">{err.field}</td>
                        <td className="table-cell text-red-500">{err.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* Etapa 3 */}
        {stepNum === 3 && (
          <>
            {step === 'importing' && (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <Upload size={36} className="text-blue-400 animate-bounce" />
                <p className="text-sm text-gray-500 font-medium">Importando alunos, aguarde...</p>
                <p className="text-xs text-gray-400">Isso pode levar alguns instantes</p>
              </div>
            )}

            {step === 'done' && importResult && (
              <>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-emerald-50 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-emerald-600">{importResult.created}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Criados</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-gray-500">{importResult.skipped}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Já existiam</p>
                  </div>
                  <div className={`${importResult.errors.length > 0 ? 'bg-red-50' : 'bg-emerald-50'} rounded-xl p-3 text-center`}>
                    <p className={`text-2xl font-bold ${importResult.errors.length > 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                      {importResult.errors.length}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">Falhas</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-4 py-3 rounded-xl text-sm font-medium">
                  <CheckCircle2 size={16} />
                  Importação concluída! {importResult.created} aluno(s) cadastrado(s).
                </div>

                {importResult.errors.length > 0 && (
                  <div className="border border-red-100 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-red-50 sticky top-0">
                        <tr>
                          <th className="table-header text-left w-14">Linha</th>
                          <th className="table-header text-left">Erro</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-red-50">
                        {importResult.errors.map((err, i) => (
                          <tr key={i} className="bg-white">
                            <td className="table-cell font-mono text-gray-400">{err.row}</td>
                            <td className="table-cell text-red-500">{err.message}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </Modal>
  );
};
