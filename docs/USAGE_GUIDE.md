Mystic AI - Complete Usage Guide (v3.0)React Native & Microservices Ekosistemi -
Sıfırdan Çalıştırma Kılavuzu
Bu kılavuz, Mystic AI mikroservis ekosistemini ve yeni Expo tabanlı mobil uygulamayı sıfırdan ayağa kaldırmak için gerekli tüm adımları içerir. Tüm Flutter bağımlılıkları temizlenmiş ve modern React Native + Expo mimarisine geçilmiştir.📋 GereksinimlerSistem GereksinimleriJava: 21 JDKMaven: 3.9+Node.js: 20+ (React Native/Expo kararlılığı için)Docker: 24.0+ & Docker ComposeGit: 2.40+Port Kullanımı

Port,Servis,Açıklama
5432,PostgreSQL,"Business Data (Tarot, Astrology, vb.)"
3306,MySQL,"Auth Data (User, Roles)"
6379,Redis,Cache & Session Management
5672,RabbitMQ,Message Broker (AMQP)
8761,Eureka,Service Registry (Registry)
9411,Zipkin,Distributed Tracing
8080,API Gateway,Ana Giriş Noktası (Routing)
8081,Auth Service,Kimlik Doğrulama & Profil

docker-compose up -d postgres mysql redis rabbitmq zipkin
Veritabanı Doğrulama
Bash# MySQL (Auth) bağlantı testi
docker exec -it mystic-mysql mysql -u root -p -e "SHOW DATABASES;"

# PostgreSQL (Business) bağlantı testi
docker exec -it mystic-postgres psql -U mystic -d mystic_db -c "\dt"
2️⃣ Backend Build & RunTüm Servisleri Maven ile DerlemeBash# Tüm modülleri temizle ve derle
mvn clean install -DskipTests -T 4
Servisleri Sırayla Başlatma (Script)start-services.sh scripti servisleri Eureka öncelikli olacak şekilde sırayla başlatır:Bashchmod +x start-services.sh
./start-services.sh
3️⃣ React Native (Expo) FrontendMobil uygulama mimarisi Expo Router, Zustand ve NativeWind (Tailwind) üzerine kuruludur.Kurulum ve ÇalıştırmaBash# Mobil uygulama dizinine git
cd mysticai-mobile

# Bağımlılıkları yükle
npm install

# Geliştirme sunucusunu başlat
npx expo start
Bağlantı Ayarları (API Endpoint)src/services/api.ts dosyasında şu yapılandırmayı kullanın:Android Emülatör: http://10.0.2.2:8080iOS Simülatör / Web: http://localhost:8080Fiziksel Cihaz (Expo Go): Bilgisayar Yerel IP (Örn: http://192.168.1.50:8080)4️⃣ Onboarding & Entegrasyon AkışıMobil uygulama ilk açıldığında aşağıdaki mantık çalışır:Auth Check: useAuthStore üzerinden token kontrol edilir. Token yoksa onboarding başlar.Onboarding: 9 adımlık veri toplama süreci (Doğum tarihi, saati, konumu, niyet vb.).Registration: Veriler toplandıktan sonra POST /api/v1/auth/register ucuna gönderilir.Hata Yönetimi: Eğer e-posta veritabanında varsa kullanıcıya hata gösterilir ve ilgili adıma yönlendirilir.Persistence: Başarılı kayıttan sonra JWT token MMKV ile saklanır ve kullanıcı (tabs)/home ekranına geçer.5️⃣ Monitoring & DebuggingAraçURLİşlevEureka Dashboardhttp://localhost:8761Mikroservislerin kayıt durumunu izleSwagger UIhttp://localhost:8080/swagger-ui.htmlAPI uç noktalarını dökümantasyonu ve testZipkin UIhttp://localhost:9411Request gecikmelerini ve tracing analiz etRabbitMQ UIhttp://localhost:15672Mesaj kuyruklarını (Queue) yönet🚀 Hızlı Başlangıç Cheat Sheet (Kopyala-Çalıştır)Bash# 1. Altyapıyı ayağa kaldır
docker-compose up -d

# 2. Backend'i derle ve tüm servisleri başlat
mvn clean install -DskipTests && ./start-services.sh

# 3. Frontend'i yükle ve çalıştır
cd mysticai-mobile && npm install && npx expo start
🔄 Sıfırdan Reset (Temiz Başlangıç)Bash# 1. Tüm Java süreçlerini ve Docker konteynerlarını durdur
pkill -f java
docker-compose down -v

# 2. Logları ve build çıktılarını temizle
rm -rf logs/*
mvn clean

# 3. Frontend Cache ve Node Modules temizle
cd mysticai-mobile && rm -rf node_modules && npm install && npx expo start -c
Hazırlayan: Mystic AI Development TeamSon Güncelleme: 2026-02-04Versiyon: 3.0.0 (React Native Migration)