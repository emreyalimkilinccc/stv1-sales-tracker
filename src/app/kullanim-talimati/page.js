'use client'

import Link from 'next/link'

const SECTIONS = [
  {
    icon: '🔑', title: 'Giriş Yapma', color: '#3b82f6',
    content: [
      'Kullanıcı adı: Satış kodunuz (ör: 2646)',
      'Şifreniz: Varsayılan şifre 123456',
      'Giriş yaptıktan sonra ana sayfaya yönlendirilirsiniz',
      'Şifrenizi değiştirmek için menüden 🔐 Şifre Değiştir seçin'
    ]
  },
  {
    icon: '📊', title: 'Veriler (Dashboard)', color: '#8b5cf6',
    content: [
      'Aylık kota takibinizi görebilirsiniz',
      'Tarih aralığı filtresi ile istediğiniz dönemi görüntüleyin',
      'Kategori bazlı satış dağılımı grafikte görünür',
      'Kişisel hedef belirleyebilirsiniz',
      'Geçen ay ile karşılaştırma otomatik yapılır',
      'Her gün girişte motivasyon yazısı görünür',
      'CSV ile verilerinizi dışa aktarabilirsiniz'
    ]
  },
  {
    icon: '💰', title: 'Satış Girişi', color: '#10b981',
    content: [
      'Tarih, saat, tutar, ürün sayısı, bonus ürün sayısı doldurun',
      'Müşteri numarası ve kategori seçin',
      'Eksi tutar (-) girerseniz iade/iptal olarak kaydedilir',
      'Kaydet butonuna basın, otomatik olarak Veriler sayfasına yönlendirilirsiniz',
      'Geçmiş satışlarınızı listeden görebilirsiniz',
      'Birden fazla satışı checkbox ile seçip toplu silebilirsiniz'
    ]
  },
  {
    icon: '🛡️', title: 'KASKO Hesaplama', color: '#06b6d4',
    content: [
      'Kategori seçin (Beyaz Eşya, Elektronik, Cep Telefonu vb.)',
      'KASKO türünü seçin (Kapsamlı Onarım veya Uzatılmış Garanti)',
      'Ürün satış fiyatını girin',
      'Otomatik olarak KASKO fiyatı, prim ve toplam fiyat hesaplanır',
      'Altta hesap makinası ile ek hesaplama yapabilirsiniz',
      'Taksit seçenekleri: 5, 10, 12, 15 ve 20 aylık ödeme miktarları otomatik hesaplanır'
    ]
  },
  {
    icon: '📈', title: 'Raporlar', color: '#f59e0b',
    content: [
      'Personelin gönderdiği düzeltme istekleri burada görünür',
      'Tarih ve satıcı filtresi ile arama yapabilirsiniz',
      'Düzenleme yapıldığında istek listeden kalkar'
    ]
  },
  {
    icon: '🏆', title: 'Performans', color: '#ec4899',
    content: [
      'Puan kazanın: Her satış +10 puan, 1K TL satış +5 puan, bonus +2 puan',
      'Seviye ilerlemesi: Bronz → Gümüş → Altın → Elmas → Efsane',
      'Günlük görevleri tamamlayarak ek puan kazanın',
      'Başarı rozetlerini toplayın (10 satış, kota kralı vb.)'
    ]
  },
  {
    icon: '🧹', title: 'Temizlik Programı', color: '#06b6d4',
    content: [
      'Yönetici/Müdür tarafından her güne kişi atanır',
      'Sadece atandığınız gün formu açılır',
      'Görevleri tamamlayıp fotoğraf kanıtı ekleyin',
      'En fazla 5 fotoğraf yükleyebilirsiniz'
    ]
  },
  {
    icon: '🚛', title: 'Transfer', color: '#8b5cf6',
    content: [
      '🏪 Mağaza Deposu: Mağaza içi transfer kayıtları',
      '📦 Dış Depo: Dış depo transfer kayıtları',
      'Mağaza adı, barkod ve araç plakası manuel girilir',
      'Tarih/saat ve işlem yapan kişi otomatik olarak doldurulur',
      'Kaydedilen transferler listelenir ve yazdırılabilir',
      '🖨️ Yazdır butonu ile resmi transfer fişi oluşturulur',
      'Tüm personel transfer ekleyebilir',
      '🔊 Transfer kaydedildiğinde sesli uyarı çalar'
    ]
  },
  {
    icon: '📊', title: 'Günlük Kapanış Özeti', color: '#6366f1',
    content: [
      'Dashboard\'da üstte günün özeti görünür',
      'Toplam satış tutarı ve adedi',
      'Toplam mola süresi ve sayısı',
      'Toplam transfer sayısı',
      'Hoş geldin mesajı ile birlikte gösterilir'
    ]
  },
  {
    icon: '⭐', title: 'Favori Sayfalar', color: '#f59e0b',
    content: [
      'Dashboard\'da en çok kullandığınız sayfaları favoriye alabilirsiniz',
      'Favori sayfalar üstte hızlı erişim olarak görünür',
      'Düzenle butonu ile favori sayfalarınızı seçebilirsiniz',
      'Tercihleriniz kaydedilir — cihazda kalıcı olarak saklanır'
    ]
  },
  {
    icon: '📝', title: 'Personel Not Defteri', color: '#f59e0b',
    content: [
      'Dashboard\'da bir sonraki personele not bırakabilirsiniz',
      'Not yazıp "Bırak" butonuna tıklayın',
      'Notlar 2 gün boyunca görünür',
      'Kendi notunuzu veya yöneticinizin notunu silebilirsiniz'
    ]
  },
  {
    icon: '🎯', title: 'Haftalık Hedef', color: '#3b82f6',
    content: [
      'Haftalık satış hedefi belirleyebilirsiniz',
      'İlerleme çubuğu ile hedefinize ne kadar yaklaştığınızı görün',
      'Günlük ortalama, kalan gün ve tahmini satış gösterilir',
      'Hedefe ulaşınca yeşile döner 🎉'
    ]
  },
  {
    icon: '⚡', title: 'Satış Hızı', color: '#06b6d4',
    content: [
      'Bugünkü satış hızınızı anlık olarak görün',
      'Saatlik ortalama ve en aktif saat bilgisi',
      '🔥 Çok Hızlı / 💪 İyi Gidiyor / 👍 Normal / 🐢 Yavaş',
      'Saatlik satış dağılımı grafikte gösterilir'
    ]
  },
  {
    icon: '🗳️', title: 'Oylama', color: '#ec4899',
    content: [
      'Yeni anket oluşturulabilir (Yönetici/Müdür)',
      'Herkes 1 kez oy kullanabilir',
      'Oylar anlık olarak sonuçlandırılır'
    ]
  },
  {
    icon: '🎰', title: 'Çekiliş', color: '#8b5cf6',
    content: [
      'Yönetici/Müdür tarafından başlatılır',
      'Kategori seçerek belirli grubu çekebilirsiniz',
      'Çark döner ve kazanan belli olur',
      'Kazanan kişi tüm sayfalarda kutlama animasyonu görür'
    ]
  },
  {
    icon: '📦', title: 'Müşteri Teslim', color: '#ec4899',
    content: [
      'Yeni teslim kaydı oluşturun',
      '📷 ile belge fotoğrafı çekin (teslim fişi, imza)',
      'Durum takibi: Teslim / Bekleyen / İptal'
    ]
  },
  {
    icon: '📥', title: 'Gelen Ürünler', color: '#f97316',
    content: [
      'Yeni gelen ürün kaydı oluşturun',
      '📷 ile irsaliye/fatura fotoğrafı çekin',
      'Durum takibi: Alındı → Kontrol → Rafa Kaldırıldı'
    ]
  },
  {
    icon: '👥', title: 'Müşteri Yönetimi', color: '#06b6d4',
    content: [
      'Müşterilerinizi ekleyin ve düzenleyin',
      'Satın alma geçmişini görüntüleyebilirsiniz'
    ]
  },
  {
    icon: '📅', title: 'İzin Talep', color: '#f59e0b',
    content: [
      'İzin türü seçin (Yıllık, Sağlık, Kişisel, Diğer)',
      'Tarih aralığı ve sebep girin',
      'Yönetici/Müdür onaylar veya reddeder'
    ]
  },
  {
    icon: '☕', title: 'Ekip Molası', color: '#f59e0b',
    content: [
      'Mola türü seçin: 🍽️ Yemek (1 saat) veya ☕ Çay (15 dk)',
      'Seçtikten sonra onay ekranında "Gönder" butonuna basın',
      'Gönder dediğinizde sayaç başlar ve yöneticiye canlı olarak düşer',
      'Süre dolduğunda sesli uyarı ile tamamlanır',
      'Günde 1 yemek + 2 çay molası hakkınız vardır',
      'Göndermeyen personele yönetici göremez — sadece gönderilenler görünür',
      'Gece 00:00\'da tüm molalar sıfırlanır'
    ]
  },
  {
    icon: '🔧', title: 'Ayarlar', color: '#6366f1',
    content: [
      '🔔 Bildirim tercihlerinizi yönetin (satış, kota, temizlik, izin)',
      '🔊 Satış sesli bildirimini açıp kapatabilirsiniz',
      '🎂 Doğum tarihinizi girin — takvimde ve ekip doğum günleri listesinde görünür',
      '🔐 Şifre değiştirme ve kullanım talimatı burada',
      'Tercihleriniz kaydedilir — cihazda kalıcı olarak saklanır',
      'Doğum tarihi girmek için: 🔧 Ayarlar → 🎂 Doğum Tarihi → tarih seç → Kaydet'
    ]
  },
  {
    icon: '📅', title: 'Ekip Takvimi', color: '#8b5cf6',
    content: [
      'Ay takvimi üzerinden doğum günlerini, tatilleri ve vardiya bilgilerini görün',
      '🔴 Kırmızı günler resmi tatillerdir (15 Temmuz, 29 Ekim, Bayramlar vb.)',
      '🎂 Doğum günü bilgisi girilmiş personeller takvimde işaretlenir',
      '👥 Vardiya seçimi: Yönetici/Müdür takvimdeki tarihe tıklayarak "Vardiya Seç" ile o gün çalışacak personelleri belirler',
      'Seçilen personeller o günün altında listelenir ve gün takvimde mor renkte görünür',
      '🏖️ Onaylı izin talepleri takvimde sarı renkte işaretlenir',
      'Doğum tarihi girmek için: 🔧 Ayarlar → 🎂 Doğum Tarihi',
      'Vardiyalı günler için resmi talimat evrakı oluşturulur (yazdır/indir)',
      'Takvimde yıl değiştirildiğinde bayramlar otomatik hesaplanır (Hicri takvim)'
    ]
  },
  {
    icon: '💱', title: 'Döviz Çevirici', color: '#10b981',
    content: [
      'ABD Doları, Euro, İngiliz Sterlini ve TL çevirme',
      'Hızlı miktar butonları (100, 500, 1.000, 5.000, 10.000, 50.000)',
      'Özel kur girerek kendi kurunuzla hesaplama yapabilirsiniz',
      'Referans kurları altta gösterilir'
    ]
  },
  {
    icon: '🔥', title: 'Satış Isı Haritası', color: '#ef4444',
    content: [
      'Son 7 gün veya son 30 gün satış dağılımı',
      'Günlük bazda renkli bar chart ve yoğunluk grid',
      'En yoğun gün ve ortalama satış bilgisi',
      'İpucu: Hücrelere tıklayarak detaylı bilgi alın'
    ]
  },
  {
    icon: '💰', title: 'Muhasebe', color: '#10b981',
    content: [
      '🏦 Banka Tahsilatı: Her Salı kasadan bankaya yatırılan tutarlar',
      '🏷️ Marka Primi: Her ayın 10\'unda alınan prim tutarları',
      '💵 Normal Prim: Her ayın 25\'inde alınan prim tutarları',
      'Kişiyi seçip tutar girilir, aylık özet otomatik hesaplanır',
      'Kişi bazlı toplam kazanç takibi',
      'Aylık/balık dönem filtresi ile eski kayıtlara erişim',
      'Dashboard\'da motivasyon yazısının altında bu ayın özeti görünür',
      'Herkes kendi kazancını görebilir, yönetici/müdür/kasa tümünü görebilir',
      'Erişim: Sadece Admin, Müdür ve Kasa yetkilisi sees — diğer personel erişemez'
    ]
  },
  {
    icon: '⚙️', title: 'Yönetim Paneli', color: '#ef4444',
    content: [
      'Mağaza ekleme, düzenleme ve silme',
      'Personel ekleme, düzenleme ve silme',
      'Aylık kota yönetimi',
      'Kategori ataması',
      'Aktivite logu',
      'Veri yedekleme (JSON indirme)'
    ]
  }
]

