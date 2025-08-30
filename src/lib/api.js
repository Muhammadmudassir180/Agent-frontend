import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5678/webhook',
  withCredentials: true,
//   headers: {
//     'Content-Type': 'application/json',
//   },
  credentials: 'include',
});

export default api;