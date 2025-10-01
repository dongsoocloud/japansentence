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
          <span className="title-秀">秀</span>: <span className="title-일">일</span>본어 <span className="title-통">통</span>문장 <span className="title-암">암</span>기
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
        </div>
        
        <div className="navbar-user">
          <Link to="/profile" className="user-name">{user.username}님</Link>
          <button onClick={onLogout} className="logout-btn">
            로그아웃
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
