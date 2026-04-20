import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom"; // 👈 thêm dòng này
import App from "./app/App.tsx";
import "./styles/index.css";

createRoot(document.getElementById("root")!).render(
  <BrowserRouter> {/* 👈 bọc ở đây */}
    <App />
  </BrowserRouter>
);
  