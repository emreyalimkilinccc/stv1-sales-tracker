import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET(req) {
  const session = await getSession()
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')
  const userId = searchParams.get('userId')

  let where = {}

  if (session.user.role === 'STAFF') {
    where.userId = session.user.id
  } else if (session.user.role === 'MANAGER') {
    where.storeId = session.user.storeId
  }

  if (startDate && endDate) {
    where.date = {
      gte: new Date(startDate),
      lte: new Date(endDate)
    }
  }

  if (userId && session.user.role !== 'STAFF') {
    where.userId = userId
  }

  const sales = await prisma.sale.findMany({
    where,
    include: {
      user: { select: { id: true, name: true } },
      store: { select: { id: true, name: true } }
    },
    orderBy: [{ date: 'desc' }, { hour: 'desc' }]
  })

  return NextResponse.json(sales)
}

export async function POST(req) {
  const session = await getSession()
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { date, hour, amount, itemCount, customerCount, category, notes } = await req.json()

    const sale = await prisma.sale.create({
      data: {
        userId: session.user.id,
        storeId: session.user.storeId,
        date: new Date(date),
        hour: parseInt(hour),
        amount: parseFloat(amount),
        itemCount: parseInt(itemCount) || 0,
        customerCount: parseInt(customerCount) || 0,
        category: category || null,
        notes: notes || null
      }
    })

    return NextResponse.json(sale)
  } catch (error) {
    console.error('Sale creation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
