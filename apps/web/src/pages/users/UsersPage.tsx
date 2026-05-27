import React, { useState, useEffect, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Users, Plus, Trash2, ShieldCheck, GraduationCap, Pencil,
  Download, Upload, CheckCircle2, XCircle, AlertTriangle,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Header } from '../../components/layout/Header';
import { Button } from '../../components/ui/Button';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Pagination } from '../../components/ui/Pagination';
import { Modal } from '../../components/ui/Modal';
import { ConfirmModal } from '../../components/ui/Modal';
import { Input, Select } from '../../components/ui/FormFields';
import { usersService } from '../../services/index';
import { useToast } from '../../components/ui/Toast';
import { getInitials, formatDate } from '../../utils';
import { UserFilters, defaultFilters } from './UserFilters';
import type { UserFiltersState } from './UserFilters';
import type { User, UpdateUserDto, ImportValidationResult, ImportResult, StudentAid, IntakeForm } from '../../types';

type OutletCtx = { onMenuClick: () => void };

const AIDS_OPTIONS: { value: StudentAid; label: string }[] = [
  { value: 'Auxílio Alimentação (VC)',             label: 'Auxílio Alimentação' },
  { value: 'Auxílio Transporte Municipal (VC)',    label: 'Transporte Municipal' },
  { value: 'Auxílio Transporte Intermunicipal (VC)', label: 'Transporte Intermunicipal' },
  { value: 'Auxílio Moradia (VC)',                 label: 'Moradia' },
  { value: 'Auxílio Cópia e Impressão (VC)',       label: 'Cópia e Impressão' },
  { value: 'Bolsa de Estudo (VC)',                 label: 'Bolsa de Estudo' },
];

const INTAKE_OPTIONS: { value: IntakeForm; label: string }[] = [
  { value: 'SISU / AMPLA CONCORRÊNCIA',                                                                                                   label: 'SISU / Ampla Concorrência' },
  { value: 'SISU / ESCOLAS PÚBLICAS',                                                                                                     label: 'SISU / Escolas Públicas' },
  { value: 'SISU / ESCOLAS PÚBLICAS / BAIXA RENDA',                                                                                      label: 'SISU / EP / Baixa Renda' },
  { value: 'SISU / ESCOLAS PÚBLICAS / AUTODECLARAÇÃO - PRETOS, PARDOS E INDÍGENAS',                                                       label: 'SISU / EP / PPI' },
  { value: 'SISU / ESCOLAS PÚBLICAS / BAIXA RENDA / AUTODECLARAÇÃO - PRETOS, PARDOS E INDÍGENAS',                                        label: 'SISU / EP / Baixa Renda / PPI' },
  { value: 'SISU / ESCOLAS PÚBLICAS / AUTODECLARAÇÃO - PRETOS, PARDOS E INDÍGENAS / PESSOAS COM DEFICIÊNCIA',                            label: 'SISU / EP / PPI / PCD' },
  { value: 'SISU / ESCOLAS PÚBLICAS / BAIXA RENDA / AUTODECLARAÇÃO - PRETOS, PARDOS E INDÍGENAS / PESSOAS COM DEFICIÊNCIA',              label: 'SISU / EP / Baixa Renda / PPI / PCD' },
  { value: 'PROCESSO SELETIVO / AMPLA CONCORRÊNCIA',                                                                                     label: 'Proc. Seletivo / Ampla Concorrência' },
  { value: 'PROCESSO SELETIVO / ESCOLAS PÚBLICAS',                                                                                       label: 'Proc. Seletivo / Escolas Públicas' },
  { value: 'PROCESSO SELETIVO / ESCOLAS PÚBLICAS / BAIXA RENDA',                                                                         label: 'Proc. Seletivo / EP / Baixa Renda' },
  { value: 'PROCESSO SELETIVO / ESCOLAS PÚBLICAS / AUTODECLARAÇÃO - PRETOS, PARDOS E INDÍGENAS',                                         label: 'Proc. Seletivo / EP / PPI' },
  { value: 'PROCESSO SELETIVO / ESCOLAS PÚBLICAS / BAIXA RENDA / AUTODECLARAÇÃO - PRETOS, PARDOS E INDÍGENAS',                           label: 'Proc. Seletivo / EP / Baixa Renda / PPI' },
  { value: 'PROCESSO SELETIVO / QUILOMBOLAS',                                                                                             label: 'Proc. Seletivo / Quilombolas' },
  { value: 'PROCESSO SELETIVO / PESSOA COM DEFICIÊNCIA',                                                                                  label: 'Proc. Seletivo / PCD' },
  { value: 'PROCESSO SELETIVO / ESCOLAS PÚBLICAS / PESSOAS COM DEFICIÊNCIA',                                                              label: 'Proc. Seletivo / EP / PCD' },
  { value: 'PROCESSO SELETIVO / ESCOLAS PÚBLICAS / PESSOAS COM DEFICIÊNCIA / BAIXA RENDA',                                               label: 'Proc. Seletivo / EP / PCD / Baixa Renda' },
  { value: 'PROCESSO SELETIVO / ESCOLAS PÚBLICAS / PESSOAS COM DEFICIÊNCIA / AUTODECLARAÇÃO - PRETOS, PARDOS E INDÍGENAS',               label: 'Proc. Seletivo / EP / PCD / PPI' },
  { value: 'PROCESSO SELETIVO / ESCOLAS PÚBLICAS / PESSOAS COM DEFICIÊNCIA / BAIXA RENDA / AUTODECLARAÇÃO - PRETOS, PARDOS E INDÍGENAS', label: 'Proc. Seletivo / EP / PCD / Baixa Renda / PPI' },
  { value: 'PROCESSO SELETIVO PARA VAGAS REMANESCENTES / ESCOLAS PÚBLICAS / AUTODECLARAÇÃO - PRETOS, PARDOS E INDÍGENAS',                label: 'Proc. Seletivo Vagas Remanescentes / EP / PPI' },
  { value: 'PROGRAMA PEC-G',                                                                                                              label: 'Programa PEC-G' },
];

