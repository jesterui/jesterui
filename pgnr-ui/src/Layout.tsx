import React, { PropsWithChildren } from 'react'
import { Outlet } from 'react-router-dom'

type Variant = 'narrow' | 'wide' | null

const Col = ({ variant, children }: PropsWithChildren<{ variant: Variant }>) => {
  return <div className={`px-4 ${variant ? variant : ''}`}>{children}</div>
}

const Layout = ({ variant }: { variant: Variant }) => {
  return (
    <div className="container max-w-7xl">
      <Col variant={variant}>
        <Outlet />
      </Col>
    </div>
  )
}

export default Layout
