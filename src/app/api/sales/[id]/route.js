import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function PUT(req, { params }) {
  const session = await getSession()
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = params
  const sale = await prisma.sale.findUnique({ where: { id } })

  if (!sale) {
    return NextResponse.json({ error: 'Sale not found' }, { status: 404 })
  }

  if (session.user.role === 'STAFF' && sale.userId !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { date, hour, amount, itemCount, customerCount, category, notes } = await req.json()

    const updatedSale = await prisma.sale.update({
      where: { id },
      data: {
        date: new Date(date),
        hour: parseInt(hour),
        amount: parseFloat(amount),
        itemCount: parseInt(itemCount) || 0,
        customerCount: parseInt(customerCount) || 0,
        category: category || null,
        notes: notes || null
      }
    })

    return NextResponse.json(updatedSale)
  } catch (error) {
    console.error('Sale update error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(req, { params }) {
  const session = await getSession()
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = params
  const sale = await prisma.sale.findUnique({ where: { id } })

  if (!sale) {
    return NextResponse.json({ error: 'Sale not found' }, { status: 404 })
  }

  if (session.user.role === 'STAFF' && sale.userId !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await prisma.sale.delete({ where: { id } })

  return NextResponse.json({ message: 'Sale deleted' })
}