const createSchema = z.object({
  name:               z.string().min(2, 'Nome obrigatório'),
  email:              z.string().email('E-mail inválido'),
  password:           z.string().min(6, 'Mínimo 6 caracteres').optional(),
  userType:           z.enum(['admin', 'student']),
  // student fields
  registrationNumber: z.string().optional(),
  course:             z.string().optional(),
  campus:             z.string().optional(),
  educationLevel:     z.string().optional(),
  modality:           z.string().optional(),
  intakeForm:         z.string().optional(),
  aids:               z.array(z.string()).optional(),
  mealTypes:          z.string().optional(),
  baremScore:         z.string().optional(),
  // admin fields
  position:           z.string().optional(),
});
type CreateForm = z.infer<typeof createSchema>;

const editSchema = z.object({
  name:               z.string().min(2, 'Nome obrigatório'),
  email:              z.string().email('E-mail inválido'),
  password:           z.string().min(6, 'Mínimo 6 caracteres').or(z.literal('')).optional(),
  registrationNumber: z.string().optional(),
  course:             z.string().optional(),
  position:           z.string().optional(),
  isActive:           z.enum(['true', 'false']),
});
type EditForm = z.infer<typeof editSchema>;

// ── Import modal states ──
type ImportStep = 'idle' | 'validating' | 'validated' | 'importing' | 'done';

