import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { X, Mail, Lock, Chrome } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        alert('確認メールを送信しました。メールフォルダを確認してください。');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        onClose();
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content auth-modal glass-panel" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}><X size={20} /></button>
        
        <h2>{isSignUp ? '新規登録' : 'ログイン'}</h2>
        <p className="auth-subtitle">
          {isSignUp ? 'アカウントを作成してクラウド保存を利用しましょう' : 'ログインすると保存済みのツリーにアクセスできます'}
        </p>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleAuth} className="auth-form">
          <div className="auth-input-group">
            <Mail size={18} className="auth-icon" />
            <input 
              type="email" 
              placeholder="メールアドレス" 
              value={email}
              onChange={e => setEmail(e.target.value)}
              required 
            />
          </div>
          <div className="auth-input-group">
            <Lock size={18} className="auth-icon" />
            <input 
              type="password" 
              placeholder="パスワード" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              required 
            />
          </div>

          <button type="submit" className="btn-premium auth-submit" disabled={loading}>
            {loading ? '処理中...' : (isSignUp ? '登録する' : 'ログイン')}
          </button>
        </form>

        <div className="auth-divider">
          <span>または</span>
        </div>

        <button className="auth-google-btn" onClick={handleGoogleLogin}>
          <Chrome size={18} /> Googleでログイン
        </button>

        <div className="auth-switch">
          {isSignUp ? (
            <p>既にアカウントをお持ちですか？ <button onClick={() => setIsSignUp(false)}>ログイン</button></p>
          ) : (
            <p>アカウントをお持ちでないですか？ <button onClick={() => setIsSignUp(true)}>新規登録</button></p>
          )}
        </div>
      </div>
    </div>
  );
};
