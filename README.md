# STV1 Satış Takip Sistemi

Next.js ile geliştirilmiş mağaza satış takip uygulaması.

## Özellikler

- Üç farklı rol: Admin, Mağaza Müdürü, Personel
- Satış kaydı ve takibi
- Dashboard ve raporlama
- Rol bazlı erişim kontrolü

## Test Hesapları

| Rol | E-posta | Şifre |
|-----|---------|-------|
| Admin | admin@stv1.com | admin123 |
| Mağaza Müdürü | manager1@stv1.com | manager123 |
| Personel | ayse@stv1.com | staff123 |

## Kurulum

1. Bağımlılıkları yükleyin:
```bash
npm install
```

2. Veritabanı ayarlarını yapın:
```bash
npx prisma migrate dev
npx prisma db seed
```

3. Geliştirme sunucusunu başlatın:
```bash
npm run dev
```

4. [http://localhost:3000](http://localhost:3000) adresini tarayıcınızda açın.

## Production

```bash
npm run build
npm start
```

`.env` dosyasında `NEXTAUTH_SECRET` ve `NEXTAUTH_URL` değerlerini production ortamına göre güncelleyin.