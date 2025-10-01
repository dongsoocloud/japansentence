import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 요청 인터셉터 - 토큰 자동 추가
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 응답 인터셉터 - 토큰 만료 처리
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    
    // 네트워크 오류 처리
    if (!error.response) {
      error.code = 'NETWORK_ERROR';
    }
    
    return Promise.reject(error);
  }
);

export interface User {
  id: number;
  username: string;
  email: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface Sentence {
  id: number;
  japanese_text: string;
  korean_meaning: string;
  furigana?: string;
  key_words?: string;
  created_at: string;
  pass_count?: number;
  fail_count?: number;
  last_studied?: string;
}

export interface AddSentenceRequest {
  japaneseText: string;
  koreanMeaning: string;
}

export interface TestResultRequest {
  sentenceId: number;
  passed: boolean;
  score: number;
}

// 인증 API
export const authAPI = {
  login: (data: LoginRequest): Promise<LoginResponse> =>
    api.post('/login', data).then(res => res.data),
  
  register: (data: RegisterRequest): Promise<{ message: string; userId: number }> =>
    api.post('/register', data).then(res => res.data),
};

// 문장 API
export const sentenceAPI = {
  getSentences: (date?: string): Promise<Sentence[]> =>
    api.get('/sentences', { params: { date } }).then(res => res.data),
  
  addSentence: (data: AddSentenceRequest): Promise<{ message: string; sentenceId: number }> =>
    api.post('/sentences', data).then(res => res.data),
  
  getTestSentences: (count: number, date?: string): Promise<Sentence[]> =>
    api.get('/test-sentences', { params: { count, date } }).then(res => res.data),
  
  submitTestResult: (data: TestResultRequest): Promise<{ message: string }> =>
    api.post('/test-result', data).then(res => res.data),
};

// 사용자 API
export const userAPI = {
  updateUser: (data: Partial<RegisterRequest>): Promise<{ message: string }> =>
    api.put('/user', data).then(res => res.data),
  
  deleteUser: (): Promise<{ message: string }> =>
    api.delete('/user').then(res => res.data),
};

export default api;
