import { withAuth } from 'next-auth/middleware'

export default withAuth({
  callbacks: {
    authorized: ({ token, req }) => {
      const path = req.nextUrl.pathname
      
      if (path.startsWith('/admin') && token?.role !== 'ADMIN') {
        return false
      }
      
      if (path.startsWith('/manager') && 
          token?.role !== 'MANAGER' && 
          token?.role !== 'ADMIN') {
        return false
      }
      
      return !!token
    }
  }
})

export const config = {
  matcher: ['/dashboard/:path*', '/sales/:path*', '/reports/:path*', '/admin/:path*', '/manager/:path*']
}