const RULES = [
  {
    title: 'Personel', icon: '👤', color: '#3b82f6',
    abilities: ['Satış ekleme', 'Müşteri ekleme', 'Envanter ekleme', 'Gelen ürün ekleme', 'Teslim kaydı oluşturma', 'Temizlik görevi', 'İzin talebi', 'KASKO hesaplama', 'Mola talebi']
  },
  {
    title: 'Mağaza Müdürü', icon: '👔', color: '#f59e0b',
    abilities: ['Tüm personel işlemleri', 'Satış düzenleme/silme', 'Müşteri düzenleme/silme', 'Envanter düzenleme/silme', 'Durum değiştirme', 'Çekiliş başlatma', 'Anket oluşturma', 'Kota yönetimi', 'Vardiya yönetimi']
  },
  {
    title: 'Yönetici', icon: '👑', color: '#ef4444',
    abilities: ['Tüm müdür işlemleri', 'Kullanıcı ekleme/silme', 'Mağaza yönetimi', 'Veri yedekleme', 'Aktivite logu', 'Vardiya talimatı yazdırma']
  }
]

const TIPS = [
  { icon: '💡', text: 'Sayfayı yenilediğinizde verileriniz korunur — tüm bilgiler bulutta saklanır' },
  { icon: '📱', text: 'Uygulama telefona eklenebilir — ana ekrana ekleyerek tam ekran kullanabilirsiniz (iOS: Safari\'den Ana Ekrana Ekle)' },
  { icon: '🔔', text: 'Bildirimleri açarak yeniliklerden haberdar olabilirsiniz' },
  { icon: '⚡', text: 'İnternet yokken bile temel verileri görebilirsiniz (çevrimdışı mod)' },
  { icon: '🔍', text: 'Satış sayfasında gelişmiş filtreleme ve arama yapabilirsiniz' },
  { icon: '📊', text: 'Dashboard\'dan CSV ile verilerinizi dışa aktarabilirsiniz' },
  { icon: '📝', text: 'Personel Not Defteri ile bir sonraki personele not bırakabilirsiniz' },
  { icon: '🎯', text: 'Haftalık hedef belirleyin, ilerleme çubuğunu takip edin' },
  { icon: '⚡', text: 'Satış Hızı Göstergesi ile günün performansını anlık görün' },
  { icon: '⭐', text: 'En çok kullandığınız sayfaları favoriye alarak hızlı erişim sağlayın' },
  { icon: '🧮', text: 'KASKO sayfasında hesap makinası ile ek hesaplama yapabilirsiniz' },
  { icon: '☕', text: 'Mola sistemi ile molalarınızı takip edebilirsiniz — yöneticiler canlı görebilir' },
  { icon: '🔧', text: 'Ayarlar menüsünden bildirim ve ses tercihlerinizi düzenleyebilirsiniz' },
  { icon: '📅', text: 'Takvimde her yıl bayramlar otomatik hesaplanır — yıl değiştirerek kontrol edebilirsiniz' },
  { icon: '📄', text: 'Vardiyalı günler için resmi talimat evrakı oluşturup yazdırabilir veya indirebilirsiniz' },
  { icon: '📅', text: 'Hesap ayarlarından doğum tarihinizi girin, takvimde ve ekip doğum günleri listesinde görünsün' },
  { icon: '💬', text: 'Her gün Dashboard\'da motivasyon yazısı sizi bekler' }
]

