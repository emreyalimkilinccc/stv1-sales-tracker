import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const stores = await prisma.store.findMany({
    include: {
      _count: { select: { users: true, sales: true } }
    }
  })

  return NextResponse.json(stores)
}

export async function POST(req) {
  const session = await getSession()
  
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { name, address, phone } = await req.json()

    const store = await prisma.store.create({
      data: { name, address, phone }
    })

    return NextResponse.json(store)
  } catch (error) {
    console.error('Store creation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
