import React, { useState, useEffect } from 'react';
import { sentenceAPI, Sentence } from '../services/api';
import AddSentenceModal from './AddSentenceModal';
import './SentenceList.css';

const SentenceList: React.FC = () => {
  const [sentences, setSentences] = useState<Sentence[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState('');
  const [error, setError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [hideJapanese, setHideJapanese] = useState(false);

  useEffect(() => {
    fetchSentences();
  }, [selectedDate]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchSentences = async () => {
    try {
      setLoading(true);
      const data = await sentenceAPI.getSentences(selectedDate || undefined);
      setSentences(data);
    } catch (error: any) {
      setError('문장 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(e.target.value);
  };

  const clearDateFilter = () => {
    setSelectedDate('');
  };

  const handleAddSentence = () => {
    setShowAddModal(true);
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
  };

  const handleSentenceAdded = () => {
    setShowAddModal(false);
    fetchSentences(); // 문장 목록 새로고침
  };

  const formatDateShort = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: '2-digit',
      month: '2-digit',
      day: '2-digit'
    });
  };

  // 문장들을 날짜별로 그룹화
  const groupSentencesByDate = (sentences: Sentence[]) => {
    const grouped: { [key: string]: Sentence[] } = {};
    
    sentences.forEach(sentence => {
      const date = sentence.created_at.split('T')[0]; // YYYY-MM-DD 형식
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(sentence);
    });
    
    // 날짜별로 정렬 (최신순)
    return Object.keys(grouped)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
      .map(date => ({
        date,
        sentences: grouped[date]
      }));
  };

  if (loading) {
    return <div className="loading">문장 목록을 불러오는 중...</div>;
  }

  const groupedSentences = groupSentencesByDate(sentences);

  return (
    <div className="sentence-list">
      <div className="sentence-list-header">
        <h1>문장 목록</h1>
        
        <div className="header-actions">
          <div className="filter-controls">
            <div className="date-filter">
              <label htmlFor="date-filter">날짜 필터:</label>
              <input
                type="date"
                id="date-filter"
                value={selectedDate}
                onChange={handleDateChange}
              />
              {selectedDate && (
                <button onClick={clearDateFilter} className="clear-filter-btn">
                  필터 초기화
                </button>
              )}
            </div>
            
            <div className="hide-japanese-control">
              <label>
                <input
                  type="checkbox"
                  checked={hideJapanese}
                  onChange={(e) => setHideJapanese(e.target.checked)}
                />
                일본어 가리기
              </label>
            </div>
          </div>
          
          <button onClick={handleAddSentence} className="add-sentence-btn">
            + 문장 추가
          </button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {sentences.length === 0 ? (
        <div className="empty-state">
          <p>등록된 문장이 없습니다.</p>
          <button onClick={handleAddSentence} className="add-sentence-link">
            첫 번째 문장을 추가해보세요
          </button>
        </div>
      ) : (
        <div className="sentences-timeline">
          {groupedSentences.map(({ date, sentences: dateSentences }) => (
            <div key={date} className="date-group">
              <div className="sentences-list">
                {dateSentences.map((sentence) => (
                  <div key={sentence.id} className="sentence-item">
                    <div className="sentence-content">
                      <div className="korean-meaning">{sentence.korean_meaning}</div>
                      <div className={`japanese-text ${hideJapanese ? 'hidden' : ''}`}>
                        {sentence.japanese_text}
                      </div>
                    </div>
                    
                    <div className="sentence-meta">
                      <div className="sentence-stats">
                        <span className="pass-count">
                          ✓ 패스: {sentence.pass_count || 0}
                        </span>
                        <span className="fail-count">
                          ✗ 실패: {sentence.fail_count || 0}
                        </span>
                      </div>
                      
                      {sentence.last_studied && (
                        <div className="last-studied">
                          마지막 학습: {formatDateShort(sentence.last_studied)}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {showAddModal && (
        <AddSentenceModal
          onClose={handleCloseModal}
          onSuccess={handleSentenceAdded}
        />
      )}
    </div>
  );
};

export default SentenceList;
