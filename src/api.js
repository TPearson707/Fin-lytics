import axios from "axios";

const api = axios.create({
  baseURL: "http://127.0.0.1:8000",
  withCredentials: true,
});

//if we see a 401 response, log the user out
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      //console.log("401 error intercepted, logging out and redirecting...");
      localStorage.removeItem("token");
      window.location.href = "/";
    }
    return Promise.reject(error);
  }
);

export default api;
