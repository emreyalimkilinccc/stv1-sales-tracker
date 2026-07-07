'use client'

import Link from 'next/link'

const SECTIONS = [
  {
    icon: '🔑', title: 'Giriş Yapma',
    color: '#3b82f6',
    content: [
      'Kullanıcı adı: Satış kodunuz (ör: 2646)',
      'Şifreniz: Varsayılan şifre 123456',
      'Giriş yaptıktan sonra ana sayfaya yönlendirilirsiniz',
      'Şifrenizi değiştirmek için menüden 🔐 Şifre Değiştir seçin'
    ]
  },
  {
    icon: '📊', title: 'Veriler (Dashboard)',
    color: '#8b5cf6',
    content: [
      'Aylık kota takibinizi görebilirsiniz',
      'Tarih aralığı filtresi ile istediğiniz dönemi görüntüleyin',
      'Kategori bazlı satış dağılımı grafikte görünür',
      'Kişisel hedef belirleyebilirsiniz',
      'Geçen ay ile karşılaştırma otomatik yapılır'
    ]
  },
  {
    icon: '💰', title: 'Satış Girişi',
    color: '#10b981',
    content: [
      'Tarih, saat, tutar, ürün sayısı, bonus ürün sayısı doldurun',
      'Müşteri numarası ve kategori seçin',
      'Eksi tutar (-) girerseniz iade/iptal olarak kaydedilir',
      'Kaydet butonuna basın, otomatik olarak Veriler sayfasına yönlendirilirsiniz',
      'Geçmiş satışlarınızı listeden görebilirsiniz'
    ]
  },
  {
    icon: '📈', title: 'Raporlar',
    color: '#f59e0b',
    content: [
      'Personelin gönderdiği düzeltme istekleri burada görünür',
      'Düzenleme yapıldığında istek listeden kalkar',
      'Tarih ve satıcı filtresi ile arama yapabilirsiniz'
    ]
  },
  {
    icon: '🧹', title: 'Temizlik Programı',
    color: '#06b6d4',
    content: [
      'Yönetici/Müdür tarafından her güne kişi atanır',
      'Sadece atandığınız gün formu açılır',
      'Görevleri tamamlayıp fotoğraf kanıtı ekleyin',
      'En fazla 5 fotoğraf yükleyebilirsiniz',
      'Fotoğraflar otomatik sıkıştırılır'
    ]
  },
  {
    icon: '🗳️', title: 'Oylama',
    color: '#ec4899',
    content: [
      'Yeni anket oluşturulabilir (Yönetici/Müdür)',
      'Herkes 1 kez oy kullanabilir',
      'Oylar anlık olarak sonuçlandırılır',
      'Oylama 00:00\'a kadar veya tümü oy verdiğinde biter'
    ]
  },
  {
    icon: '🎰', title: 'Çekiliş',
    color: '#8b5cf6',
    content: [
      'Yönetici/Müdür tarafından başlatılır',
      'Kategori seçerek belirli grubu çekebilirsiniz',
      'Çark döner ve kazanan belli olur',
      'Kazanan kişi tüm sayfalarda kutlama animasyonu görür'
    ]
  },
  {
    icon: '📦', title: 'Müşteri Teslim',
    color: '#ec4899',
    content: [
      'Yeni teslim kaydı oluşturun',
      'Müşteri seçin veya elle yazın',
      '📷 ile belge fotoğrafı çekin (teslim fişi, imza)',
      'Durum takibi: Teslim / Bekleyen / İptal',
      'Fotoğrafları büyüterek görüntüleyebilirsiniz'
    ]
  },
  {
    icon: '📥', title: 'Gelen Ürünler',
    color: '#f97316',
    content: [
      'Yeni gelen ürün kaydı oluşturun',
      'Tedarikçi, kategori ve miktar bilgisi girin',
      '📷 ile irsaliye/fatura fotoğrafı çekin',
      'Durum takibi: Alındı → Kontrol → Rafa Kaldırıldı'
    ]
  },
  {
    icon: '👥', title: 'Müşteri Yönetimi',
    color: '#06b6d4',
    content: [
      'Herkes yeni müşteri ekleyebilir',
      'Düzenleme ve silme sadece Yönetici/Müdür tarafından yapılabilir',
      'Telefon, email ve adres bilgilerini kaydedin',
      'Satın alma geçmişini görüntüleyebilirsiniz'
    ]
  },
  {
    icon: '📦', title: 'Envanter Takibi',
    color: '#f59e0b',
    content: [
      'Herkes yeni ürün ekleyebilir',
      'Herkes stok adedini +/- ile güncelleyebilir',
      'Düzenleme ve silme sadece Yönetici/Müdür tarafından yapılabilir',
      'Stok azalırsa otomatik uyarı görünür',
      'Minimum stok seviyesini belirleyebilirsiniz'
    ]
  },
  {
    icon: '📥', title: 'Gelen Ürünler',
    color: '#f97316',
    content: [
      'Herkes yeni gelen ürün kaydı oluşturabilir',
      '📷 ile irsaliye/fatura fotoğrafı çekin',
      'Tedarikçi, kategori ve miktar bilgisi girin',
      'Durum takibi: Alındı → Kontrol → Rafa Kaldırıldı',
      'Durum değiştirme sadece Yönetici/Müdür tarafından yapılabilir'
    ]
  },
  {
    icon: '📦', title: 'Müşteri Teslim',
    color: '#ec4899',
    content: [
      'Herkes yeni teslim kaydı oluşturabilir',
      'Müşteri seçin veya elle yazın',
      '📷 ile belge fotoğrafı çekin (teslim fişi, imza, ürün fotoğrafı)',
      'Durum takibi: Teslim Edildi / Bekleyen / İptal',
      'Durum değiştirme sadece Yönetici/Müdür tarafından yapılabilir',
      'Fotoğrafları büyüterek görüntüleyebilirsiniz'
    ]
  },
  {
    icon: '📅', title: 'İzin Talep',
    color: '#f59e0b',
    content: [
      'İzin türü seçin (Yıllık, Sağlık, Kişisel, Diğer)',
      'Tarih aralığı ve sebep girin',
      'Yönetici/Müdür onaylar veya reddeder',
      'Takvim üzerinden izin durumunu takip edebilirsiniz'
    ]
  },
  {
    icon: '⚙️', title: 'Yönetim Paneli',
    color: '#ef4444',
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

const TIPS = [
  { icon: '💡', text: 'Sayfayı yenilediğinizde verileriniz korunur — tüm bilgiler bulutta saklanır' },
  { icon: '📱', text: 'Uygulama telefona eklenebilir — ana ekrana ekleyerek tam ekran kullanabilirsiniz' },
  { icon: '🔔', text: 'Bildirimleri açarak yeniliklerden haberdar olabilirsiniz' },
  { icon: '⚡', text: 'İnternet yokken bile temel verileri görebilirsiniz (çevrimdışı mod)' },
  { icon: '🔐', text: 'Giriş yaptıktan 30 dakika sonra otomatik çıkış yapılır' }
]

export default function KullanimTalimatiPage() {
  return (
    <div className="px-4 py-6 max-w-4xl mx-auto">
      <div className="page-header" style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#ffffff', marginBottom: '0.375rem' }}>📖 Kullanım Talimatı</h1>
        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px' }}>STV1 Mağaza Satış Takip Sistemi nasıl kullanılır?</p>
      </div>

      {/* Özet */}
      <div className="card" style={{ marginBottom: '1rem', background: 'linear-gradient(135deg, rgba(59,130,246,0.1), rgba(139,92,246,0.1))' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
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
          {[
            { role: 'Personel', icon: '👤', color: '#3b82f6', abilities: ['Satış ekleme', 'Müşteri ekleme', 'Envanter ekleme', 'Gelen ürün ekleme', 'Teslim kaydı oluşturma', 'Temizlik görevi', 'İzin talebi'] },
            { role: 'Mağaza Müdürü', icon: '👔', color: '#f59e0b', abilities: ['Tüm personel işlemleri', 'Satış düzenleme/silme', 'Müşteri düzenleme/silme', 'Envanter düzenleme/silme', 'Durum değiştirme', 'Çekiliş başlatma', 'Anket oluşturma', 'Kota yönetimi'] },
            { role: 'Yönetici', icon: '👑', color: '#ef4444', abilities: ['Tüm müdür işlemleri', 'Kullanıcı ekleme/silme', 'Mağaza yönetimi', 'Veri yedekleme', 'Aktivite logu'] }
          ].map(r => (
            <div key={r.role} style={{ backgroundColor: '#0f172a', borderRadius: '0.75rem', padding: '1rem', border: `1px solid ${r.color}30` }}>
              <div style={{ fontSize: '14px', fontWeight: '600', color: r.color, marginBottom: '0.5rem' }}>{r.icon} {r.role}</div>
              {r.abilities.map((a, i) => (
                <div key={i} style={{ fontSize: '12px', color: '#94a3b8', padding: '0.15rem 0' }}>✅ {a}</div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Alt Bilgi */}
      <div className="card" style={{ marginTop: '1.5rem', textAlign: 'center' }}>
        <div style={{ fontSize: '14px', color: '#64748b', marginBottom: '0.5rem' }}>
          Sorularınız için yönetiminize başvurunuz
        </div>
        <div style={{ fontSize: '12px', color: '#475569' }}>
          STV1 v1.0 — Geliştirici: Emre YALIMKILINÇ
        </div>
      </div>
    </div>
  )
}
