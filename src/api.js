import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:8000", // if running on server change to server url
});

export default api;
