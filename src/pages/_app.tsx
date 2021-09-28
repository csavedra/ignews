import { AppProps } from 'next/app'
import React from 'react'
import { Header } from '../components/header'
import { Provider as NextAuthProvider } from 'next-auth/client'

import '../styles/global.scss'

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <NextAuthProvider session={pageProps.session}>
      <Header />
      <Component {...pageProps} />
    </NextAuthProvider>
  )
}

export default MyApp