export default function KullanimTalimatiPage() {
  return (
    <div className="px-4 py-6 max-w-4xl mx-auto">
      {/* Başlık */}
      <div className="page-header" style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-15px', right: '-15px', fontSize: '80px', opacity: 0.1, transform: 'rotate(15deg)' }}>📖</div>
        <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#ffffff', marginBottom: '0.375rem', position: 'relative' }}>📖 Kullanım Talimatı</h1>
        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px', position: 'relative' }}>STV1 Mağaza Satış Takip Sistemi nasıl kullanılır?</p>
      </div>

      {/* Özet */}
      <div className="card" style={{ marginBottom: '1rem', background: 'linear-gradient(135deg, rgba(59,130,246,0.1), rgba(139,92,246,0.1))' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
          <span style={{ fontSize: '28px' }}>🏪</span>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#f8fafc' }}>STV1 Nedir?</h2>
            <p style={{ fontSize: '13px', color: '#94a3b8' }}>Mağaza satışlarınızı, stoklarınızı ve personel yönetimizi tek bir platformdan takip edebilirsiniz.</p>
          </div>
        </div>
      </div>

      {/* İpuçları */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#f8fafc', marginBottom: '0.75rem' }}>💡 Faydalı İpuçları</h3>
        <div className="space-y-2">
          {TIPS.map((tip, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', fontSize: '13px', color: '#94a3b8' }}>
              <span style={{ fontSize: '16px' }}>{tip.icon}</span> {tip.text}
            </div>
          ))}
        </div>
      </div>

      {/* Özellikler */}
      <div className="space-y-4">
        {SECTIONS.map((section, i) => (
          <div key={i} className="card" style={{ borderLeft: `4px solid ${section.color}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '22px' }}>{section.icon}</span>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#f8fafc' }}>{section.title}</h3>
            </div>
            <ul style={{ paddingLeft: '1.25rem' }}>
              {section.content.map((item, j) => (
                <li key={j} style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '0.375rem', lineHeight: '1.6' }}>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Yetki Kuralları */}
      <div className="card" style={{ marginTop: '1.5rem', borderLeft: '4px solid #f59e0b' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#f8fafc', marginBottom: '1rem' }}>🔑 Yetki Kuralları</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
          {RULES.map(r => (
            <div key={r.title} style={{ backgroundColor: '#0f172a', borderRadius: '0.75rem', padding: '1rem', border: `1px solid ${r.color}30` }}>
              <div style={{ fontSize: '14px', fontWeight: '600', color: r.color, marginBottom: '0.5rem' }}>{r.icon} {r.title}</div>
              {r.abilities.map((a, i) => (
                <div key={i} style={{ fontSize: '12px', color: '#94a3b8', padding: '0.15rem 0' }}>✅ {a}</div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Alt Bilgi */}
      <div className="card" style={{ marginTop: '1.5rem', textAlign: 'center' }}>
        <div style={{ fontSize: '14px', color: '#64748b', marginBottom: '0.5rem' }}>Sorularınız için yönetiminize başvurunuz</div>
        <div style={{ fontSize: '12px', color: '#475569' }}>STV1 v2.0 — Geliştirici: Emre YALIMKILINÇ</div>
      </div>
    </div>
  )
}
