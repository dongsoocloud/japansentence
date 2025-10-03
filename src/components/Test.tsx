import React, { useState } from 'react';
import { sentenceAPI, Sentence } from '../services/api';
import './Test.css';

const Test: React.FC = () => {
  const [testSentences, setTestSentences] = useState<Sentence[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [comparison, setComparison] = useState<any[]>([]);
  const [testConfig, setTestConfig] = useState({
    count: 5,
    date: ''
  });
  const [testStarted, setTestStarted] = useState(false);
  const [testCompleted, setTestCompleted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const currentSentence = testSentences[currentIndex];

  const startTest = async () => {
    try {
      setLoading(true);
      setError('');
      const sentences = await sentenceAPI.getTestSentences(testConfig.count, testConfig.date || undefined);
      
      if (sentences.length === 0) {
        setError('선택한 조건에 맞는 문장이 없습니다.');
        return;
      }
      
      setTestSentences(sentences);
      setTestStarted(true);
      setCurrentIndex(0);
      setUserInput('');
      setShowResult(false);
      setTestCompleted(false);
    } catch (error: any) {
      setError('시험 문장을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const calculateScore = (originalText: string, userInput: string) => {
    // 정규화 함수: 의미 없는 차이점 제거 (compareSentences와 동일)
    const normalizeForComparison = (text: string) => {
      return text
        .replace(/\s+/g, '') // 모든 공백 제거
        .replace(/[[\]()（）]/g, '') // 괄호 제거
        .replace(/[、。！？]/g, '') // 일본어 구두점 제거
        .trim();
    };
    
    const normalizedOriginal = normalizeForComparison(originalText);
    const normalizedUser = normalizeForComparison(userInput);
    
    if (normalizedOriginal === normalizedUser) {
      return 100;
    }
    
    // LCS 알고리즘을 사용한 최적 매칭 계산
    const lcsLength = calculateLCS(normalizedOriginal, normalizedUser);
    const maxLength = Math.max(normalizedOriginal.length, normalizedUser.length);
    
    return Math.round((lcsLength / maxLength) * 100);
  };

  // LCS (Longest Common Subsequence) 계산
  const calculateLCS = (text1: string, text2: string) => {
    const chars1 = text1.split('');
    const chars2 = text2.split('');
    const m = chars1.length;
    const n = chars2.length;
    
    // DP 테이블 생성
    const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
    
    // LCS 계산
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (chars1[i-1] === chars2[j-1]) {
          dp[i][j] = dp[i-1][j-1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i-1][j], dp[i][j-1]);
        }
      }
    }
    
    return dp[m][n];
  };

  const compareSentences = (originalText: string, userInput: string) => {
    // 정규화 함수: 의미 없는 차이점 제거
    const normalizeForComparison = (text: string) => {
      return text
        .replace(/\s+/g, '') // 모든 공백 제거
        .replace(/[[\]()（）]/g, '') // 괄호 제거
        .replace(/[、。！？]/g, '') // 일본어 구두점 제거
        .trim();
    };
    
    // 원본 텍스트와 사용자 입력을 문자 배열로 변환
    const originalChars = originalText.split('');
    const userChars = userInput.split('');
    
    // 정규화된 텍스트로 매칭 계산
    const normalizedOriginal = normalizeForComparison(originalText);
    const normalizedUser = normalizeForComparison(userInput);
    
    // 정규화된 텍스트의 매칭 정보 계산
    const matchInfo = calculateCharacterMatches(normalizedOriginal, normalizedUser);
    
    // 원본 텍스트를 기준으로 결과 생성
    const result = [];
    let normalizedIndex = 0;
    
    for (let i = 0; i < originalChars.length; i++) {
      const originalChar = originalChars[i];
      
      // 공백이나 특수문자는 항상 올바른 것으로 처리
      if (/[\s[\]()（）、。！？]/.test(originalChar)) {
        result.push({
          original: originalChar,
          user: userChars[i] || '',
          isCorrect: true
        });
        continue;
      }
      
      // 정규화된 텍스트에서의 매칭 확인
      const isMatched = matchInfo.matchedChars.has(normalizedIndex);
      
      result.push({
        original: originalChar,
        user: userChars[i] || '',
        isCorrect: isMatched
      });
      
      normalizedIndex++;
    }
    
    // 사용자 입력에서 추가된 문자들 처리
    for (let i = originalChars.length; i < userChars.length; i++) {
      result.push({
        original: '',
        user: userChars[i],
        isCorrect: false
      });
    }
    
    return result;
  };

  // 문자 매칭 정보 계산 (간단하고 정확한 버전)
  const calculateCharacterMatches = (text1: string, text2: string) => {
    const chars1 = text1.split('');
    const chars2 = text2.split('');
    const matchedChars = new Set<number>();
    
    // 간단한 순차 매칭
    let i = 0, j = 0;
    while (i < chars1.length && j < chars2.length) {
      if (chars1[i] === chars2[j]) {
        matchedChars.add(i);
        i++;
        j++;
      } else {
        // 다음 매칭을 찾기 위해 j를 증가
        j++;
      }
    }
    
    return { matchedChars };
  };

  const submitAnswer = () => {
    if (!currentSentence) return;
    
    const calculatedScore = calculateScore(currentSentence.japanese_text, userInput);
    const comparisonResult = compareSentences(currentSentence.japanese_text, userInput);
    
    setScore(calculatedScore);
    setComparison(comparisonResult);
    setShowResult(true);
    
    // 결과 저장
    sentenceAPI.submitTestResult({
      sentenceId: currentSentence.id,
      passed: calculatedScore >= 90,
      score: calculatedScore
    });
  };

  const nextQuestion = () => {
    if (currentIndex < testSentences.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setUserInput('');
      setShowResult(false);
    } else {
      setTestCompleted(true);
    }
  };

  const restartTest = () => {
    setTestStarted(false);
    setTestCompleted(false);
    setCurrentIndex(0);
    setUserInput('');
    setShowResult(false);
    setTestSentences([]);
  };

  if (!testStarted && !testCompleted) {
    return (
      <div className="test-setup">
        <div className="test-setup-container">
          <h1>시험 설정</h1>
          
          <div className="test-config">
            <div className="form-group">
              <label htmlFor="count">시험 문장 수</label>
              <select
                id="count"
                value={testConfig.count}
                onChange={(e) => setTestConfig({...testConfig, count: parseInt(e.target.value)})}
              >
                <option value={3}>3개</option>
                <option value={5}>5개</option>
                <option value={10}>10개</option>
                <option value={15}>15개</option>
                <option value={20}>20개</option>
              </select>
            </div>
            
            <div className="form-group">
              <label htmlFor="date">날짜 필터 (선택사항)</label>
              <input
                type="date"
                id="date"
                value={testConfig.date}
                onChange={(e) => setTestConfig({...testConfig, date: e.target.value})}
              />
              <button 
                type="button" 
                onClick={() => setTestConfig({...testConfig, date: ''})}
                className="clear-date-btn"
              >
                전체 날짜
              </button>
            </div>
          </div>
          
          {error && <div className="error-message">{error}</div>}
          
          <button 
            onClick={startTest} 
            disabled={loading}
            className="start-test-btn"
          >
            {loading ? '시험 준비 중...' : '시험 시작'}
          </button>
        </div>
      </div>
    );
  }

  if (testCompleted) {
    const totalPassed = testSentences.length;
    
    return (
      <div className="test-completed">
        <div className="test-completed-container">
          <h1>시험 완료!</h1>
          <div className="test-summary">
            <div className="summary-item">
              <span className="summary-label">총 문장 수:</span>
              <span className="summary-value">{totalPassed}</span>
            </div>
          </div>
          
          <div className="test-actions">
            <button onClick={restartTest} className="restart-btn">
              다시 시험 보기
            </button>
            <a href="/dashboard" className="dashboard-btn">
              대시보드로 이동
            </a>
            <a href="/sentences" className="view-sentences-btn">
              문장 목록 보기
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="test">
      <div className="test-container">
        <div className="test-progress">
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${((currentIndex + 1) / testSentences.length) * 100}%` }}
            ></div>
          </div>
          <span className="progress-text">
            {currentIndex + 1} / {testSentences.length}
          </span>
        </div>

        <div className="test-question">
          <h2>다음 한국어 뜻에 맞는 일본어 문장을 입력하세요:</h2>
          <div className="korean-meaning">
            {currentSentence?.korean_meaning}
          </div>
          
          <div className="user-input-section">
            <textarea
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="일본어 문장을 입력하세요..."
              className="user-input"
              rows={3}
              disabled={showResult}
            />
            
            {!showResult && (
              <button onClick={submitAnswer} className="submit-answer-btn">
                답안 제출
              </button>
            )}
          </div>
        </div>

        {showResult && (
          <div className="test-result">
            <div className="score-display">
              <span className="score-label">점수:</span>
              <span className={`score-value ${score >= 90 ? 'pass' : 'fail'}`}>
                {score}점 {score >= 90 ? '(패스!)' : '(실패)'}
              </span>
            </div>
            
            <div className="answer-comparison">
              <div className="correct-answer">
                <h3>정답:</h3>
                <div className="answer-text">
                  {comparison.map((char, index) => (
                    <span 
                      key={index} 
                      className={char.isCorrect ? 'correct' : 'incorrect'}
                    >
                      {char.original}
                    </span>
                  ))}
                </div>
              </div>
              
              <div className="user-answer">
                <h3>내 답안:</h3>
                <div className="answer-text">
                  {comparison.map((char, index) => (
                    <span 
                      key={index} 
                      className={char.isCorrect ? 'correct' : 'incorrect'}
                    >
                      {char.user}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            
            <button onClick={nextQuestion} className="next-question-btn">
              {currentIndex < testSentences.length - 1 ? '다음 문제' : '시험 완료'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Test;
