import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { authAPI } from '../services/api';
import './Auth.css';

interface User {
  id: number;
  username: string;
  email: string;
}

interface RegisterProps {
  onLogin: (user: User, token: string) => void;
}

const Register: React.FC<RegisterProps> = ({ onLogin }) => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setLoading(true);
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.');
      setLoading(false);
      return;
    }

    try {
      await authAPI.register({
        username: formData.username,
        email: formData.email,
        password: formData.password
      });
      
      // 회원가입 성공 후 자동 로그인
      const loginResponse = await authAPI.login({
        email: formData.email,
        password: formData.password
      });
      
      onLogin(loginResponse.user, loginResponse.token);
    } catch (error: any) {
      console.error('Register error:', error);
      
      if (error.response?.data?.error) {
        setError(error.response.data.error);
      } else if (error.response?.status === 400) {
        if (error.response.data.error.includes('Username')) {
          setError('이미 사용 중인 사용자명입니다.');
        } else if (error.response.data.error.includes('email')) {
          setError('이미 사용 중인 이메일입니다.');
        } else {
          setError('입력 정보를 확인해주세요.');
        }
      } else if (error.response?.status === 404) {
        setError('서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.');
      } else if (error.code === 'NETWORK_ERROR') {
        setError('네트워크 연결을 확인해주세요.');
      } else {
        setError('회원가입에 실패했습니다. 잠시 후 다시 시도해주세요.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="app-title">
            <span className="title-秀">秀</span>: <span className="title-일">일</span>본어 <span className="title-통">통</span>문장 <span className="title-암">암</span>기
          </div>
          <h2>회원가입</h2>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">사용자명</label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
            />
          </div>
          
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
          
          <div className="form-group">
            <label htmlFor="confirmPassword">비밀번호 확인</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
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
            {loading ? '회원가입 중...' : '회원가입'}
          </button>
        </form>
        
        <p className="auth-link">
          이미 계정이 있으신가요? <Link to="/login">로그인</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
