import React, { useState } from 'react';
import { userAPI, User } from '../services/api';
import './UserProfile.css';

interface UserProfileProps {
  user: User;
  onLogout: () => void;
}

const UserProfile: React.FC<UserProfileProps> = ({ user, onLogout }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    username: user.username,
    email: user.email,
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleEdit = () => {
    setIsEditing(true);
    setFormData({
      username: user.username,
      email: user.email,
      password: '',
      confirmPassword: ''
    });
    setError('');
    setSuccess('');
  };

  const handleCancel = () => {
    setIsEditing(false);
    setFormData({
      username: user.username,
      email: user.email,
      password: '',
      confirmPassword: ''
    });
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (formData.password && formData.password !== formData.confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.');
      setLoading(false);
      return;
    }

    try {
      const updateData: any = {
        username: formData.username,
        email: formData.email
      };

      if (formData.password) {
        updateData.password = formData.password;
      }

      await userAPI.updateUser(updateData);
      setSuccess('프로필이 성공적으로 업데이트되었습니다.');
      setIsEditing(false);
    } catch (error: any) {
      setError(error.response?.data?.error || '프로필 업데이트에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('정말로 계정을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      return;
    }

    try {
      await userAPI.deleteUser();
      onLogout();
    } catch (error: any) {
      setError(error.response?.data?.error || '계정 삭제에 실패했습니다.');
    }
  };

  return (
    <div className="user-profile">
      <div className="user-profile-container">
        <h1>프로필</h1>
        
        {!isEditing ? (
          <div className="profile-view">
            <div className="profile-info">
              <div className="info-item">
                <label>사용자명:</label>
                <span>{user.username}</span>
              </div>
              <div className="info-item">
                <label>이메일:</label>
                <span>{user.email}</span>
              </div>
            </div>
            
            <div className="profile-actions">
              <button onClick={handleEdit} className="edit-btn">
                프로필 수정
              </button>
              <button onClick={handleDelete} className="delete-btn">
                계정 삭제
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="profile-form">
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
              <label htmlFor="password">새 비밀번호 (선택사항)</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="새 비밀번호를 입력하세요"
              />
            </div>
            
            {formData.password && (
              <div className="form-group">
                <label htmlFor="confirmPassword">비밀번호 확인</label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="비밀번호를 다시 입력하세요"
                />
              </div>
            )}
            
            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}
            
            <div className="form-actions">
              <button 
                type="button" 
                onClick={handleCancel}
                className="cancel-btn"
              >
                취소
              </button>
              <button 
                type="submit" 
                disabled={loading}
                className="save-btn"
              >
                {loading ? '저장 중...' : '저장'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default UserProfile;
