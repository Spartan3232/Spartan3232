import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus } from "lucide-react";
import { toast } from "sonner";
import OturumList from "@/components/OturumList";
import KoclukForm from "@/components/KoclukForm";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function TTS() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [mumessil, setMumessil] = useState(null);
  const [oturumlar, setOturumlar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("gecmis");

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const [mumessilRes, oturumRes] = await Promise.all([
        axios.get(`${API}/mumessil/${id}`),
        axios.get(`${API}/mumessil/${id}/oturumlar`),
      ]);
      setMumessil(mumessilRes.data);
      setOturumlar(oturumRes.data);
      setLoading(false);
    } catch (error) {
      toast.error("Veri yüklenirken hata oluştu");
      setLoading(false);
    }
  };

  const getInitials = (name) => {
    return name?.split(" ").map((n) => n[0]).join("") || "";
  };

  if (loading || !mumessil) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-6 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 fade-in">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="mb-4 hover:bg-white/80"
            data-testid="back-btn"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Geri
          </Button>

          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
            <div className="flex items-center space-x-6">
              <Avatar className="h-20 w-20 ring-4 ring-blue-100">
                <AvatarImage src={mumessil.avatar_url} alt={mumessil.ad} />
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white text-2xl font-semibold">
                  {getInitials(mumessil.ad)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  {mumessil.ad}
                </h1>
                <p className="text-gray-600">{mumessil.bolge}</p>
              </div>
              <div className="text-right">
                <Badge className="bg-blue-600 text-white px-4 py-2 text-base">
                  Toplam Koçluk: {oturumlar.length}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="fade-in">
          <TabsList className="grid w-full grid-cols-2 mb-6 bg-white shadow-sm">
            <TabsTrigger
              value="gecmis"
              className="text-base data-[state=active]:bg-blue-600 data-[state=active]:text-white"
              data-testid="tab-gecmis"
            >
              Geçmiş
            </TabsTrigger>
            <TabsTrigger
              value="yeni"
              className="text-base data-[state=active]:bg-blue-600 data-[state=active]:text-white"
              data-testid="tab-yeni"
            >
              Yeni Koçluk
            </TabsTrigger>
          </TabsList>

          <TabsContent value="gecmis">
            <OturumList oturumlar={oturumlar} onRefresh={fetchData} />
          </TabsContent>

          <TabsContent value="yeni">
            <KoclukForm
              mumessilId={id}
              onSuccess={() => {
                fetchData();
                setActiveTab("gecmis");
                toast.success("Koçluk oturumu başarıyla kaydedildi");
              }}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