export const UsersPage: React.FC = () => {
  const { onMenuClick } = useOutletContext<OutletCtx>();
  const toast = useToast();
  const qc = useQueryClient();

  const [page, setPage]             = useState(1);
  const [typeFilter, setTypeFilter] = useState<'all' | 'admin' | 'student'>('all');
  const [filters, setFilters]       = useState<UserFiltersState>(defaultFilters);
  const [createModal, setCreateModal] = useState(false);
  const [deleteUser, setDeleteUser]   = useState<User | null>(null);
  const [editUserId, setEditUserId]   = useState<number | null>(null);

  // ── Import state ──
  const [importOpen, setImportOpen]         = useState(false);
  const [importStep, setImportStep]         = useState<ImportStep>('idle');
  const [importFile, setImportFile]         = useState<File | null>(null);
  const [validationResult, setValidation]   = useState<ImportValidationResult | null>(null);
  const [importResult, setImportResult]     = useState<ImportResult | null>(null);
  const fileInputRef                        = useRef<HTMLInputElement>(null);

  const handleFiltersChange = (f: UserFiltersState) => {
    setFilters(f);
    setPage(1);
  };

  // ── Queries ──────────────────────────────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ['users', page, typeFilter, filters],
    queryFn: () => usersService.list({
      pageIndex:          page - 1,
      pageSize:           10,
      userType:           typeFilter === 'all' ? undefined : typeFilter,
      name:               filters.name               || undefined,
      isActive:           filters.isActive           || undefined,
      createdFrom:        filters.createdFrom        || undefined,
      createdTo:          filters.createdTo          || undefined,
      registrationNumber: filters.registrationNumber || undefined,
      course:             filters.course             || undefined,
      position:           filters.position           || undefined,
    }),
  });

  const { data: editUserData } = useQuery({
    queryKey: ['user', editUserId],
    queryFn:  () => usersService.get(editUserId!),
    enabled:  !!editUserId,
  });

  // ── Forms ────────────────────────────────────────────────────────────────────
  const {
    register, handleSubmit, watch, reset,
    formState: { errors },
  } = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: { userType: 'student' },
  });
  const watchType = watch('userType');

  const {
    register: editReg, handleSubmit: editHandleSubmit,
    reset: editReset, formState: { errors: editErrors },
  } = useForm<EditForm>({
    resolver: zodResolver(editSchema),
  });
  const editUserType = editUserData?.userType;

  useEffect(() => {
    if (editUserData) {
      editReset({
        name:               editUserData.name,
        email:              editUserData.email,
        password:           '',
        registrationNumber: editUserData.studentProfile?.registrationNumber ?? '',
        course:             editUserData.studentProfile?.course ?? '',
        position:           editUserData.adminProfile?.position ?? '',
        isActive:           editUserData.isActive ? 'true' : 'false',
      });
    }
  }, [editUserData, editReset]);

  // ── Mutations ────────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: usersService.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      toast.success('Usuário criado!');
      setCreateModal(false);
      reset();
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Erro ao criar usuário.'),
  });

  function buildCreatePayload(d: CreateForm) {
    const base = {
      name:     d.name,
      email:    d.email,
      password: d.userType === 'student' ? `ifba.${d.registrationNumber ?? ''}` : (d.password ?? ''),
      userType: d.userType,
    };
    if (d.userType === 'student') {
      return {
        ...base,
        registrationNumber: d.registrationNumber || undefined,
        course:             d.course             || undefined,
        campus:             d.campus             || undefined,
        educationLevel:     (d.educationLevel    || undefined) as any,
        modality:           (d.modality          || undefined) as any,
        intakeForms:        d.intakeForm ? [d.intakeForm as any] : undefined,
        aids:               d.aids?.length ? d.aids as any : undefined,
        mealTypes:          d.mealTypes          || undefined,
        baremScore:         d.baremScore ? Number(d.baremScore) : undefined,
      };
    }
    return { ...base, position: d.position || undefined };
  }

  const editMutation = useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: UpdateUserDto }) =>
      usersService.update(id, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      qc.invalidateQueries({ queryKey: ['user', editUserId] });
      toast.success('Usuário atualizado!');
      setEditUserId(null);
    },
    onError: () => toast.error('Erro ao atualizar usuário.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => usersService.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      toast.success('Usuário removido.');
      setDeleteUser(null);
    },
    onError: () => toast.error('Erro ao remover usuário.'),
  });

  const onEditSubmit = (d: EditForm) => {
    const dto: UpdateUserDto = {
      name:     d.name,
      email:    d.email,
      isActive: d.isActive === 'true',
      ...(d.password ? { password: d.password } : {}),
      ...(editUserType === 'student'
        ? { registrationNumber: d.registrationNumber, course: d.course }
        : { position: d.position }),
    };
    editMutation.mutate({ id: editUserId!, dto });
  };

  // ── Import handlers ───────────────────────────────────────────────────────────
  function openImport() {
    setImportOpen(true);
    setImportStep('idle');
    setImportFile(null);
    setValidation(null);
    setImportResult(null);
  }

  function closeImport() {
    setImportOpen(false);
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFile(file);
    setImportStep('validating');
    setValidation(null);
    try {
      const result = await usersService.validateImport(file);
      setValidation(result);
      setImportStep('validated');
    } catch {
      toast.error('Erro ao validar planilha.');
      setImportStep('idle');
    } finally {
      // reset input so same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleConfirmImport() {
    if (!importFile) return;
    setImportStep('importing');
    try {
      const result = await usersService.bulkImport(importFile);
      setImportResult(result);
      setImportStep('done');
      qc.invalidateQueries({ queryKey: ['users'] });
    } catch {
      toast.error('Erro ao importar planilha.');
      setImportStep('validated');
    }
  }

  // ── Columns ──────────────────────────────────────────────────────────────────
  const columns = [
    {
      key: 'name', header: 'Usuário',
      render: (u: User) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {getInitials(u.name)}
          </div>
          <div>
            <p className="font-medium text-gray-800">{u.name}</p>
            <p className="text-xs text-gray-400">{u.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'userType', header: 'Tipo',
      render: (u: User) => u.userType === 'admin'
        ? <Badge className="bg-blue-50 text-blue-700"><ShieldCheck size={11} />Admin</Badge>
        : <Badge className="bg-gray-100 text-gray-600"><GraduationCap size={11} />Estudante</Badge>,
    },
    {
      key: 'detail', header: 'Detalhes',
      render: (u: User) => u.userType === 'admin'
        ? (
          <span className="text-xs text-gray-500">{u.adminProfile?.position ?? '—'}</span>
        ) : (
          <div>
            <p className="text-xs font-mono text-gray-500">{u.studentProfile?.registrationNumber ?? '—'}</p>
            <p className="text-xs text-gray-400">{u.studentProfile?.course ?? '—'}</p>
          </div>
        ),
    },
    {
      key: 'createdAt', header: 'Desde',
      render: (u: User) => <span className="text-xs text-gray-400">{formatDate(u.createdAt)}</span>,
    },
    {
      key: 'isActive', header: 'Status',
      render: (u: User) => u.isActive
        ? <Badge className="bg-emerald-500Bg text-emerald-500" dot>Ativo</Badge>
        : <Badge className="bg-red-500Bg text-red-500" dot>Inativo</Badge>,
    },
    {
      key: 'actions', header: '',
      render: (u: User) => (
        <div className="flex items-center gap-1 justify-end">
          <button
            onClick={() => setEditUserId(Number(u.id))}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-colors"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={() => setDeleteUser(u)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-500Bg transition-colors"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <Header
        title="Usuários"
        subtitle="Gerencie administradores e estudantes"
        onMenuClick={onMenuClick}
        actions={
          <div className="flex items-center gap-2">
            <a
              href={usersService.downloadTemplate()}
              download="modelo-alunos.xlsx"
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <Download size={14} />
              Planilha Modelo
            </a>
            <Button variant="secondary" icon={<Upload size={15} />} onClick={openImport}>
              Importar
            </Button>
            <Button icon={<Plus size={15} />} onClick={() => setCreateModal(true)}>
              Novo Usuário
            </Button>
          </div>
        }
      />

      <div className="p-4 sm:p-6 animate-fade-in">
        <div className="card">
          {/* Type tabs */}
          <div className="px-5 py-3 border-b border-gray-100 flex gap-1">
            {(['all', 'admin', 'student'] as const).map((t) => (
              <button
                key={t}
                onClick={() => {
                  setTypeFilter(t);
                  setPage(1);
                  setFilters((prev) => ({ ...prev, registrationNumber: '', course: '', position: '' }));
                }}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                  typeFilter === t ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                {t === 'all' ? 'Todos' : t === 'admin' ? 'Admins' : 'Estudantes'}
              </button>
            ))}
          </div>

          {/* Filters */}
          <UserFilters filters={filters} onChange={handleFiltersChange} typeFilter={typeFilter} />

          <Table
            columns={columns}
            data={data?.data ?? []}
            keyExtractor={(u) => u.id}
            loading={isLoading}
            emptyMessage="Nenhum usuário encontrado."
            emptyIcon={<Users size={32} />}
          />
          <Pagination page={page} total={data?.total ?? 0} limit={10} onPageChange={setPage} />
        </div>
      </div>

      {/* ── Create Modal ──────────────────────────────────────────────────── */}
      <Modal
        open={createModal}
        onClose={() => { setCreateModal(false); reset(); }}
        title="Novo Usuário"
        subtitle="Preencha os dados do novo usuário"
        icon={<Users size={18} />}
        maxWidth="xl"
      >
        <form onSubmit={handleSubmit((d) => createMutation.mutate(buildCreatePayload(d)))} className="space-y-4">
          {/* Dados base */}
          <div className="grid sm:grid-cols-2 gap-4">
            <Input label="Nome Completo" placeholder="João da Silva" error={errors.name?.message} {...register('name')} />
            <Input label="E-mail" type="email" placeholder="joao@ifba.edu.br" error={errors.email?.message} {...register('email')} />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <Select
              label="Tipo de Usuário"
              options={[{ value: 'student', label: 'Estudante' }, { value: 'admin', label: 'Administrador' }]}
              error={errors.userType?.message}
              {...register('userType')}
            />
            {watchType === 'admin' ? (
              <Input label="Senha" type="password" placeholder="••••••••" error={errors.password?.message} {...register('password')} />
            ) : (
              <div className="w-full">
                <p className="label">Senha</p>
                <div className="input bg-gray-50 text-gray-400 text-xs flex items-center select-none cursor-default">
                  ifba.<span className="text-gray-500 font-mono">{watch('registrationNumber') || 'matrícula'}</span>
                </div>
                <p className="mt-1 text-xs text-gray-400">Gerada automaticamente</p>
              </div>
            )}
          </div>

          {/* Campos de admin */}
          {watchType === 'admin' && (
            <Input label="Cargo" placeholder="Assistente Social" {...register('position')} />
          )}

          {/* Campos de estudante */}
          {watchType === 'student' && (
            <div className="space-y-4 border-t border-gray-100 pt-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Dados acadêmicos</p>

              <div className="grid sm:grid-cols-3 gap-4">
                <Input label="Matrícula" placeholder="20221234" {...register('registrationNumber')} />
                <Input label="Campus" placeholder="VC" {...register('campus')} />
                <Input
                  label="Pontuação Barema"
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="0.0"
                  {...register('baremScore')}
                />
              </div>

              <Input label="Curso" placeholder="113 - Bacharelado em Engenharia Elétrica" {...register('course')} />

              <div className="grid sm:grid-cols-2 gap-4">
                <Select
                  label="Nível de Ensino"
                  placeholder="Selecione..."
                  options={[
                    { value: 'Graduação',  label: 'Graduação' },
                    { value: 'Médio',      label: 'Médio' },
                  ]}
                  {...register('educationLevel')}
                />
                <Select
                  label="Modalidade"
                  placeholder="Selecione..."
                  options={[
                    { value: 'Bacharelado',         label: 'Bacharelado' },
                    { value: 'Licenciatura',         label: 'Licenciatura' },
                    { value: 'Técnico Integrado',    label: 'Técnico Integrado' },
                    { value: 'Técnico Subsequente',  label: 'Técnico Subsequente' },
                  ]}
                  {...register('modality')}
                />
              </div>

              <Select
                label="Forma de Ingresso"
                placeholder="Selecione..."
                options={INTAKE_OPTIONS}
                {...register('intakeForm')}
              />

              {/* Auxílios — checkboxes */}
              <div>
                <p className="label mb-2">Auxílios Aprovados</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {AIDS_OPTIONS.map((opt) => (
                    <label key={opt.value} className="flex items-center gap-2 cursor-pointer group">
                      <input
                        type="checkbox"
                        value={opt.value}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 cursor-pointer"
                        {...register('aids')}
                      />
                      <span className="text-xs text-gray-600 group-hover:text-gray-800">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <Select
                label="Tipo de Refeição (auxílio alimentação)"
                placeholder="Não se aplica"
                options={[
                  { value: 'Almoço',                  label: 'Almoço' },
                  { value: 'Jantar',                   label: 'Jantar' },
                  { value: 'Café da manhã',            label: 'Café da manhã' },
                  { value: 'Almoço, Café da manhã',    label: 'Almoço e Café da manhã' },
                ]}
                {...register('mealTypes')}
              />
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <Button type="button" variant="secondary" onClick={() => { setCreateModal(false); reset(); }}>Cancelar</Button>
            <Button type="submit" loading={createMutation.isPending}>Criar Usuário</Button>
          </div>
        </form>
      </Modal>

      {/* ── Edit Modal ────────────────────────────────────────────────────── */}
      <Modal
        open={!!editUserId}
        onClose={() => setEditUserId(null)}
        title="Editar Usuário"
        subtitle="Atualize os dados do usuário"
        icon={<Pencil size={18} />}
        maxWidth="lg"
      >
        <form onSubmit={editHandleSubmit(onEditSubmit)} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <Input label="Nome Completo" placeholder="João da Silva" error={editErrors.name?.message} {...editReg('name')} />
            <Input label="E-mail" type="email" placeholder="joao@email.com" error={editErrors.email?.message} {...editReg('email')} />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <Input
              label="Nova Senha"
              type="password"
              placeholder="Deixe em branco para não alterar"
              error={editErrors.password?.message}
              {...editReg('password')}
            />
            <Select
              label="Status"
              options={[{ value: 'true', label: 'Ativo' }, { value: 'false', label: 'Inativo' }]}
              error={editErrors.isActive?.message}
              {...editReg('isActive')}
            />
          </div>

          {editUserType === 'student' ? (
            <div className="grid sm:grid-cols-2 gap-4">
              <Input label="Matrícula" placeholder="20221234" {...editReg('registrationNumber')} />
              <Input label="Curso" placeholder="Técnico em Informática" {...editReg('course')} />
            </div>
          ) : (
            <Input label="Cargo" placeholder="Assistente Social" {...editReg('position')} />
          )}

          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <Button type="button" variant="secondary" onClick={() => setEditUserId(null)}>Cancelar</Button>
            <Button type="submit" loading={editMutation.isPending}>Salvar Alterações</Button>
          </div>
        </form>
      </Modal>

      {/* ── Import Modal ──────────────────────────────────────────────────── */}
      <Modal
        open={importOpen}
        onClose={closeImport}
        title="Importar Alunos"
        subtitle="Importe uma planilha para cadastrar alunos em massa"
        icon={<Upload size={18} />}
        maxWidth="xl"
      >
        <div className="space-y-4">
          {/* Step: idle / pick file */}
          {(importStep === 'idle' || importStep === 'validating') && (
            <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-xl py-10 gap-3">
              <Upload size={32} className="text-gray-300" />
              <p className="text-sm text-gray-500">Selecione o arquivo <span className="font-semibold">.xlsx</span> ou <span className="font-semibold">.xls</span></p>
              <Button
                type="button"
                variant="secondary"
                loading={importStep === 'validating'}
                onClick={() => fileInputRef.current?.click()}
              >
                {importStep === 'validating' ? 'Validando...' : 'Selecionar Arquivo'}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>
          )}

          {/* Step: validated */}
          {importStep === 'validated' && validationResult && (
            <>
              {/* Summary */}
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

              {/* Status badge */}
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

              {/* Error table */}
              {validationResult.errors.length > 0 && (
                <div className="border border-red-100 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
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

              <div className="flex justify-between gap-3 pt-2 border-t border-gray-100">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setImportStep('idle');
                    setImportFile(null);
                    setValidation(null);
                  }}
                >
                  Trocar arquivo
                </Button>
                <Button
                  type="button"
                  onClick={handleConfirmImport}
                  disabled={validationResult.validRows === 0}
                >
                  Importar {validationResult.validRows} aluno(s)
                </Button>
              </div>
            </>
          )}

          {/* Step: importing */}
          {importStep === 'importing' && (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <Upload size={32} className="text-blue-400 animate-bounce" />
              <p className="text-sm text-gray-500">Importando alunos, aguarde...</p>
            </div>
          )}

          {/* Step: done */}
          {importStep === 'done' && importResult && (
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

              <div className="flex justify-end pt-2 border-t border-gray-100">
                <Button type="button" onClick={closeImport}>Fechar</Button>
              </div>
            </>
          )}
        </div>
      </Modal>

      <ConfirmModal
        open={!!deleteUser}
        onClose={() => setDeleteUser(null)}
        onConfirm={() => deleteUser && deleteMutation.mutate(deleteUser.id)}
        title="Remover Usuário"
        description={`Tem certeza que deseja remover "${deleteUser?.name}"?`}
        confirmLabel="Remover"
        loading={deleteMutation.isPending}
      />
    </div>
  );
};
