'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, CheckCircle2, Lock, ShieldAlert } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordPage() {
  const router = useRouter();
  const { updatePassword } = useAuth();
  const [success, setSuccess] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data: ResetPasswordFormData) => {
    setErrorMsg(null);
    const { error } = await updatePassword(data.password);
    if (error) {
      setErrorMsg(error.message || 'Failed to update password. Your reset link may have expired.');
    } else {
      setSuccess(true);
      setTimeout(() => {
        router.push('/dashboard');
      }, 2500);
    }
  };

  return (
    <div className="flex min-h-screen flex-col justify-center px-4 py-12 sm:px-6 lg:px-8 bg-slate-50">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link href="/" className="inline-flex items-center gap-2 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white font-bold text-lg shadow-sm">
            LF
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-900">
            LeadFlow <span className="text-indigo-600">AI</span>
          </span>
        </Link>
        <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">
          Set new workspace password
        </h2>
        <p className="mt-1.5 text-xs text-slate-500">
          Enter your new credentials to securely access your agency data.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-sm">
          {errorMsg && (
            <div
              role="alert"
              className="mb-5 flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700"
            >
              <ShieldAlert className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {success ? (
            <div className="text-center py-4 space-y-3">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 mb-2">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Password Updated Successfully</h3>
              <p className="text-xs text-slate-600 leading-relaxed max-w-sm mx-auto">
                Your password has been changed. Redirecting to your dashboard...
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label
                  htmlFor="password"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  New Password <span className="text-rose-500">*</span>
                </label>
                <Input
                  id="password"
                  type="password"
                  placeholder="At least 8 chars, 1 uppercase & 1 number"
                  icon={<Lock className="h-4 w-4" />}
                  error={errors.password?.message}
                  {...register('password')}
                />
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Confirm New Password <span className="text-rose-500">*</span>
                </label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Repeat new password"
                  icon={<Lock className="h-4 w-4" />}
                  error={errors.confirmPassword?.message}
                  {...register('confirmPassword')}
                />
              </div>

              <Button
                type="submit"
                className="w-full mt-2"
                size="lg"
                isLoading={isSubmitting}
              >
                <span>Save New Password</span>
              </Button>

              <div className="text-center pt-3 border-t border-slate-100">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Return to login</span>
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

