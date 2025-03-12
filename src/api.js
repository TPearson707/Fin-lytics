import axios from "axios";

const api = axios.create({
  baseURL:
    "mysql+pymysql://website_user:iamthesiteuser@jobhunting.cdoka0swm67i.us-east-2.rds.amazonaws.com:3306/database", // if running on server change to server url
});

export default api;
