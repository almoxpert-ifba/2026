import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Users, Plus, Trash2, ShieldCheck, GraduationCap, Pencil,
  Download, Upload, KeyRound, Mail, MailX,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Header } from '../../components/layout/Header';
import { Button } from '../../components/ui/Button';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Pagination } from '../../components/ui/Pagination';
import { ConfirmModal } from '../../components/ui/Modal';
import { usersService } from '../../services/index';
import { useToast } from '../../components/ui/Toast';
import { getInitials, formatDate } from '../../utils';
import { UserFilters, defaultFilters } from './UserFilters';
import type { UserFiltersState } from './UserFilters';
import type { User, UpdateUserDto, CreateUserDto } from '../../types';
import { UserFormModal } from './modals/UserFormModal';
import { UserImportModal } from './modals/UserImportModal';

type OutletCtx = { onMenuClick: () => void };

export const UsersPage: React.FC = () => {
  const { onMenuClick } = useOutletContext<OutletCtx>();
  const toast = useToast();
  const qc = useQueryClient();

  const [page, setPage]             = useState(1);
  const [typeFilter, setTypeFilter] = useState<'all' | 'admin' | 'student'>('all');
  const [filters, setFilters]       = useState<UserFiltersState>(defaultFilters);
  const [createModal, setCreateModal]             = useState(false);
  const [editUserId, setEditUserId]               = useState<number | null>(null);
  const [deleteUser, setDeleteUser]               = useState<User | null>(null);
  const [resetPasswordUser, setResetPasswordUser] = useState<User | null>(null);
  const [importOpen, setImportOpen]               = useState(false);

  const handleFiltersChange = (f: UserFiltersState) => { setFilters(f); setPage(1); };

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

  // ── Mutations ────────────────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: (dto: CreateUserDto) => usersService.create(dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      toast.success('Usuário criado!');
      setCreateModal(false);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Erro ao criar usuário.'),
  });

  const editMutation = useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: UpdateUserDto }) => usersService.update(id, dto),
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

  const resetPasswordMutation = useMutation({
    mutationFn: (id: number) => usersService.resetPassword(id),
    onSuccess: () => {
      toast.success('Senha resetada para o padrão. O usuário receberá e-mail de confirmação.');
      setResetPasswordUser(null);
    },
    onError: () => toast.error('Erro ao resetar senha.'),
  });

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
        ? <span className="text-xs text-gray-500">{u.adminProfile?.position ?? '—'}</span>
        : (
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
      key: 'receiveEmails', header: 'E-mails',
      render: (u: User) => u.receiveEmails
        ? <span title="Recebendo e-mails" className="flex items-center gap-1 text-xs text-emerald-600"><Mail size={13} /> Ativo</span>
        : <span title="E-mails desativados" className="flex items-center gap-1 text-xs text-gray-400"><MailX size={13} /> Inativo</span>,
    },
    {
      key: 'actions', header: '',
      render: (u: User) => (
        <div className="flex items-center gap-1 justify-end">
          <button onClick={() => setEditUserId(Number(u.id))} title="Editar"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-colors">
            <Pencil size={14} />
          </button>
          <button onClick={() => setResetPasswordUser(u)} title="Resetar senha"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-amber-500 hover:bg-amber-50 transition-colors">
            <KeyRound size={14} />
          </button>
          <button onClick={() => setDeleteUser(u)} title="Remover"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
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
            <button type="button" onClick={() => usersService.downloadTemplate()}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
              <Download size={14} />
              Planilha Modelo
            </button>
            <Button variant="secondary" icon={<Upload size={15} />} onClick={() => setImportOpen(true)}>
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
          <div className="px-5 py-3 border-b border-gray-100 flex gap-1">
            {(['all', 'admin', 'student'] as const).map((t) => (
              <button key={t}
                onClick={() => { setTypeFilter(t); setPage(1); setFilters((prev) => ({ ...prev, registrationNumber: '', course: '', position: '' })); }}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${typeFilter === t ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-100'}`}>
                {t === 'all' ? 'Todos' : t === 'admin' ? 'Admins' : 'Estudantes'}
              </button>
            ))}
          </div>

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
      <UserFormModal
        mode="create"
        open={createModal}
        onClose={() => setCreateModal(false)}
        onSave={(dto) => createMutation.mutate(dto)}
        loading={createMutation.isPending}
      />

      {/* ── Edit Modal ────────────────────────────────────────────────────── */}
      {editUserData && (
        <UserFormModal
          mode="edit"
          user={editUserData}
          open={!!editUserId}
          onClose={() => setEditUserId(null)}
          onSave={(dto) => editMutation.mutate({ id: editUserId!, dto })}
          loading={editMutation.isPending}
        />
      )}

      {/* ── Import Modal ──────────────────────────────────────────────────── */}
      <UserImportModal open={importOpen} onClose={() => setImportOpen(false)} />

      {/* ── Confirm Delete ────────────────────────────────────────────────── */}
      <ConfirmModal
        open={!!deleteUser}
        onClose={() => setDeleteUser(null)}
        onConfirm={() => deleteUser && deleteMutation.mutate(deleteUser.id)}
        title="Remover Usuário"
        description={`Tem certeza que deseja remover "${deleteUser?.name}"?`}
        confirmLabel="Remover"
        loading={deleteMutation.isPending}
      />

      {/* ── Confirm Reset Password ────────────────────────────────────────── */}
      <ConfirmModal
        open={!!resetPasswordUser}
        onClose={() => setResetPasswordUser(null)}
        onConfirm={() => resetPasswordUser && resetPasswordMutation.mutate(resetPasswordUser.id)}
        title="Resetar Senha"
        description={`Resetar a senha de "${resetPasswordUser?.name}" para o padrão (${resetPasswordUser?.userType === 'student' ? 'ifba.matrícula' : 'admin.email'})? O usuário precisará criar uma nova senha ao fazer login.`}
        confirmLabel="Resetar Senha"
        loading={resetPasswordMutation.isPending}
      />
    </div>
  );
};
