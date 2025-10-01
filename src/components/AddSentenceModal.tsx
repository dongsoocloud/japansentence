import React, { useState } from 'react';
import { sentenceAPI } from '../services/api';
import './AddSentenceModal.css';

interface AddSentenceModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const AddSentenceModal: React.FC<AddSentenceModalProps> = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    japaneseText: '',
    koreanMeaning: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await sentenceAPI.addSentence({
        japaneseText: formData.japaneseText,
        koreanMeaning: formData.koreanMeaning
      });
      
      onSuccess();
    } catch (error: any) {
      setError(error.response?.data?.error || '문장 등록에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>문장 추가</h2>
          <button onClick={onClose} className="close-btn">&times;</button>
        </div>
        
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label htmlFor="japaneseText">일본어 문장</label>
            <textarea
              id="japaneseText"
              name="japaneseText"
              value={formData.japaneseText}
              onChange={handleChange}
              placeholder="일본어 문장을 입력하세요"
              required
              rows={3}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="koreanMeaning">한국어 뜻</label>
            <textarea
              id="koreanMeaning"
              name="koreanMeaning"
              value={formData.koreanMeaning}
              onChange={handleChange}
              placeholder="한국어 뜻을 입력하세요"
              required
              rows={3}
            />
          </div>
          
          {error && <div className="error-message">{error}</div>}
          
          <div className="form-actions">
            <button 
              type="button" 
              onClick={onClose}
              className="cancel-btn"
            >
              ✕
            </button>
            <button 
              type="submit" 
              disabled={loading}
              className="submit-btn"
            >
              {loading ? '등록 중...' : '등록'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddSentenceModal;
