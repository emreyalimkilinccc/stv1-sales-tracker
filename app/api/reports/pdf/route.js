import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import jsPDF from 'jspdf'
import 'jspdf-autotable'

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

  const doc = new jsPDF()

  doc.setFontSize(20)
  doc.text('Satış Raporu', 14, 22)
  
  doc.setFontSize(12)
  doc.text(`Tarih Aralığı: ${startDate || 'Başlangıç'} - ${endDate || 'Bitiş'}`, 14, 32)
  doc.text(`Toplam Satış: ${sales.length}`, 14, 40)
  doc.text(
    `Toplam Tutar: ₺${sales.reduce((sum, s) => sum + parseFloat(s.amount), 0).toLocaleString('tr-TR')}`,
    14,
    48
  )

  const tableData = sales.map(sale => [
    new Date(sale.date).toLocaleDateString('tr-TR'),
    `${String(sale.hour).padStart(2, '0')}:00`,
    sale.user.name,
    `₺${parseFloat(sale.amount).toLocaleString('tr-TR')}`,
    sale.itemCount.toString(),
    sale.customerCount.toString()
  ])

  doc.autoTable({
    startY: 55,
    head: [['Tarih', 'Saat', 'Personel', 'Tutar', 'Ürün', 'Müşteri']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [79, 70, 229] }
  })

  const pdfBuffer = Buffer.from(doc.output('arraybuffer'))
  
  return new NextResponse(pdfBuffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename=satis-raporu.pdf'
    }
  })
}
