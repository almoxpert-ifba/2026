import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, ArrowLeft } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { authService } from '../../services/authService';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/FormFields';

const schema = z.object({
  email: z.string().email('E-mail inválido'),
});
type FormData = z.infer<typeof schema>;

export const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [sent, setSent] = useState(false);
  const [sentEmail, setSentEmail] = useState('');
  const [apiError, setApiError] = useState('');

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setApiError('');
    try {
      await authService.forgotPassword(data.email);
      setSentEmail(data.email);
      setSent(true);
    } catch {
      setApiError('Não foi possível processar a solicitação. Tente novamente.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-6">
          <img src="/iconeAlmoXpert.png" alt="AlmoxPert" className="h-16 w-auto object-contain" />
        </div>

        {!sent ? (
          <>
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-gray-900 mb-1">Esqueceu sua senha?</h1>
              <p className="text-sm text-gray-400">
                Informe seu e-mail e enviaremos um código de verificação.
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Input
                label="E-mail"
                type="email"
                placeholder="seu@email.com"
                icon={<Mail size={15} />}
                error={errors.email?.message}
                {...register('email')}
              />

              {apiError && (
                <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">
                  {apiError}
                </div>
              )}

              <Button type="submit" className="w-full" loading={isSubmitting} size="lg">
                Enviar código
              </Button>
            </form>
          </>
        ) : (
          <div className="text-center">
            <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail size={24} className="text-blue-600" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Verifique seu e-mail</h1>
            <p className="text-sm text-gray-500 mb-6">
              Se <span className="font-medium text-gray-700">{sentEmail}</span> estiver cadastrado,
              você receberá um código de 6 dígitos em breve.
            </p>
            <Button
              className="w-full mb-3"
              size="lg"
              onClick={() => navigate('/reset-password', { state: { email: sentEmail } })}
            >
              Inserir código
            </Button>
          </div>
        )}

        <Link
          to="/login"
          className="flex items-center justify-center gap-1.5 mt-6 text-sm text-gray-400 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft size={14} />
          Voltar ao login
        </Link>
      </div>
    </div>
  );
};
