import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useToast } from '../context/ToastContext';

export default function LoginPage() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [email, setEmail] = useState('admin@acme.com');
  const [password, setPassword] = useState('Password123!');
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  if (user) {
    navigate('/', { replace: true });
    return null;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await login(email, password);
      toast('Welcome back!', 'success');
      navigate('/', { replace: true });
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
          : undefined;
      setError(msg ?? 'Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-primary to-brand-primary-dk flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background shapes */}
      <div className="absolute w-96 h-96 bg-brand-secondary/10 rounded-full -top-24 -left-24 animate-pulse" />
      <div className="absolute w-72 h-72 bg-brand-accent/10 rounded-full -bottom-16 -right-16 animate-pulse" />

      <div className="w-full max-w-md z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/15 rounded-2xl mb-4">
            <span className="text-3xl font-bold text-white">HI</span>
          </div>
          <h1 className="text-3xl font-bold text-white">
            Highspring India<span className="text-brand-secondary"> TMS</span>
          </h1>
          <p className="text-white/60 text-sm mt-1">Smart Timesheet Management</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">Welcome back</h2>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-brand-danger">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
              autoComplete="email"
              icon={<span className="text-sm">✉</span>}
            />
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
              icon={<span className="text-sm">🔒</span>}
            />

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-gray-300"
                />
                Remember me
              </label>
              <button type="button" className="text-sm text-brand-primary hover:underline">
                Forgot password?
              </button>
            </div>

            <Button type="submit" isLoading={isLoading} className="w-full mt-2" size="lg">
              Sign in
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-gray-400">
            Demo: admin@acme.com / Password123!
          </p>
        </div>
      </div>
    </div>
  );
}
