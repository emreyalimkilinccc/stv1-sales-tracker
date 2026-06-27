'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import SalesForm from '@/components/SalesForm'

export default function SalesPage() {
  const { data: session } = useSession()
  const [sales, setSales] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingSale, setEditingSale] = useState(null)

  useEffect(() => {
    fetchSales()
  }, [])

  const fetchSales = async () => {
    try {
      const res = await fetch('/api/sales')
      const data = await res.json()
      setSales(data)
    } catch (error) {
      console.error('Error fetching sales:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (formData) => {
    if (editingSale) {
      await fetch(`/api/sales/${editingSale.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      setEditingSale(null)
    } else {
      await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
    }
    fetchSales()
  }

  const handleDelete = async (id) => {
    if (!confirm('Bu satışı silmek istediğinize emin misiniz?')) return
    
    await fetch(`/api/sales/${id}`, { method: 'DELETE' })
    fetchSales()
  }

  const today = new Date().toISOString().split('T')[0]
  const todaySales = sales.filter(s => s.date.startsWith(today))
  const totalToday = todaySales.reduce((sum, s) => sum + parseFloat(s.amount), 0)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Satış Giriş</h1>
        <p className="mt-1 text-sm text-gray-600">
          Günlük satışlarınızı kaydedin
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            {editingSale ? 'Satışı Düzenle' : 'Yeni Satış Ekle'}
          </h2>
          <SalesForm 
            onSubmit={handleSubmit} 
            initialData={editingSale}
          />
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h3 className="text-lg font-medium text-gray-900">Bugünün Özeti</h3>
            <div className="mt-4 grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-500">Toplam Satış</p>
                <p className="text-2xl font-bold text-indigo-600">
                  ₺{totalToday.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">İşlem Sayısı</p>
                <p className="text-2xl font-bold text-indigo-600">
                  {todaySales.length}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Ortalama</p>
                <p className="text-2xl font-bold text-indigo-600">
                  ₺{todaySales.length > 0 
                    ? (totalToday / todaySales.length).toLocaleString('tr-TR', { minimumFractionDigits: 2 })
                    : '0.00'
                  }
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Satış Geçmişi</h3>
            </div>
            {loading ? (
              <div className="p-6 text-center text-gray-500">Yükleniyor...</div>
            ) : sales.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                Henüz satış kaydı bulunmuyor
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tarih
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Saat
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tutar
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ürün
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Müşteri
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      İşlemler
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sales.map((sale) => (
                    <tr key={sale.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(sale.date).toLocaleDateString('tr-TR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {String(sale.hour).padStart(2, '0')}:00
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ₺{parseFloat(sale.amount).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {sale.itemCount}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {sale.customerCount}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => setEditingSale(sale)}
                          className="text-indigo-600 hover:text-indigo-900 mr-4"
                        >
                          Düzenle
                        </button>
                        <button
                          onClick={() => handleDelete(sale.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Sil
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
