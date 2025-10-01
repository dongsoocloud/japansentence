import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { sentenceAPI, Sentence } from '../services/api';
import './Dashboard.css';

const Dashboard: React.FC = () => {
  const [recentSentences, setRecentSentences] = useState<Sentence[]>([]);
  const [stats, setStats] = useState({
    totalSentences: 0,
    totalPassed: 0,
    totalFailed: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // 페이지가 포커스될 때마다 데이터 새로고침
  useEffect(() => {
    const handleFocus = () => {
      fetchDashboardData();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  const fetchDashboardData = async () => {
    try {
      const sentences = await sentenceAPI.getSentences();
      setRecentSentences(sentences.slice(0, 5)); // 최근 5개 문장
      
      // 통계 계산
      const totalPassed = sentences.reduce((sum, sentence) => sum + (sentence.pass_count || 0), 0);
      const totalFailed = sentences.reduce((sum, sentence) => sum + (sentence.fail_count || 0), 0);
      
      setStats({
        totalSentences: sentences.length,
        totalPassed,
        totalFailed
      });
    } catch (error) {
      console.error('대시보드 데이터 로딩 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">로딩 중...</div>;
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div className="app-title">
          <span className="title-秀">秀</span>: <span className="title-일">일</span>본어 <span className="title-통">통</span>문장 <span className="title-암">암</span>기
        </div>
        <h1>대시보드</h1>
        <p>일본어 문장 학습 현황을 확인하세요</p>
      </div>

      <div className="dashboard-stats">
        <div className="stats-container">
          <div className="stat-item">
            <h3>총 문장 수</h3>
            <div className="stat-number">{stats.totalSentences}</div>
          </div>
          
          <div className="stat-item">
            <h3>패스 횟수</h3>
            <div className="stat-number success">{stats.totalPassed}</div>
          </div>
          
          <div className="stat-item">
            <h3>실패 횟수</h3>
            <div className="stat-number error">{stats.totalFailed}</div>
          </div>
        </div>
      </div>

      <div className="dashboard-actions">
        <Link to="/sentences" className="action-card">
          <div className="action-icon">📝</div>
          <h3>문장 추가</h3>
          <p>새로운 일본어 문장을 등록하세요</p>
        </Link>
        
        <Link to="/test" className="action-card">
          <div className="action-icon">📚</div>
          <h3>시험 보기</h3>
          <p>등록한 문장으로 시험을 봅니다</p>
        </Link>
        
        <Link to="/sentences" className="action-card">
          <div className="action-icon">📋</div>
          <h3>문장 목록</h3>
          <p>등록한 모든 문장을 확인하세요</p>
        </Link>
      </div>

      {recentSentences.length > 0 && (
        <div className="recent-sentences">
          <h2>최근 등록한 문장</h2>
          <div className="sentence-list">
            {recentSentences.map((sentence) => (
              <div key={sentence.id} className="sentence-item">
                <div className="sentence-content">
                  <div className="japanese-text">{sentence.japanese_text}</div>
                  <div className="korean-meaning">{sentence.korean_meaning}</div>
                </div>
                <div className="sentence-stats">
                  <span className="pass-count">✓ {sentence.pass_count || 0}</span>
                  <span className="fail-count">✗ {sentence.fail_count || 0}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
