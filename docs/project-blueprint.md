# Mystic AI - Proje Gereksinimleri

## Teknik Yığın (Tech Stack)
- **Dil:** Java 21
- **Framework:** Spring Boot 3.4+
- **Mimari:** Microservices (Spring Cloud)
- **Veritabanı:** PostgreSQL (Her servis için ayrı şema)
- **Mesajlaşma:** RabbitMQ (Asenkron AI işlemleri için)
- **AI Entegrasyonu:** Spring AI (Anthropic/OpenAI)

## Servis Kayıtları ve Portlar
- `service-registry`: 8761
- `api-gateway`: 8080
- `auth-service`: 8081
- `tarot-service`: 8082
- `astrology-service`: 8083
- `ai-orchestrator`: 8084

## Kodlama Standartları
- DTO'lar için Java 21 **Record** yapısı kullanılacak.
- Controller seviyesinde `ResponseEntity` dönecek.
- Exception Handling merkezi (GlobalExceptionHandler) olacak.
- İsimlendirmeler İngilizce olacak.


Servis Adı,Sorumluluk,Teknoloji Notu
Astrology,Doğum haritası verisi sağlar.,Ephemeris kütüphanesi entegrasyonu gerekebilir.
Tarot,Kart seçimi ve anlamlarını yönetir.,Randomize algoritması ve deste yönetimi.
AI Orchestrator,Tüm servislerden gelen ham veriyi AI'a gönderir.,Prompt Engineering burada yapılır.
Vision,Görüntü analizi (Kahve/El falı).,Spring AI + Multi-modal modeller (GPT-4o/Claude 3.5 Sonnet).