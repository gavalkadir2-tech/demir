import { Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import YeniIs from "./pages/YeniIs";
import Isler from "./pages/Isler";
import IsDetay from "./pages/IsDetay";
import Urunler from "./pages/Urunler";
import Malzemeler from "./pages/Malzemeler";
import KesimListeleri from "./pages/KesimListeleri";
import Teklifler from "./pages/Teklifler";
import TeklifDetay from "./pages/TeklifDetay";
import Stok from "./pages/Stok";
import Musteriler from "./pages/Musteriler";
import MusteriDetay from "./pages/MusteriDetay";
import Ayarlar from "./pages/Ayarlar";
import Takvim from "./pages/Takvim";
import Isciler from "./pages/Isciler";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/yeni-is" element={<YeniIs />} />
        <Route path="/isler" element={<Isler />} />
        <Route path="/isler/:id" element={<IsDetay />} />
        <Route path="/urunler" element={<Urunler />} />
        <Route path="/malzemeler" element={<Malzemeler />} />
        <Route path="/kesim-listeleri" element={<KesimListeleri />} />
        <Route path="/teklifler" element={<Teklifler />} />
        <Route path="/teklifler/:id" element={<TeklifDetay />} />
        <Route path="/stok" element={<Stok />} />
        <Route path="/musteriler" element={<Musteriler />} />
        <Route path="/musteriler/:id" element={<MusteriDetay />} />
        <Route path="/takvim" element={<Takvim />} />
        <Route path="/isciler" element={<Isciler />} />
        <Route path="/ayarlar" element={<Ayarlar />} />
      </Route>
    </Routes>
  );
}
