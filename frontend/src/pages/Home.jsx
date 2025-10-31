import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, User, MapPin, Phone, Mail } from "lucide-react";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Home() {
  const navigate = useNavigate();
  const [mumessiller, setMumessiller] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [oturumCounts, setOturumCounts] = useState({});

  useEffect(() => {
    fetchMumessiller();
  }, []);

  const fetchMumessiller = async () => {
    try {
      const res = await axios.get(`${API}/mumessil`);
      setMumessiller(res.data);
      
      // Fetch session counts
      const counts = {};
      for (const m of res.data) {
        const oturumRes = await axios.get(`${API}/mumessil/${m.id}/oturumlar`);
        counts[m.id] = oturumRes.data.length;
      }
      setOturumCounts(counts);
      setLoading(false);
    } catch (error) {
      toast.error("Mümessiller yüklenirken hata oluştu");
      setLoading(false);
    }
  };

  const filteredMumessiller = mumessiller.filter(
    (m) =>
      m.ad.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.bolge.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getInitials = (name) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("");
  };

  if (loading) {
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
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 fade-in">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-2">
            F3 AI Koç
          </h1>
          <p className="text-lg text-gray-600">
            Mümessil Koçluk Yönetim Sistemi
          </p>
        </div>

        {/* Search */}
        <div className="mb-8 fade-in">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <Input
              type="text"
              placeholder="Mümessil veya bölge ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-12 text-base"
              data-testid="search-input"
            />
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredMumessiller.map((mumessil, index) => (
            <Card
              key={mumessil.id}
              className="card-hover cursor-pointer overflow-hidden border-gray-200 bg-white/80 backdrop-blur-sm slide-up"
              style={{ animationDelay: `${index * 50}ms` }}
              onClick={() => navigate(`/tts/${mumessil.id}`)}
              data-testid={`mumessil-card-${mumessil.id}`}
            >
              <CardContent className="p-6">
                <div className="flex flex-col items-center text-center space-y-4">
                  {/* Avatar */}
                  <Avatar className="h-20 w-20 ring-4 ring-blue-100">
                    <AvatarImage src={mumessil.avatar_url} alt={mumessil.ad} />
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white text-xl font-semibold">
                      {getInitials(mumessil.ad)}
                    </AvatarFallback>
                  </Avatar>

                  {/* Name */}
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-1">
                      {mumessil.ad}
                    </h3>
                    <div className="flex items-center justify-center text-sm text-gray-600">
                      <MapPin className="h-4 w-4 mr-1" />
                      {mumessil.bolge}
                    </div>
                  </div>

                  {/* Stats */}
                  <Badge
                    variant="secondary"
                    className="bg-blue-50 text-blue-700 hover:bg-blue-100 px-3 py-1"
                  >
                    Toplam Koçluk: {oturumCounts[mumessil.id] || 0}
                  </Badge>

                  {/* Contact Info */}
                  <div className="w-full pt-4 border-t border-gray-200 space-y-2">
                    <div className="flex items-center text-xs text-gray-600">
                      <Mail className="h-3 w-3 mr-2 flex-shrink-0" />
                      <span className="truncate">{mumessil.eposta}</span>
                    </div>
                    <div className="flex items-center text-xs text-gray-600">
                      <Phone className="h-3 w-3 mr-2 flex-shrink-0" />
                      <span>{mumessil.telefon}</span>
                    </div>
                  </div>

                  {/* Button */}
                  <Button
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/tts/${mumessil.id}`);
                    }}
                    data-testid={`view-tts-btn-${mumessil.id}`}
                  >
                    TTS Sayfasına Git
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredMumessiller.length === 0 && (
          <div className="text-center py-12 fade-in">
            <User className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">Mümessil bulunamadı</p>
          </div>
        )}
      </div>
    </div>
  );
}
