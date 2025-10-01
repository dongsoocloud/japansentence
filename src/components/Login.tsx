import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { authAPI } from '../services/api';
import './Auth.css';

interface User {
  id: number;
  username: string;
  email: string;
}

interface LoginProps {
  onLogin: (user: User, token: string) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorPersist, setErrorPersist] = useState(false);

  // 에러 메시지가 사라지지 않도록 강제로 유지
  useEffect(() => {
    if (error && errorPersist) {
      const timer = setInterval(() => {
        setError(error);
      }, 200);
      
      return () => clearInterval(timer);
    }
  }, [error, errorPersist]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    // 입력 시 에러 메시지 유지 (자동으로 사라지지 않음)
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // 중복 제출 방지
    if (loading) {
      return false;
    }
    
    setLoading(true);
    setError('');
    setErrorPersist(false);

    try {
      console.log('Attempting login with:', { email: formData.email, password: '[HIDDEN]' });
      console.log('Form data being sent:', formData);
      const response = await authAPI.login(formData);
      console.log('Login successful:', response);
      
      // 성공 시에만 onLogin 호출
      if (response && response.user && response.token) {
        onLogin(response.user, response.token);
      }
    } catch (error: any) {
      console.error('Login error:', error);
      
      let errorMessage = '로그인에 실패했습니다. 잠시 후 다시 시도해주세요.';
      
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.response?.status === 401) {
        errorMessage = '이메일 또는 비밀번호가 올바르지 않습니다.';
      } else if (error.response?.status === 400) {
        errorMessage = '이메일과 비밀번호를 입력해주세요.';
      } else if (error.response?.status === 404) {
        errorMessage = '서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.';
      } else if (error.code === 'NETWORK_ERROR') {
        errorMessage = '네트워크 연결을 확인해주세요.';
      }
      
      // 에러 메시지 설정 - 즉시 설정하고 강제로 유지
      setError(errorMessage);
      setErrorPersist(true);
      
      // Alert로 에러 메시지 표시
      alert(errorMessage);
      
      // 에러 메시지가 사라지지 않도록 강제로 유지
      setTimeout(() => {
        setError(errorMessage);
        setErrorPersist(true);
      }, 100);
      
      setTimeout(() => {
        setError(errorMessage);
        setErrorPersist(true);
      }, 500);
      
    } finally {
      setLoading(false);
    }
    
    return false; // 폼 제출 완전히 막기
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>로그인</h2>
        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="email">이메일</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">비밀번호</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>
          
          {error && (
            <div className="error-message" role="alert" aria-live="polite">
              {error}
            </div>
          )}
          
          <button type="submit" disabled={loading} className="submit-btn">
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>
        
        <p className="auth-link">
          계정이 없으신가요? <Link to="/register">회원가입</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
