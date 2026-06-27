import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import * as XLSX from 'xlsx'

export async function GET(req) {
  const session = await getSession()
  
  if (!session || session.user.role === 'STAFF') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')

  let where = {}
  if (session.user.role === 'MANAGER') {
    where.storeId = session.user.storeId
  }
  if (startDate && endDate) {
    where.date = {
      gte: new Date(startDate),
      lte: new Date(endDate)
    }
  }

  const sales = await prisma.sale.findMany({
    where,
    include: {
      user: { select: { name: true } },
      store: { select: { name: true } }
    },
    orderBy: [{ date: 'desc' }, { hour: 'desc' }]
  })

  const worksheetData = sales.map(sale => ({
    'Tarih': new Date(sale.date).toLocaleDateString('tr-TR'),
    'Saat': `${String(sale.hour).padStart(2, '0')}:00`,
    'Personel': sale.user.name,
    'Mağaza': sale.store.name,
    'Tutar': parseFloat(sale.amount),
    'Ürün Sayısı': sale.itemCount,
    'Müşteri Sayısı': sale.customerCount,
    'Kategori': sale.category || '',
    'Notlar': sale.notes || ''
  }))

  const worksheet = XLSX.utils.json_to_sheet(worksheetData)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Satışlar')

  const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
  
  return new NextResponse(excelBuffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename=satis-raporu.xlsx'
    }
  })
}
