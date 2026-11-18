import React, { useState, useEffect, useRef } from 'react';
import { ArrowRight, ArrowLeft, Sparkles, Check, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const AuthPage: React.FC = () => {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [step, setStep] = useState<number>(0);

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Canvas for background moving agent simulation
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Particle agent model
    const numAgents = Math.min(100, Math.floor((width * height) / 12000));
    const agents = Array.from({ length: numAgents }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.8,
      vy: (Math.random() - 0.5) * 0.8,
      state: Math.random() < 0.05 ? 'I' : 'S', // mostly susceptible, few infected
      timer: 0,
    }));

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Draw faint connections
      for (let i = 0; i < agents.length; i++) {
        const a = agents[i];
        a.x += a.vx;
        a.y += a.vy;

        if (a.x < 0 || a.x > width) a.vx *= -1;
        if (a.y < 0 || a.y > height) a.vy *= -1;

        if (a.state === 'I') {
          a.timer++;
          if (a.timer > 300) a.state = 'R';
        }

        // Draw agent dot
        ctx.beginPath();
        ctx.arc(a.x, a.y, a.state === 'I' ? 4 : 3, 0, Math.PI * 2);
        if (a.state === 'I') ctx.fillStyle = 'rgba(225, 29, 72, 0.7)'; // Red
        else if (a.state === 'R') ctx.fillStyle = 'rgba(5, 150, 105, 0.6)'; // Green
        else ctx.fillStyle = 'rgba(91, 33, 182, 0.25)'; // Soft Violet
        ctx.fill();

        // Infection proximity
        if (a.state === 'I') {
          for (let j = 0; j < agents.length; j++) {
            if (i !== j && agents[j].state === 'S') {
              const dx = a.x - agents[j].x;
              const dy = a.y - agents[j].y;
              const dist = Math.sqrt(dx * dx + dy * dy);
              if (dist < 40 && Math.random() < 0.02) {
                agents[j].state = 'I';
              }
            }
          }
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  // Conversational questions definition
  const loginQuestions = [
    {
      title: "What's your institutional email?",
      subtitle: 'Enter your credentials to enter the workbench',
      value: email,
      setValue: setEmail,
      type: 'email',
      placeholder: 'analyst@outbreaklab.local',
    },
    {
      title: 'Enter your workbench password',
      subtitle: 'Default demo account password is AnalystPass2026!',
      value: password,
      setValue: setPassword,
      type: 'password',
      placeholder: '••••••••••••',
    },
  ];

  const registerQuestions = [
    {
      title: "Let's set up your workbench. What is your full name?",
      subtitle: 'How should your reports and scenarios be attributed?',
      value: fullName,
      setValue: setFullName,
      type: 'text',
      placeholder: 'Dr. Jane Epidemiologist',
    },
    {
      title: "What's your preferred email address?",
      subtitle: 'Will be used for secure session authorization',
      value: email,
      setValue: setEmail,
      type: 'email',
      placeholder: 'jane@publichealth.edu',
    },
    {
      title: 'Create a secure password',
      subtitle: 'Must be at least 8 characters long',
      value: password,
      setValue: setPassword,
      type: 'password',
      placeholder: '••••••••••••',
    },
  ];

  const currentQuestions = mode === 'login' ? loginQuestions : registerQuestions;
  const currentQ = currentQuestions[step];

  const handleNext = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!currentQ.value.trim()) {
      setErrorMsg('This field cannot be left blank.');
      return;
    }

    if (step < currentQuestions.length - 1) {
      setStep(step + 1);
    } else {
      // Submit login or register
      setLoading(true);
      try {
        if (mode === 'login') {
          await login(email, password);
        } else {
          await register(email, password, fullName);
        }
      } catch (err: any) {
        setErrorMsg(err.message || 'Authentication failed. Please verify credentials.');
      } finally {
        setLoading(false);
      }
    }
  };

  const switchMode = (newMode: 'login' | 'register') => {
    setMode(newMode);
    setStep(0);
    setErrorMsg(null);
  };

  return (
    <div className="relative min-h-screen bg-base overflow-hidden flex items-center justify-center p-6">
      {/* Live Agent Particle Backdrop Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none opacity-60" />

      {/* Center Conversational Card */}
      <div className="relative z-10 w-full max-w-lg bg-white/90 backdrop-blur-xl p-8 sm:p-12 rounded-3xl border border-border shadow-elevated">
        {/* Brand header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2.5">
            <div className="w-4 h-4 rounded-full bg-signal animate-pulse" />
            <span className="font-sora font-bold text-sm tracking-widest uppercase text-text">OUTBREAKLAB</span>
          </div>
          <button
            onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}
            className="text-xs font-mono text-primary hover:underline font-medium"
          >
            {mode === 'login' ? 'Create Workbench →' : 'Existing Sign-In →'}
          </button>
        </div>

        {/* Conversational Question */}
        <form onSubmit={handleNext} className="space-y-6">
          <div className="space-y-2">
            <h2 className="font-sora text-2xl sm:text-3xl font-bold text-text leading-tight">
              {currentQ.title}
            </h2>
            <p className="text-xs font-mono text-text-3">{currentQ.subtitle}</p>
          </div>

          {/* Oversized Input */}
          <div className="relative">
            <input
              type={currentQ.type}
              autoFocus
              value={currentQ.value}
              onChange={(e) => currentQ.setValue(e.target.value)}
              placeholder={currentQ.placeholder}
              className="w-full px-6 py-4 rounded-full bg-surface-2 border border-border font-sora text-base text-text focus:outline-none focus:ring-2 focus:ring-primary shadow-inner"
            />
          </div>

          {errorMsg && (
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-mono flex items-center gap-2 animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Controls: Continue button + Back link */}
          <div className="flex items-center justify-between pt-2">
            {step > 0 ? (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="text-xs font-mono text-text-3 hover:text-text flex items-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Previous
              </button>
            ) : (
              <div />
            )}

            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 rounded-full bg-primary hover:bg-primary-hover text-white font-sora font-semibold text-xs tracking-wider flex items-center gap-2 shadow-soft active:scale-95 transition-all"
            >
              <span>{loading ? 'Authenticating...' : step === currentQuestions.length - 1 ? 'Enter Workbench ↵' : 'Continue ↵'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Step Progress Dots */}
          <div className="flex items-center justify-center gap-2 pt-4">
            {currentQuestions.map((_, i) => (
              <span
                key={i}
                className={`w-2 h-2 rounded-full transition-all duration-200 ${
                  step === i ? 'w-6 bg-primary' : i < step ? 'bg-signal' : 'bg-border'
                }`}
              />
            ))}
          </div>
        </form>

        {/* Demo Account Quick-Fill Helper */}
        {mode === 'login' && (
          <div className="mt-8 pt-6 border-t border-border/60 text-center">
            <div className="text-[11px] font-mono text-text-3 mb-2">Default Pre-seeded Demo Accounts:</div>
            <div className="flex justify-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setEmail('analyst@outbreaklab.local');
                  setPassword('AnalystPass2026!');
                  setStep(1);
                }}
                className="px-3 py-1 rounded-full bg-surface-2 hover:bg-border text-[11px] font-mono text-primary font-semibold border border-border"
              >
                Fill Analyst Demo
              </button>
              <button
                type="button"
                onClick={() => {
                  setEmail('admin@outbreaklab.local');
                  setPassword('AdminOutbreakLab2026!');
                  setStep(1);
                }}
                className="px-3 py-1 rounded-full bg-surface-2 hover:bg-border text-[11px] font-mono text-text-2 font-semibold border border-border"
              >
                Fill Admin Demo
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
