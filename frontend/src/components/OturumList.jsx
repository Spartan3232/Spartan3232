import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar, Users, FileText } from "lucide-react";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function OturumList({ oturumlar, onRefresh }) {
  const [selectedOturum, setSelectedOturum] = useState(null);
  const [detay, setDetay] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleViewDetay = async (oturum) => {
    setSelectedOturum(oturum);
    setLoading(true);
    try {
      const res = await axios.get(`${API}/oturum/${oturum.id}`);
      setDetay(res.data);
    } catch (error) {
      console.error("Detay yüklenemedi", error);
    }
    setLoading(false);
  };

  if (oturumlar.length === 0) {
    return (
      <div className="text-center py-16 bg-white rounded-xl shadow-md border border-gray-200">
        <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600 text-lg">Henüz koçluk oturumu yok.</p>
        <p className="text-gray-500 text-sm mt-2">Yeni Koçluk sekmesinden oturum oluşturabilirsiniz.</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {oturumlar.map((oturum, index) => (
          <Card
            key={oturum.id}
            className="cursor-pointer hover:shadow-lg transition-shadow bg-white border-gray-200 slide-up"
            style={{ animationDelay: `${index * 50}ms` }}
            onClick={() => handleViewDetay(oturum)}
            data-testid={`oturum-card-${index}`}
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-4 mb-3">
                    <div className="flex items-center text-gray-700">
                      <Calendar className="h-4 w-4 mr-2" />
                      <span className="font-semibold">{new Date(oturum.tarih).toLocaleDateString('tr-TR')}</span>
                    </div>
                    <div className="flex items-center text-gray-600">
                      <Users className="h-4 w-4 mr-2" />
                      <span className="text-sm">Doktor: {oturum.doktor_sayisi} | Eczane: {oturum.eczane_sayisi}</span>
                    </div>
                  </div>
                  <p className="text-gray-700 line-clamp-2">{oturum.ortak_yorum_1?.split('\n')[0] || "Yorum bulunmuyor"}</p>
                </div>
                <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200 ml-4">Detay</Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Detay Modal */}
      <Dialog open={!!selectedOturum} onOpenChange={(open) => !open && setSelectedOturum(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Koçluk Oturumu Detayı</DialogTitle>
          </DialogHeader>
          {loading ? (
            <div className="py-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Yükleniyor...</p>
            </div>
          ) : detay ? (
            <div className="space-y-6 py-4">
              {/* Temel Bilgiler */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Tarih</p>
                    <p className="font-semibold">{new Date(detay.oturum.tarih).toLocaleDateString('tr-TR')}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Doktor / Eczane</p>
                    <p className="font-semibold">{detay.oturum.doktor_sayisi} / {detay.oturum.eczane_sayisi}</p>
                  </div>
                </div>
              </div>

              {/* Yetkinlikler */}
              <div>
                <h3 className="font-bold text-lg mb-3">Yetkinlik Değerlendirmeleri</h3>
                <div className="space-y-2">
                  {['Etkinlik', 'Verimlilik'].map(alan => {
                    const items = detay.yetkinlikler.filter(y => y.alan === alan);
                    if (items.length === 0) return null;
                    return (
                      <div key={alan} className="bg-gray-50 rounded-lg p-4">
                        <h4 className="font-semibold mb-2">{alan}</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {items.map((y, idx) => (
                            <div key={idx} className="flex items-center justify-between text-sm">
                              <span className="text-gray-700">{y.baslik}</span>
                              <Badge variant={y.seviye === 'Gelişmeli' ? 'destructive' : y.seviye === 'Başarılı' ? 'default' : 'secondary'}>
                                {y.seviye}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Yorumlar */}
              {detay.oturum.ortak_yorum_1 && (
                <div>
                  <h3 className="font-bold text-lg mb-3">Ortak Yorumlar</h3>
                  <div className="bg-gray-50 rounded-lg p-4 whitespace-pre-wrap">{detay.oturum.ortak_yorum_1}</div>
                </div>
              )}

              {/* Aksiyonlar */}
              {detay.aksiyonlar.length > 0 && (
                <div>
                  <h3 className="font-bold text-lg mb-3">Aksiyon Planları</h3>
                  <div className="space-y-3">
                    {detay.aksiyonlar.map((aksiyon, idx) => (
                      <div key={idx} className="border-l-4 border-amber-500 bg-gray-50 rounded-r-lg p-4">
                        <h4 className="font-bold text-amber-700 mb-2">{aksiyon.baslik}</h4>
                        <div className="text-sm space-y-1">
                          <p><span className="font-semibold">Aksiyon Konusu:</span> {aksiyon.aksiyon_konusu}</p>
                          <p><span className="font-semibold">Hedef:</span> {aksiyon.hedef}</p>
                          <p><span className="font-semibold">Ölçüm:</span> {aksiyon.olcum}</p>
                          <p><span className="font-semibold">Beklenen Sonuç:</span> {aksiyon.beklenen_sonuc}</p>
                          <p><span className="font-semibold">Nasıl 1:</span> {aksiyon.nasil1}</p>
                          {aksiyon.nasil2 && <p><span className="font-semibold">Nasıl 2:</span> {aksiyon.nasil2}</p>}
                          {aksiyon.nasil3 && <p><span className="font-semibold">Nasıl 3:</span> {aksiyon.nasil3}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
