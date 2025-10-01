import React from 'react';
import { Link } from 'react-router-dom';
import './Navbar.css';

interface User {
  id: number;
  username: string;
  email: string;
}

interface NavbarProps {
  user: User;
  onLogout: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ user, onLogout }) => {
  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/dashboard" className="navbar-brand">
          일본어 문장 학습
        </Link>
        
        <div className="navbar-menu">
          <Link to="/dashboard" className="navbar-item">
            대시보드
          </Link>
          <Link to="/sentences" className="navbar-item">
            문장 목록
          </Link>
          <Link to="/test" className="navbar-item">
            시험 보기
          </Link>
          <Link to="/profile" className="navbar-item">
            프로필
          </Link>
        </div>
        
        <div className="navbar-user">
          <span className="user-name">{user.username}님</span>
          <button onClick={onLogout} className="logout-btn">
            로그아웃
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
