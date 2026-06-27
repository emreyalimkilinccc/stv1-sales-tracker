'use client'

import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'
import { usePathname } from 'next/navigation'

export default function Navbar() {
  const { data: session } = useSession()
  const pathname = usePathname()

  const isActive = (path) => pathname === path

  if (!session) return null

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', roles: ['STAFF', 'MANAGER', 'ADMIN'] },
    { href: '/sales', label: 'Satış Giriş', roles: ['STAFF', 'MANAGER', 'ADMIN'] },
    { href: '/reports', label: 'Raporlar', roles: ['MANAGER', 'ADMIN'] },
    { href: '/admin', label: 'Yönetim', roles: ['ADMIN'] },
  ]

  return (
    <nav className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <span className="text-xl font-bold text-indigo-600">STV1</span>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {navItems
                .filter(item => item.roles.includes(session.user.role))
                .map(item => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                      isActive(item.href)
                        ? 'border-indigo-500 text-gray-900'
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
            </div>
          </div>
          <div className="flex items-center">
            <div className="ml-4 flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                {session.user.name}
              </span>
              <span className="text-xs px-2 py-1 bg-indigo-100 text-indigo-800 rounded">
                {session.user.role}
              </span>
              <button
                onClick={() => signOut()}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Çıkış
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}
