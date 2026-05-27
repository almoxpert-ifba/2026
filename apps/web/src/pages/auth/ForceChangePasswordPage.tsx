import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { authService } from '../../services/authService';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/FormFields';

const passwordRules = z
  .string()
  .min(8, 'Mínimo de 8 caracteres')
  .regex(/[a-z]/, 'Deve ter pelo menos uma letra minúscula')
  .regex(/[A-Z]/, 'Deve ter pelo menos uma letra maiúscula')
  .regex(/[^a-zA-Z0-9]/, 'Deve ter pelo menos um caractere especial');

const schema = z.object({
  currentPassword: z.string().min(1, 'Senha atual obrigatória'),
  newPassword:     passwordRules,
  confirmPassword: z.string(),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: 'As senhas não coincidem',
  path: ['confirmPassword'],
});
type FormData = z.infer<typeof schema>;

export const ForceChangePasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const { setMustChangePassword } = useAuthStore();
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [apiError, setApiError] = useState('');

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setApiError('');
    try {
      await authService.changePassword(data.currentPassword, data.newPassword);
      setMustChangePassword(false);
      navigate('/dashboard');
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setApiError(msg || 'Não foi possível alterar a senha. Verifique sua senha atual.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-6">
          <img src="/iconeAlmoXpert.png" alt="AlmoxPert" className="h-16 w-auto object-contain" />
        </div>

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Defina sua nova senha</h1>
          <p className="text-sm text-gray-400">
            Por segurança, você precisa criar uma nova senha antes de continuar.
          </p>
        </div>

        <div className="mb-5 px-4 py-3 rounded-xl bg-blue-50 border border-blue-200 text-sm text-blue-700 space-y-1">
          <p className="font-semibold mb-1">A nova senha deve ter:</p>
          <ul className="list-disc list-inside space-y-0.5 text-blue-600">
            <li>No mínimo 8 caracteres</li>
            <li>Letras maiúsculas e minúsculas</li>
            <li>Pelo menos um caractere especial (!@#$%...)</li>
          </ul>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="relative">
            <Input
              label="Senha atual"
              type={showCurrent ? 'text' : 'password'}
              placeholder="••••••••"
              icon={<Lock size={15} />}
              error={errors.currentPassword?.message}
              {...register('currentPassword')}
            />
            <button type="button" onClick={() => setShowCurrent(!showCurrent)}
              className="absolute right-3.5 top-9 text-gray-400 hover:text-gray-600">
              {showCurrent ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>

          <div className="relative">
            <Input
              label="Nova senha"
              type={showNew ? 'text' : 'password'}
              placeholder="••••••••"
              icon={<Lock size={15} />}
              error={errors.newPassword?.message}
              {...register('newPassword')}
            />
            <button type="button" onClick={() => setShowNew(!showNew)}
              className="absolute right-3.5 top-9 text-gray-400 hover:text-gray-600">
              {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>

          <div className="relative">
            <Input
              label="Confirmar nova senha"
              type={showConfirm ? 'text' : 'password'}
              placeholder="••••••••"
              icon={<Lock size={15} />}
              error={errors.confirmPassword?.message}
              {...register('confirmPassword')}
            />
            <button type="button" onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3.5 top-9 text-gray-400 hover:text-gray-600">
              {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>

          {apiError && (
            <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">
              {apiError}
            </div>
          )}

          <Button type="submit" className="w-full mt-2" loading={isSubmitting} size="lg">
            Alterar senha e continuar
          </Button>
        </form>
      </div>
    </div>
  );
};
