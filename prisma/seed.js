const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  const store1 = await prisma.store.create({
    data: {
      name: 'Merkez Mağaza',
      address: 'İstanbul, Kadıköy',
      phone: '0216 123 4567'
    }
  })

  const store2 = await prisma.store.create({
    data: {
      name: 'Anadolu Yakası Şubesi',
      address: 'İstanbul, Üsküdar',
      phone: '0216 765 4321'
    }
  })

  const adminPassword = await bcrypt.hash('admin123', 12)
  await prisma.user.create({
    data: {
      email: 'admin@stv1.com',
      password: adminPassword,
      name: 'Sistem Yöneticisi',
      role: 'ADMIN'
    }
  })

  const managerPassword = await bcrypt.hash('manager123', 12)
  const manager1 = await prisma.user.create({
    data: {
      email: 'manager1@stv1.com',
      password: managerPassword,
      name: 'Ahmet Yılmaz',
      role: 'MANAGER',
      storeId: store1.id
    }
  })

  const manager2 = await prisma.user.create({
    data: {
      email: 'manager2@stv1.com',
      password: managerPassword,
      name: 'Mehmet Kaya',
      role: 'MANAGER',
      storeId: store2.id
    }
  })

  const staffPassword = await bcrypt.hash('staff123', 12)
  const staffMembers = [
    { name: 'Ayşe Demir', email: 'ayse@stv1.com', storeId: store1.id },
    { name: 'Fatma Çelik', email: 'fatma@stv1.com', storeId: store1.id },
    { name: 'Ali Öztürk', email: 'ali@stv1.com', storeId: store1.id },
    { name: 'Zeynep Arslan', email: 'zeynep@stv1.com', storeId: store2.id },
    { name: 'Mustafa Yıldız', email: 'mustafa@stv1.com', storeId: store2.id },
  ]

  for (const staff of staffMembers) {
    await prisma.user.create({
      data: {
        ...staff,
        password: staffPassword,
        role: 'STAFF'
      }
    })
  }

  const allStaff = await prisma.user.findMany({
    where: { role: 'STAFF' }
  })

  const categories = ['Genel', 'Elektronik', 'Giyim', 'Gıda', 'Mobilya']
  
  for (let dayOffset = 0; dayOffset < 30; dayOffset++) {
    const date = new Date()
    date.setDate(date.getDate() - dayOffset)

    for (const staff of allStaff) {
      const salesCount = Math.floor(Math.random() * 6) + 3
      
      for (let i = 0; i < salesCount; i++) {
        const hour = Math.floor(Math.random() * 10) + 9
        
        await prisma.sale.create({
          data: {
            userId: staff.id,
            storeId: staff.storeId,
            date: date,
            hour: hour,
            amount: Math.floor(Math.random() * 5000) + 100,
            itemCount: Math.floor(Math.random() * 20) + 1,
            customerCount: Math.floor(Math.random() * 10) + 1,
            category: categories[Math.floor(Math.random() * categories.length)]
          }
        })
      }
    }
  }

  console.log('Seed verileri başarıyla oluşturuldu!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
