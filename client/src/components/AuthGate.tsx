import { useEffect, useState } from "react";
import { api } from "../api/client";
import { Spinner } from "./ui";
import Login from "../pages/Login";
import Layout from "./Layout";

type Durum = "yukleniyor" | "girisli" | "girissiz";

export default function AuthGate() {
  const [durum, setDurum] = useState<Durum>("yukleniyor");

  const kontrolEt = () => {
    setDurum("yukleniyor");
    api
      .get("/auth/me")
      .then(() => setDurum("girisli"))
      .catch(() => setDurum("girissiz"));
  };

  useEffect(() => {
    kontrolEt();
  }, []);

  if (durum === "yukleniyor") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (durum === "girissiz") {
    return <Login onGiris={kontrolEt} />;
  }

  return <Layout />;
}
