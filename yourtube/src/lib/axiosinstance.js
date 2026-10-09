import axios from "axios";
import { getBackendUrl } from "./api";

const axiosInstance = axios.create({
  baseURL: getBackendUrl(),
});

axiosInstance.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

export default axiosInstance;
