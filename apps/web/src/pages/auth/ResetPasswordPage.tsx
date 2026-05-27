import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { authService } from '../../services/authService';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/FormFields';

const schema = z.object({
  email: z.string().email('E-mail inválido'),
  code:  z.string().length(6, 'O código deve ter 6 dígitos'),
});
type FormData = z.infer<typeof schema>;

export const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const prefillEmail = (location.state as any)?.email ?? '';

  const [done, setDone] = useState(false);
  const [apiError, setApiError] = useState('');

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: prefillEmail, code: '' },
  });

  const onSubmit = async (data: FormData) => {
    setApiError('');
    try {
      await authService.resetPassword(data.email, data.code);
      setDone(true);
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setApiError(msg || 'Código inválido ou expirado. Tente novamente.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-6">
          <img src="/iconeAlmoXpert.png" alt="AlmoxPert" className="h-16 w-auto object-contain" />
        </div>

        {!done ? (
          <>
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-gray-900 mb-1">Confirmar código</h1>
              <p className="text-sm text-gray-400">
                Insira o código de 6 dígitos enviado para o seu e-mail.
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Input
                label="E-mail"
                type="email"
                placeholder="seu@email.com"
                error={errors.email?.message}
                {...register('email')}
              />

              <div>
                <Input
                  label="Código de verificação"
                  type="text"
                  placeholder="000000"
                  maxLength={6}
                  error={errors.code?.message}
                  {...register('code')}
                />
              </div>

              {apiError && (
                <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">
                  {apiError}
                </div>
              )}

              <Button type="submit" className="w-full" loading={isSubmitting} size="lg">
                Confirmar e redefinir senha
              </Button>
            </form>

            <p className="text-center text-xs text-gray-400 mt-4">
              Não recebeu?{' '}
              <Link to="/forgot-password" className="text-blue-600 hover:underline">
                Reenviar código
              </Link>
            </p>
          </>
        ) : (
          <div className="text-center">
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={28} className="text-green-600" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Senha redefinida!</h1>
            <p className="text-sm text-gray-500 mb-6">
              Sua senha foi redefinida para o padrão. Verifique seu e-mail para ver a nova senha.
              Ao entrar, você será solicitado a criar uma nova senha.
            </p>
            <Button className="w-full" size="lg" onClick={() => navigate('/login')}>
              Ir para o login
            </Button>
          </div>
        )}

        {!done && (
          <Link
            to="/login"
            className="flex items-center justify-center gap-1.5 mt-6 text-sm text-gray-400 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft size={14} />
            Voltar ao login
          </Link>
        )}
      </div>
    </div>
  );
};
