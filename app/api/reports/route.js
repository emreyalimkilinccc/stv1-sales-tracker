import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET(req) {
  const session = await getSession()
  
  if (!session || session.user.role === 'STAFF') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')
  const userId = searchParams.get('userId')
  const groupBy = searchParams.get('groupBy') || 'day'

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

  if (userId) {
    where.userId = userId
  }

  const sales = await prisma.sale.findMany({
    where,
    include: {
      user: { select: { id: true, name: true } },
      store: { select: { id: true, name: true } }
    },
    orderBy: { date: 'asc' }
  })

  let groupedData = {}
  
  if (groupBy === 'day') {
    groupedData = sales.reduce((acc, sale) => {
      const key = sale.date.toISOString().split('T')[0]
      if (!acc[key]) acc[key] = { date: key, amount: 0, count: 0, items: 0, customers: 0 }
      acc[key].amount += parseFloat(sale.amount)
      acc[key].count += 1
      acc[key].items += sale.itemCount
      acc[key].customers += sale.customerCount
      return acc
    }, {})
  } else if (groupBy === 'week') {
    groupedData = sales.reduce((acc, sale) => {
      const date = new Date(sale.date)
      const weekStart = new Date(date)
      weekStart.setDate(date.getDate() - date.getDay())
      const key = weekStart.toISOString().split('T')[0]
      if (!acc[key]) acc[key] = { week: key, amount: 0, count: 0, items: 0, customers: 0 }
      acc[key].amount += parseFloat(sale.amount)
      acc[key].count += 1
      acc[key].items += sale.itemCount
      acc[key].customers += sale.customerCount
      return acc
    }, {})
  } else if (groupBy === 'month') {
    groupedData = sales.reduce((acc, sale) => {
      const key = sale.date.toISOString().substring(0, 7)
      if (!acc[key]) acc[key] = { month: key, amount: 0, count: 0, items: 0, customers: 0 }
      acc[key].amount += parseFloat(sale.amount)
      acc[key].count += 1
      acc[key].items += sale.itemCount
      acc[key].customers += sale.customerCount
      return acc
    }, {})
  }

  let staffData = {}
  if (session.user.role !== 'STAFF') {
    staffData = sales.reduce((acc, sale) => {
      const key = sale.userId
      if (!acc[key]) acc[key] = { userId: key, userName: sale.user.name, amount: 0, count: 0 }
      acc[key].amount += parseFloat(sale.amount)
      acc[key].count += 1
      return acc
    }, {})
  }

  return NextResponse.json({
    groupedData: Object.values(groupedData),
    staffData: Object.values(staffData),
    totalSales: sales.length,
    totalAmount: sales.reduce((sum, s) => sum + parseFloat(s.amount), 0)
  })
}
